-- Restrict p_skip_limit_check to service_role only.
--
-- Previously any authenticated user with a valid JWT could call:
--   supabase.rpc('increment_ai_usage', { p_user_id: ..., p_skip_limit_check: true })
-- and bypass the daily limit entirely.
--
-- This migration replaces the function with one that raises a permission error
-- when p_skip_limit_check=TRUE is passed by any caller that is not the service_role.
--
-- HOW THE ROLE CHECK WORKS:
-- PostgREST issues "SET LOCAL ROLE <role>" before executing the function, which sets
-- the GUC "role" (accessible via current_setting). Inside a SECURITY DEFINER function,
-- current_user/current_role resolve to the function OWNER, not the PostgREST-set role.
-- Therefore we read current_setting('role', true) which correctly reflects whether the
-- caller used the anon/authenticated JWT or the service_role key.
-- When called via the Supabase service client (service key), PostgREST sets role=service_role.
-- When called via a user JWT, PostgREST sets role=authenticated.
-- This check is reliable in the Supabase/PostgREST environment.

DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_skip_limit_check BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoker_role TEXT;
BEGIN
  -- Read the PostgREST-set role from the GUC. current_setting('role', true) returns the
  -- role PostgREST placed via SET LOCAL ROLE before entering this SECURITY DEFINER function.
  -- Falls back to empty string if the GUC is not set (e.g. direct psql connections in tests).
  v_invoker_role := COALESCE(current_setting('role', true), '');

  -- Guard: only service_role may pass p_skip_limit_check=TRUE.
  -- User JWTs run as 'authenticated'; service key runs as 'service_role'.
  IF p_skip_limit_check AND v_invoker_role <> 'service_role' THEN
    RAISE EXCEPTION 'permission denied: p_skip_limit_check requires service_role (invoker role: %)', v_invoker_role
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_skip_limit_check THEN
    -- BYOK path: only increment total_usage; do not touch daily_usage so that
    -- BYOK users accumulate lifetime credit history without distorting daily limits.
    INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
    VALUES (p_user_id, 0, 1, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_usage = ai_credits.total_usage + 1,
      updated_at = now();
  ELSE
    -- Standard path: increment both daily_usage and total_usage with date-aware reset.
    INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE)
    ON CONFLICT (user_id)
    DO UPDATE SET
      daily_usage = CASE
        WHEN ai_credits.usage_date = CURRENT_DATE THEN ai_credits.daily_usage + 1
        ELSE 1
      END,
      total_usage = ai_credits.total_usage + 1,
      usage_date = CURRENT_DATE,
      updated_at = now();
  END IF;
END;
$$;
