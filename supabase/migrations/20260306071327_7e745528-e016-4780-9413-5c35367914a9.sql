
-- Helper function: extracts supabaseUuid from Clerk JWT custom claim
-- Falls back to auth.uid() if the claim is missing (backward compat)
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (auth.jwt()->>'supabaseUuid')::uuid,
    auth.uid()
  );
$$;

-- ========== RESUMES ==========
DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can view own resumes" ON public.resumes;

CREATE POLICY "Users can delete own resumes" ON public.resumes FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own resumes" ON public.resumes FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own resumes" ON public.resumes FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own resumes" ON public.resumes FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== PROFILES ==========
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== COVER_LETTERS ==========
DROP POLICY IF EXISTS "Users can delete own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can insert own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can update own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can view own cover letters" ON public.cover_letters;

CREATE POLICY "Users can delete own cover letters" ON public.cover_letters FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own cover letters" ON public.cover_letters FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own cover letters" ON public.cover_letters FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own cover letters" ON public.cover_letters FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== JOB_APPLICATIONS ==========
DROP POLICY IF EXISTS "Users can delete own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.job_applications;

CREATE POLICY "Users can delete own applications" ON public.job_applications FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own applications" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own applications" ON public.job_applications FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own applications" ON public.job_applications FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== JOBS ==========
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;

CREATE POLICY "Users can delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== INTERVIEW_SESSIONS ==========
DROP POLICY IF EXISTS "Users can delete own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can insert own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can update own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can view own interview sessions" ON public.interview_sessions;

CREATE POLICY "Users can delete own interview sessions" ON public.interview_sessions FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own interview sessions" ON public.interview_sessions FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own interview sessions" ON public.interview_sessions FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own interview sessions" ON public.interview_sessions FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== CAREER_ASSESSMENTS ==========
DROP POLICY IF EXISTS "Users can delete own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can view own assessments" ON public.career_assessments;

CREATE POLICY "Users can delete own assessments" ON public.career_assessments FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.career_assessments FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own assessments" ON public.career_assessments FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own assessments" ON public.career_assessments FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== RESUME_SHARES ==========
DROP POLICY IF EXISTS "Owners can manage own shares" ON public.resume_shares;

CREATE POLICY "Owners can manage own shares" ON public.resume_shares FOR ALL TO authenticated USING (public.get_clerk_user_id() = user_id) WITH CHECK (public.get_clerk_user_id() = user_id);

-- ========== RESUME_VERSIONS ==========
DROP POLICY IF EXISTS "Users can delete own versions" ON public.resume_versions;
DROP POLICY IF EXISTS "Users can insert own versions" ON public.resume_versions;
DROP POLICY IF EXISTS "Users can view own versions" ON public.resume_versions;

CREATE POLICY "Users can delete own versions" ON public.resume_versions FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own versions" ON public.resume_versions FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own versions" ON public.resume_versions FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== NOTIFICATIONS ==========
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== AI_CREDITS ==========
DROP POLICY IF EXISTS "Users can insert own credits" ON public.ai_credits;
DROP POLICY IF EXISTS "Users can view own credits" ON public.ai_credits;

CREATE POLICY "Users can insert own credits" ON public.ai_credits FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own credits" ON public.ai_credits FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== AI_USAGE_LOGS ==========
DROP POLICY IF EXISTS "Users can delete own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can view own AI usage logs" ON public.ai_usage_logs;

CREATE POLICY "Users can delete own AI usage logs" ON public.ai_usage_logs FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own AI usage logs" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== AUDIT_LOGS ==========
DROP POLICY IF EXISTS "Users can delete own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;

CREATE POLICY "Users can delete own audit logs" ON public.audit_logs FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== TAILOR_HISTORY ==========
DROP POLICY IF EXISTS "Users can delete own tailor history" ON public.tailor_history;
DROP POLICY IF EXISTS "Users can insert own tailor history" ON public.tailor_history;
DROP POLICY IF EXISTS "Users can view own tailor history" ON public.tailor_history;

CREATE POLICY "Users can delete own tailor history" ON public.tailor_history FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own tailor history" ON public.tailor_history FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own tailor history" ON public.tailor_history FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== USER_API_KEYS ==========
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON public.user_api_keys;

CREATE POLICY "Users can delete own API keys" ON public.user_api_keys FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own API keys" ON public.user_api_keys FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own API keys" ON public.user_api_keys FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own API keys" ON public.user_api_keys FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== USER_PREFERENCES ==========
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;

CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== BUG_REPORTS ==========
DROP POLICY IF EXISTS "Users can insert own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;

CREATE POLICY "Users can insert own bug reports" ON public.bug_reports FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own bug reports" ON public.bug_reports FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== FEATURE_REQUESTS ==========
DROP POLICY IF EXISTS "Users can insert their own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can view own feature requests" ON public.feature_requests;

CREATE POLICY "Users can insert their own feature requests" ON public.feature_requests FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own feature requests" ON public.feature_requests FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== PUSH_SUBSCRIPTIONS ==========
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== SHORT_LINKS ==========
DROP POLICY IF EXISTS "Owners can manage own short links" ON public.short_links;

CREATE POLICY "Owners can manage own short links" ON public.short_links FOR ALL TO authenticated USING (public.get_clerk_user_id() = owner_user_id) WITH CHECK (public.get_clerk_user_id() = owner_user_id);

-- ========== RESIGNATION_LETTERS ==========
DROP POLICY IF EXISTS "Users can delete own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can insert own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can update own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can view own resignation letters" ON public.resignation_letters;

CREATE POLICY "Users can delete own resignation letters" ON public.resignation_letters FOR DELETE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can insert own resignation letters" ON public.resignation_letters FOR INSERT TO authenticated WITH CHECK (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can update own resignation letters" ON public.resignation_letters FOR UPDATE TO authenticated USING (public.get_clerk_user_id() = user_id);
CREATE POLICY "Users can view own resignation letters" ON public.resignation_letters FOR SELECT TO authenticated USING (public.get_clerk_user_id() = user_id);

-- ========== Update functions that use auth.uid() ==========
CREATE OR REPLACE FUNCTION public.get_user_api_key_info(p_user_id uuid)
 RETURNS TABLE(provider text, key_tier text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT uk.provider, uk.key_tier, uk.created_at, uk.updated_at
  FROM public.user_api_keys uk
  WHERE uk.user_id = p_user_id AND p_user_id = public.get_clerk_user_id();
$$;

-- Update get_portfolio_analytics to use get_clerk_user_id()
CREATE OR REPLACE FUNCTION public.get_portfolio_analytics(p_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_visits  jsonb;
  v_summary jsonb;
BEGIN
  SELECT user_id INTO v_profile
  FROM public.profiles
  WHERE username = lower(p_username) AND user_id = public.get_clerk_user_id();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id',                 pv.id,
      'country',            pv.country,
      'city',               pv.city,
      'time_spent_seconds', pv.time_spent_seconds,
      'sections_viewed',    pv.sections_viewed,
      'referrer',           pv.referrer,
      'short_link_id',      pv.short_link_id,
      'visited_at',         pv.visited_at
    ) ORDER BY pv.visited_at DESC
  ), '[]'::jsonb)
  INTO v_visits
  FROM public.portfolio_visits pv
  WHERE pv.username = lower(p_username)
  LIMIT 50;

  SELECT jsonb_build_object(
    'total_visits',      count(*),
    'unique_countries',  count(DISTINCT country) FILTER (WHERE country IS NOT NULL),
    'avg_time_seconds',  round(avg(time_spent_seconds) FILTER (WHERE time_spent_seconds IS NOT NULL))::int
  )
  INTO v_summary
  FROM public.portfolio_visits
  WHERE username = lower(p_username);

  RETURN jsonb_build_object(
    'visits',  v_visits,
    'summary', v_summary
  );
END;
$function$;

-- Update portfolio_visits RLS to use get_clerk_user_id()
DROP POLICY IF EXISTS "Portfolio owner can view own visits" ON public.portfolio_visits;
CREATE POLICY "Portfolio owner can view own visits" ON public.portfolio_visits FOR SELECT TO authenticated
  USING (username IN (SELECT p.username FROM profiles p WHERE p.user_id = public.get_clerk_user_id() AND p.username IS NOT NULL));

-- Update share_comments policies that reference auth.uid()
DROP POLICY IF EXISTS "Share owners can delete comments" ON public.share_comments;
DROP POLICY IF EXISTS "Share owners can update comments" ON public.share_comments;
DROP POLICY IF EXISTS "Share owners can view comments" ON public.share_comments;

CREATE POLICY "Share owners can delete comments" ON public.share_comments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM resume_shares rs WHERE rs.id = share_comments.share_id AND rs.user_id = public.get_clerk_user_id()));
CREATE POLICY "Share owners can update comments" ON public.share_comments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM resume_shares rs WHERE rs.id = share_comments.share_id AND rs.user_id = public.get_clerk_user_id()));
CREATE POLICY "Share owners can view comments" ON public.share_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM resume_shares rs WHERE rs.id = share_comments.share_id AND rs.user_id = public.get_clerk_user_id()));
