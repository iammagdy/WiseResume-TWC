-- Force PostgREST to reload its schema cache by touching the deleted_at column
-- This resolves the 42703 "column resumes.deleted_at does not exist" error
ALTER TABLE public.resumes ALTER COLUMN deleted_at TYPE timestamptz USING deleted_at::timestamptz;

-- Force a full schema notification
NOTIFY pgrst, 'reload schema';