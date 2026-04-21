-- Task #10: Verify & fix tables with RLS enabled but no policies
--
-- Background
-- ----------
-- The security advisor flagged seven tables with RLS enabled but zero
-- policies, which silently denies all PostgREST access for non-service-role
-- callers:
--
--   resume_certifications, resume_educations, resume_experiences,
--   resume_skills, rpc_rate_limits, wisehire_invites, wisehire_waitlist
--
-- Audit findings (see DATABASE_AUDIT.md and code search):
--
-- (a) Client-readable / writable tables -> need explicit RLS policies:
--     The four resume_* sub-tables are currently kept in sync from the
--     `resumes` JSONB columns via the `sync_resume_json_cache` trigger,
--     so today no client code calls `from('resume_*')` directly. We still
--     install owner-scoped policies so that future direct access from the
--     resume editor (a likely refactor) does not silently 0-row, and so
--     that the advisor's `rls_enabled_no_policy` warning is resolved.
--     Ownership is derived from the parent `resumes.user_id`.
--
-- (b) RPC / Edge Function only tables -> RLS stays on with no policies:
--     `rpc_rate_limits`, `wisehire_invites`, `wisehire_waitlist` are
--     written and read exclusively by Edge Functions using the service
--     role key (verified by code search in supabase/functions/). Leaving
--     RLS enabled with no policies is the correct, intentional state:
--     PostgREST callers are denied by default, and the service role
--     bypasses RLS. We document this on the table COMMENT so the advisor
--     INFO is acknowledged rather than hiding a real bug.
--
-- All policies use the `(SELECT auth.uid())` subselect form so that
-- auth.uid() is evaluated once per query rather than once per row
-- (avoids the `auth_rls_initplan` perf regression).

-- ---------------------------------------------------------------------------
-- (a) resume_* sub-tables: owner-scoped policies via parent resumes.user_id
-- ---------------------------------------------------------------------------

-- resume_experiences -------------------------------------------------------
DROP POLICY IF EXISTS "resume_experiences_owner_select" ON public.resume_experiences;
CREATE POLICY "resume_experiences_owner_select"
  ON public.resume_experiences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_experiences.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_experiences_owner_insert" ON public.resume_experiences;
CREATE POLICY "resume_experiences_owner_insert"
  ON public.resume_experiences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_experiences.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_experiences_owner_update" ON public.resume_experiences;
CREATE POLICY "resume_experiences_owner_update"
  ON public.resume_experiences
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_experiences.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_experiences.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_experiences_owner_delete" ON public.resume_experiences;
CREATE POLICY "resume_experiences_owner_delete"
  ON public.resume_experiences
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_experiences.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

-- resume_educations --------------------------------------------------------
DROP POLICY IF EXISTS "resume_educations_owner_select" ON public.resume_educations;
CREATE POLICY "resume_educations_owner_select"
  ON public.resume_educations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_educations.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_educations_owner_insert" ON public.resume_educations;
CREATE POLICY "resume_educations_owner_insert"
  ON public.resume_educations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_educations.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_educations_owner_update" ON public.resume_educations;
CREATE POLICY "resume_educations_owner_update"
  ON public.resume_educations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_educations.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_educations.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_educations_owner_delete" ON public.resume_educations;
CREATE POLICY "resume_educations_owner_delete"
  ON public.resume_educations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_educations.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

-- resume_skills ------------------------------------------------------------
DROP POLICY IF EXISTS "resume_skills_owner_select" ON public.resume_skills;
CREATE POLICY "resume_skills_owner_select"
  ON public.resume_skills
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_skills.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_skills_owner_insert" ON public.resume_skills;
CREATE POLICY "resume_skills_owner_insert"
  ON public.resume_skills
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_skills.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_skills_owner_update" ON public.resume_skills;
CREATE POLICY "resume_skills_owner_update"
  ON public.resume_skills
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_skills.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_skills.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_skills_owner_delete" ON public.resume_skills;
CREATE POLICY "resume_skills_owner_delete"
  ON public.resume_skills
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_skills.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

-- resume_certifications ----------------------------------------------------
DROP POLICY IF EXISTS "resume_certifications_owner_select" ON public.resume_certifications;
CREATE POLICY "resume_certifications_owner_select"
  ON public.resume_certifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_certifications.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_certifications_owner_insert" ON public.resume_certifications;
CREATE POLICY "resume_certifications_owner_insert"
  ON public.resume_certifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_certifications.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_certifications_owner_update" ON public.resume_certifications;
CREATE POLICY "resume_certifications_owner_update"
  ON public.resume_certifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_certifications.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_certifications.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "resume_certifications_owner_delete" ON public.resume_certifications;
CREATE POLICY "resume_certifications_owner_delete"
  ON public.resume_certifications
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = resume_certifications.resume_id
        AND r.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.resume_experiences IS
  'Normalized work experience. Ownership derived from parent resumes.user_id; '
  'kept in sync with resumes.experience JSONB via sync_resume_json_cache trigger. '
  'RLS: owner-scoped SELECT/INSERT/UPDATE/DELETE for authenticated.';

COMMENT ON TABLE public.resume_educations IS
  'Normalized education history. Ownership derived from parent resumes.user_id; '
  'kept in sync with resumes.education JSONB via sync_resume_json_cache trigger. '
  'RLS: owner-scoped SELECT/INSERT/UPDATE/DELETE for authenticated.';

COMMENT ON TABLE public.resume_skills IS
  'Normalized skills for indexed search. Ownership derived from parent '
  'resumes.user_id; kept in sync with resumes.skills JSONB via '
  'sync_resume_json_cache trigger. RLS: owner-scoped SELECT/INSERT/UPDATE/DELETE '
  'for authenticated.';

COMMENT ON TABLE public.resume_certifications IS
  'Normalized certifications. Ownership derived from parent resumes.user_id. '
  'RLS: owner-scoped SELECT/INSERT/UPDATE/DELETE for authenticated.';

-- ---------------------------------------------------------------------------
-- (b) RPC / Edge-Function-only tables: keep RLS on, no policies, document it
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.rpc_rate_limits IS
  'Rate-limit counters. Access pattern: SERVICE-ROLE ONLY via Edge Functions '
  '(_shared/rateLimiter.ts, _shared/userRateLimiter.ts, verify-dev-kit). '
  'RLS is enabled with NO policies on purpose: the service role bypasses RLS, '
  'and PostgREST callers (anon/authenticated) must not read or write rate-limit '
  'state. Do not add client-facing policies. The advisor INFO '
  '`rls_enabled_no_policy` for this table is intentional.';

COMMENT ON TABLE public.wisehire_invites IS
  'WiseHire invite tokens. Access pattern: SERVICE-ROLE ONLY via Edge Functions '
  '(admin-wisehire-invite, wisehire-validate-invite, wisehire-complete-signup, '
  'wisehire-invite-reminder, admin-wisehire-revoke-invite, admin-wisehire-reset-user, '
  'admin-wisehire-waitlist). Tokens are sensitive and are validated server-side; '
  'clients never read or write this table directly. RLS stays enabled with no '
  'policies so PostgREST denies by default; service role bypasses RLS. The '
  'advisor INFO `rls_enabled_no_policy` for this table is intentional.';

COMMENT ON TABLE public.wisehire_waitlist IS
  'WiseHire waitlist signups. Access pattern: SERVICE-ROLE ONLY via Edge '
  'Functions (wisehire-waitlist-join, wisehire-waitlist-check-email, '
  'admin-wisehire-waitlist, admin-wisehire-invite). Public sign-up flows go '
  'through validated Edge Functions (with rate limiting and bot guards), not '
  'direct PostgREST inserts. RLS stays enabled with no policies; service role '
  'bypasses RLS. The advisor INFO `rls_enabled_no_policy` for this table is '
  'intentional.';
