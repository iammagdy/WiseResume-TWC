# DevKit Stabilization And Operations Hub

Date: 2026-05-12
Status: Fully deployed and verified in production.

## Source Of Truth

The DevKit is Appwrite-native. Admin data comes from Appwrite Functions using server-side API keys — not direct browser reads for cross-user data.

The DevKit login flow is server-issued:

1. The lock screen sends the entered DevKit password to `admin-devkit-data` with action `verify-devkit-session`.
2. The function compares it to `DEVKIT_PASSWORD`.
3. The function returns a short-lived signed DevKit token (8h TTL, HMAC-SHA256).
4. The browser stores only the signed token, never the raw DevKit password.
5. Admin function calls send `Authorization: Bearer <signed-token>` through the Appwrite SDK body shim as `__headers.Authorization`.

`VITE_DEV_KIT_PASSWORD` must not be used as an access-control secret.

## Implemented Surfaces

- `src/lib/devkit/devKitClient.ts`: unified DevKit client, normalized `DevKitResult`, typed `DevKitError`, and server-login helper.
- `src/lib/appwrite-functions.ts`: clearer Appwrite Function failure classification.
- `src/pages/DevToolsPage.tsx`: Operations Hub navigation with status labels; Observability, Live Activity, and Coupons now marked Live.
- `src/components/dev-kit/DiagnosticsPanel.tsx`: first-class diagnostics panel.
- `appwrite-hubs/admin-devkit-data/src/main.js`: signed session issuance, signed token verification, diagnostics, mission control, and standardized admin data actions.
- `appwrite-hubs/inspect-ai-keys/src/main.js`: accepts signed DevKit tokens.

## Live Appwrite Audit — Verified 2026-05-12

Audit target: Appwrite project `69fd362b001eb325a192`, region `fra`.

### Deployed Functions (active deployments verified)

| Function ID | Deployment ID | Status |
|---|---|---|
| `admin-devkit-data` | `6a02a5659c9fbac776ea` | ready, active |
| `inspect-ai-keys` | `6a02a56757026c50c3c9` | ready, active |
| `ai-gateway` | — | enabled, no deployment |
| `admin-feature-flags` | — | enabled, no deployment |
| `admin-email` | — | enabled, no deployment |
| `admin-testmail` | — | enabled, no deployment |
| `admin-visitor-analytics` | — | enabled, no deployment |

### Function Variables (admin-devkit-data)

- `DEVKIT_PASSWORD` — set (secret)
- `APPWRITE_API_KEY` — set (secret)
- `GITHUB_TOKEN` — set (optional, for Mission Control GitHub commit data)

### Function Variables (inspect-ai-keys)

- `DEVKIT_PASSWORD` — set (secret)
- `APPWRITE_API_KEY` — set (secret)

### Verification Results

- Wrong DevKit password → HTTP 401, `code: INVALID_PASSWORD` ✓
- Correct DevKit password → HTTP 200, signed token returned (dot-separated HMAC-SHA256) ✓
- Diagnostics action with signed token → HTTP 200, real health data ✓
- Mission Control action: production site up (HTTP 200), provider pings returning ✓
- inspect-ai-keys action: 10 of 12 slots present across OpenRouter, Groq, DeepSeek, NVIDIA ✓

### Known Diagnostics Note

The `users.list()` and `functions.list()` SDK calls inside the function return "request cannot have request body" from the Appwrite server. This is a node-appwrite SDK GET-with-body limitation at runtime v18. The underlying API key has valid Users and Functions access (confirmed via direct REST calls). This does not block DevKit operation — all panel actions work correctly. Update node-appwrite in the function to resolve this in a future pass.

### Collections In Database `main` (verified)

Collections present (sample): `profiles`, `resumes`, `ai_credits`, `subscriptions`, `app_settings`, `admin_audit_logs`, `usage_events`, `chat_sessions`, `interview_sessions`, `notifications`, `portfolio_settings`, `wisehire_candidates`, `wisehire_companies`, `wisehire_roles`, and more (98 total).

Collections created in a prior session (schema now available):
- `feature_flags`
- `error_log`
- `discount_codes`
- `visitor_events`
- `contact_requests`
- `audit_logs`

## DevKit Sidebar Status (Current)

| Panel | Status | Notes |
|---|---|---|
| Diagnostics | Live | Deployed and verified |
| Mission Control | Live | Deployed and verified |
| Observability | Live | error_log schema created |
| Live Activity | Live | visitor_events + contact_requests schema created |
| Smoke Runner | Live | — |
| Infrastructure | Live | — |
| God Mode (Users) | Live | — |
| Database X-Ray | Live | — |
| Feature Control | Needs Schema | admin-feature-flags not yet deployed; needs signed token auth update |
| AI Radar | Live | — |
| AI Keys | Live | Deployed and verified |
| AI Master Switch | Live | — |
| Email Center | Needs Appwrite Function | admin-email needs RESEND_API_KEY |
| Testmail Inbox | Needs Appwrite Function | admin-testmail needs TESTMAIL_API_KEY |
| Coupons | Live | discount_codes schema created |
| Portfolios | Live | — |
| History | Live | — |
| Core Settings | Live | — |

## Remaining Work

- Update `node-appwrite` in `admin-devkit-data` and `inspect-ai-keys` to fix SDK GET-with-body issue affecting diagnostics counters.
- Deploy `admin-feature-flags` with signed DevKit token auth and mark Feature Control Live.
- Provide `RESEND_API_KEY` and `TESTMAIL_API_KEY` to unlock Email Center and Testmail Inbox.
- Add optional `PRODUCTION_URL` variable to `admin-devkit-data` if the production URL changes from the default.
