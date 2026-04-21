-- =====================================================================
-- P0 — Critical security hotfixes (Task #9)
--
-- Source: DATABASE_AUDIT.md (April 20, 2026) and
--         .local/db-analysis/security.json
--
-- Fixes applied in this migration:
--   1. messages.Admins-can-manage-all-messages — drop the user_metadata
--      branch (user-editable, privilege-escalation hole). Use only
--      app_metadata, which is server-controlled. Wrap in (SELECT ...)
--      so the JWT is decoded once per query, not once per row.
--   2. contact_requests."Anyone can insert contact requests" — keep the
--      anonymous insert path (used by the public Contact / Bug-report
--      forms via the submit-contact-request edge function and by the
--      legacy direct-insert path on older clients) but add a real
--      WITH CHECK predicate (non-empty email + message length bounds +
--      type whitelist). Application-level rate limiting (the
--      check_email_rate_limit helper + Hono edge-function rate
--      limiting on submit-contact-request) already covers abuse, so a
--      DB-side rate-limit table is not added here.
--   3. talent_pool_views.talent_pool_views_hr_insert — restrict to
--      authenticated users whose profile.account_type = 'hr', matching
--      the policy's name and the WiseHire account-type isolation rule
--      (CONSTITUTION §7.4).
--   4. storage.objects — drop the broad public SELECT policies on the
--      `avatars` and `screenshots` public buckets. Public-bucket object
--      URLs continue to resolve without a SELECT policy; removing the
--      policies prevents clients from listing all files in either
--      bucket.
--
-- Out of scope (separate tasks):
--   * Wrapping auth.uid() in (SELECT ...) across the other ~43 policies.
--   * Hardening function search_path on the 8 functions flagged WARN.
--   * Investigating the 7 RLS-on / no-policy tables.
--
-- Dashboard follow-ups (NOT code, must be toggled in Supabase UI):
--   * Auth → Settings → enable "Leaked password protection" (HIBP).
--   * Database → Backups → enable Point-in-Time Recovery (or confirm
--     daily backups are running). Note the result in the PR.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. messages: secure the admin policy
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;

CREATE POLICY "Admins can manage all messages"
  ON public.messages
  FOR ALL
  TO authenticated
  USING (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------------------------------------------------------------------
-- 2. contact_requests: replace WITH CHECK (true) with a real predicate
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can insert contact requests"
  ON public.contact_requests;

CREATE POLICY "Anyone can insert contact requests"
  ON public.contact_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Type must be one of the known values (defense-in-depth alongside
    -- the existing CHECK constraint on the column).
    type IN ('bug', 'feature', 'contact')
    -- Email must be non-empty and look vaguely like an email address.
    AND email IS NOT NULL
    AND length(btrim(email)) BETWEEN 5 AND 320
    AND position('@' IN email) > 1
    -- Message must be non-empty and bounded.
    AND message IS NOT NULL
    AND length(btrim(message)) BETWEEN 10 AND 5000
    -- Optional subject is bounded when provided.
    AND (subject IS NULL OR length(subject) <= 200)
    -- Anonymous submissions must not spoof a user_id; authenticated
    -- submissions, when supplied, must match the caller.
    AND (
      user_id IS NULL
      OR user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- 3. talent_pool_views: restrict insert to HR profiles
-- ---------------------------------------------------------------------
-- The policy name implies an HR check, but the prior WITH CHECK was
-- effectively `true`. Replace with a real account_type='hr' predicate.
-- A profile row is required (CONSTITUTION §7.4 — every WiseHire write
-- pre-resolves profiles.id from auth.uid()).
DROP POLICY IF EXISTS "talent_pool_views_hr_insert"
  ON public.talent_pool_views;

CREATE POLICY "talent_pool_views_hr_insert"
  ON public.talent_pool_views
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.account_type = 'hr'
    )
  );

-- ---------------------------------------------------------------------
-- 4. storage.objects: drop broad SELECT policies on public buckets
-- ---------------------------------------------------------------------
-- Public buckets serve object URLs without requiring a SELECT policy.
-- The broad SELECT policies turn the bucket into an enumerable
-- directory of every user's files, which is what the audit flagged.
-- INSERT / UPDATE / DELETE policies for owners are left intact.
DROP POLICY IF EXISTS "Authenticated users can view avatars"
  ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible"
  ON storage.objects;

DROP POLICY IF EXISTS "Public read access for screenshots"
  ON storage.objects;
