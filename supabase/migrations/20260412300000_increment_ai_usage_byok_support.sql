-- Replace increment_ai_usage with a new signature that adds an optional
-- p_skip_limit_check parameter for BYOK usage logging.
--
-- We must explicitly drop the old single-argument overload first to avoid
-- PostgREST RPC overload ambiguity. CREATE OR REPLACE only replaces functions
-- with the exact same signature, so dropping is required.
DROP FUNCTION IF EXISTS public.increment_ai_usage(UUID);

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_skip_limit_check BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_skip_limit_check THEN
    -- BYOK path: only increment total_usage, do not touch daily_usage so that
    -- BYOK users accumulate lifetime credit history without distorting daily limit.
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
