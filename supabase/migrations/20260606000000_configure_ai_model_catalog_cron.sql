-- Task #15: Configure the refresh_ai_test_models cron job so the DevKit
-- AI Key Slots panel gets a live model catalog instead of the 6-entry seed.
--
-- Root cause: the previous migrations (20260520000001, 20260503000001) both
-- required `app.cron_secret` and `app.edge_functions_url` GUCs to be set as
-- database-level settings (ALTER DATABASE) before they would schedule the
-- job. Those GUCs were never set in production, so both migrations silently
-- skipped the schedule step. The cron has never run.
--
-- This migration is fully self-contained — no manual steps required:
--   1. Auto-seeds Supabase Vault with a random cron_secret if absent.
--   2. Creates private.exec_refresh_ai_test_models() — a SECURITY DEFINER
--      helper that reads the secret from Vault at call time (no secret in
--      the cron.job command string or any source file).
--   3. Schedules the pg_cron job nightly at 03:17 UTC (idempotent).
--
-- The edge function (admin-ai-ops) verifies callers by reading the same
-- Vault row via requireCronSecretOrVault() in _shared/webhookAuth.ts.
-- The CRON_SECRET env var (set in Edge Function Secrets) is also accepted
-- for backward compatibility with older deployments.
--
-- After this migration runs, trigger a one-shot manual refresh via:
--   POST /admin-ai-ops { "action": "refresh-test-models" }  (admin auth)
-- to populate the catalog immediately without waiting for 03:17 UTC.

DO $$
DECLARE
  has_pg_cron  boolean;
  has_pg_net   boolean;
  existing_id  bigint;
  vault_exists boolean;
  fn_url       text := 'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/admin-ai-ops';
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO has_pg_net;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping refresh_ai_test_models schedule.';
    RETURN;
  END IF;

  -- ── 1. Auto-seed Vault with a random cron_secret (idempotent) ──────────────
  -- If a 'cron_secret' row already exists (e.g. manually provisioned or from
  -- a previous migration run), we leave it in place. This INSERT is a no-op
  -- on re-runs, so the migration is safe to apply multiple times.
  --
  -- The edge function reads this row via requireCronSecretOrVault() as a
  -- fallback when the CRON_SECRET env var is not set. After running this
  -- migration you can optionally set CRON_SECRET in Edge Function Secrets to
  -- the same value (SELECT decrypted_secret FROM vault.decrypted_secrets
  -- WHERE name = 'cron_secret') to enable the fast env-var path; if you
  -- don't, the Vault path is used automatically and everything still works.
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM vault.secrets WHERE name = 'cron_secret'
    ) INTO vault_exists;

    IF NOT vault_exists THEN
      PERFORM vault.create_secret(
        gen_random_uuid()::text,
        'cron_secret',
        'CRON_SECRET for refresh_ai_test_models nightly cron job (Task #15)'
      );
      RAISE NOTICE 'Auto-seeded vault.cron_secret with a random UUID.';
    ELSE
      RAISE NOTICE 'vault.cron_secret already exists; skipping seed.';
    END IF;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Vault seed skipped (error: %); cron will fall back to app.cron_secret GUC.', SQLERRM;
  END;

  -- ── 2. Create private schema + helper function ──────────────────────────────
  -- private schema is not exposed by PostgREST so this function is not
  -- reachable from the API layer.
  CREATE SCHEMA IF NOT EXISTS private;

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
      -- Read CRON_SECRET from Supabase Vault (preferred).
      BEGIN
        SELECT decrypted_secret INTO cron_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_secret'
        LIMIT 1;
      EXCEPTION WHEN others THEN
        cron_secret := NULL;
      END;

      -- Fall back to GUC (set via dashboard or ALTER DATABASE if available).
      IF cron_secret IS NULL OR cron_secret = '' THEN
        cron_secret := current_setting('app.cron_secret', true);
      END IF;

      IF cron_secret IS NULL OR cron_secret = '' THEN
        RAISE WARNING
          'refresh_ai_test_models: no cron_secret found in Vault or GUC. '
          'Run: SELECT vault.create_secret(''<value>'', ''cron_secret'', ''''); '
          'then re-run this migration or manually call cron.schedule(...)';
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

  -- ── 3. Public helper function for edge-function Vault access ───────────────
  -- PostgREST does not expose the vault schema by default, so edge functions
  -- cannot query vault.decrypted_secrets via the REST API. This SECURITY
  -- DEFINER function in the public schema bridges that gap: it reads the
  -- cron_secret from Vault and returns it to the service_role caller only.
  -- requireCronSecretOrVault() in webhookAuth.ts calls this via supabase-js
  -- .rpc('get_cron_secret_internal') as the Vault fallback path.
  CREATE OR REPLACE FUNCTION public.get_cron_secret_internal()
  RETURNS text
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = vault, public
  AS $$
    SELECT decrypted_secret FROM vault.decrypted_secrets
    WHERE name = 'cron_secret' LIMIT 1;
  $$;
  REVOKE ALL ON FUNCTION public.get_cron_secret_internal() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.get_cron_secret_internal() TO service_role;
  RAISE NOTICE 'Created public.get_cron_secret_internal() (service_role only).';

  -- ── 4. Schedule (idempotent — unschedule first if exists) ──────────────────
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

  -- ── 5. Soft-fail GUC attempt ────────────────────────────────────────────────
  -- Requires superuser; silently skipped when running as a restricted role.
  -- Set via the Supabase Dashboard → Database → Configuration if needed.
  BEGIN
    EXECUTE format('ALTER DATABASE postgres SET "app.edge_functions_url" = %L',
      'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1');
    RAISE NOTICE 'Set app.edge_functions_url GUC.';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped app.edge_functions_url GUC (insufficient privilege).';
  END;
END $$;
