-- Restore last_reminder_sent_at on public.resumes.
--
-- The column was added in 20260219123840 then dropped in 20260221134715.
-- The transactional-email edge function (resume-reminder action) still
-- selects and updates this column to prevent sending more than one
-- reminder per resume within a 30-day window. Without the column the
-- handler throws a 500 on every cron invocation.

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp with time zone DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resumes_last_reminder_sent_at
  ON public.resumes (last_reminder_sent_at)
  WHERE last_reminder_sent_at IS NOT NULL;
