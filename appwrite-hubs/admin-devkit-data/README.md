# admin-devkit-data — Appwrite Function

Serves four DevKit admin panels via a single multi-action Appwrite Function:

| Panel | Action |
|---|---|
| Mission Control | `mission-control` |
| Analytics | `analytics` |
| Observability | `observability` |
| Live Activity | `live-activity` |
| Edge-fn Drift (Mission Control sub-panel) | `edge-fn-drift` |

---

## Deploy

### Via Appwrite Console (recommended for first deploy)

1. Open [Appwrite Console](https://cloud.appwrite.io) → project `69fd362b001eb325a192` → **Functions**.
2. Click **Create Function** → choose **Node.js 18** runtime.
3. Set the **Function ID** to exactly `admin-devkit-data`.
4. After creation, go to **Variables** and add all required variables (see below).
5. Go to **Deployments** → **Create Deployment** → upload a zip of this directory.
6. The zip must contain `package.json` and `src/main.js` at the root level (not nested in a subdirectory).

### Via Appwrite CLI / SDK

```bash
cd appwrite-hubs/admin-devkit-data
npm install --omit=dev
tar -czf ../../admin-devkit-data.tar.gz .
appwrite functions createDeployment \
  --functionId admin-devkit-data \
  --entrypoint src/main.js \
  --code ../../admin-devkit-data.tar.gz \
  --commands "npm install --omit=dev" \
  --activate true
```

Before deploying, verify the archive shape:

```bash
tar -tzf ../../admin-devkit-data.tar.gz | head
```

The first entries must include `package.json`, `src/main.js`, and `node_modules/` at the archive root. If the archive starts with a nested repo folder, the live runtime can fail with `Cannot find module 'node-appwrite'`.

---

## Function Variables

Set these in Appwrite Console → Functions → `admin-devkit-data` → **Variables**.

| Variable | Required | Description |
|---|---|---|
| `DEVKIT_PASSWORD` | **Yes** | Shared admin password. Every request must carry `Authorization: Bearer <DEVKIT_PASSWORD>`. |
| `APPWRITE_API_KEY` | **Yes** | Server API key with `databases.read` + `databases.write` scopes. Generate in Appwrite Console → API Keys. |
| `GITHUB_TOKEN` | No | GitHub PAT with `repo:read` scope. Used in `mission-control` to fetch the latest commit SHA and timestamp from `iammagdy/WiseResume-TWC`. Without this, the deploy card shows no commit info. |
| `RESEND_API_KEY` | No | Resend API key. Used in `mission-control` to ping the Resend API and verify the key type (full-access vs restricted). |
| `OPENROUTER_KEY_1` | No | OpenRouter API key. Used in `mission-control` AI provider ping. |
| `OPENROUTER_KEY_2` | No | Second OpenRouter key (shown as `openrouter2` in the UI). |
| `GROQ_KEY_1` | No | Groq API key. Used in `mission-control` AI provider ping. |
| `PRODUCTION_URL` | No | Production site URL to HTTP-ping. Defaults to `https://thewise.cloud`. |

`APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by the Appwrite runtime — do not set them manually.

---

## Request / Response Shapes

All requests use `POST` with a JSON body. The frontend calls this function through the Appwrite Functions client and the shared DevKit backend helper.

### Auth

Login uses `action: "verify-devkit-session"` and returns a short-lived signed token. Protected requests include:
```
Authorization: Bearer <signed-devkit-token>
```

The function still accepts the raw `DEVKIT_PASSWORD` as a legacy bearer token for server-side smoke checks, but the browser must store only the signed token.
Missing or incorrect token → `401 { success: false, error: "Unauthorized" }`.

---

### `action: "mission-control"`

**Request body:**
```json
{ "action": "mission-control" }
```

**Response:**
```ts
{
  isDevEnvironment: boolean;
  checkedAt: string;                // ISO timestamp
  deploy: {
    ok: boolean;
    lastCommitAt: string | null;    // ISO timestamp from GitHub API
    sha: string | null;             // 7-char short SHA
    branch: string;                 // always "main"
    repoConfigured: boolean;        // true when GITHUB_TOKEN is set
    repoUrl: string | null;
    productionUrl: string;
    siteUp: boolean;
    sitePingedAt: string;
    siteHttpStatus: number;
  };
  ai: {
    providerPings: Array<{
      provider: string;             // "openrouter" | "openrouter2" | "groq"
      ok: boolean;
      latencyMs: number | null;
      httpStatus: number;
    }>;
    openrouterConfigured: boolean;
    openrouter2Configured: boolean;
    groqConfigured: boolean;
    anyProviderOk: boolean;
    allProvidersOk: boolean;
    keysInSupabaseVault: boolean;   // always false (Supabase decommissioned)
  };
  email: {
    resendKeyPresent: boolean;
    reachable: boolean;
    httpStatus: number;
    sends24h: null;                 // not yet implemented
    keyInSupabaseVault: boolean;    // always false
    reason?: "restricted_key" | "missing_key" | string;
  };
  database: {
    ok: boolean;
    error: string | null;
    errorCount1h: number | null;
  };
  secrets: {
    items: Array<{
      key: string;
      label: string;
      present: boolean;
      source: "appwrite_function_variable";
      lastRotatedAt: null;
      stale: false;
      daysSinceRotation: null;
    }>;
    missingCount: number;
    staleCount: number;
  };
  recentErrors: Array<{
    id: string; message: string; context: string | null; created_at: string; level: string;
  }>;
  recentAdminActions: Array<{
    id: string; action: string; category: string | null;
    metadata: Record<string, unknown> | null; created_at: string; user_id: string | null;
  }>;
}
```

---

### `action: "analytics"`

**Request body:**
```json
{ "action": "analytics", "range": "7d" }
```
`range` values: `"today"` | `"7d"` | `"30d"` | `"90d"` | `"all"`.

**Response:** `{ data: PremiumAnalyticsData }` — see `src/components/dev-kit/analytics/types.ts` for the full TypeScript type.

---

### `action: "observability"`

#### Get telemetry
```json
{ "action": "observability", "obs_action": "get_telemetry" }
```
Response: `{ telemetry: TelemetryRow[] }` — or `{ missing_table: true }` if `edge_function_logs` collection does not exist.

#### Get error stream
```json
{
  "action": "observability",
  "obs_action": "get_error_stream",
  "since": "2026-05-01T00:00:00.000Z",
  "function_name": "admin-devkit-data",
  "severity": "error"
}
```
All filters optional. Response: `{ errors: ErrorRow[] }` — or `{ missing_table: true }` if `error_log` collection does not exist.

#### Mark reviewed
```json
{ "action": "observability", "obs_action": "mark_reviewed", "error_id": "<doc-id>" }
```
Response: `{ success: true }`.

---

### `action: "live-activity"`

```json
{ "action": "live-activity", "resource": "usage_events" }
{ "action": "live-activity", "resource": "error_log" }
{ "action": "live-activity", "resource": "contact_requests" }
```
Responses: `{ data: UsageEvent[] }` / `{ data: ErrorLogRow[] }` / `{ data: ContactRequest[] }`.
`error_log` may return `{ missing: true, data: [] }` if the collection does not exist yet.

---

### `action: "edge-fn-drift"`

```json
{ "action": "edge-fn-drift" }
```
Response: `EdgeFnDriftData` — deployed function count, freshness (oldest/newest deploy timestamp, count older than 30 days), and auth posture.

---

## Appwrite Database Collections Read

All collections are in the `main` database (project `69fd362b001eb325a192`).

| Collection ID | Used by action(s) |
|---|---|
| `feature_flags` | `mission-control` (DB connectivity check) |
| `error_log` | `mission-control`, `observability`, `live-activity` |
| `admin_audit_logs` | `mission-control` |
| `usage_events` | `analytics`, `live-activity` |
| `ai_usage_logs` | `analytics` |
| `portfolio_visits` | `analytics` |
| `profiles` | `analytics` |
| `edge_function_logs` | `observability` (telemetry) |
| `contact_requests` | `live-activity` |

The `APPWRITE_API_KEY` must have **`databases.read`** permission on the `main` database and **`databases.write`** for `error_log` (to support `mark_reviewed`). Functions read/list permission is needed for `edge-fn-drift`.

---

## Notes

- `secrets.items[*].source` is `"appwrite_function_variable"` — the legacy `"supabase_vault"` value that the old Supabase function returned is intentionally replaced. The `MissionControlPanel.tsx` `SecretItem` type still has `'supabase_vault'` in its union — that value will be cleaned up when the frontend type is updated.
- `email.sends24h` is always `null` — Resend's API does not expose a sends-in-last-24h count without a paid analytics plan.
- `edge-fn-drift` requires the API key to have `functions.read` scope. If it lacks this, the response will return `deployedCount: 0` gracefully rather than throwing.
