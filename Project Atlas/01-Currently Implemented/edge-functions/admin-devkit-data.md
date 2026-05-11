# admin-devkit-data

**Last verified:** 2026-05-11 (Task #1 — update-plan action added, GITHUB_TOKEN set, redeployed)
**Type:** reference card
**Sources:**
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `appwrite-hubs/admin-devkit-data/package.json`
- `appwrite-hubs/admin-devkit-data/README.md`

**Canonical owner:** `appwrite-hubs/admin-devkit-data/README.md`

---

**What it does:** Multi-action Appwrite Function serving the DevKit admin panels. Routes on `body.action`:

| Action | Status | Panel served |
|---|---|---|
| `mission-control` | ✅ Implemented | Mission Control — deploy status, AI provider pings, email check, DB health, secrets inventory, recent errors and admin actions |
| `update-plan` | ✅ Implemented | God Mode — upserts a user's `subscriptions` document using the admin API key; body: `{ user_id, plan }` |
| `analytics` | ⏳ Pending migration | Analytics — usage event aggregates, DAU/WAU, top features, portfolio visits, country breakdown, cohort retention, plan distribution |
| `observability` | ⏳ Pending migration | Observability — edge function telemetry, error stream, mark-reviewed write |
| `live-activity` | ⏳ Pending migration | Live Activity — recent `usage_events`, `error_log`, and `contact_requests` docs |
| `edge-fn-drift` | ⏳ Pending migration | Mission Control sub-panel — deployed function count, oldest/newest deploy timestamps, auth posture |

**Note:** Unimplemented actions return `400 { success: false, error: "Unknown action: ..." }`. The AnalyticsPanel, ObservabilityPanel, and LiveActivityPanel all call unimplemented actions and will display error states until those handlers are added.

**Auth:** `Authorization: Bearer <DEVKIT_PASSWORD>` on every request. Missing or wrong token → 401.

**Runtime:** Node.js 18, Appwrite Cloud (project `69fd362b001eb325a192`, fra region).

**Function ID:** `admin-devkit-data`

**Function Variables:** All required variables (`DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, `GITHUB_TOKEN`, `RESEND_API_KEY`, `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, `GROQ_KEY_1`) are inherited from Appwrite project-level global variables — no per-function variable configuration is needed. `APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by the runtime. `PRODUCTION_URL` defaults to `https://thewise.cloud` if not set.

**Deployment:** `6a0147becead9e32fd4d` — status `ready`, active, built 2026-05-11. Live verification: returns `401 {"success":false,"error":"Unauthorized"}` for unauthenticated calls (function running correctly).

**Appwrite database collections read (all in `main` DB):**
`feature_flags`, `error_log`, `admin_audit_logs`, `usage_events`, `ai_usage_logs`, `portfolio_visits`, `profiles`, `edge_function_logs`, `contact_requests`, `subscriptions`, `resumes`

**Deployment artifact:** `appwrite-hubs/admin-devkit-data.tar.gz` — upload to Appwrite Console → Deployments → Create Deployment, entrypoint `src/main.js`.

---

**Related:**
- `appwrite-hubs/admin-devkit-data/README.md` — full deploy instructions + request/response shapes
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
- `src/components/dev-kit/MissionControlPanel.tsx`
- `src/components/dev-kit/AnalyticsPanel.tsx`
- `src/components/dev-kit/ObservabilityPanel.tsx`
- `src/components/dev-kit/LiveActivityPanel.tsx`
