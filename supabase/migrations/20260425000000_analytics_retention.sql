-- =============================================================================
-- Phase 5 — Analytics data lifecycle
-- =============================================================================
-- Adds:
--   1. BRIN indexes on the timestamp column of each insert-heavy analytics
--      table (`portfolio_visits.visited_at`, `error_log.created_at`,
--      `audit_logs.created_at`). BRIN is ~10x smaller than B-tree and ideal
--      for append-only timestamped data — range scans by date win, and the
--      index footprint stays negligible even at 100M+ rows.
--   2. `sweep_analytics_retention_batch(table, days, batch_size)` — a
--      SECURITY DEFINER RPC that deletes ONE batch (≤ batch_size rows)
--      from the named analytics table older than the cutoff and returns
--      the deleted row count. The Express sweeper loops, calling this
--      once per batch, so each batch runs in its own short transaction
--      and locks are never held for more than one batch's duration.
--      This is the key safety property — a function with an inner loop
--      runs as a single transaction in Postgres and would defeat the
--      "short locks" goal.
--
-- Defaults are intentionally NOT hard-coded in the SQL — the Express-side
-- sweeper passes them in from env vars (PORTFOLIO_VISITS_RETENTION_DAYS,
-- ERROR_LOG_RETENTION_DAYS, AUDIT_LOGS_RETENTION_DAYS) so retention can
-- be tuned without a migration.
-- =============================================================================

-- ── BRIN indexes ─────────────────────────────────────────────────────────────
-- pages_per_range = 32 (smaller than the default 128) tightens the granule
-- enough that day-bounded sweeps still get good selectivity, while keeping
-- the index <1 MB even at tens of millions of rows.

CREATE INDEX IF NOT EXISTS idx_portfolio_visits_visited_at_brin
  ON public.portfolio_visits
  USING BRIN (visited_at)
  WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_error_log_created_at_brin
  ON public.error_log
  USING BRIN (created_at)
  WITH (pages_per_range = 32);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_brin
  ON public.audit_logs
  USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- ── sweep_analytics_retention_batch ──────────────────────────────────────────
-- Deletes a SINGLE batch (≤ p_batch_size rows) older than now() - p_days
-- from the named analytics table. Uses FOR UPDATE SKIP LOCKED so a
-- concurrent app insert never blocks the sweep and vice-versa. Returns
-- the number of rows deleted in this call. The caller (Express) loops
-- until the returned count is less than p_batch_size, so each batch
-- runs in its own short transaction (1 RPC call = 1 txn).
--
-- p_table is whitelisted server-side via a CASE — we do NOT use dynamic
-- SQL with raw identifiers, both for safety and so the planner can use
-- the per-table BRIN index.

DROP FUNCTION IF EXISTS public.sweep_analytics_retention(INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.sweep_analytics_retention_batch(
  p_table       TEXT,
  p_days        INTEGER,
  p_batch_size  INTEGER DEFAULT 10000
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff   TIMESTAMPTZ;
  v_deleted  BIGINT := 0;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'retention window must be >= 1 day (got %)', p_days;
  END IF;
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 100000 THEN
    RAISE EXCEPTION 'batch size must be between 1 and 100000 (got %)', p_batch_size;
  END IF;

  v_cutoff := now() - make_interval(days => p_days);

  -- Whitelist the table name. Each branch uses the static identifier so
  -- the per-table BRIN index can be planned, and there is zero injection
  -- surface on p_table.
  CASE p_table
    WHEN 'portfolio_visits' THEN
      WITH victims AS (
        SELECT id FROM public.portfolio_visits
        WHERE visited_at < v_cutoff
        ORDER BY visited_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM public.portfolio_visits pv
      USING victims
      WHERE pv.id = victims.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'error_log' THEN
      WITH victims AS (
        SELECT id FROM public.error_log
        WHERE created_at < v_cutoff
        ORDER BY created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM public.error_log el
      USING victims
      WHERE el.id = victims.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    WHEN 'audit_logs' THEN
      WITH victims AS (
        SELECT id FROM public.audit_logs
        WHERE created_at < v_cutoff
        ORDER BY created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM public.audit_logs al
      USING victims
      WHERE al.id = victims.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'unknown analytics table: %', p_table;
  END CASE;

  RETURN v_deleted;
END;
$$;

-- Lock down to roles that should ever invoke this. PostgREST anonymous
-- and authenticated roles must not be able to trigger any sweep.
-- service_role (Supabase) and the database owner (Neon DATABASE_URL
-- connections from the Express sweeper) get EXECUTE explicitly.
REVOKE ALL ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER)
  TO service_role;
-- Best-effort grant for the Neon DATABASE_URL role. Names vary per
-- environment, so wrap each in a DO block that no-ops on missing role.
DO $grant$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER) TO postgres';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;
DO $grant$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER) TO neon_superuser';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;

COMMENT ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER) IS
  'Phase 5 retention sweep: deletes ONE batch (<= p_batch_size rows) older than
   now() - p_days from the named analytics table. Each call runs in its own
   transaction so locks stay short. Caller loops until ROW_COUNT < p_batch_size.';

-- ── analytics_sweep_lock ─────────────────────────────────────────────────────
-- Cross-process / cross-instance mutex for the retention sweeper. Required
-- because the Neon HTTP serverless driver does NOT preserve a single
-- backend session across statements — `pg_advisory_lock(...)` would be
-- released the moment its HTTP request returns, defeating the lock. A
-- durable single-row table sidesteps that entirely.
--
-- Acquire pattern (in app code):
--   INSERT INTO analytics_sweep_lock (id, holder, acquired_at, expires_at)
--   VALUES (1, $holder, now(), now() + interval '...')
--   ON CONFLICT (id) DO UPDATE
--     SET holder = EXCLUDED.holder,
--         acquired_at = EXCLUDED.acquired_at,
--         expires_at  = EXCLUDED.expires_at
--     WHERE analytics_sweep_lock.expires_at < now()
--   RETURNING holder = $holder AS got;
--
-- Release pattern: DELETE WHERE holder = $holder.
-- The TTL ensures a crashed holder cannot pin the lock indefinitely.

CREATE TABLE IF NOT EXISTS public.analytics_sweep_lock (
  id          INTEGER     PRIMARY KEY DEFAULT 1,
  holder      TEXT        NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,
  CONSTRAINT analytics_sweep_lock_singleton CHECK (id = 1)
);

REVOKE ALL ON TABLE public.analytics_sweep_lock FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_sweep_lock TO service_role;
DO $grant$ BEGIN
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_sweep_lock TO postgres';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;
DO $grant$ BEGIN
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analytics_sweep_lock TO neon_superuser';
EXCEPTION WHEN undefined_object THEN NULL; END $grant$;

COMMENT ON TABLE public.analytics_sweep_lock IS
  'Phase 5 — single-row durable mutex for the retention sweeper. The Neon
   HTTP driver cannot hold session advisory locks across statements, so we
   use a TTL-bearing row instead. Holders insert with an expiry; stale
   holders are evicted on the next acquire attempt.';
