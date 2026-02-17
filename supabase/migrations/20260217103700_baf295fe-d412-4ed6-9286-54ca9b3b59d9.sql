
-- Drop the conflicting (user_id, usage_date) constraint, keep (user_id) for one-row-per-user model
ALTER TABLE public.ai_credits DROP CONSTRAINT IF EXISTS ai_credits_user_id_usage_date_key;

-- Rewrite the RPC to use ON CONFLICT (user_id) with date-aware reset logic
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
END;
$$;
