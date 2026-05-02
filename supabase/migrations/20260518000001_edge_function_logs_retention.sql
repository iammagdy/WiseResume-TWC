-- =============================================================================
-- Task #20 — Auto-trim `edge_function_logs`
-- =============================================================================
-- After Task #19, every admin and AI edge function writes a row into
-- `edge_function_logs` on each invocation (previously only 8 functions did),
-- so the table now grows by thousands of rows per day. Without retention
-- it slowly slows down the Observability → Telemetry tab.
--
-- This migration:
--   1. Adds a BRIN index on `edge_function_logs.created_at` so the daily
--      sweep's `WHERE created_at < cutoff ORDER BY created_at` scan stays
--      cheap even at tens of millions of rows. Matches the BRIN treatment
--      `portfolio_visits`, `error_log`, and `audit_logs` already use.
--   2. Extends the `sweep_analytics_retention_batch` whitelist with an
--      `edge_function_logs` branch so the existing Express-side sweeper
--      (server/index.ts `runAnalyticsSweep`) can prune it with the same
--      batched / FOR UPDATE SKIP LOCKED loop the other tables use.
--
-- The retention window is passed in from the env var
-- `EDGE_FUNCTION_LOGS_RETENTION_DAYS` (default 30) so it can be tuned
-- without another migration.
-- =============================================================================

-- ── BRIN index ───────────────────────────────────────────────────────────────
-- Same pages_per_range = 32 setting as the other analytics-table BRINs so
-- day-bounded sweeps still get good selectivity.
CREATE INDEX IF NOT EXISTS idx_edge_function_logs_created_at_brin
  ON public.edge_function_logs
  USING BRIN (created_at)
  WITH (pages_per_range = 32);

-- ── sweep_analytics_retention_batch — add edge_function_logs branch ──────────
-- Replace the function body to add the new whitelisted table. Function
-- signature, return type, security, and grants are unchanged so the
-- existing Express-side caller does not need any RPC migration coordination.

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

    WHEN 'edge_function_logs' THEN
      WITH victims AS (
        SELECT id FROM public.edge_function_logs
        WHERE created_at < v_cutoff
        ORDER BY created_at
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM public.edge_function_logs efl
      USING victims
      WHERE efl.id = victims.id;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

    ELSE
      RAISE EXCEPTION 'unknown analytics table: %', p_table;
  END CASE;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.sweep_analytics_retention_batch(TEXT, INTEGER, INTEGER) IS
  'Phase 5 retention sweep: deletes ONE batch (<= p_batch_size rows) older than
   now() - p_days from the named analytics table. Each call runs in its own
   transaction so locks stay short. Caller loops until ROW_COUNT < p_batch_size.
   Whitelisted tables: portfolio_visits, error_log, audit_logs, edge_function_logs.';
