-- Fix: safely cast supabaseUuid claim — if it's a Clerk string (not a UUID)
-- the previous version threw 22P02. This version uses a regex guard first.
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_val text;
BEGIN
  -- Try top-level supabaseUuid claim first
  v_val := auth.jwt() ->> 'supabaseUuid';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  -- Try app_metadata.supabaseUuid
  v_val := auth.jwt() -> 'app_metadata' ->> 'supabaseUuid';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  -- Last resort: try sub (works if Clerk template sets sub = UUID)
  v_val := auth.jwt() ->> 'sub';
  IF v_val IS NOT NULL AND v_val ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN v_val::uuid;
  END IF;

  RETURN NULL;
END;
$$;