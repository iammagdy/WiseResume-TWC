-- ============================================================
-- Security Audit Task #9 — RLS for tailoring_results + Audit Docs
-- ============================================================
-- Addresses gaps identified during audit review:
--   1. tailoring_results had indexes but no RLS policies.
--   2. Documents full RLS coverage matrix for the audit record.
--   3. Describes file-upload boundary architecture (text-first).
--
-- NOTE (2026-04-21 sync): On the canonical Supabase project
-- `public.tailoring_results` does NOT exist — it is a planned-but-not-yet-
-- built feature. The block below is wrapped in an existence guard so it
-- cleanly no-ops where the table is absent and applies the policies the
-- moment the table is created. The audit comments at the bottom of this
-- file remain valid regardless.
-- ============================================================

DO $$
BEGIN
  IF to_regclass('public.tailoring_results') IS NULL THEN
    RAISE NOTICE 'rls_tailoring_results: public.tailoring_results is absent — skipping policy creation';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.tailoring_results ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "Users can view own tailoring results" ON public.tailoring_results';
  EXECUTE $sql$
    CREATE POLICY "Users can view own tailoring results"
      ON public.tailoring_results
      FOR SELECT
      TO authenticated
      USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can insert own tailoring results" ON public.tailoring_results';
  EXECUTE $sql$
    CREATE POLICY "Users can insert own tailoring results"
      ON public.tailoring_results
      FOR INSERT
      TO authenticated
      WITH CHECK (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can update own tailoring results" ON public.tailoring_results';
  EXECUTE $sql$
    CREATE POLICY "Users can update own tailoring results"
      ON public.tailoring_results
      FOR UPDATE
      TO authenticated
      USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own tailoring results" ON public.tailoring_results';
  EXECUTE $sql$
    CREATE POLICY "Users can delete own tailoring results"
      ON public.tailoring_results
      FOR DELETE
      TO authenticated
      USING (public.get_clerk_user_id() = user_id OR public.safe_uid() = user_id)
  $sql$;

  EXECUTE $sql$
    COMMENT ON TABLE public.tailoring_results IS
      'AI-generated tailored resume sections. RLS: owner-only for all CRUD via '
      'get_clerk_user_id()/safe_uid(). Service-role (edge functions, hard-purge) '
      'bypasses RLS by design. File upload architecture: WiseResume never stores '
      'raw resume files — only pre-extracted plain text reaches any server endpoint.'
  $sql$;
END $$;

-- --------------------------------------------------------
-- 2. FULL RLS COVERAGE AUDIT RECORD (comments only — no schema changes)
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
-- tailoring_results    | ON   | owner     | owner     | owner     | owner  ← gated
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
