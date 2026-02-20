
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS active_feature TEXT;
ALTER TABLE public.bug_reports ADD COLUMN IF NOT EXISTS recent_errors JSONB DEFAULT NULL;
