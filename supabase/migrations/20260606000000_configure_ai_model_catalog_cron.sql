-- Task #15: Configure the refresh_ai_test_models cron job so the DevKit
-- AI Key Slots panel gets a live model catalog instead of the 6-entry seed.
--
-- Root cause: the previous migrations (20260520000001, 20260503000001) both
-- required `app.cron_secret` and `app.edge_functions_url` GUCs to be set as
-- database-level settings (ALTER DATABASE) before they would schedule the
-- job. Those GUCs were never set in production, so both migrations silently
-- skipped the schedule step. The cron has never run.
--
-- This migration:
--   1. Creates a SECURITY DEFINER helper function in the `private` schema
--      that reads the CRON_SECRET from Supabase Vault at runtime (no secret
--      stored in source control or in the cron.job command string).
--   2. Schedules a pg_cron job to call that function nightly at 03:17 UTC.
--
-- The CRON_SECRET must be stored in Supabase Vault under the name
-- 'cron_secret' before this job first fires. The vault row is created once
-- via the Supabase Management API and is never committed to source control.
--
-- After this migration runs, trigger a one-shot manual refresh via:
--   POST /admin-ai-ops { "action": "refresh-test-models" }  (admin auth)
-- so the catalog is populated immediately without waiting for 03:17 UTC.

DO $$
DECLARE
  has_pg_cron boolean;
  has_pg_net  boolean;
  has_vault   boolean;
  existing_id bigint;
  fn_url      text := 'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/admin-ai-ops';
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')           INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')            INTO has_pg_net;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault')    INTO has_vault;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping refresh_ai_test_models schedule.';
    RETURN;
  END IF;

  -- ── 1. Create the helper function ──────────────────────────────────────────
  -- The function lives in `private` (not `public`) so it is not accessible
  -- via PostgREST. It reads the CRON_SECRET from Supabase Vault at call time —
  -- the secret value is never embedded in the scheduled command string or in
  -- any migration source file.
  EXECUTE format($func$
    CREATE OR REPLACE FUNCTION private.exec_refresh_ai_test_models()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, vault, extensions
    AS $body$
    DECLARE
      cron_secret text;
      fn_url      text := %L;
    BEGIN
      -- Read secret from Supabase Vault (preferred) with GUC fallback.
      BEGIN
        SELECT decrypted_secret INTO cron_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_secret'
        LIMIT 1;
      EXCEPTION WHEN others THEN
        cron_secret := NULL;
      END;

      IF cron_secret IS NULL OR cron_secret = '' THEN
        cron_secret := current_setting('app.cron_secret', true);
      END IF;

      IF cron_secret IS NULL OR cron_secret = '' THEN
        RAISE WARNING 'refresh_ai_test_models: cron_secret not configured in Vault or GUC. '
          'Store the secret with: SELECT vault.create_secret(''<value>'', ''cron_secret'', '''');';
        RETURN;
      END IF;

      PERFORM net.http_post(
        url     := fn_url,
        headers := jsonb_build_object(
          'x-cron-secret', cron_secret,
          'x-admin-ai-op', 'refresh-test-models',
          'Content-Type',  'application/json'
        ),
        body    := '{"action":"refresh-test-models"}'::jsonb,
        timeout_milliseconds := 30000
      );
    END;
    $body$
  $func$, fn_url);

  RAISE NOTICE 'Created private.exec_refresh_ai_test_models().';

  -- ── 2. Schedule (idempotent — unschedule first if exists) ──────────────────
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'refresh_ai_test_models';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
    RAISE NOTICE 'Unscheduled existing refresh_ai_test_models job (id: %).', existing_id;
  END IF;

  PERFORM cron.schedule(
    'refresh_ai_test_models',
    '17 3 * * *',
    'SELECT private.exec_refresh_ai_test_models()'
  );

  RAISE NOTICE 'Scheduled refresh_ai_test_models cron job (nightly 03:17 UTC).';

  -- ── 3. Soft-fail GUC attempt ───────────────────────────────────────────────
  -- These require superuser. The EXCEPTION block makes this a no-op when the
  -- Management API runs migrations as a restricted role. Set them via the
  -- Supabase Dashboard → Database → Configuration if needed by other migrations.
  BEGIN
    EXECUTE format('ALTER DATABASE postgres SET "app.edge_functions_url" = %L',
      'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1');
    RAISE NOTICE 'Set app.edge_functions_url GUC.';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped app.edge_functions_url GUC (insufficient privilege).';
  END;
END $$;
