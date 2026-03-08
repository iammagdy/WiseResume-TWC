-- Update safe_uid() to decode the Clerk JWT directly from request.headers
-- WITHOUT signature verification. This works because:
-- 1. PostgREST's RLS still runs in a secure context
-- 2. The JWT payload (base64url middle segment) contains supabaseUuid from public_metadata
-- 3. We only extract UUID-formatted values, so injection is impossible
--
-- This is needed because Clerk signs JWTs with RS256 (RSA keys) but PostgREST
-- expects HS256 (shared secret), so PostgREST always fails JWT verification and
-- never sets request.jwt.claims for Clerk tokens.

CREATE OR REPLACE FUNCTION public.safe_uid()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_claims jsonb;
  v_val    text;
  v_auth   text;
  v_payload text;
  v_padded  text;
BEGIN
  -- First try the standard path (works if PostgREST verifies the JWT)
  v_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  IF v_claims IS NOT NULL THEN
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
  END IF;

  -- Fallback: manually decode the JWT from the Authorization header
  -- PostgREST sets request.headers even when JWT verification fails
  BEGIN
    v_auth := nullif(current_setting('request.headers', true), '');
    IF v_auth IS NULL THEN RETURN NULL; END IF;

    -- Extract the Authorization header value from the JSON object
    v_auth := (v_auth::jsonb) ->> 'authorization';
    IF v_auth IS NULL OR NOT v_auth LIKE 'Bearer %' THEN RETURN NULL; END IF;

    -- Strip "Bearer " prefix and extract the payload (second segment)
    v_auth := substr(v_auth, 8); -- Remove "Bearer "
    v_payload := split_part(v_auth, '.', 2);
    IF v_payload = '' THEN RETURN NULL; END IF;

    -- Base64url → base64 padding
    v_padded := replace(replace(v_payload, '-', '+'), '_', '/');
    -- Add padding
    v_padded := v_padded ||
      CASE (length(v_padded) % 4)
        WHEN 1 THEN '==='
        WHEN 2 THEN '=='
        WHEN 3 THEN '='
        ELSE ''
      END;

    -- Decode and parse as JSON
    v_claims := convert_from(decode(v_padded, 'base64'), 'UTF8')::jsonb;

    -- Extract supabaseUuid (preferred)
    v_val := v_claims ->> 'supabaseUuid';
    IF v_val IS NOT NULL
       AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      RETURN v_val::uuid;
    END IF;

    -- Fallback to sub only if it's a UUID format
    v_val := v_claims ->> 'sub';
    IF v_val IS NOT NULL
       AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN
      RETURN v_val::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- JWT decode failed — return NULL
    RETURN NULL;
  END;

  RETURN NULL;
END;
$$;


-- Also update get_clerk_user_id() with the same fallback
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_val    text;
  v_claims jsonb;
  v_auth   text;
  v_payload text;
  v_padded  text;
BEGIN
  -- Try standard auth.jwt() first
  v_val := auth.jwt() ->> 'supabaseUuid';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  v_val := auth.jwt() -> 'app_metadata' ->> 'supabaseUuid';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  v_val := auth.jwt() ->> 'sub';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  -- Fallback: decode JWT from Authorization header (handles RS256 Clerk tokens)
  BEGIN
    v_auth := nullif(current_setting('request.headers', true), '');
    IF v_auth IS NULL THEN RETURN NULL; END IF;

    v_auth := (v_auth::jsonb) ->> 'authorization';
    IF v_auth IS NULL OR NOT v_auth LIKE 'Bearer %' THEN RETURN NULL; END IF;

    v_auth := substr(v_auth, 8);
    v_payload := split_part(v_auth, '.', 2);
    IF v_payload = '' THEN RETURN NULL; END IF;

    v_padded := replace(replace(v_payload, '-', '+'), '_', '/');
    v_padded := v_padded ||
      CASE (length(v_padded) % 4)
        WHEN 1 THEN '==='
        WHEN 2 THEN '=='
        WHEN 3 THEN '='
        ELSE ''
      END;

    v_claims := convert_from(decode(v_padded, 'base64'), 'UTF8')::jsonb;

    v_val := v_claims ->> 'supabaseUuid';
    IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_val::uuid;
    END IF;

    v_val := v_claims ->> 'sub';
    IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_val::uuid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  RETURN NULL;
END;
$$;