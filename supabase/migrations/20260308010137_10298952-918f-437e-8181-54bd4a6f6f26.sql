
-- ============================================================
-- Custom Access Token Hook: rewrite JWT sub to supabaseUuid
-- 
-- When Clerk issues a JWT, sub = raw Clerk ID ("user_3AYq...").
-- auth.uid() casts sub::uuid, causing 22P02.
-- This hook intercepts the token after Supabase validates it
-- and replaces sub with the UUID from the supabaseUuid claim,
-- so auth.uid() receives a valid UUID.
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
  RETURNS jsonb
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_claims   jsonb;
  v_uuid_val text;
BEGIN
  v_claims := event -> 'claims';

  -- Pull supabaseUuid from the top-level claim
  v_uuid_val := v_claims ->> 'supabaseUuid';

  -- If it's a valid UUID, rewrite sub so auth.uid() works correctly
  IF v_uuid_val IS NOT NULL
     AND v_uuid_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_claims := jsonb_set(v_claims, '{sub}', to_jsonb(v_uuid_val));
    RETURN jsonb_set(event, '{claims}', v_claims);
  END IF;

  -- No valid UUID found — return unchanged (will 22P02 later, but best we can do)
  RETURN event;
END;
$$;

-- Grant execute to the supabase_auth_admin role (required for hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;
-- Revoke from public for security
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM PUBLIC;
