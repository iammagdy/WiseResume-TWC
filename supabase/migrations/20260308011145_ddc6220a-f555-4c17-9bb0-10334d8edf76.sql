
-- ================================================================
-- Add deleted_at (idempotent — already exists but safe to re-run)
-- ================================================================
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at
  ON public.resumes (deleted_at)
  WHERE deleted_at IS NULL;

-- ================================================================
-- safe_uid(): reads JWT claims via current_setting, never throws
-- Uses supabaseUuid first, falls back to sub only if valid UUID
-- ================================================================
CREATE OR REPLACE FUNCTION public.safe_uid()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_val    text;
BEGIN
  v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF v_claims IS NULL THEN RETURN NULL; END IF;

  v_val := v_claims ->> 'supabaseUuid';
  IF v_val IS NOT NULL
     AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN v_val::uuid;
  END IF;

  v_val := v_claims ->> 'sub';
  IF v_val IS NOT NULL
     AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN v_val::uuid;
  END IF;

  RETURN NULL;
END;
$$;

-- ================================================================
-- Drop unused custom_access_token_hook
-- ================================================================
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- ================================================================
-- Rebuild profiles RLS with dual check
-- ================================================================
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
  WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);

-- ================================================================
-- Rebuild resumes RLS with dual check
-- ================================================================
DROP POLICY IF EXISTS "Users can view own resumes"   ON public.resumes;
DROP POLICY IF EXISTS "Users can insert own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can update own resumes" ON public.resumes;
DROP POLICY IF EXISTS "Users can delete own resumes" ON public.resumes;

CREATE POLICY "Users can view own resumes"   ON public.resumes FOR SELECT
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON public.resumes FOR INSERT
  WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can update own resumes" ON public.resumes FOR UPDATE
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
CREATE POLICY "Users can delete own resumes" ON public.resumes FOR DELETE
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);
