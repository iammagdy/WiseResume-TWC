
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS awards jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS publications jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS volunteering jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS hobbies jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "references" jsonb DEFAULT '[]';
