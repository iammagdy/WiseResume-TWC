-- Fix the purge-old-visitor-events cron job registered in 20260607000002.
--
-- Problem with the original migration:
--   1. It called net.http_post() inline in the cron command string, but
--      pg_net is not installed on this project.
--   2. It read vault.decrypted_secrets WHERE name = 'CRON_SECRET' (uppercase),
--      but the vault row is named 'cron_secret' (lowercase).
--
-- Fix: have the cron job call public.purge_old_visitor_events() directly via
-- SQL instead of routing through the edge function via HTTP. This is simpler,
-- does not require pg_net or any secrets, and is the canonical pattern for
-- maintenance cron jobs that have a matching DB-side function.
--
-- The purge-old-visitor-events edge function still exists for manual/external
-- invocation (e.g. from the DevKit or API); the cron bypasses HTTP for
-- efficiency and reliability.

DO $$
DECLARE
  has_pg_cron boolean;
  existing_id bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) INTO has_pg_cron;

  IF NOT has_pg_cron THEN
    RAISE NOTICE 'pg_cron not installed; skipping purge-old-visitor-events schedule.';
    RETURN;
  END IF;

  -- Unschedule the broken job registered by 20260607000002 (if present).
  SELECT jobid INTO existing_id
  FROM cron.job
  WHERE jobname = 'purge-old-visitor-events-daily';

  IF existing_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_id);
    RAISE NOTICE 'Unscheduled stale purge-old-visitor-events-daily job (id: %).', existing_id;
  END IF;

  -- Re-schedule: directly call the DB function — no pg_net, no HTTP, no secrets.
  PERFORM cron.schedule(
    'purge-old-visitor-events-daily',
    '0 3 * * *',
    'SELECT public.purge_old_visitor_events()'
  );

  RAISE NOTICE 'Scheduled purge-old-visitor-events-daily cron job (daily 03:00 UTC).';
END $$;
