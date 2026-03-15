-- US3: Implement Soft Deletes
-- Created: 2026-03-14

-- 1. Ensure columns exist on primary entities
-- Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Resumes
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Portfolios table is not present in the current schema. skipped.

-- Messages
-- Note: Messages table will be created in US6, but we'll add it there.

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (is_deleted = false AND (auth.uid() = user_id OR get_clerk_user_id() = user_id));

-- Resumes
DROP POLICY IF EXISTS "Users can view own resumes" ON public.resumes;
CREATE POLICY "Users can view own resumes" ON public.resumes
    FOR SELECT USING (is_deleted = false AND (auth.uid() = user_id OR get_clerk_user_id() = user_id));

DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
CREATE POLICY "Users can update own resumes" ON public.resumes
    FOR UPDATE USING (is_deleted = false AND (auth.uid() = user_id OR get_clerk_user_id() = user_id));

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
