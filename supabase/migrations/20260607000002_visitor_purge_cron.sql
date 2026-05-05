-- Schedule daily purge of visitor_events rows older than 365 days.
-- Calls the purge-old-visitor-events edge function at 03:00 UTC every day.
-- Requires pg_cron extension (enabled by default on Supabase Pro and above).
-- The CRON_SECRET value is read from the vault at runtime by the edge function;
-- this migration only wires the schedule — it does not store the secret in SQL.

select cron.schedule(
  'purge-old-visitor-events-daily',
  '0 3 * * *',
  $$
    select
      net.http_post(
        url      := 'https://jnsfmkzgxsviuthaqlyy.supabase.co/functions/v1/purge-old-visitor-events',
        headers  := jsonb_build_object(
                      'Content-Type',  'application/json',
                      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
                    ),
        body     := '{}'::jsonb
      )
  $$
);
