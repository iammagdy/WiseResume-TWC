-- AUTH-2: cron-triggered Edge Functions now require an `x-cron-secret`
-- header instead of `Authorization: Bearer <CRON_SECRET>`.
--
-- This migration patches any existing pg_cron jobs that invoke
-- weekly-digest, send-resume-reminder, or wisehire-invite-reminder via
-- net.http_post(...). It rewrites the `headers` jsonb so the new header
-- is set to the value stored in the `app.cron_secret` GUC (or the
-- legacy `app.settings.cron_secret`). The legacy Authorization-based
-- header is removed from the same call.
--
-- The migration is intentionally defensive:
--   * it is a no-op if the `pg_cron` extension is not installed in this
--     environment (local dev, branch DBs, etc.);
--   * it is a no-op if the GUC is not set, so it will not silently
--     write an empty secret over a working configuration;
--   * it only touches commands that mention one of the three function
--     names, so unrelated cron jobs are never modified.
--
-- Operators must, before running this migration in production:
--   1. set `CRON_SECRET` in Supabase Edge Function Secrets, and
--   2. set the matching value as a database GUC, for example:
--        ALTER DATABASE postgres SET app.cron_secret = '<random-secret>';
--      (so net.http_post can read it via current_setting()).

DO $$
DECLARE
  has_pg_cron boolean;
  cron_secret text;
  job RECORD;
  new_command text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO has_pg_cron;

  IF NOT has_pg_cron THEN
    RAISE NOTICE 'pg_cron not installed; skipping cron header rewrite.';
    RETURN;
  END IF;

  -- Prefer the modern GUC name, fall back to the legacy nested key.
  BEGIN
    cron_secret := current_setting('app.cron_secret', true);
  EXCEPTION WHEN others THEN
    cron_secret := NULL;
  END;
  IF cron_secret IS NULL OR cron_secret = '' THEN
    BEGIN
      cron_secret := current_setting('app.settings.cron_secret', true);
    EXCEPTION WHEN others THEN
      cron_secret := NULL;
    END;
  END IF;

  IF cron_secret IS NULL OR cron_secret = '' THEN
    RAISE NOTICE 'app.cron_secret is not set; skipping cron header rewrite. '
      'Set it with: ALTER DATABASE postgres SET app.cron_secret = ''<secret>''; '
      'then re-run this migration or update jobs manually.';
    RETURN;
  END IF;

  FOR job IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE command ILIKE '%weekly-digest%'
       OR command ILIKE '%send-resume-reminder%'
       OR command ILIKE '%wisehire-invite-reminder%'
  LOOP
    -- Strip any existing Authorization-bearer or x-cron-secret entries
    -- from the headers jsonb literal in the command, then inject the
    -- canonical x-cron-secret header. This is a textual rewrite because
    -- pg_cron stores the command as plain SQL text.
    new_command := regexp_replace(
      job.command,
      '''Authorization''\s*,\s*''Bearer\s+[^'']+''\s*,?\s*',
      '',
      'gi'
    );
    new_command := regexp_replace(
      new_command,
      '''x-cron-secret''\s*,\s*''[^'']+''\s*,?\s*',
      '',
      'gi'
    );
    -- Inject the new header pair as the first entry inside jsonb_build_object(...).
    new_command := regexp_replace(
      new_command,
      'jsonb_build_object\(',
      'jsonb_build_object(''x-cron-secret'', ' || quote_literal(cron_secret) || ', ',
      'i'
    );

    IF new_command <> job.command THEN
      PERFORM cron.alter_job(job_id := job.jobid, command := new_command);
      RAISE NOTICE 'Updated cron job % (id=%) to use x-cron-secret header.',
        job.jobname, job.jobid;
    ELSE
      RAISE NOTICE 'Cron job % (id=%) command unchanged (no jsonb_build_object header found); '
        'manual update required.', job.jobname, job.jobid;
    END IF;
  END LOOP;
END $$;
