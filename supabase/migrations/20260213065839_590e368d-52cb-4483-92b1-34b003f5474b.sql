
-- Drop the overly permissive UPDATE policy on ai_credits
DROP POLICY IF EXISTS "Users can update own credits" ON public.ai_credits;

-- Create a security definer function to safely increment AI usage
-- Only this function can modify credit rows, preventing client-side manipulation
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_credits (user_id, daily_usage, total_usage, usage_date)
  VALUES (p_user_id, 1, 1, CURRENT_DATE)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    daily_usage = ai_credits.daily_usage + 1,
    total_usage = ai_credits.total_usage + 1,
    updated_at = now();
END;
$$;

-- Add unique constraint needed for the upsert (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_credits_user_id_usage_date_key'
  ) THEN
    ALTER TABLE public.ai_credits ADD CONSTRAINT ai_credits_user_id_usage_date_key UNIQUE (user_id, usage_date);
  END IF;
END $$;
