# DevKit Stabilization And Operations Hub

Date: 2026-05-12
Status: Implemented on `codex/devkit-stabilization-ops`, pending deployment of updated Appwrite Functions.

## Source Of Truth

The DevKit is Appwrite-native. Admin data must come from Appwrite Functions using server-side Appwrite API keys, not direct browser reads for cross-user data.

The DevKit login flow is now server-issued:

1. The lock screen sends the entered DevKit password to `admin-devkit-data` with action `verify-devkit-session`.
2. The function compares it to `DEVKIT_PASSWORD`.
3. The function returns a short-lived signed DevKit token.
4. The browser stores only the signed token, not the raw DevKit password.
5. Admin function calls send `Authorization: Bearer <signed-token>` through the Appwrite SDK body shim as `__headers.Authorization`.

`VITE_DEV_KIT_PASSWORD` must not be used as an access-control secret.

## Implemented Surfaces

- `src/lib/devkit/devKitClient.ts`: unified DevKit client, normalized `DevKitResult`, typed `DevKitError`, and server-login helper.
- `src/lib/appwrite-functions.ts`: clearer Appwrite Function failure classification.
- `src/pages/DevToolsPage.tsx`: Operations Hub navigation with status labels and blocked panels for missing prerequisites.
- `src/components/dev-kit/DiagnosticsPanel.tsx`: first-class diagnostics panel.
- `appwrite-hubs/admin-devkit-data/src/main.js`: signed session issuance, signed token verification, diagnostics, mission control, and standardized admin data actions.
- `appwrite-hubs/inspect-ai-keys/src/main.js`: accepts signed DevKit tokens.

## Live Appwrite Audit Findings

Audit target: Appwrite project `69fd362b001eb325a192`, region `fra`.

Functions found and enabled:

- `admin-devkit-data`
- `inspect-ai-keys`
- `ai-gateway`
- `admin-feature-flags`
- `admin-email`
- `admin-testmail`
- `admin-visitor-analytics`

Functions not deployed as standalone functions:

- `admin-list-users`
- `admin-audit-logs`

Collections found:

- `profiles`
- `subscriptions`
- `ai_credits`
- `resumes`
- `admin_audit_logs`
- `app_settings`
- `usage_events`

Collections missing:

- `audit_logs`
- `feature_flags`
- `error_log`
- `discount_codes`
- `visitor_events`
- `contact_requests`

Because those collections are missing, the Operations Hub marks related panels as needing schema instead of letting them execute broken requests.

## Required Deployment Steps

Deploy updated Appwrite Functions before expecting production DevKit login to work:

- `admin-devkit-data`
- `inspect-ai-keys`

After deployment, verify:

- Wrong DevKit password returns `INVALID_PASSWORD`.
- Correct DevKit password returns a signed token.
- Stored browser session token is not the raw password.
- Diagnostics panel loads and lists function/schema/env readiness.
- AI Keys panel accepts the signed token.

## Known Remaining Work

Create missing collections before enabling their panels as Live:

- `feature_flags` for Feature Control.
- `error_log` for Observability.
- `discount_codes` for Coupons.
- `visitor_events` for Live Visitors and visitor analytics.
- `contact_requests` for Live Activity contact feed.
- Optional `audit_logs` only if legacy app flows still need it; admin audit source is `admin_audit_logs`.

Update additional admin functions to accept signed DevKit tokens before marking their panels Live:

- `admin-feature-flags`
- `admin-email`
- `admin-testmail`
- `admin-visitor-analytics`

The current branch avoids calling not-ready panels from the UI, so admins see blockers instead of generic execution failures.
