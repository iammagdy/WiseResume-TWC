-- AI test model allow-list: dynamic refresh from each provider's /models endpoint.
--
-- Companion to the `refresh-ai-test-models` edge function. The function
-- writes a single `app_settings` row keyed by `ai_test_model_allowlist`
-- containing the curated per-provider model lists. The shape is:
--
--   {
--     "lastRefreshedAt": "2026-05-20T00:00:00Z",
--     "providers": {
--       "openrouter": {
--         "fetchedAt": "...",
--         "fetchOk": true,
--         "models": [{"id": "...", "tier": "free", "hint": "Free tier"}, ...]
--       },
--       "groq":     { ... },
--       "deepseek": { ... }
--     }
--   }
--
-- `inspect-ai-keys` and `ai-test` read this row through
-- `loadAITestModelCatalog()` and merge it with the hardcoded seed list in
-- `_shared/modelDefaults.ts` so admins always see at minimum the seed
-- models even if the scheduled refresh has never run.
--
-- This migration:
--   1. Inserts an empty placeholder row so the read path always succeeds
--      from day 1 (no row → defaults to seed list, but downstream code is
--      simpler when the row is at least present).
--   2. Schedules a nightly pg_cron job that hits the function via
--      net.http_post — only if pg_cron + pg_net are both available and
--      the cron secret + edge function URL are configured. Defensive: a
--      missing dependency or GUC silently skips the schedule and prints
--      a NOTICE so operators can finish wiring it up later.
--
-- ── Operator setup checklist ──────────────────────────────────────────
--   Edge Function Secrets:
--     CRON_SECRET            — shared secret the cron job sends in `x-cron-secret`.
--     OPENROUTER_KEY_1       — used to fetch OpenRouter /models (public, but the
--                              header conventions match the test-call path).
--     GROQ_KEY_1             — required: Groq /models needs Bearer auth.
--     DEEPSEEK_KEY (or _1)   — required: DeepSeek /models needs Bearer auth.
--
--   Database GUCs (set once via ALTER DATABASE postgres SET ...):
--     app.cron_secret        — same value as CRON_SECRET above.
--     app.edge_functions_url — base URL for edge functions, e.g.
--                              'https://<project-ref>.supabase.co/functions/v1'.
--
--   Then re-run this migration (or the DO block below) to (re)schedule the job.

-- 1. Seed an empty placeholder row so the read path always sees a JSON object.
INSERT INTO public.app_settings (key, value, updated_at)
VALUES (
  'ai_test_model_allowlist',
  jsonb_build_object(
    'lastRefreshedAt', NULL,
    'providers', jsonb_build_object(
      'openrouter', jsonb_build_object('fetchedAt', NULL, 'fetchOk', false, 'models', '[]'::jsonb),
      'groq',       jsonb_build_object('fetchedAt', NULL, 'fetchOk', false, 'models', '[]'::jsonb),
      'deepseek',   jsonb_build_object('fetchedAt', NULL, 'fetchOk', false, 'models', '[]'::jsonb)
    )
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Conditionally schedule the nightly refresh job.
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
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping refresh-ai-test-models schedule.';
    RETURN;
  END IF;

  -- Pull the cron secret and edge function base URL from GUCs. Both must be
  -- set or we skip — never fall back to an empty header that would 401.
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
      'skipping refresh-ai-test-models schedule. Set both then re-run this migration.';
    RETURN;
  END IF;

  fn_url := rtrim(fn_base_url, '/') || '/refresh-ai-test-models';

  -- Drop any prior schedule with the same name so re-running this migration
  -- updates the URL / secret cleanly.
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'refresh_ai_test_models';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
  END IF;

  -- Schedule daily at 03:17 UTC — outside peak admin traffic.
  PERFORM cron.schedule(
    'refresh_ai_test_models',
    '17 3 * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url     := %L,
        headers := jsonb_build_object(
          'x-cron-secret', %L,
          'Content-Type',  'application/json'
        ),
        body    := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
      $cmd$,
      fn_url,
      cron_secret
    )
  );

  RAISE NOTICE 'Scheduled refresh_ai_test_models cron job (URL: %).', fn_url;
END $$;
