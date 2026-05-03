-- Task #55: re-point the `send-resume-reminder` pg_cron job at the
-- merged `transactional-email` router so cron parity is preserved
-- across the eventual deletion of the standalone send-resume-reminder
-- function.
--
-- The merged router dispatches on body.action="resume-reminder" with
-- an `x-transactional-email-action: resume-reminder` header fallback.
-- The resume-reminder handler keeps its original `requireCronSecret`
-- gate, so the existing CRON_SECRET continues to be the only auth
-- credential the cron job needs to send.
--
-- This migration is intentionally defensive: it is a no-op if pg_cron
-- or pg_net is not installed, if the relevant GUCs are not set, or
-- if no cron job currently references send-resume-reminder.
--
-- Operator setup checklist (unchanged from prior cron migrations):
--   Edge Function Secrets: CRON_SECRET.
--   Database GUCs: app.cron_secret, app.edge_functions_url.

DO $$
DECLARE
  has_pg_cron boolean;
  has_pg_net  boolean;
  cron_secret text;
  fn_base_url text;
  fn_url      text;
  job RECORD;
  new_command text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO has_pg_cron;
  SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')  INTO has_pg_net;

  IF NOT has_pg_cron OR NOT has_pg_net THEN
    RAISE NOTICE 'pg_cron or pg_net not installed; skipping send-resume-reminder cron repoint.';
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
      'skipping send-resume-reminder cron repoint. Set both then re-run this migration.';
    RETURN;
  END IF;

  fn_url := rtrim(fn_base_url, '/') || '/transactional-email';

  -- Rewrite any existing cron command that references send-resume-reminder
  -- so the URL points at transactional-email and the dispatch fields
  -- (header + body action) are added. The textual rewrite preserves any
  -- surrounding cron wiring.
  FOR job IN
    SELECT jobid, jobname, command
    FROM cron.job
    WHERE command ILIKE '%send-resume-reminder%'
  LOOP
    new_command := regexp_replace(
      job.command,
      '/send-resume-reminder',
      '/transactional-email',
      'g'
    );
    -- Inject the dispatch action into the headers (jsonb_build_object
    -- call constructs the headers map). Skip if a previous repoint
    -- already added it.
    IF new_command NOT ILIKE '%x-transactional-email-action%' THEN
      new_command := regexp_replace(
        new_command,
        'jsonb_build_object\(',
        'jsonb_build_object(''x-transactional-email-action'', ''resume-reminder'', ',
        'i'
      );
    END IF;

    -- Also inject body.action so the merged router's PRIMARY dispatch
    -- path matches (header fallback would route correctly on its own,
    -- but we set both surfaces to mirror the web helper). The legacy
    -- pg_cron command posts an empty `'{}'::jsonb` body — rewrite that
    -- to `'{"action":"resume-reminder"}'::jsonb`. Skip if already
    -- injected by a prior repoint.
    IF new_command NOT ILIKE '%"action":"resume-reminder"%'
       AND new_command NOT ILIKE '%''action'',%''resume-reminder''%' THEN
      new_command := regexp_replace(
        new_command,
        '''\{\}''::jsonb',
        '''{"action":"resume-reminder"}''::jsonb',
        'g'
      );
    END IF;

    IF new_command <> job.command THEN
      PERFORM cron.alter_job(job_id := job.jobid, command := new_command);
      RAISE NOTICE 'Re-pointed cron job % (id=%) at transactional-email/resume-reminder.',
        job.jobname, job.jobid;
    ELSE
      RAISE NOTICE 'Cron job % (id=%) command unchanged (no rewrite needed).',
        job.jobname, job.jobid;
    END IF;
  END LOOP;
END $$;
