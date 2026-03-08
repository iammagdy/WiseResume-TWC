
-- Fix get_clerk_user_id() to never call auth.uid() which throws 22P02
-- when Clerk's sub claim is a non-UUID string like "user_3AYqOlWJzoMv90..."
-- Instead, read ONLY the supabaseUuid custom claim from the JWT.
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'supabaseUuid')::uuid,
    (auth.jwt() -> 'app_metadata' ->> 'supabaseUuid')::uuid
  )
$$;
