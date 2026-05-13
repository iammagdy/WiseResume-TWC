# admin-devkit-data

**Last verified:** 2026-05-13 (DevKit login spinner recovery and profile sub-action fix; deployment `6a0415154ff4ed2b537e` ready)
**Type:** reference card
**Sources:**
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `appwrite-hubs/admin-devkit-data/package.json`
- `appwrite-hubs/admin-devkit-data/README.md`

**Canonical owner:** `appwrite-hubs/admin-devkit-data/README.md`

---

**What it does:** Multi-action Appwrite Function serving the DevKit admin panels. Routes on `body.action`.

| Action | Status | Panel served |
|---|---|---|
| `verify-devkit-session` | Implemented | DevKit login; returns a short-lived signed token when `DEVKIT_PASSWORD` matches |
| `diagnostics` | Implemented | Diagnostics panel health checks |
| `mission-control` | Implemented | Mission Control deploy status, AI provider pings, email check, DB health, secrets inventory, recent errors and admin actions |
| `list-users-page` | Implemented | God Mode / User 360 user list with server-side joins |
| `user-360` | Implemented | User profile, resumes, plan, credits, AI usage, audit context |
| `global-stats` | Implemented | DevKit global stats bar |
| `list-audit-logs` | Implemented | Audit log panel |
| `list-errors` | Implemented | Error stream / incident surfaces |
| `list-feature-flags` | Implemented | Feature Control read path |
| `update-feature-flag` | Implemented | Feature Control write path with audit logging |
| `provider-health` | Implemented | AI Command Center provider health |
| `data-hygiene-scan` | Implemented | Data Hygiene dry-run scan |
| `devkit-smoke-test` | Implemented | DevKit Runner smoke suite |
| `set-plan`, `set-credits`, `suspend-user` | Implemented | Support Tools safe admin writes with audit logging |

**Auth:** Login calls `action: "verify-devkit-session"` with the entered password. The function compares it server-side against `DEVKIT_PASSWORD` and returns a short-lived signed DevKit token. Protected actions use `Authorization: Bearer <signed-token>`; legacy direct `Authorization: Bearer <DEVKIT_PASSWORD>` is still accepted by the function but must not be stored in the browser.

**Runtime:** Node.js 18, Appwrite Cloud (project `69fd362b001eb325a192`, fra region).

**Function ID:** `admin-devkit-data`

**Function variables:** `DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, and optional `GITHUB_TOKEN` are configured on the live function. Appwrite masks variable values in management API responses, so verification should check presence by key and then execute a safe action. Optional provider/email variables (`RESEND_API_KEY`, `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, `GROQ_KEY_1`) may be function variables or project/global variables depending on deployment. `APPWRITE_FUNCTION_API_ENDPOINT` and `APPWRITE_FUNCTION_PROJECT_ID` are injected automatically by the runtime. `PRODUCTION_URL` defaults to `https://resume.thewise.cloud` if not set.

**Deployment:** `6a0415154ff4ed2b537e` - status `ready`, active, built 2026-05-13. Live verification after redeploy: `verify-devkit-session` with a deliberately wrong password returns completed execution, HTTP `401`, code `INVALID_PASSWORD`, and no runtime stderr. Local handler verification against live Appwrite data returns 2 Auth users, 1 verified user, 3 active-user-owned resumes, 31 orphaned resume documents, and exposes `test@thewise.cloud` as the unverified Auth user.

**2026-05-13 DevKit login spinner incident:** `/devkit` could remain stuck on "Issue DevKit Session" if the browser-side Appwrite execution promise did not return. Root cause at the UI layer was unbounded DevKit function invocations: `devKitLogin` and shared `devKitCall` waited forever for Appwrite SDK execution promises. The frontend now applies explicit timeouts: 15 seconds for login and 20 seconds for panel actions. Timed-out panel calls return structured `NETWORK_ERROR` DevKit errors instead of throwing past the panel helper. Verified locally on `localhost:5000/devkit` with a deliberately wrong password: the submit button re-enabled after the request path completed instead of staying disabled.

**2026-05-13 profile sub-action fix:** `UserDetailDrawer` previously sent duplicate `action` keys when loading profile fields (`update-profile` and `get`). JavaScript kept the later key, so the backend could receive the wrong top-level action. The contract is now `action: "update-profile"` plus `profile_action: "get"`; the live function was redeployed with the matching handler.

**2026-05-13 DevKit operations incident:** God Mode and infrastructure cards were misleading because the function used `profiles` as the user source of truth and counted every `resumes` document. Live Appwrite truth is 2 Auth users, 1 profile, and 34 resume documents; 31 resume documents belong to deleted/orphaned user IDs. God Mode now pages from Appwrite Auth users first, then joins profiles/subscriptions/credits/resume counts. Overview now shows active-user-owned resumes as the main count and reports orphaned resume documents separately. The function also avoids `node-appwrite` GET/list calls for read paths because this SDK version sends bodies on GET requests; internal REST GET helpers are now used for users, collections, functions, and document list/read actions.

**2026-05-13 DevKit access incident:** `/devkit` showed generic "Access denied" because the live `admin-devkit-data` deployment failed before auth with `Cannot find module 'node-appwrite'`. Root cause was deployment artifact drift: the root `admin-devkit-data.tar.gz` had been built with the wrong archive shape, so the runtime could not resolve dependencies. Rebuilt the root artifact from `appwrite-hubs/admin-devkit-data/` so `package.json`, `src/main.js`, and `node_modules/` are at archive root, then redeployed. Future deploys must verify the archive root with `tar -tzf admin-devkit-data.tar.gz` before upload.

**Appwrite database collections read/write (all in `main` DB):**
`profiles`, `subscriptions`, `ai_credits`, `resumes`, `admin_audit_logs`, `audit_logs`, `feature_flags`, `error_log`, `discount_codes`, `app_settings`, plus observability/usage collections used by diagnostics and live activity.

**Deployment artifact:** `admin-devkit-data.tar.gz` at repo root or `appwrite-hubs/admin-devkit-data.tar.gz`, but the archive must contain `package.json`, `src/main.js`, and `node_modules/` at the archive root. Upload to Appwrite Console or `functions.createDeployment`, entrypoint `src/main.js`, commands `npm install --omit=dev`.

---

**Related:**
- `appwrite-hubs/admin-devkit-data/README.md` - full deploy instructions + request/response shapes
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
- `src/pages/DevToolsPage.tsx`
- `src/lib/devkit/devKitClient.ts`
- `src/components/dev-kit/`
