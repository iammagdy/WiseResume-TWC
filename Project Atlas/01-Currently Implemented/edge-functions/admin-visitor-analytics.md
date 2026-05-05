# admin-visitor-analytics

**Last verified:** 2026-05-05 (Task #6 — deployed to production)

DevKit backend for the Visitors panel. Requires admin auth (`requireAdminAuth`).

| action | description |
|---|---|
| `kpis` | total/unique visits today + in range, new vs returning, top country, mobile/desktop %, device + browser breakdown |
| `country-dist` | page_view counts grouped by `country`, sorted descending |
| `top-pages` | pages ranked by view count + unique sessions (top 20) |
| `click-targets` | click targets ranked by count, optionally filtered by `page` (top 30) |
| `sections` | section_view counts ranked, with unique visitor count (top 20) |
| `sessions` | paginated session list; groups raw events by session_id; returns duration, page count, event count |
| `journey` | full ordered event stream for a given `anon_id` or `session_id` (limit 500) |
| `cohort` | pages visited by converted visitors (those with a user_id after stitching) |

All actions accept `range` (`today` | `7d` | `30d` | `90d`). `sessions` accepts `page_num` (0-indexed).

- **Production status**: ACTIVE — deployed 2026-05-05 via `supabase functions deploy`
- **RPCs used**: `count_distinct_visitor_anon_ids(p_start)`, `visitor_new_vs_returning(p_start)` (both applied in migration 20260607000001)
