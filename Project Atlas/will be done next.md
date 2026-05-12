# Will Be Done Next

Last updated: 2026-05-12

This file is the handoff note for the DevKit stabilization work that was interrupted because the chat context was nearly full. It records what was completed, what was merged, and what still needs to be done in the next session.

## Completed In Repo

Merged into `main` through PR #50, squash commit `e32920bbf1795aac1207a170ec26ca62a9898d66`.

Implemented source changes:

- Server-issued signed DevKit session flow through `admin-devkit-data` action `verify-devkit-session`.
- Unified frontend DevKit backend client in `src/lib/devkit/devKitClient.ts`.
- Safer DevKit auth storage in `src/lib/devkit/devKitAuth.ts`.
- Improved Appwrite Function error translation in `src/lib/appwrite-functions.ts`.
- New Diagnostics panel in `src/components/dev-kit/DiagnosticsPanel.tsx`.
- DevKit page converted into an Operations Hub shell in `src/pages/DevToolsPage.tsx`.
- `admin-devkit-data` updated to support signed token verification, diagnostics, mission control, overview stats, global stats, users page, audit logs, coupons, resumes, and error listing actions.
- `inspect-ai-keys` updated to accept signed DevKit tokens.
- Atlas documentation added under `Project Atlas/03-Implemented/devkit-stabilization-ops.md`.

## Completed Directly In Appwrite

Using the Appwrite API, the missing database collections were created or verified in database `main`:

- `feature_flags`
- `error_log`
- `discount_codes`
- `visitor_events`
- `contact_requests`
- `audit_logs`

Core attributes and indexes were added for those collections so the DevKit panels have real schema foundations instead of silently failing or showing fake empty states.

## Interrupted Work

The session was interrupted while moving from schema cleanup into live Appwrite Function deployment.

The next session should continue from this point:

1. Deploy and activate the updated `admin-devkit-data` function from `appwrite-hubs/admin-devkit-data`.
2. Deploy and activate the updated `inspect-ai-keys` function from `appwrite-hubs/inspect-ai-keys`.
3. Add or update required Appwrite Function variables where missing.
4. Re-run Diagnostics from the DevKit UI.
5. Update Atlas status notes after production verification.

## Live Appwrite Project Facts

Known Appwrite production values from the audit:

- Project ID: `69fd362b001eb325a192`
- Endpoint: `https://fra.cloud.appwrite.io/v1`
- Database ID: `main`
- Production URL fallback: `https://resume.thewise.cloud`

Do not commit API keys, DevKit passwords, provider keys, Resend keys, or Testmail keys to the repo.

## Function Deployment Next Steps

Use the Appwrite API or Appwrite CLI to package each function directory and create a new deployment with activation enabled.

Priority functions:

- `admin-devkit-data`
  - Runtime currently audited as Node 18.
  - Entrypoint: `src/main.js`.
  - Needs variables: `DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, optional `GITHUB_TOKEN`, optional `PRODUCTION_URL`.

- `inspect-ai-keys`
  - Runtime currently audited as Node 18.
  - Entrypoint: `src/main.js`.
  - Needs variables: `DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, AI provider keys as configured.

Recommended deployment check after activation:

- Confirm latest deployment status is `ready`.
- Confirm active deployment changed from the old deployment.
- Invoke `admin-devkit-data` with action `verify-devkit-session` using the DevKit password.
- Invoke `admin-devkit-data` action `diagnostics` using the returned signed token.
- Invoke `inspect-ai-keys` using the same signed token.

## Variables Still Missing Or Likely Needed

The audit showed some functions had missing environment variables:

- `admin-feature-flags` likely needs `APPWRITE_API_KEY` to read/write `feature_flags`.
- `admin-visitor-analytics` likely needs `APPWRITE_API_KEY` to read analytics collections.
- `admin-email` needs `APPWRITE_API_KEY` and `RESEND_API_KEY` before Email Center can be Live.
- `admin-testmail` needs `RESEND_API_KEY` and `TESTMAIL_API_KEY` before Testmail Inbox can be Live.

If the user does not provide Resend/Testmail secrets, keep Email Center and Testmail Inbox marked as blocked instead of pretending they work.

## UI Status Notes To Revisit

Because the missing collections were created after PR #50 was opened, these DevKit sidebar statuses should be revisited in a follow-up commit:

- `Observability` no longer needs to be blocked only because of missing `error_log` schema.
- `Live Activity` no longer needs to be blocked only because of missing `visitor_events` and `contact_requests` schema.
- `Coupons` no longer needs to be blocked only because of missing `discount_codes` schema.
- `Feature Control` can become Live only after `admin-feature-flags` has the required server variables and accepts the chosen DevKit auth model.

## Safety Rules For Next Session

- Never print or commit the Appwrite API key.
- Never store raw DevKit password in frontend code or localStorage.
- Do not mark a panel Live unless its backend function, variables, schema, and auth path are verified.
- Keep destructive or cleanup operations dry-run by default.
- Every write action should create an admin audit log.

## Definition Of Done

The DevKit stabilization is complete when:

- The merged repo source is deployed to Appwrite Functions.
- DevKit login returns a signed token from Appwrite.
- Diagnostics loads successfully and reports real health.
- Mission Control and AI Keys work with the signed token.
- Sidebar status labels match the real Appwrite deployment state.
- Project Atlas reflects final production truth after verification.
