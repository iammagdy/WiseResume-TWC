# purge-old-visitor-events

**Last verified:** 2026-05-05 (Task #6 — deployed to production)

Cron retention sweep. Deletes `visitor_events` rows older than 365 days.

- **Auth**: `CRON_SECRET` via `x-cron-secret` header or `Authorization: Bearer <secret>`
- **Trigger**: daily pg_cron job (`0 3 * * *` UTC) — wired via migration `20260607000002_visitor_purge_cron.sql`
- **Calls**: `SELECT public.purge_old_visitor_events()` RPC (returns count of deleted rows)
- **Response**: `{ ok: true, deleted: <integer> }`
- **Production status**: ACTIVE — deployed 2026-05-05 via `supabase functions deploy`
- **Cron schedule**: ACTIVE — `cron.schedule('purge-old-visitor-events-daily', '0 3 * * *', 'SELECT public.purge_old_visitor_events()')` applied via migration `20260607000003_fix_visitor_purge_cron.sql`; calls DB function directly (no pg_net required; cron jobid 4 confirmed in production)
