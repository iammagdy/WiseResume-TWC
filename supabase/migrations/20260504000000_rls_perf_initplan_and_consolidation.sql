-- =============================================================================
-- RLS performance pass: wrap auth.uid()/auth.jwt()/auth.role() in (SELECT ...)
-- and consolidate multiple permissive policies for the same role x action.
--
-- Background:
--   Postgres re-evaluates `auth.<fn>()` once per row scanned inside a policy.
--   Wrapping in `(SELECT auth.<fn>())` lets it cache the result via initPlan.
--   This is the highest-impact, schema-neutral perf change available.
--
--   In addition, several tables had multiple PERMISSIVE policies for the same
--   (role, action) tuple. Postgres evaluates every one on every row, so we
--   merge them into a single OR-combined policy.
--
-- Strategy:
--   Phase 1: Dynamically rewrite every policy on the affected tables so that
--            calls to auth.uid()/auth.jwt()/auth.role() are wrapped in a
--            SELECT subquery. The rewrite is idempotent: it first strips any
--            existing wrap (so re-running does not double-wrap), then re-wraps.
--
--   Phase 2: For each known multi-permissive group (taken from the perf
--            advisor) drop the duplicate policies and create a single
--            consolidated policy. Phase 2 runs AFTER phase 1, so the qual /
--            with_check expressions it pulls from pg_policies are already in
--            their wrapped form.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Helper: render a name[] of role names as a TO clause string. The literal
-- name "public" must be emitted as the unquoted PUBLIC keyword (it is not a
-- normal role); every other role is properly quoted via quote_ident.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.__rls_render_roles(role_names name[])
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT string_agg(
    CASE WHEN rn::text = 'public' THEN 'PUBLIC' ELSE quote_ident(rn::text) END,
    ', '
  )
  FROM unnest(COALESCE(role_names, ARRAY['public']::name[])) AS t(rn);
$fn$;

-- -----------------------------------------------------------------------------
-- Phase 1: idempotent rewrap of auth.* helper calls inside USING / WITH CHECK
-- -----------------------------------------------------------------------------
DO $rewrite$
DECLARE
  affected_tables CONSTANT text[] := ARRAY[
    'admin_user_notes','app_settings','contact_requests','coupon_redemptions',
    'cover_letters','credit_transactions','discount_codes','messages',
    'portfolio_history','portfolio_settings','profiles','resignation_letters',
    'resumes','share_comments','social_links','subscriptions',
    'talent_pool_profiles','talent_pool_views','usage_events','user_gamification',
    'wisehire_applications','wisehire_bulk_screen_jobs','wisehire_candidate_briefs',
    'wisehire_candidate_notes','wisehire_candidates','wisehire_clients',
    'wisehire_companies','wisehire_outreach_emails','wisehire_pipeline_events',
    'wisehire_roles','wisehire_saved_searches','wisehire_scorecard_templates',
    'wisehire_scorecards'
  ];
  r RECORD;
  v_qual text;
  v_check text;
  v_orig_qual text;
  v_orig_check text;
  v_perm text;
  v_cmd text;
  v_roles text;
  v_using_clause text;
  v_check_clause text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd,
           qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(affected_tables)
  LOOP
    v_qual := COALESCE(r.qual, '');
    v_check := COALESCE(r.with_check, '');
    v_orig_qual := v_qual;
    v_orig_check := v_check;

    -- Strip any existing wrap forms first (idempotent), then re-wrap.
    -- pg_get_expr renders subqueries as `( SELECT auth.uid() AS uid)`.
    IF v_qual <> '' THEN
      v_qual := regexp_replace(v_qual, '\(\s*SELECT\s+auth\.uid\(\)(\s+AS\s+\w+)?\s*\)', 'auth.uid()', 'gi');
      v_qual := regexp_replace(v_qual, '\(\s*SELECT\s+auth\.jwt\(\)(\s+AS\s+\w+)?\s*\)', 'auth.jwt()', 'gi');
      v_qual := regexp_replace(v_qual, '\(\s*SELECT\s+auth\.role\(\)(\s+AS\s+\w+)?\s*\)', 'auth.role()', 'gi');
      v_qual := regexp_replace(v_qual, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      v_qual := regexp_replace(v_qual, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      v_qual := regexp_replace(v_qual, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
    END IF;

    IF v_check <> '' THEN
      v_check := regexp_replace(v_check, '\(\s*SELECT\s+auth\.uid\(\)(\s+AS\s+\w+)?\s*\)', 'auth.uid()', 'gi');
      v_check := regexp_replace(v_check, '\(\s*SELECT\s+auth\.jwt\(\)(\s+AS\s+\w+)?\s*\)', 'auth.jwt()', 'gi');
      v_check := regexp_replace(v_check, '\(\s*SELECT\s+auth\.role\(\)(\s+AS\s+\w+)?\s*\)', 'auth.role()', 'gi');
      v_check := regexp_replace(v_check, 'auth\.uid\(\)', '(SELECT auth.uid())', 'g');
      v_check := regexp_replace(v_check, 'auth\.jwt\(\)', '(SELECT auth.jwt())', 'g');
      v_check := regexp_replace(v_check, 'auth\.role\(\)', '(SELECT auth.role())', 'g');
    END IF;

    -- Skip if no auth.* calls were present (nothing to rewrite).
    IF v_qual = v_orig_qual AND v_check = v_orig_check THEN
      CONTINUE;
    END IF;

    v_perm := CASE r.permissive WHEN 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;
    v_cmd := r.cmd;
    v_roles := pg_temp.__rls_render_roles(r.roles);

    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);

    v_using_clause := CASE WHEN v_qual <> '' THEN ' USING (' || v_qual || ')' ELSE '' END;
    v_check_clause := CASE WHEN v_check <> '' THEN ' WITH CHECK (' || v_check || ')' ELSE '' END;

    EXECUTE format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      r.policyname, r.schemaname, r.tablename, v_perm, v_cmd, v_roles,
      v_using_clause, v_check_clause);
  END LOOP;
END
$rewrite$;

-- -----------------------------------------------------------------------------
-- Phase 2: consolidate multiple permissive policies for the same (role, action)
--
-- Helper: given a list of policy names on a table, return their merged USING
-- and WITH CHECK expressions (OR-combined) and the union of their roles.
-- -----------------------------------------------------------------------------
DO $merge$
DECLARE
  -- Each entry: table, list of policy names to merge, replacement policy spec.
  merge_groups jsonb := $json$
    [
      {
        "table": "cover_letters",
        "drop_legacy": ["Users can view own cover letters","Users can insert own cover letters","Users can update own cover letters","Users can delete own cover letters"],
        "keep_owner_prefix": "cover_letters_owner_"
      },
      {
        "table": "resignation_letters",
        "drop_legacy": ["Users can view own resignation letters","Users can insert own resignation letters","Users can update own resignation letters","Users can delete own resignation letters"],
        "keep_owner_prefix": "resignation_letters_owner_"
      }
    ]
  $json$;
  g jsonb;
  pname text;
BEGIN
  -- For cover_letters and resignation_letters: the legacy "Users can ..."
  -- policies (which use get_clerk_user_id() OR safe_uid()) overlap with the
  -- newer *_owner_* policies (auth.uid() based) for every role x action.
  -- Drop the legacy policies; the *_owner_* policies (already wrapped by
  -- phase 1, scoped TO authenticated) remain as the sole permissive policy.
  -- Rows whose user_id was written under the old Clerk id format would have
  -- been migrated by the prior Clerk -> Supabase migration; safe_uid() and
  -- auth.uid() return the same value for Supabase auth users.
  FOR g IN SELECT * FROM jsonb_array_elements(merge_groups) LOOP
    FOR pname IN SELECT jsonb_array_elements_text(g->'drop_legacy') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                     pname, g->>'table');
    END LOOP;
  END LOOP;
END
$merge$;

-- -----------------------------------------------------------------------------
-- app_settings: scope service_role_app_settings to TO service_role so it stops
-- duplicating anon/authenticated SELECT permissions with anon_read_app_settings
-- and authenticated_read_app_settings.
-- -----------------------------------------------------------------------------
DO $app_settings_fix$
DECLARE
  v_qual text;
  v_check text;
BEGIN
  SELECT qual, with_check INTO v_qual, v_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='app_settings'
      AND policyname='service_role_app_settings';

  IF FOUND THEN
    EXECUTE 'DROP POLICY "service_role_app_settings" ON public.app_settings';
    EXECUTE format(
      'CREATE POLICY "service_role_app_settings" ON public.app_settings AS PERMISSIVE FOR ALL TO service_role%s%s',
      CASE WHEN COALESCE(v_qual,'') <> '' THEN ' USING (' || v_qual || ')' ELSE ' USING (true)' END,
      CASE WHEN COALESCE(v_check,'') <> '' THEN ' WITH CHECK (' || v_check || ')' ELSE ' WITH CHECK (true)' END
    );
  END IF;
END
$app_settings_fix$;

-- -----------------------------------------------------------------------------
-- messages: scope both the admin policy and the owner policy TO authenticated
-- and merge them into a single permissive policy per command. We split the
-- single ALL policy into 4 cmd-specific policies so future changes can scope
-- mutations differently if needed; the union of behaviour is preserved.
-- -----------------------------------------------------------------------------
DO $messages_fix$
DECLARE
  v_admin_qual text;
  v_admin_check text;
  v_user_qual text;
  v_user_check text;
  v_select_using text;
  v_insert_check text;
  v_update_using text;
  v_update_check text;
  v_delete_using text;
BEGIN
  SELECT qual, with_check INTO v_admin_qual, v_admin_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='messages'
      AND policyname='Admins can manage all messages';
  SELECT qual, with_check INTO v_user_qual, v_user_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='messages'
      AND policyname='Users can manage own messages';

  IF v_admin_qual IS NULL AND v_user_qual IS NULL THEN
    RETURN; -- nothing to do
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages';
  EXECUTE 'DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages';

  v_select_using := '(' || COALESCE(v_user_qual, 'false') || ') OR (' || COALESCE(v_admin_qual, 'false') || ')';
  v_insert_check := '(' || COALESCE(v_user_check, v_user_qual, 'false') || ') OR (' || COALESCE(v_admin_check, v_admin_qual, 'false') || ')';
  v_update_using := v_select_using;
  v_update_check := v_insert_check;
  v_delete_using := v_select_using;

  EXECUTE format('CREATE POLICY "messages_select" ON public.messages AS PERMISSIVE FOR SELECT TO authenticated USING (%s)', v_select_using);
  EXECUTE format('CREATE POLICY "messages_insert" ON public.messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (%s)', v_insert_check);
  EXECUTE format('CREATE POLICY "messages_update" ON public.messages AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', v_update_using, v_update_check);
  EXECUTE format('CREATE POLICY "messages_delete" ON public.messages AS PERMISSIVE FOR DELETE TO authenticated USING (%s)', v_delete_using);
END
$messages_fix$;

-- -----------------------------------------------------------------------------
-- share_comments: merge "Public can view comments on active shares" and
-- "Share owners can view comments" into a single SELECT policy.
-- -----------------------------------------------------------------------------
DO $share_comments_fix$
DECLARE
  v_pub_qual text;
  v_owner_qual text;
  v_pub_perm text;
  v_owner_perm text;
  v_pub_roles name[];
  v_owner_roles name[];
  v_roles text;
BEGIN
  SELECT qual, permissive, roles INTO v_pub_qual, v_pub_perm, v_pub_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='share_comments'
      AND policyname='Public can view comments on active shares';
  SELECT qual, permissive, roles INTO v_owner_qual, v_owner_perm, v_owner_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='share_comments'
      AND policyname='Share owners can view comments';

  IF v_pub_qual IS NULL AND v_owner_qual IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Public can view comments on active shares" ON public.share_comments';
  EXECUTE 'DROP POLICY IF EXISTS "Share owners can view comments" ON public.share_comments';

  -- Union the role sets (default both to authenticated if NULL).
  v_roles := pg_temp.__rls_render_roles(
    ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(v_pub_roles, ARRAY['authenticated']::name[]) ||
        COALESCE(v_owner_roles, ARRAY['authenticated']::name[])
      )
    )::name[]
  );

  EXECUTE format(
    'CREATE POLICY "share_comments_select" ON public.share_comments AS PERMISSIVE FOR SELECT TO %s USING ((%s) OR (%s))',
    v_roles,
    COALESCE(v_pub_qual, 'false'),
    COALESCE(v_owner_qual, 'false')
  );
END
$share_comments_fix$;

-- -----------------------------------------------------------------------------
-- talent_pool_profiles: merge talent_pool_owner_all (SELECT slice) with
-- talent_pool_hr_read into one SELECT policy. Owner policy keeps mutations.
-- -----------------------------------------------------------------------------
DO $talent_pool_profiles_fix$
DECLARE
  v_owner_qual text;
  v_owner_check text;
  v_owner_cmd text;
  v_hr_qual text;
  v_hr_roles name[];
  v_owner_roles name[];
  v_roles text;
BEGIN
  SELECT qual, with_check, cmd, roles
    INTO v_owner_qual, v_owner_check, v_owner_cmd, v_owner_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='talent_pool_profiles'
      AND policyname='talent_pool_owner_all';
  SELECT qual, roles INTO v_hr_qual, v_hr_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='talent_pool_profiles'
      AND policyname='talent_pool_hr_read';

  IF v_owner_qual IS NULL AND v_hr_qual IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "talent_pool_owner_all" ON public.talent_pool_profiles';
  EXECUTE 'DROP POLICY IF EXISTS "talent_pool_hr_read" ON public.talent_pool_profiles';

  -- Owner mutations stay as they were (split per cmd).
  IF v_owner_qual IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY "talent_pool_owner_insert" ON public.talent_pool_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      COALESCE(v_owner_check, v_owner_qual)
    );
    EXECUTE format(
      'CREATE POLICY "talent_pool_owner_update" ON public.talent_pool_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      v_owner_qual,
      COALESCE(v_owner_check, v_owner_qual)
    );
    EXECUTE format(
      'CREATE POLICY "talent_pool_owner_delete" ON public.talent_pool_profiles AS PERMISSIVE FOR DELETE TO authenticated USING (%s)',
      v_owner_qual
    );
  END IF;

  -- Single combined SELECT policy.
  v_roles := pg_temp.__rls_render_roles(
    ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(v_owner_roles, ARRAY['authenticated']::name[]) ||
        COALESCE(v_hr_roles, ARRAY['authenticated']::name[])
      )
    )::name[]
  );

  EXECUTE format(
    'CREATE POLICY "talent_pool_select" ON public.talent_pool_profiles AS PERMISSIVE FOR SELECT TO %s USING ((%s) OR (%s))',
    v_roles,
    COALESCE(v_owner_qual, 'false'),
    COALESCE(v_hr_qual, 'false')
  );
END
$talent_pool_profiles_fix$;

-- -----------------------------------------------------------------------------
-- wisehire_applications: merge applications_applicant_all (SELECT slice) with
-- applications_owner_read into one SELECT policy. Applicant policy keeps
-- mutation rights via split insert/update/delete policies.
-- -----------------------------------------------------------------------------
DO $wh_apps_fix$
DECLARE
  v_app_qual text;
  v_app_check text;
  v_app_roles name[];
  v_owner_qual text;
  v_owner_roles name[];
  v_roles text;
BEGIN
  SELECT qual, with_check, roles
    INTO v_app_qual, v_app_check, v_app_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_applications'
      AND policyname='applications_applicant_all';
  SELECT qual, roles INTO v_owner_qual, v_owner_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_applications'
      AND policyname='applications_owner_read';

  IF v_app_qual IS NULL AND v_owner_qual IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "applications_applicant_all" ON public.wisehire_applications';
  EXECUTE 'DROP POLICY IF EXISTS "applications_owner_read" ON public.wisehire_applications';

  IF v_app_qual IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY "applications_applicant_insert" ON public.wisehire_applications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      COALESCE(v_app_check, v_app_qual)
    );
    EXECUTE format(
      'CREATE POLICY "applications_applicant_update" ON public.wisehire_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      v_app_qual,
      COALESCE(v_app_check, v_app_qual)
    );
    EXECUTE format(
      'CREATE POLICY "applications_applicant_delete" ON public.wisehire_applications AS PERMISSIVE FOR DELETE TO authenticated USING (%s)',
      v_app_qual
    );
  END IF;

  v_roles := pg_temp.__rls_render_roles(
    ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(v_app_roles, ARRAY['authenticated']::name[]) ||
        COALESCE(v_owner_roles, ARRAY['authenticated']::name[])
      )
    )::name[]
  );

  EXECUTE format(
    'CREATE POLICY "applications_select" ON public.wisehire_applications AS PERMISSIVE FOR SELECT TO %s USING ((%s) OR (%s))',
    v_roles,
    COALESCE(v_app_qual, 'false'),
    COALESCE(v_owner_qual, 'false')
  );
END
$wh_apps_fix$;

-- -----------------------------------------------------------------------------
-- wisehire_companies: scope "HR user owns their company" TO authenticated so
-- it no longer overlaps with companies_public_read on anon SELECT.
-- -----------------------------------------------------------------------------
DO $wh_companies_fix$
DECLARE
  v_qual text;
  v_check text;
  v_cmd text;
BEGIN
  SELECT qual, with_check, cmd INTO v_qual, v_check, v_cmd
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_companies'
      AND policyname='HR user owns their company';
  IF NOT FOUND THEN RETURN; END IF;

  EXECUTE 'DROP POLICY "HR user owns their company" ON public.wisehire_companies';
  EXECUTE format(
    'CREATE POLICY "HR user owns their company" ON public.wisehire_companies AS PERMISSIVE FOR %s TO authenticated%s%s',
    v_cmd,
    CASE WHEN COALESCE(v_qual,'') <> '' THEN ' USING (' || v_qual || ')' ELSE '' END,
    CASE WHEN COALESCE(v_check,'') <> '' THEN ' WITH CHECK (' || v_check || ')' ELSE '' END
  );
END
$wh_companies_fix$;

-- -----------------------------------------------------------------------------
-- wisehire_roles: same treatment as wisehire_companies.
-- -----------------------------------------------------------------------------
DO $wh_roles_fix$
DECLARE
  v_qual text;
  v_check text;
  v_cmd text;
BEGIN
  SELECT qual, with_check, cmd INTO v_qual, v_check, v_cmd
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_roles'
      AND policyname='HR user owns their roles';
  IF NOT FOUND THEN RETURN; END IF;

  EXECUTE 'DROP POLICY "HR user owns their roles" ON public.wisehire_roles';
  EXECUTE format(
    'CREATE POLICY "HR user owns their roles" ON public.wisehire_roles AS PERMISSIVE FOR %s TO authenticated%s%s',
    v_cmd,
    CASE WHEN COALESCE(v_qual,'') <> '' THEN ' USING (' || v_qual || ')' ELSE '' END,
    CASE WHEN COALESCE(v_check,'') <> '' THEN ' WITH CHECK (' || v_check || ')' ELSE '' END
  );
END
$wh_roles_fix$;

-- -----------------------------------------------------------------------------
-- wisehire_scorecards: owner_all_scorecards is FOR ALL (overlaps with
-- public_read_scorecard on every role x SELECT). Split owner policy into
-- mutation policies + a combined SELECT policy unioned with public_read.
-- -----------------------------------------------------------------------------
DO $wh_scorecards_fix$
DECLARE
  v_owner_qual text;
  v_owner_check text;
  v_owner_roles name[];
  v_pub_qual text;
  v_pub_roles name[];
  v_roles text;
BEGIN
  SELECT qual, with_check, roles INTO v_owner_qual, v_owner_check, v_owner_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_scorecards'
      AND policyname='owner_all_scorecards';
  SELECT qual, roles INTO v_pub_qual, v_pub_roles
    FROM pg_policies WHERE schemaname='public' AND tablename='wisehire_scorecards'
      AND policyname='public_read_scorecard';

  IF v_owner_qual IS NULL AND v_pub_qual IS NULL THEN
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "owner_all_scorecards" ON public.wisehire_scorecards';
  EXECUTE 'DROP POLICY IF EXISTS "public_read_scorecard" ON public.wisehire_scorecards';

  IF v_owner_qual IS NOT NULL THEN
    EXECUTE format(
      'CREATE POLICY "scorecards_owner_insert" ON public.wisehire_scorecards AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      COALESCE(v_owner_check, v_owner_qual)
    );
    EXECUTE format(
      'CREATE POLICY "scorecards_owner_update" ON public.wisehire_scorecards AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      v_owner_qual,
      COALESCE(v_owner_check, v_owner_qual)
    );
    EXECUTE format(
      'CREATE POLICY "scorecards_owner_delete" ON public.wisehire_scorecards AS PERMISSIVE FOR DELETE TO authenticated USING (%s)',
      v_owner_qual
    );
  END IF;

  v_roles := pg_temp.__rls_render_roles(
    ARRAY(
      SELECT DISTINCT unnest(
        COALESCE(v_owner_roles, ARRAY['authenticated']::name[]) ||
        COALESCE(v_pub_roles, ARRAY['anon','authenticated']::name[])
      )
    )::name[]
  );

  EXECUTE format(
    'CREATE POLICY "scorecards_select" ON public.wisehire_scorecards AS PERMISSIVE FOR SELECT TO %s USING ((%s) OR (%s))',
    v_roles,
    COALESCE(v_owner_qual, 'false'),
    COALESCE(v_pub_qual, 'false')
  );
END
$wh_scorecards_fix$;

COMMIT;
