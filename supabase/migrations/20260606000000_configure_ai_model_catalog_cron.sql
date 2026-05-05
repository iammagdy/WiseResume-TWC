-- Task #15: Configure the refresh_ai_test_models cron job so the DevKit
-- AI Key Slots panel gets a live model catalog instead of the 6-entry seed.
--
-- Root cause: the previous migrations (20260520000001, 20260503000001) both
-- required `app.cron_secret` and `app.edge_functions_url` GUCs to be set as
-- database-level settings (ALTER DATABASE) before they would schedule the
-- job. Those GUCs were never set in production, so both migrations silently
-- skipped the schedule step. The cron has never run.
--
-- This migration avoids the GUC dependency entirely by hardcoding the
-- project-specific values that are otherwise read from GUCs. It is safe to
-- re-run — it unschedules any existing job by name before re-creating it.
--
-- Hardcoded values (project ref: jnsfmkzgxsviuthaqlyy):
--   Edge fn URL: https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1
--   CRON_SECRET: stored in Supabase Edge Function Secrets; value rotated
--                as part of Task #15 (2026-06-06).
--
-- After this migration runs, also trigger a one-shot manual refresh via:
--   POST /admin-ai-ops { "action": "refresh-test-models" }  (admin auth)
-- so the catalog is populated immediately without waiting for 03:17 UTC.

DO $$
DECLARE
  has_pg_cron boolean;
  has_pg_net  boolean;
  fn_url      text;
  cron_secret text;
  existing_id bigint;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO has_pg_net;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping refresh_ai_test_models schedule.';
    RETURN;
  END IF;

  fn_url      := 'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/admin-ai-ops';
  cron_secret := '7c4ce5ea-1be4-44ab-bb00-dbcb50b47373';

  -- Drop any prior schedule so re-running this migration is idempotent.
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'refresh_ai_test_models';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
    RAISE NOTICE 'Unscheduled existing refresh_ai_test_models job (id: %).', existing_id;
  END IF;

  -- Schedule daily at 03:17 UTC — outside peak admin traffic.
  -- Sends both the x-admin-ai-op header and body.action for defence-in-depth.
  PERFORM cron.schedule(
    'refresh_ai_test_models',
    '17 3 * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'x-cron-secret', %L,
          'x-admin-ai-op', 'refresh-test-models',
          'Content-Type',  'application/json'
        ),
        body    := '{"action":"refresh-test-models"}'::jsonb,
        timeout_milliseconds := 30000
      );
      $cmd$,
      fn_url,
      cron_secret
    )
  );

  RAISE NOTICE 'Scheduled refresh_ai_test_models cron job (nightly 03:17 UTC → %).', fn_url;

  -- Also try to set the GUCs for future migration compatibility.
  -- These require superuser; the EXCEPTION block makes this a soft failure.
  BEGIN
    EXECUTE format('ALTER DATABASE postgres SET "app.edge_functions_url" = %L',
      'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1');
    EXECUTE format('ALTER DATABASE postgres SET "app.cron_secret" = %L', cron_secret);
    RAISE NOTICE 'Set app.edge_functions_url and app.cron_secret GUCs.';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped GUC ALTER DATABASE (insufficient privilege). '
      'Set app.edge_functions_url and app.cron_secret manually if needed.';
  END;
END $$;
