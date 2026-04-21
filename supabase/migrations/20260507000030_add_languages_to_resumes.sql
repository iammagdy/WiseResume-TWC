-- Add missing languages column to resumes table
ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb;
