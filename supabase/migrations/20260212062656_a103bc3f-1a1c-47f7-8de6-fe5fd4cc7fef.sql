ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS remind_at timestamptz;