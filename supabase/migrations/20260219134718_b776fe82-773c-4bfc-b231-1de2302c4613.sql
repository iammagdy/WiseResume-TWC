
-- Enable pgcrypto in extensions schema (not public)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Create a helper function to hash share passwords
CREATE OR REPLACE FUNCTION public.hash_share_password(raw_password text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT extensions.crypt(raw_password, extensions.gen_salt('bf'));
$$;

-- Create a helper to verify share passwords
CREATE OR REPLACE FUNCTION public.verify_share_password(raw_password text, hashed_password text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT extensions.crypt(raw_password, hashed_password) = hashed_password;
$$;

-- Migrate existing plain text passwords to bcrypt hashes
UPDATE public.resume_shares
SET password = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password IS NOT NULL;

-- Update get_shared_resume to use hashed comparison
CREATE OR REPLACE FUNCTION public.get_shared_resume(share_token text, password_attempt text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share record;
  v_resume record;
BEGIN
  SELECT * INTO v_share
  FROM public.resume_shares
  WHERE token = share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- If share is password-protected, validate using bcrypt comparison
  IF v_share.password IS NOT NULL THEN
    IF password_attempt IS NULL OR NOT public.verify_share_password(password_attempt, v_share.password) THEN
      RETURN jsonb_build_object(
        'requires_password', true,
        'authenticated', false
      );
    END IF;
  END IF;

  SELECT * INTO v_resume
  FROM public.resumes
  WHERE id = v_share.resume_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'share', jsonb_build_object(
      'resume_id', v_share.resume_id,
      'is_active', v_share.is_active,
      'expires_at', v_share.expires_at,
      'view_count', v_share.view_count
    ),
    'resume', row_to_json(v_resume)::jsonb
  );
END;
$$;
