
-- Create a secure view that excludes the encrypted_key column
CREATE OR REPLACE VIEW public.user_api_keys_safe AS
SELECT id, user_id, provider, key_tier, created_at, updated_at
FROM public.user_api_keys;

-- Grant access to the view
GRANT SELECT ON public.user_api_keys_safe TO authenticated;
GRANT SELECT ON public.user_api_keys_safe TO anon;

-- Enable RLS on the view (views inherit from base table RLS)
-- But we also need to revoke direct SELECT on the base table from anon/authenticated
-- and only allow access through the view or edge functions

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own API keys" ON public.user_api_keys;

-- Create a restrictive SELECT policy that blocks direct table access
-- Edge functions use service role or the user's JWT with RLS, so we need
-- to keep SELECT for the edge function (manage-api-keys) which queries as the user.
-- The edge function selects provider, key_tier, created_at, updated_at (not encrypted_key).
-- But we can't do column-level RLS in Postgres.
-- 
-- Best approach: use the get_user_api_key_info RPC (already exists, SECURITY DEFINER)
-- for client-side reads, and block direct SELECT entirely.

-- Block all direct SELECT on user_api_keys
CREATE POLICY "No direct select on api keys"
  ON public.user_api_keys FOR SELECT
  USING (false);
