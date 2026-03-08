
-- Add safe_uid() fallback to ALL tables that currently only use get_clerk_user_id()
-- This prevents 22P02 errors when the JWT sub is a raw Clerk ID (non-UUID)

-- career_assessments
DROP POLICY IF EXISTS "Users can view own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON public.career_assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON public.career_assessments;
CREATE POLICY "Users can view own assessments" ON public.career_assessments FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own assessments" ON public.career_assessments FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own assessments" ON public.career_assessments FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own assessments" ON public.career_assessments FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- interview_sessions
DROP POLICY IF EXISTS "Users can view own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can insert own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can update own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can delete own interview sessions" ON public.interview_sessions;
CREATE POLICY "Users can view own interview sessions" ON public.interview_sessions FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own interview sessions" ON public.interview_sessions FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own interview sessions" ON public.interview_sessions FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own interview sessions" ON public.interview_sessions FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- resume_versions
DROP POLICY IF EXISTS "Users can view own versions" ON public.resume_versions;
DROP POLICY IF EXISTS "Users can insert own versions" ON public.resume_versions;
DROP POLICY IF EXISTS "Users can delete own versions" ON public.resume_versions;
CREATE POLICY "Users can view own versions" ON public.resume_versions FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own versions" ON public.resume_versions FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own versions" ON public.resume_versions FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- tailor_history
DROP POLICY IF EXISTS "Users can view own tailor history" ON public.tailor_history;
DROP POLICY IF EXISTS "Users can insert own tailor history" ON public.tailor_history;
DROP POLICY IF EXISTS "Users can delete own tailor history" ON public.tailor_history;
CREATE POLICY "Users can view own tailor history" ON public.tailor_history FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own tailor history" ON public.tailor_history FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own tailor history" ON public.tailor_history FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- ai_usage_logs
DROP POLICY IF EXISTS "Users can view own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can insert own AI usage logs" ON public.ai_usage_logs;
DROP POLICY IF EXISTS "Users can delete own AI usage logs" ON public.ai_usage_logs;
CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own AI usage logs" ON public.ai_usage_logs FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own AI usage logs" ON public.ai_usage_logs FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- ai_credits
DROP POLICY IF EXISTS "Users can view own credits" ON public.ai_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON public.ai_credits;
CREATE POLICY "Users can view own credits" ON public.ai_credits FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own credits" ON public.ai_credits FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- cover_letters
DROP POLICY IF EXISTS "Users can view own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can insert own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can update own cover letters" ON public.cover_letters;
DROP POLICY IF EXISTS "Users can delete own cover letters" ON public.cover_letters;
CREATE POLICY "Users can view own cover letters" ON public.cover_letters FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own cover letters" ON public.cover_letters FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own cover letters" ON public.cover_letters FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own cover letters" ON public.cover_letters FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- job_applications
DROP POLICY IF EXISTS "Users can view own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can insert own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.job_applications;
DROP POLICY IF EXISTS "Users can delete own applications" ON public.job_applications;
CREATE POLICY "Users can view own applications" ON public.job_applications FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own applications" ON public.job_applications FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.job_applications FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own applications" ON public.job_applications FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- resume_shares
DROP POLICY IF EXISTS "Owners can manage own shares" ON public.resume_shares;
CREATE POLICY "Owners can manage own shares" ON public.resume_shares FOR ALL USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own jobs" ON public.jobs FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- user_api_keys
DROP POLICY IF EXISTS "Users can view own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can insert own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can update own API keys" ON public.user_api_keys;
DROP POLICY IF EXISTS "Users can delete own API keys" ON public.user_api_keys;
CREATE POLICY "Users can view own API keys" ON public.user_api_keys FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own API keys" ON public.user_api_keys FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own API keys" ON public.user_api_keys FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own API keys" ON public.user_api_keys FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- audit_logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can insert own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can delete own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own audit logs" ON public.audit_logs FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own audit logs" ON public.audit_logs FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- resignation_letters
DROP POLICY IF EXISTS "Users can view own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can insert own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can update own resignation letters" ON public.resignation_letters;
DROP POLICY IF EXISTS "Users can delete own resignation letters" ON public.resignation_letters;
CREATE POLICY "Users can view own resignation letters" ON public.resignation_letters FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own resignation letters" ON public.resignation_letters FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can update own resignation letters" ON public.resignation_letters FOR UPDATE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id) WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own resignation letters" ON public.resignation_letters FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- push_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.push_subscriptions FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON public.push_subscriptions FOR DELETE USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- short_links
DROP POLICY IF EXISTS "Owners can manage own short links" ON public.short_links;
CREATE POLICY "Owners can manage own short links" ON public.short_links FOR ALL USING (get_clerk_user_id() = owner_user_id OR safe_uid() = owner_user_id) WITH CHECK (get_clerk_user_id() = owner_user_id OR safe_uid() = owner_user_id);

-- bug_reports
DROP POLICY IF EXISTS "Users can view own bug reports" ON public.bug_reports;
DROP POLICY IF EXISTS "Users can insert own bug reports" ON public.bug_reports;
CREATE POLICY "Users can view own bug reports" ON public.bug_reports FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert own bug reports" ON public.bug_reports FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);

-- feature_requests
DROP POLICY IF EXISTS "Users can view own feature requests" ON public.feature_requests;
DROP POLICY IF EXISTS "Users can insert their own feature requests" ON public.feature_requests;
CREATE POLICY "Users can view own feature requests" ON public.feature_requests FOR SELECT USING (get_clerk_user_id() = user_id OR safe_uid() = user_id);
CREATE POLICY "Users can insert their own feature requests" ON public.feature_requests FOR INSERT WITH CHECK (get_clerk_user_id() = user_id OR safe_uid() = user_id);
