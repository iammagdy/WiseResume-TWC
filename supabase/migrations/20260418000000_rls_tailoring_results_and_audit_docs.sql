-- ============================================================
-- Security Audit Task #9 — RLS for tailoring_results + Audit Docs
-- ============================================================
-- Addresses gaps identified during audit review:
--   1. tailoring_results had indexes but no RLS policies.
--   2. Documents full RLS coverage matrix for the audit record.
--   3. Describes file-upload boundary architecture (text-first).
-- ============================================================

-- --------------------------------------------------------
-- 1. TAILORING RESULTS — enable RLS and add owner-only policies
--
--    tailoring_results stores AI-generated tailored resume content
--    keyed to a user_id. Users should only access their own rows.
--    Service-role access (edge functions, webhooks) is unrestricted.
-- --------------------------------------------------------
ALTER TABLE public.tailoring_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tailoring results" ON public.tailoring_results;
CREATE POLICY "Users can view own tailoring results"
  ON public.tailoring_results
  FOR SELECT
  TO authenticated
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tailoring results" ON public.tailoring_results;
CREATE POLICY "Users can insert own tailoring results"
  ON public.tailoring_results
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tailoring results" ON public.tailoring_results;
CREATE POLICY "Users can update own tailoring results"
  ON public.tailoring_results
  FOR UPDATE
  TO authenticated
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tailoring results" ON public.tailoring_results;
CREATE POLICY "Users can delete own tailoring results"
  ON public.tailoring_results
  FOR DELETE
  TO authenticated
  USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id);

COMMENT ON TABLE public.tailoring_results IS
  'AI-generated tailored resume sections. RLS: owner-only for all CRUD via '
  'get_clerk_user_id()/safe_uid(). Service-role (edge functions) bypasses RLS. '
  'Block client UPDATE/DELETE directly in application flow; edge function '
  'hard-purge cleans up on account deletion.';

-- --------------------------------------------------------
-- 2. FULL RLS COVERAGE AUDIT RECORD
--
--    Documents the verified RLS posture for every user-data
--    table in scope for Task #9. This comment row exists for
--    the audit trail — no policy changes are made to already-
--    hardened tables here.
-- --------------------------------------------------------

-- TABLE                | RLS  | SELECT    | INSERT    | UPDATE    | DELETE
-- ---------------------+------+-----------+-----------+-----------+-----------
-- resumes              | ON   | owner     | owner     | owner     | owner
-- profiles             | ON   | owner+pub | owner     | owner     | denied
-- job_applications     | ON   | owner     | owner     | owner     | owner
-- resume_shares        | ON   | owner     | owner     | denied    | owner
-- ai_credits           | ON   | owner     | svc-only  | BLOCKED   | svc-only
-- subscriptions        | ON   | owner     | BLOCKED   | BLOCKED   | BLOCKED
-- credit_transactions  | ON   | owner     | BLOCKED   | BLOCKED   | BLOCKED
-- user_preferences     | ON   | owner     | owner     | owner     | owner
-- user_api_keys        | ON   | owner     | owner     | owner     | owner
-- portfolio_settings   | ON   | owner     | owner     | owner     | owner
-- portfolio_history    | ON   | owner     | owner     | denied    | denied
-- portfolio_visits     | ON   | anon+own  | anon+own  | denied    | denied
-- rpc_rate_limits      | ON   | BLOCKED   | BLOCKED   | n/a       | n/a
-- ai_usage_logs        | ON   | owner     | owner     | denied    | owner
-- tailoring_results    | ON   | owner     | owner     | owner     | owner  ← NEW
-- notifications        | ON   | owner     | svc-only  | owner     | owner
-- ---------------------+------+-----------+-----------+-----------+-----------
-- "BLOCKED" = explicit WITH CHECK(false)/USING(false) policy for authenticated
-- "svc-only" = no client policy (RLS denies by default); service_role bypasses

-- --------------------------------------------------------
-- 3. FILE UPLOAD BOUNDARY DOCUMENTATION
--
--    WiseResume uses a TEXT-FIRST file upload architecture:
--      a) The user selects a PDF/DOCX/TXT file in the browser.
--      b) The file is processed CLIENT-SIDE by PDF.js or mammoth.js,
--         extracting plain text without any server involvement.
--      c) ONLY the extracted plain text is sent to the parse-resume
--         edge function (POST { text, fileType: 'text/plain' }).
--      d) Raw file bytes are NEVER transmitted to any Supabase endpoint.
--
--    As a result:
--      - There is no "raw upload ingress" path for resume files.
--      - MIME enforcement at the parse-resume endpoint is on pre-extracted
--        text (fileType required, allowlist validated, magic-byte headers
--        checked, non-printable character ratio capped).
--      - Avatar/profile-image uploads DO go through Supabase Storage
--        (the 'avatars' bucket) and are restricted to image/* MIME types
--        with a 5 MB size limit (enforced in the 20260417000000 migration).
--      - No resume content is ever stored in Supabase Storage.
-- --------------------------------------------------------
COMMENT ON TABLE public.tailoring_results IS
  'AI-generated tailored resume sections. RLS: owner-only for all CRUD. '
  'Service-role (edge functions, hard-purge) bypasses RLS by design. '
  'File upload architecture: WiseResume never stores raw resume files — '
  'only pre-extracted plain text reaches any server endpoint.';
