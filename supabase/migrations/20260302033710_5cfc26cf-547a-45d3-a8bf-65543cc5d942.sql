
-- Add GitHub projects cache columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS github_projects_cache jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS github_last_synced timestamp with time zone DEFAULT NULL;
