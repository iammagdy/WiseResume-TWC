# purge-old-visitor-events

**Last verified:** 2026-05-05 (Task #4)

Cron retention sweep. Deletes `visitor_events` rows older than 90 days.

- **Auth**: `CRON_SECRET` header
- **Trigger**: scheduled cron (configure in Supabase dashboard)
- **Calls**: `SELECT purge_old_visitor_events(90)`
