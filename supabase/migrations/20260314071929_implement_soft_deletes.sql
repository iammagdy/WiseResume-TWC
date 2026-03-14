-- US3: Implement Soft Deletes
-- Created: 2026-03-14

-- 1. Ensure columns exist on primary entities
-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Resumes
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Portfolios (Assuming it exists based on spec)
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Messages
-- Note: Messages table will be created in US6, but we'll add it there.

-- 2. Update RLS Policies to filter out deleted records
-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (is_deleted = false);

-- Resumes
DROP POLICY IF EXISTS "Users can manage own resumes" ON public.resumes;
CREATE POLICY "Users can manage own resumes" ON public.resumes
    FOR ALL USING (auth.uid() = user_id AND is_deleted = false);

-- 3. Automatic Soft Delete Trigger (Alternative to hard delete)
-- This trigger intercepts DELETE and performs UPDATE instead
CREATE TRIGGER trigger_soft_delete_resumes
    BEFORE DELETE ON public.resumes
    FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

CREATE TRIGGER trigger_soft_delete_profiles
    BEFORE DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.soft_delete_record();

COMMENT ON COLUMN public.profiles.is_deleted IS 'Flag for soft deletion.';
COMMENT ON COLUMN public.resumes.is_deleted IS 'Flag for soft deletion.';
