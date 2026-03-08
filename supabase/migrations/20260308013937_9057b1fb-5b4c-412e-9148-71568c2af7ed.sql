-- Force PostgREST schema cache reload by re-applying the column
-- The column exists but PostgREST cache is stale
ALTER TABLE public.resumes DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.resumes ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;
