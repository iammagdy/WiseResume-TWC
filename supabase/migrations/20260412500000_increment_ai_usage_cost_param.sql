-- Add p_cost parameter to increment_ai_usage so a single RPC call can atomically
-- deduct any number of credits, eliminating the partial-charge risk that existed
-- when the caller looped N times for a cost-N action.
--
-- The old signature had (p_user_id UUID, p_skip_limit_check BOOLEAN DEFAULT FALSE).
-- We must drop it before recreating with the new signature to avoid PostgREST
-- overload-ambiguity errors.

DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id          UUID,
  p_skip_limit_check BOOLEAN DEFAULT FALSE,
  p_cost             INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoker_role TEXT;
BEGIN
  -- Validate cost is positive.
  IF p_cost < 1 THEN
    RAISE EXCEPTION 'p_cost must be >= 1, got %', p_cost
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Read the PostgREST-set role from the GUC. current_setting('role', true) returns the
  -- role PostgREST placed via SET LOCAL ROLE before entering this SECURITY DEFINER function.
  -- Falls back to empty string if the GUC is not set (e.g. direct psql connections in tests).
  v_invoker_role := COALESCE(current_setting('role', true), '');

  -- Guard: only service_role may pass p_skip_limit_check=TRUE.
  IF p_skip_limit_check AND v_invoker_role <> 'service_role' THEN
    RAISE EXCEPTION 'permission denied: p_skip_limit_check requires service_role (invoker role: %)', v_invoker_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_skip_limit_check THEN
    -- BYOK path: only increment total_usage by p_cost; do not touch daily_usage so that
    -- BYOK users accumulate lifetime credit history without distorting daily limits.
    INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
    VALUES (p_user_id, 0, p_cost, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_usage = ai_credits.total_usage + p_cost,
      updated_at  = now();
  ELSE
    -- Standard path: atomically increment both daily_usage and total_usage by p_cost
    -- with date-aware reset of daily_usage.
    INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
    VALUES (p_user_id, p_cost, p_cost, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
      daily_usage = CASE
        WHEN ai_credits.usage_date = CURRENT_DATE THEN ai_credits.daily_usage + p_cost
        ELSE p_cost
      END,
      total_usage = ai_credits.total_usage + p_cost,
      usage_date  = CURRENT_DATE,
      updated_at  = now();
  END IF;
END;
$$;
