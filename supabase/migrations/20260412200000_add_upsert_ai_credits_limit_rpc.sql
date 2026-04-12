-- Atomically insert or update an ai_credits row when a user upgrades their plan.
-- On conflict (existing row for user), only daily_limit is updated so that any
-- usage already recorded today (daily_usage) is preserved.
CREATE OR REPLACE FUNCTION public.upsert_ai_credits_limit(
  p_user_id   UUID,
  p_daily_limit INTEGER,
  p_usage_date  DATE
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.ai_credits (user_id, daily_limit, daily_usage, usage_date)
  VALUES (p_user_id, p_daily_limit, 0, p_usage_date)
  ON CONFLICT (user_id)
  DO UPDATE SET daily_limit = EXCLUDED.daily_limit;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_ai_credits_limit(UUID, INTEGER, DATE) TO service_role;
