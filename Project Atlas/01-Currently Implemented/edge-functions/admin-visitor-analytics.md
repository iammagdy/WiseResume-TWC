# admin-visitor-analytics

**Last verified:** 2026-05-05 (Task #4)

DevKit backend for the Visitors panel. Requires admin auth (`requireAdminAuth`).

| action | description |
|---|---|
| `kpis` | unique visitors, sessions, page views, bounce rate, avg session length |
| `country-dist` | visitor counts grouped by `country_code` |
| `top-pages` | pages ranked by view count |
| `click-targets` | `[data-track]` targets ranked by click count, filterable by page |
| `sections` | `[data-section]` elements ranked by dwell-event count |
| `sessions` | paginated session list with device/browser/country/page count |
| `journey` | full ordered event stream for a single `session_id` |
| `cohort` | unique visitor + session counts grouped by calendar day |

All actions accept `range` (`1d` | `7d` | `30d` | `90d` | `all`) and `page` / `pageSize` for paginated actions.
