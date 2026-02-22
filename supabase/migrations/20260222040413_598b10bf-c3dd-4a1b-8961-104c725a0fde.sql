
-- Restore SELECT access for authenticated users (needed by edge functions)
-- Client code never queries this table directly - all access goes through edge functions
DROP POLICY IF EXISTS "No direct select on api keys" ON public.user_api_keys;

CREATE POLICY "Users can view own API keys"
  ON public.user_api_keys FOR SELECT
  USING (auth.uid() = user_id);
