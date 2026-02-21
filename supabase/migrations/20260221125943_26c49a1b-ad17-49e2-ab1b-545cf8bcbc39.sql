
-- 1. Foreign keys to auth.users with ON DELETE CASCADE
ALTER TABLE public.ai_credits ADD CONSTRAINT ai_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bug_reports ADD CONSTRAINT bug_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.career_assessments ADD CONSTRAINT career_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.feature_requests ADD CONSTRAINT feature_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.resignation_letters ADD CONSTRAINT resignation_letters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.resume_shares ADD CONSTRAINT resume_shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.resume_versions ADD CONSTRAINT resume_versions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_api_keys ADD CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop overly permissive resume_shares SELECT policy
DROP POLICY IF EXISTS "Public can view active shares" ON public.resume_shares;

-- 3. portfolio_visits: RPC + block direct inserts
CREATE OR REPLACE FUNCTION public.record_portfolio_visit(
  p_username text,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_referrer text DEFAULT NULL,
  p_short_link_id text DEFAULT NULL,
  p_sections_viewed jsonb DEFAULT '[]'::jsonb,
  p_time_spent_seconds integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username) AND portfolio_enabled = true
  ) THEN
    RETURN;
  END IF;
  INSERT INTO public.portfolio_visits (username, country, city, referrer, short_link_id, sections_viewed, time_spent_seconds)
  VALUES (lower(p_username), p_country, p_city, p_referrer, p_short_link_id, p_sections_viewed, p_time_spent_seconds);
END;
$$;

DROP POLICY IF EXISTS "Anyone can record portfolio visit" ON public.portfolio_visits;
CREATE POLICY "No direct inserts" ON public.portfolio_visits FOR INSERT WITH CHECK (false);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_visits_username ON public.portfolio_visits (username);
CREATE INDEX IF NOT EXISTS idx_portfolio_visits_visited_at ON public.portfolio_visits (visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_resume_shares_token ON public.resume_shares (token);
CREATE INDEX IF NOT EXISTS idx_resignation_letters_user_id ON public.resignation_letters (user_id);

-- 8. API keys info RPC
CREATE OR REPLACE FUNCTION public.get_user_api_key_info(p_user_id uuid)
RETURNS TABLE(provider text, key_tier text, created_at timestamptz, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT uk.provider, uk.key_tier, uk.created_at, uk.updated_at
  FROM public.user_api_keys uk
  WHERE uk.user_id = p_user_id AND p_user_id = auth.uid();
$$;

-- 4. Data cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.ai_usage_logs WHERE created_at < now() - interval '90 days';
  DELETE FROM public.notifications WHERE is_read = true AND created_at < now() - interval '30 days';
  DELETE FROM public.resume_versions
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY resume_id ORDER BY version_number DESC) as rn
      FROM public.resume_versions
    ) ranked WHERE rn > 50
  );
END;
$$;
