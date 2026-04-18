-- Phase 4 — AI Provider Resilience
--
-- Postgres-backed circuit breaker shared across ALL edge function instances.
-- Without this, each cold-started instance keeps its own in-memory failure
-- count so the same broken upstream gets re-tried 100s of times concurrently
-- when a provider is down. With this table, the first instance to hit the
-- failure threshold "opens" the breaker and every other instance reads the
-- shared state and skips that provider until the cool-down expires.
--
-- The companion RPC `record_ai_breaker_event` does both the read+write in
-- a single SQL round-trip so callers cannot race each other into duplicate
-- "should I open?" decisions.

CREATE TABLE IF NOT EXISTS public.ai_provider_breaker (
  provider              TEXT PRIMARY KEY,
  failure_count         INTEGER     NOT NULL DEFAULT 0,
  window_started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_until          TIMESTAMPTZ,
  -- Half-open / single-probe lock. When a breaker's cooldown expires we
  -- want EXACTLY ONE caller across all instances to test the upstream.
  -- A second caller hitting the same RPC at the same instant must still
  -- see the breaker as "open" until the prober reports success/failure
  -- (or until probe_in_flight_until expires as a deadlock guard).
  probe_in_flight_until TIMESTAMPTZ,
  last_success_at       TIMESTAMPTZ,
  last_failure_at       TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Older deployments may already have the table without the probe column.
-- Adding it as a no-op when the column exists keeps the migration idempotent.
ALTER TABLE public.ai_provider_breaker
  ADD COLUMN IF NOT EXISTS probe_in_flight_until TIMESTAMPTZ;

COMMENT ON TABLE public.ai_provider_breaker IS
  'Cross-instance circuit breaker state for managed AI providers (Phase 4).';

-- ── Atomic record-an-outcome RPC ────────────────────────────────────────────
-- Idempotent upsert that records ONE attempt outcome and returns the post-
-- update state. Threshold and window/cooldown are passed in by the caller
-- so the policy can be tuned via env vars without touching the DB.
--
-- Args:
--   p_provider          — short stable id, e.g. 'wiseresume/openrouter'
--   p_success           — true on success, false on failure
--   p_threshold         — failures within window that trigger opening (e.g. 5)
--   p_window_seconds    — sliding-window length for failure counting (e.g. 60)
--   p_cooldown_seconds  — how long the breaker stays open after tripping (e.g. 60)
--
-- Returns JSONB:
--   { provider, failure_count, window_started_at, opened_until, is_open }
--
-- Semantics:
--   - Success                           → reset failure_count to 0, clear opened_until
--   - Failure inside the active window  → increment failure_count, open if >= threshold
--   - Failure after window expiry       → start a fresh window with count=1
--
-- Concurrency:
--   - Wraps INSERT … ON CONFLICT DO UPDATE so it serialises naturally on the
--     PK row. Two parallel failure reports cannot both miss the threshold;
--     the second one sees the incremented count via the same row lock.

CREATE OR REPLACE FUNCTION public.record_ai_breaker_event(
  p_provider          TEXT,
  p_success           BOOLEAN,
  p_threshold         INTEGER DEFAULT 5,
  p_window_seconds    INTEGER DEFAULT 60,
  p_cooldown_seconds  INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_now              TIMESTAMPTZ := NOW();
  v_row              public.ai_provider_breaker%ROWTYPE;
  v_window_expired   BOOLEAN;
  v_new_count        INTEGER;
  v_new_window_start TIMESTAMPTZ;
  v_new_opened_until TIMESTAMPTZ;
BEGIN
  IF p_provider IS NULL OR length(p_provider) = 0 THEN
    RAISE EXCEPTION 'p_provider is required';
  END IF;

  -- Ensure a row exists so the UPDATE below always finds something to lock.
  INSERT INTO public.ai_provider_breaker (provider, failure_count, window_started_at, updated_at)
  VALUES (p_provider, 0, v_now, v_now)
  ON CONFLICT (provider) DO NOTHING;

  SELECT * INTO v_row
    FROM public.ai_provider_breaker
   WHERE provider = p_provider
     FOR UPDATE;

  IF p_success THEN
    -- Success — clear failures, the breaker, and any in-flight probe lock
    -- (the probe just succeeded, so future callers can resume normally).
    UPDATE public.ai_provider_breaker
       SET failure_count         = 0,
           window_started_at     = v_now,
           opened_until          = NULL,
           probe_in_flight_until = NULL,
           last_success_at       = v_now,
           updated_at            = v_now
     WHERE provider = p_provider
     RETURNING * INTO v_row;
  ELSE
    v_window_expired := (v_row.window_started_at + (p_window_seconds || ' seconds')::interval) < v_now;
    IF v_window_expired THEN
      v_new_count        := 1;
      v_new_window_start := v_now;
    ELSE
      v_new_count        := v_row.failure_count + 1;
      v_new_window_start := v_row.window_started_at;
    END IF;

    IF v_new_count >= p_threshold THEN
      v_new_opened_until := v_now + (p_cooldown_seconds || ' seconds')::interval;
    ELSE
      -- Preserve a still-open breaker if one is in flight; never accidentally
      -- close it just because a single new failure didn't meet the threshold.
      v_new_opened_until := CASE
        WHEN v_row.opened_until IS NOT NULL AND v_row.opened_until > v_now
          THEN v_row.opened_until
        ELSE NULL
      END;
    END IF;

    UPDATE public.ai_provider_breaker
       SET failure_count     = v_new_count,
           window_started_at = v_new_window_start,
           opened_until      = v_new_opened_until,
           last_failure_at   = v_now,
           updated_at        = v_now
     WHERE provider = p_provider
     RETURNING * INTO v_row;
  END IF;

  RETURN jsonb_build_object(
    'provider',          v_row.provider,
    'failure_count',     v_row.failure_count,
    'window_started_at', v_row.window_started_at,
    'opened_until',      v_row.opened_until,
    'is_open',           (v_row.opened_until IS NOT NULL AND v_row.opened_until > v_now)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_ai_breaker_event(TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_breaker_event(TEXT, BOOLEAN, INTEGER, INTEGER, INTEGER)
  TO service_role;

-- ── Half-open / single-probe acquisition RPC ────────────────────────────────
-- Replaces the previous "is the breaker open?" SELECT with an atomic state
-- machine that implements true half-open semantics:
--
--   closed       — opened_until is NULL (or in the past) AND no probe lock.
--                  Caller is allowed; no state change.
--   open         — opened_until is in the future. Caller is denied.
--   half_open    — cooldown just expired AND no probe in flight. The FIRST
--                  caller atomically claims a probe lock (probe_in_flight_until
--                  = NOW + p_probe_ttl) and is allowed to proceed. Concurrent
--                  callers see the lock and are denied (treated as "open").
--   locked_probe — cooldown expired BUT another caller already holds the
--                  probe lock and we are within its TTL. Denied.
--
-- Returns one of: 'closed' | 'open' | 'half_open' | 'locked_probe'.
-- Callers treat 'closed' and 'half_open' as ALLOW, everything else as DENY.
--
-- The probe TTL is a deadlock guard — if a probing instance crashes mid-
-- request we can't leave the breaker permanently locked, so the slot
-- auto-releases after p_probe_ttl_seconds and the next caller can retry.

CREATE OR REPLACE FUNCTION public.try_acquire_breaker_pass(
  p_provider           TEXT,
  p_probe_ttl_seconds  INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_now      TIMESTAMPTZ := NOW();
  v_row      public.ai_provider_breaker%ROWTYPE;
  v_open     BOOLEAN;
  v_probing  BOOLEAN;
BEGIN
  IF p_provider IS NULL OR length(p_provider) = 0 THEN
    RAISE EXCEPTION 'p_provider is required';
  END IF;

  -- Materialise the row so the FOR UPDATE below has something to lock.
  INSERT INTO public.ai_provider_breaker (provider, failure_count, window_started_at, updated_at)
  VALUES (p_provider, 0, v_now, v_now)
  ON CONFLICT (provider) DO NOTHING;

  -- Row-level lock serialises concurrent callers across instances.
  SELECT * INTO v_row
    FROM public.ai_provider_breaker
   WHERE provider = p_provider
     FOR UPDATE;

  v_open    := v_row.opened_until IS NOT NULL AND v_row.opened_until > v_now;
  v_probing := v_row.probe_in_flight_until IS NOT NULL AND v_row.probe_in_flight_until > v_now;

  -- 1. Breaker fully closed → allow with no state change.
  IF v_row.opened_until IS NULL THEN
    RETURN 'closed';
  END IF;

  -- 2. Cooldown still active → deny.
  IF v_open THEN
    RETURN 'open';
  END IF;

  -- 3. Cooldown elapsed but a probe is already in flight → deny so we
  --    don't issue a thundering herd of "test" requests in parallel.
  IF v_probing THEN
    RETURN 'locked_probe';
  END IF;

  -- 4. Cooldown elapsed and no probe in flight → THIS caller becomes the
  --    prober. Claim the slot atomically before releasing the row lock
  --    so concurrent callers will see the lock on their own SELECT.
  UPDATE public.ai_provider_breaker
     SET probe_in_flight_until = v_now + (p_probe_ttl_seconds || ' seconds')::interval,
         updated_at            = v_now
   WHERE provider = p_provider;

  RETURN 'half_open';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.try_acquire_breaker_pass(TEXT, INTEGER)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.try_acquire_breaker_pass(TEXT, INTEGER)
  TO service_role;

-- ── Refund-day fix ──────────────────────────────────────────────────────────
-- The previous atomic_refund_credit only ever subtracted from today's row,
-- so a deduction that committed at 23:59:59 UTC and a refund at 00:00:02
-- the next day landed on different calendar dates: the refund was a no-op
-- and the user permanently over-paid by one credit. Add an optional
-- p_usage_date that the caller plumbs through from the original deduction
-- so refunds always target the same row that was debited.
--
-- Backwards compatible: when p_usage_date is NULL the function falls back to
-- CURRENT_DATE so older callers continue to work unchanged.

-- Drop the old 2-arg version explicitly. CREATE OR REPLACE cannot replace
-- a function whose argument list changed, so without this DROP we'd end up
-- with TWO overloads (UUID,INTEGER) and (UUID,INTEGER,DATE) and any
-- pre-existing 2-arg call sites would still hit the buggy "always today"
-- code path.
DROP FUNCTION IF EXISTS public.atomic_refund_credit(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.atomic_refund_credit(
  p_user_id     UUID,
  p_amount      INTEGER DEFAULT 1,
  p_usage_date  DATE    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_date  DATE := COALESCE(p_usage_date, CURRENT_DATE);
  v_new_daily    INTEGER;
  v_new_total    BIGINT;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
  END IF;

  UPDATE public.ai_credits
     SET daily_usage = GREATEST(
                         CASE WHEN usage_date = v_target_date THEN daily_usage - p_amount
                              ELSE daily_usage END,
                         0
                       ),
         total_usage = GREATEST(total_usage - p_amount, 0),
         updated_at  = NOW()
   WHERE user_id = p_user_id
   RETURNING daily_usage, total_usage
        INTO v_new_daily, v_new_total;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'refunded',    false,
      'reason',      'no_row',
      'daily_usage', 0,
      'total_usage', 0
    );
  END IF;

  RETURN jsonb_build_object(
    'refunded',    true,
    'daily_usage', v_new_daily,
    'total_usage', v_new_total,
    'usage_date',  v_target_date
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_refund_credit(UUID, INTEGER, DATE)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.atomic_refund_credit(UUID, INTEGER, DATE)
  TO service_role;

-- ── Deduct RPC: also return usage_date ──────────────────────────────────────
-- Update atomic_attempt_and_deduct_credit to surface the usage_date it stored
-- so refundCredit can later pass it back. Backwards compatible: existing
-- callers that ignore the new field continue to work.

CREATE OR REPLACE FUNCTION public.atomic_attempt_and_deduct_credit(
  p_user_id    UUID,
  p_plan_limit INTEGER,
  p_amount     INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_today         DATE    := CURRENT_DATE;
  v_daily_usage   INTEGER;
  v_usage_date    DATE;
  v_total_usage   BIGINT;
  v_effective_use INTEGER;
  v_new_remaining INTEGER;
BEGIN
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
  END IF;

  IF p_plan_limit < 0 THEN
    -- Unlimited plan: report today's date so refund logic stays consistent.
    RETURN jsonb_build_object(
      'allowed',    true,
      'remaining',  999999,
      'usage_date', v_today
    );
  END IF;

  INSERT INTO public.ai_credits (
    user_id, daily_usage, total_usage, usage_date, daily_limit, updated_at
  )
  VALUES (p_user_id, 0, 0, v_today, p_plan_limit, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT daily_usage, total_usage, usage_date
    INTO v_daily_usage, v_total_usage, v_usage_date
    FROM public.ai_credits
   WHERE user_id = p_user_id
     FOR UPDATE;

  IF v_usage_date != v_today THEN
    v_effective_use := 0;
  ELSE
    v_effective_use := v_daily_usage;
  END IF;

  IF v_effective_use + p_amount > p_plan_limit THEN
    RETURN jsonb_build_object(
      'allowed',    false,
      'remaining',  GREATEST(p_plan_limit - v_effective_use, 0),
      'usage_date', v_today
    );
  END IF;

  UPDATE public.ai_credits
     SET daily_usage  = CASE
                          WHEN usage_date = v_today THEN daily_usage + p_amount
                          ELSE p_amount
                        END,
         total_usage  = total_usage + p_amount,
         usage_date   = v_today,
         daily_limit  = p_plan_limit,
         updated_at   = NOW()
   WHERE user_id = p_user_id;

  v_new_remaining := p_plan_limit - v_effective_use - p_amount;

  RETURN jsonb_build_object(
    'allowed',    true,
    'remaining',  GREATEST(v_new_remaining, 0),
    'usage_date', v_today
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.atomic_attempt_and_deduct_credit(UUID, INTEGER, INTEGER)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.atomic_attempt_and_deduct_credit(UUID, INTEGER, INTEGER)
  TO service_role;
