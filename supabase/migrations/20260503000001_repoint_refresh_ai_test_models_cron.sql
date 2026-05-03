-- Task #53: re-point the nightly `refresh_ai_test_models` pg_cron job at
-- the merged `admin-ai-ops` router so cron parity is preserved across the
-- eventual deletion of the standalone `refresh-ai-test-models` function.
--
-- The merged router special-cases this action so the cron-secret auth
-- bypass still works — `requireCronSecret` is invoked when the request
-- carries `x-cron-secret`, exactly mirroring the original
-- `authenticate()` flow. Body shape: `{"action":"refresh-test-models"}`
-- (the router also accepts the `x-admin-ai-op` header; we send both for
-- defence-in-depth and to match the web helper's contract).
--
-- Operator setup checklist (unchanged from the prior migration):
--   Edge Function Secrets: CRON_SECRET, OPENROUTER_KEY_1, GROQ_KEY_1,
--                          DEEPSEEK_KEY (or _1).
--   Database GUCs: app.cron_secret, app.edge_functions_url.

DO $$
DECLARE
  has_pg_cron boolean;
  has_pg_net  boolean;
  cron_secret text;
  fn_base_url text;
  fn_url      text;
  existing_id bigint;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO has_pg_net;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping refresh-ai-test-models cron repoint.';
    RETURN;
  END IF;

  BEGIN
    cron_secret := current_setting('app.cron_secret', true);
  EXCEPTION WHEN others THEN
    cron_secret := NULL;
  END;
  BEGIN
    fn_base_url := current_setting('app.edge_functions_url', true);
  EXCEPTION WHEN others THEN
    fn_base_url := NULL;
  END;

  IF cron_secret IS NULL OR cron_secret = '' OR fn_base_url IS NULL OR fn_base_url = '' THEN
    RAISE NOTICE 'app.cron_secret and/or app.edge_functions_url GUC not set; '
      'skipping refresh-ai-test-models cron repoint. Set both then re-run this migration.';
    RETURN;
  END IF;

  fn_url := rtrim(fn_base_url, '/') || '/admin-ai-ops';

  -- Drop any prior schedule with the same name so re-running this migration
  -- updates the URL / secret / body cleanly.
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'refresh_ai_test_models';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
  END IF;

  PERFORM cron.schedule(
    'refresh_ai_test_models',
    '17 3 * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'x-cron-secret',  %L,
          'x-admin-ai-op',  'refresh-test-models',
          'Content-Type',   'application/json'
        ),
        body    := jsonb_build_object('action', 'refresh-test-models'),
        timeout_milliseconds := 30000
      );
      $cmd$,
      fn_url,
      cron_secret
    )
  );

  RAISE NOTICE 'Re-pointed refresh_ai_test_models cron job at admin-ai-ops (URL: %).', fn_url;
END $$;
