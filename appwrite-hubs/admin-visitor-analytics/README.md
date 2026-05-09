# admin-visitor-analytics

Appwrite Function that serves the **VisitorsPanel** and **MissionControlPanel** (live-count widget) with real visitor intelligence data.

## Actions

| `action` | Description | Returns |
|---|---|---|
| `live-count` | Active visitors in last 5 min | `{ liveCount, topCountries }` |
| `kpis` | KPI summary for the selected range | `{ data: KpiData }` |
| `country-dist` | Visit counts by country code | `{ data: CountryDist[] }` |
| `top-pages` | Most visited page paths | `{ data: PageRow[] }` |
| `click-targets` | Most-clicked data-track elements | `{ data: NamedCount[] }` |
| `sections` | Most-viewed page sections | `{ data: SectionRow[] }` |
| `sessions` | Paginated session list | `{ data: { sessions, total, page } }` |
| `cohort` | Unique visitors grouped by ISO week | `{ data: NamedCount[] }` |
| `journey` | All events for a session/visitor | `{ success, data: JourneyEvent[] }` |

### Request body

```json
{
  "action": "kpis",
  "range": "7d",
  "page_num": 0,
  "page": "/landing",
  "session_id": "sess_abc",
  "anon_id": "anon_xyz"
}
```

`range` accepts: `"today"` | `"7d"` | `"30d"` | `"90d"`.
`page_num` (sessions): 0-indexed page (50 sessions per page).
`page` (click-targets): optional path filter.
`session_id` / `anon_id` (journey): at least one required.

### live-count response

```json
{ "success": true, "liveCount": 12, "topCountries": [{ "country": "US", "count": 5 }] }
```

Note: for `live-count` the data fields are returned at the top level (not nested under `data`) to match the `unwrapAdminResponse` call in `MissionControlPanel.tsx`.

## Deploy

### Appwrite Console

1. Project → Functions → Create Function
2. Name: `admin-visitor-analytics`
3. Function ID: `admin-visitor-analytics`
4. Runtime: Node.js 18
5. Entry point: `src/main.js`
6. Set Function Variables (see below)
7. Deploy source: upload this directory (zip `admin-visitor-analytics/`)

### CLI

```bash
appwrite functions createDeployment \
  --functionId admin-visitor-analytics \
  --entrypoint src/main.js \
  --code ./appwrite-hubs/admin-visitor-analytics \
  --activate true
```

## Required Function Variables

| Variable | Value |
|---|---|
| `DEVKIT_PASSWORD` | Shared secret (same as `DEVKIT_PASSWORD` in `admin-devkit-data`) |
| `APPWRITE_API_KEY` | API key with `databases.read` scope |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |

## Required Collection — `visitor_events` (database `main`)

| Attribute | Type | Description |
|---|---|---|
| `session_id` | string | Browser session identifier |
| `anon_id` | string | Anonymous visitor ID (persistent cookie) |
| `user_id` | string? | Appwrite user `$id` if authenticated |
| `event_type` | string | `page_view` / `click` / `section_view` / `feature_use` |
| `page` | string? | URL path |
| `target` | string? | `data-track` attribute value for clicks |
| `section` | string? | Section name for section_view events |
| `country` | string? | 2-letter ISO country code |
| `device_type` | string? | `mobile` / `tablet` / `desktop` |
| `browser` | string? | Browser name |

Collection permissions: read access for the API key used above.

## Execute permissions

Set to **team members only** (do not allow `any` / `guests`). This function uses a Bearer token auth layer in addition to Appwrite's built-in permission system.
