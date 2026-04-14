-- Atomic credit check-and-deduct function.
--
-- Replaces the previous "check then deduct after AI call" pattern which was
-- susceptible to concurrent usage and transient RPC failures. This function
-- atomically verifies the user is within their daily limit AND decrements
-- their usage counter in a single database transaction. The AI call is only
-- made if this function returns allowed=true.
--
-- If this function fails (DB down, deadlock, etc.), the caller MUST reject
-- the request (fail-closed). The previous pattern of ignoring deduction
-- failures is explicitly not acceptable for cost-protection purposes.
--
-- Security design:
--   - Called exclusively by Edge Functions using the SERVICE ROLE key.
--   - GRANT is restricted to service_role only — browser/anon clients cannot
--     invoke this function directly even if they know the UUID of another user.
--   - NOT SECURITY DEFINER: runs under the caller's role (service_role), which
--     already has unrestricted table access. SECURITY DEFINER is unnecessary and
--     would widen the trust boundary.
--
-- Concurrency correctness:
--   - We must guarantee that SELECT FOR UPDATE always finds a lockable row so
--     that parallel first-use requests cannot all pass the limit check before
--     any of them commits an update.
--   - Solution: INSERT ... ON CONFLICT DO NOTHING before SELECT FOR UPDATE.
--     The INSERT either creates the row (first request wins) or is a no-op
--     (subsequent concurrent requests). Either way, the row exists before we
--     try to lock it, so SELECT FOR UPDATE serialises all callers correctly.
--
-- Arguments:
--   p_user_id    — the user performing the action (set server-side, not by client)
--   p_plan_limit — the authoritative daily limit for this user's plan (-1 = unlimited)
--   p_amount     — number of credits to deduct (default 1; some endpoints cost 2)
--
-- Returns JSONB:
--   { "allowed": true,  "remaining": 42 }    -- deducted successfully
--   { "allowed": false, "remaining": N  }    -- daily limit already reached (N = credits left)
--   { "allowed": true,  "remaining": 999999 } -- unlimited plan (p_plan_limit = -1)

CREATE OR REPLACE FUNCTION public.atomic_attempt_and_deduct_credit(
  p_user_id    UUID,
  p_plan_limit INTEGER,
  p_amount     INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
-- NOT SECURITY DEFINER: runs under the calling role (service_role).
-- Browser clients are blocked by the GRANT below, not by SECURITY DEFINER.
AS $$
DECLARE
  v_today         DATE    := CURRENT_DATE;
  v_daily_usage   INTEGER;
  v_usage_date    DATE;
  v_total_usage   BIGINT;
  v_effective_use INTEGER;
  v_new_remaining INTEGER;
BEGIN
  -- Sanity-check the amount (must be positive)
  IF p_amount < 1 THEN
    RAISE EXCEPTION 'p_amount must be >= 1, got %', p_amount;
  END IF;

  -- Unlimited plan: skip all accounting
  IF p_plan_limit < 0 THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 999999);
  END IF;

  -- ── Concurrency-safe row initialization ──────────────────────────────────
  -- Ensure a lockable row always exists BEFORE we SELECT FOR UPDATE.
  -- Without this, two parallel "first use" requests both find NOT FOUND,
  -- both read v_daily_usage=0 (under the limit), and both INSERT/UPDATE
  -- independently — allowing limit bypass.
  --
  -- With this INSERT first:
  --   - Request A: INSERT creates the row (0 usage). SELECT FOR UPDATE: LOCKED.
  --   - Request B: INSERT is ON CONFLICT DO NOTHING (row already exists).
  --                SELECT FOR UPDATE: WAITS for A.
  --   After A commits: B re-reads the actual usage (≥1) and enforces limit.
  INSERT INTO public.ai_credits (
    user_id, daily_usage, total_usage, usage_date, daily_limit, updated_at
  )
  VALUES (p_user_id, 0, 0, v_today, p_plan_limit, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  -- Now lock the guaranteed-to-exist row for the duration of this transaction
  SELECT daily_usage, total_usage, usage_date
    INTO v_daily_usage, v_total_usage, v_usage_date
    FROM public.ai_credits
   WHERE user_id = p_user_id
     FOR UPDATE;

  -- Compute effective usage (reset to 0 if the calendar date rolled over)
  IF v_usage_date != v_today THEN
    v_effective_use := 0;
  ELSE
    v_effective_use := v_daily_usage;
  END IF;

  -- Enforce the daily limit.
  -- Require that the FULL p_amount fits within the remaining budget.
  -- Partial deductions are not allowed (e.g., user has 1 credit left but the
  -- endpoint costs 2 — the request is denied in full).
  IF v_effective_use + p_amount > p_plan_limit THEN
    RETURN jsonb_build_object(
      'allowed',   false,
      'remaining', GREATEST(p_plan_limit - v_effective_use, 0)
    );
  END IF;

  -- Atomically update the credit row
  UPDATE public.ai_credits
     SET daily_usage  = CASE
                          WHEN usage_date = v_today THEN daily_usage + p_amount
                          ELSE p_amount              -- date rolled over: reset
                        END,
         total_usage  = total_usage + p_amount,
         usage_date   = v_today,
         daily_limit  = p_plan_limit,
         updated_at   = NOW()
   WHERE user_id = p_user_id;

  v_new_remaining := p_plan_limit - v_effective_use - p_amount;

  RETURN jsonb_build_object(
    'allowed',    true,
    'remaining',  GREATEST(v_new_remaining, 0)
  );
END;
$$;

-- Restrict execution to service_role ONLY.
-- Edge Functions call this via the service role key (server-side).
-- Browser/anon clients cannot call this even with a valid session JWT,
-- preventing any cross-user credit manipulation via direct RPC calls.
REVOKE EXECUTE ON FUNCTION public.atomic_attempt_and_deduct_credit(UUID, INTEGER, INTEGER)
  FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.atomic_attempt_and_deduct_credit(UUID, INTEGER, INTEGER)
  TO service_role;
