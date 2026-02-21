
-- 1A: Move pgcrypto extension out of public schema
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- 2A: Composite index on audit_logs for category queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_category_created 
ON public.audit_logs (user_id, category, created_at DESC);

-- 2B: Composite index on portfolio_visits for analytics RPC
CREATE INDEX IF NOT EXISTS idx_portfolio_visits_username_visited 
ON public.portfolio_visits (username, visited_at DESC);

-- 4B: Auto-create user_preferences on profile insert
CREATE OR REPLACE FUNCTION public.handle_new_profile_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_preferences
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_profile_preferences();

-- 4C: Remove dormant columns (not used in any frontend code)
ALTER TABLE public.resumes DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.resumes DROP COLUMN IF EXISTS last_reminder_sent_at;
