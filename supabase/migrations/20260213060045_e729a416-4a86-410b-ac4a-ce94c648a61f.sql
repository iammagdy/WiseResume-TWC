
-- Replace get_shared_resume to validate password server-side and never expose it to the client
CREATE OR REPLACE FUNCTION public.get_shared_resume(share_token text, password_attempt text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_share record;
  v_resume record;
BEGIN
  -- Find the share
  SELECT * INTO v_share
  FROM public.resume_shares
  WHERE token = share_token
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- If share is password-protected, validate the attempt
  IF v_share.password IS NOT NULL THEN
    IF password_attempt IS NULL OR password_attempt <> v_share.password THEN
      -- Return only that it requires a password (or wrong password), never expose actual password
      RETURN jsonb_build_object(
        'requires_password', true,
        'authenticated', false
      );
    END IF;
  END IF;

  -- Fetch the resume (bypasses RLS via security definer)
  SELECT * INTO v_resume
  FROM public.resumes
  WHERE id = v_share.resume_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Return combined result WITHOUT the password field
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
$function$;
