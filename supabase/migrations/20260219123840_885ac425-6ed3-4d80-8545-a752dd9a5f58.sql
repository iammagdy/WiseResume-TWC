
-- Add hired_at to profiles for post-hire re-engagement
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hired_at timestamp with time zone DEFAULT NULL;

-- Add login_streak and last_login_date for persistent streak tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_streak integer DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_date date DEFAULT NULL;

-- Add digest_enabled for weekly digest opt-out
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT true;

-- Add last_reminder_sent_at to resumes to prevent spam reminders
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp with time zone DEFAULT NULL;
