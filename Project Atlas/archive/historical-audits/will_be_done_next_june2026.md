> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Will Be Done Next

Last updated: 2026-05-12

## Status

The DevKit stabilization work is fully deployed and verified. This file is updated to reflect what remains after the deployment session.

## What Was Completed In This Session

- Deployed `admin-devkit-data` (deployment `6a02a5659c9fbac776ea`, status: ready, active).
- Deployed `inspect-ai-keys` (deployment `6a02a56757026c50c3c9`, status: ready, active).
- Set `DEVKIT_PASSWORD` and `APPWRITE_API_KEY` on both functions.
- Verified DevKit login returns a signed HMAC-SHA256 token.
- Verified wrong password returns `INVALID_PASSWORD`.
- Verified Diagnostics, Mission Control, and AI Keys panels work with the signed token.
- Updated `DevToolsPage.tsx` sidebar: Observability, Live Activity, and Coupons changed from `Needs Schema` to `Live`.
- Added `ObservabilityPanel`, `LiveActivityPanel`, and `CouponsPanel` imports and switch cases.
- Updated Project Atlas to reflect verified production state.

## Known Issue: Diagnostics SDK GET-with-body

The `users.list()`, `functions.list()`, and `databases.listCollections()` calls inside the deployed function return "request cannot have request body" — a node-appwrite SDK limitation where the SDK sends a body on GET requests, which the Appwrite server rejects. The underlying API key has correct permissions (verified via direct REST). This causes the Diagnostics panel to show `broken` for those three checks only. All other DevKit operations are unaffected.

Fix: Update `node-appwrite` from `^11.1.1` to `^14.x` or later in both function `package.json` files and redeploy.

## Remaining Work (Prioritized)

### High — Fixes a false-positive broken status in Diagnostics
1. Update `node-appwrite` in `appwrite-hubs/admin-devkit-data/package.json` and `appwrite-hubs/inspect-ai-keys/package.json` to `^14.x`.
2. Redeploy both functions after the dependency update.
3. Re-run Diagnostics to confirm `auth-users`, `functions-list`, and `collections-list` show `healthy`.

### Medium — Enables Feature Control panel
4. Update `admin-feature-flags` function to accept the signed DevKit token (same `checkAuth` pattern as `admin-devkit-data`).
5. Add `DEVKIT_PASSWORD` and `APPWRITE_API_KEY` to `admin-feature-flags` Appwrite function variables.
6. Deploy `admin-feature-flags` and mark the Feature Control panel `Live` in `DevToolsPage.tsx`.

### Low — Requires user-supplied secrets
7. Provide `RESEND_API_KEY` to unlock Email Center.
8. Provide `TESTMAIL_API_KEY` to unlock Testmail Inbox.

## Live Appwrite Project Facts

- Project ID: `69fd362b001eb325a192`
- Endpoint: `https://fra.cloud.appwrite.io/v1`
- Database ID: `main`
- Production URL: `https://resume.thewise.cloud`

## Safety Rules

- Never print or commit the Appwrite API key or DevKit password.
- Never store raw DevKit password in frontend code or localStorage.
- Do not mark a panel Live unless its backend function, variables, schema, and auth path are verified.
- Keep destructive or cleanup operations dry-run by default.
- Every write action should create an admin audit log.
