
-- Performance indexes for high-query tables
CREATE INDEX IF NOT EXISTS idx_job_applications_user_applied ON public.job_applications (user_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_status ON public.job_applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_created ON public.cover_letters (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tailor_history_user_created ON public.tailor_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
