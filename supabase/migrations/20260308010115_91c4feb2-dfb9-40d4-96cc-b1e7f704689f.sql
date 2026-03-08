
-- Add deleted_at column to resumes table.
-- The app uses soft-deletes (.is('deleted_at', null)) but the column was missing, causing 42703 errors.
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at
  ON public.resumes (deleted_at)
  WHERE deleted_at IS NULL;
