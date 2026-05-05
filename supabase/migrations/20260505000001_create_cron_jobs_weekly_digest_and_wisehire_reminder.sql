-- Create pg_cron jobs for weekly-digest and wisehire-invite-reminder.
--
-- These two jobs were never explicitly created in any prior migration —
-- earlier migrations only patched them if they already existed.
--
-- The CRON_SECRET value here matches what is stored in Supabase Edge
-- Function Secrets under the key CRON_SECRET. Both must be kept in sync
-- if the secret is ever rotated.
--
-- Schedules:
--   weekly-digest            → every Monday at 09:00 UTC  (0 9 * * 1)
--   wisehire-invite-reminder → every hour at :05          (5 * * * *)
--
-- Defensive: no-op if pg_cron or pg_net are not installed.

DO $$
DECLARE
  has_pg_cron   boolean;
  has_pg_net    boolean;
  cron_secret   text;
  fn_base_url   text;
  digest_url    text;
  reminder_url  text;
  existing_id   bigint;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO has_pg_net;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping cron job creation.';
    RETURN;
  END IF;

  -- Try GUC first (set by operator via ALTER DATABASE); fall back to
  -- the value baked in at migration time so this is not a no-op even
  -- when the GUC has not been configured.
  BEGIN
    cron_secret := current_setting('app.cron_secret', true);
  EXCEPTION WHEN others THEN
    cron_secret := NULL;
  END;
  IF cron_secret IS NULL OR cron_secret = '' THEN
    cron_secret := '346ef1c9137ab1406720feab996e223d0f0bb6f4bcc5377c6dfb62c2007f17b9';
  END IF;

  BEGIN
    fn_base_url := current_setting('app.edge_functions_url', true);
  EXCEPTION WHEN others THEN
    fn_base_url := NULL;
  END;
  IF fn_base_url IS NULL OR fn_base_url = '' THEN
    fn_base_url := 'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1';
  END IF;

  digest_url   := rtrim(fn_base_url, '/') || '/weekly-digest';
  reminder_url := rtrim(fn_base_url, '/') || '/wisehire-invite-reminder';

  -- ── weekly-digest ────────────────────────────────────────────────────────
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'weekly_digest';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
    RAISE NOTICE 'Unscheduled existing weekly_digest job (id=%) for replacement.', existing_id;
  END IF;

  PERFORM cron.schedule(
    'weekly_digest',
    '0 9 * * 1',
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
      digest_url,
      cron_secret
    )
  );
  RAISE NOTICE 'Created weekly_digest cron job → % (every Monday 09:00 UTC).', digest_url;

  -- ── wisehire-invite-reminder ──────────────────────────────────────────────
  SELECT jobid INTO existing_id FROM cron.job WHERE jobname = 'wisehire_invite_reminder';
  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
    RAISE NOTICE 'Unscheduled existing wisehire_invite_reminder job (id=%) for replacement.', existing_id;
  END IF;

  PERFORM cron.schedule(
    'wisehire_invite_reminder',
    '5 * * * *',
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
      reminder_url,
      cron_secret
    )
  );
  RAISE NOTICE 'Created wisehire_invite_reminder cron job → % (every hour at :05).', reminder_url;

END $$;
