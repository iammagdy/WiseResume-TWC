-- ============================================================
-- Security Hardening: M4 + M5
-- M4: Restrict app_settings anon read access
--     The anon RLS policy is removed. The get_app_settings() RPC
--     is SECURITY DEFINER and granted to anon, so maintenance_mode
--     continues to work for unauthenticated users via the RPC.
-- M5: Lock down contact_requests to service_role inserts only.
--     Direct anonymous SDK inserts are blocked; only the
--     submit-contact-request edge function (using service key)
--     can write to this table.
-- ============================================================

-- M4: Remove the anon read policy that exposed app_settings keys
--     to unauthenticated visitors. The SECURITY DEFINER
--     get_app_settings() RPC handles the unauthenticated access
--     path for maintenance mode and feature flags.
DROP POLICY IF EXISTS "anon_read_app_settings" ON public.app_settings;

-- Ensure the authenticated read policy exists (idempotent)
DROP POLICY IF EXISTS "authenticated_read_app_settings" ON public.app_settings;
CREATE POLICY "authenticated_read_app_settings" ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (key IN (
    'maintenance_mode',
    'announcement_banner',
    'announcement_enabled',
    'feature_cover_letters',
    'feature_applications',
    'feature_ai_studio',
    'feature_portfolio',
    'feature_interview_coach',
    'feature_career_advisor'
  ));


-- M5: Remove the open anonymous insert policy on contact_requests.
--     Inserts must now go through the submit-contact-request edge
--     function which uses the service role key and enforces
--     server-side rate limiting and input validation.
DROP POLICY IF EXISTS "Anyone can insert contact requests" ON public.contact_requests;

-- Add a policy that allows only service_role to insert.
-- (service_role bypasses RLS by default, but we add this explicitly
--  for clarity and future-proofing.)
DROP POLICY IF EXISTS "service_role_insert_contact_requests" ON public.contact_requests;
CREATE POLICY "service_role_insert_contact_requests" ON public.contact_requests
  FOR INSERT
  TO service_role
  WITH CHECK (true);
