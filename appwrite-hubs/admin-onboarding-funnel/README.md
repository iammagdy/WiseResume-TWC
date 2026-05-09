# admin-onboarding-funnel

Appwrite Function that serves the **OnboardingFunnelPanel** with step-by-step drop-off metrics for the profile-creation onboarding flow.

## Request / Response

### Request body

```json
{ "days": 14, "granularity": "day" }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `days` | number | `14` | Rolling window in days (1, 7, 14, 30, 90) |
| `granularity` | `"day"` \| `"week"` | `"day"` | Time-series bucket size |

### Response

```json
{
  "success": true,
  "data": {
    "rangeFrom": "2026-04-25T00:00:00.000Z",
    "rangeTo":   "2026-05-09T12:34:56.789Z",
    "totalEvents": 843,
    "truncated": false,
    "funnel": [
      { "step": "started",       "users": 320 },
      { "step": "path_selected", "users": 270 },
      { "step": "review_opened", "users": 210 },
      { "step": "completed",     "users": 180 }
    ],
    "methodBreakdown": [
      { "method": "manual",   "count": 140 },
      { "method": "cv_upload","count": 110 },
      { "method": "linkedin", "count":  20 }
    ],
    "skipRates": [
      { "step": "path_selected", "count": 12, "denominator": 282, "rate": 0.043 }
    ],
    "saveFailures": [
      { "message": "Validation failed: email required", "count": 7 }
    ],
    "series": [
      { "date": "2026-04-25", "started": 22, "path_selected": 18, "review_opened": 14, "completed": 12 }
    ]
  }
}
```

`truncated: true` is set when `totalEvents >= 9999` — the user should narrow the date range.

## Deploy

### Appwrite Console

1. Project → Functions → Create Function
2. Name: `admin-onboarding-funnel`
3. Function ID: `admin-onboarding-funnel`
4. Runtime: Node.js 18
5. Entry point: `src/main.js`
6. Set Function Variables (see below)
7. Deploy source: upload this directory (zip `admin-onboarding-funnel/`)

### CLI

```bash
appwrite functions createDeployment \
  --functionId admin-onboarding-funnel \
  --entrypoint src/main.js \
  --code ./appwrite-hubs/admin-onboarding-funnel \
  --activate true
```

## Required Function Variables

| Variable | Value |
|---|---|
| `DEVKIT_PASSWORD` | Shared secret (same across all admin-* functions) |
| `APPWRITE_API_KEY` | API key with `databases.read` scope |
| `APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `69fd362b001eb325a192` |

## Required Collection — `audit_logs` (database `main`)

Documents in this collection must have `category = 'onboarding'` to be picked up.

| Attribute | Type | Description |
|---|---|---|
| `user_id` | string? | Appwrite user `$id` (or `anon_id` for unauthenticated) |
| `anon_id` | string? | Anonymous visitor ID (fallback when user_id absent) |
| `category` | string | Must be `'onboarding'` |
| `action` | string | `started` / `path_selected` / `review_opened` / `completed` / `skipped` / `save_failed` |
| `metadata` | object? | Extra fields — `method` (for path_selected), `step` (for skipped), `message` (for save_failed) |

Collection permissions: read access for the API key used above.

## Funnel steps

| Step key | Label | Description |
|---|---|---|
| `started` | Started | User landed on the onboarding welcome screen |
| `path_selected` | Path picked | User chose CV upload, LinkedIn import, or manual |
| `review_opened` | Review opened | User reached the profile review step |
| `completed` | Completed | User finished and saved their profile |

## Execute permissions

Set to **team members only** (do not allow `any` / `guests`). Bearer token auth is applied at the application layer in addition to Appwrite permissions.
