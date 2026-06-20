# DevKit Live Audit - 2026-06-20

## Scope

Audited `main` against live Appwrite project `69fd362b001eb325a192` using the local app at `http://127.0.0.1:5173/devkit`.

Admin identity verified:
- User ID: `69fd4c3d000b06337cd7`
- Labels: `admin`, `premium`, `mvp`
- DevKit login request ID: `dk_mqmj70zy_fa82cfba`

Browser note: the DevKit Home screen was visually confirmed unlocked in the Codex browser by screenshot. Direct browser automation was unavailable in this thread because the in-app browser control service failed to initialize, so the exhaustive automated browser-tab walk was performed at the live function/data layer rather than by clicking every tab in-browser.

## Preflight And Verification

- `main` was synced with `origin/main` before audit.
- Local app started successfully on port `5173`.
- `npm run build` passed before live testing.
- `npm run build` passed after live testing.
- Targeted DevKit ESLint passed with `0` errors and `1` existing warning:
  - `src/components/dev-kit/DeployHubsPanel.tsx`: `react-hooks/exhaustive-deps` warns that `loadFunctions` is missing from a `useEffect` dependency array.

## Panel And Tab Coverage

| Area | Live Backend Result | Evidence |
| --- | --- | --- |
| Home | Pass | `home-summary`, request `dk_mqmj71ah_4114e128`: site up HTTP 200, AI ready, maintenance off, WiseHire queue clear, 19 users |
| Mission Control | Pass | `mission-control`, request `dk_mqmj71ni_be343643`: deploy, AI, email, database, secrets, recent errors returned |
| Diagnostics | Degraded | `diagnostics`, request `dk_mqmj72ju_ef8937f3`: returned 46 items, `overallStatus: broken` |
| Observability / Telemetry | Pass | `observability/get_telemetry`, request `dk_mqmj9ekh_4d2b0f7f`: 0 telemetry rows, table present |
| Observability / Errors | Pass | `observability/get_error_stream`, request `dk_mqmj9ess_5476ec82`: 0 errors, table present |
| Growth / Analytics | Pass | `analytics`, request `dk_mqmj7468_99171515`: signups last 14 days = 2, page views empty state |
| Growth / Visitors | Pass | `admin-visitor-analytics/dashboard`: live data envelope returned |
| Growth / Live | Pass | `admin-visitor-analytics/live-count`: live count 0, explicit empty state |
| Data Integrity | Pass | `overview-stats`, request `dk_mqmj7ehe_0617bbd0`: 19 auth users, 62 resumes, 31 orphaned resumes |
| Users | Pass | `list-users-page`, request `dk_mqmj7feb_04b01508`: 19 users |
| User Drawer / Actions | Pass | Audit user set plan, trial grant/revoke, credits, suspend/unsuspend, revoke sessions all succeeded |
| User Drawer / Content | Pass | `list-user-content`, request `dk_mqmjc0hz_efe3e8a0`: 0 resumes for seeded audit user |
| User Drawer / Activity | Pass | `live-activity/user_content_stats`, request `dk_mqmjc0qo_35c4f7c0`: user stats returned |
| Database X-Ray | Pass | `list-all-resumes`, request `dk_mqmj7fvn_b2291980`: 5 documents from 93 total |
| Feature Flags | Pass | list returned empty state; create/edit/delete audit flag succeeded |
| AI Health / Overview | Pass | AI gateway activity returned 5 executions and usage stats |
| AI Health / Keys & Models | Pass | `inspect-ai-keys`: 10 keys and model defaults returned masked |
| AI Health / Routing | Pass | routing list returned 0 configs; temporary create/update/delete route succeeded |
| AI Tools Map | Pass | `list-routes`, request `dk_mqmj7l9k_63cbe2c8`: route map returned |
| AI Radar | Pass | `ai-request-analytics`, request `dk_mqmj7kqo_8cd4024f`: 176 requests in window, 60 credits charged |
| API Keys | Pass | `inspect-ai-keys`: 10 key records returned |
| Moderation / Bugs | Pass | `list_bug_reports`: 6 bug reports |
| Moderation / Blocklist | Pass | list empty; audit blocklist add/remove succeeded |
| Moderation / Queue | Pass | `list_moderation_queue`: 0 items, explicit empty state |
| Email / Send | Pass | `admin-email/email-actions diagnose`: Resend key configured |
| Email / Automations | Fail | `admin-email/resend-sync sync`: fails with missing `RESEND_AUDIENCE_ALL_USERS` |
| Email / Inbox | Pass | `admin-testmail/testmail-inbox`: configured, 0 emails |
| Email / Studio | Pass | Email templates path is covered by `email-actions` diagnostics and studio code path; no mutation sent from Studio |
| Coupons | Pass | list returned 1 code; audit-only code created and removed |
| Portfolios | Pass | directory list returned 3 rows; rules, reserved, exclusive, premium lists loaded |
| WiseHire Queue | Pass | `list-wisehire-waitlist`, request `dk_mqmj86nt_eb25b801`: 0 entries |
| Audit Log | Pass | `list-audit-logs`, request `dk_mqmj86w2_f382bd9b`: 8 rows from 28 total |
| System Test Runner | Partial | Backend smoke targets covered individually; browser runner button execution not automated |
| Appwrite Functions / Functions | Pass | `list-functions`, request `dk_mqmj87cy_48478a9e`: 23 functions |
| Appwrite Functions / Logs | Pass | `list-function-executions`, request `dk_mqmj87yz_e1721337`: 5 executions |
| Appwrite Functions / Deploy Status | Pass | `deploy-hubs-status`, request `dk_mqmj874c_c2178564`: ready, 5 required, 0 missing |
| Appwrite Functions / Hashes | Pass | `get-deployed-hashes`, request `dk_mqmj87r3_4c89959e`: hashes returned |

## Mutation Coverage

Seed prefix: `devkit_audit_20260620155431`

Temporary audit user:
- User ID: `6a36b7b8001d1c842e18`
- Email: `Magdy.saber+devkit_audit_20260620155431@outlook.com`

Passed actions:
- `set-plan`: request `dk_mqmjbx8s_d0cb2b52`
- `grant-trial`: request `dk_mqmjby37_26f72f6c`
- `revoke-trial`: request `dk_mqmjbywk_4ebaf8fa`
- `set-credits`: request `dk_mqmjbzkw_c356ed66`
- `save-note` and note delete: requests `dk_mqmjbzy3_6ca734a9`, `dk_mqmjc075_306f2665`
- `suspend-user` / unsuspend: requests `dk_mqmjc10o_c39184ec`, `dk_mqmjc1ea_3981aeee`
- `revoke-sessions`: request `dk_mqmjc1sz_a9b849d5`
- `delete-user`: request `dk_mqmjc7dx_1f970ad4`
- Feature flag create/edit/delete
- Blocklist add/remove
- Routing config create/update/delete
- Coupon create, then direct cleanup from `discount_codes`
- Maintenance mode setting toggled and restored; final `maintenance_mode=false`

Not exercised:
- WiseHire waitlist approve/dismiss because the live waitlist is empty.
- Moderation queue review because the live queue is empty.
- Testmail send was not sent; inbox/config were verified and the audit mailbox was available.
- Appwrite hub redeploy was intentionally not triggered.

## Cleanup

Verified cleanup after audit:
- Auth user: `0`
- Profile: `0`
- Feature flag: `0`
- Blocklist entry: `0`
- Coupon: `0`
- Routing config: `0`
- Subscription residue: initially `1`, removed directly, verified `0`
- AI credits residue: initially `1`, removed directly, verified `0`
- Global setting restored: `maintenance_mode=false`

Audit log rows intentionally remain as system evidence of admin actions.

## Findings

### P1 - Email Automations Sync Cannot Run

Panel: Email / Automations
Function: `admin-email`
Action: `module=resend-sync`, `action=sync`
Observed error: `RESEND_AUDIENCE_ALL_USERS is not configured`
Impact: the Email Automations sync action will fail in DevKit until the Appwrite function variable is configured.

### P2 - Diagnostics Reports Broken Overall Status

Panel: Diagnostics
Function: `admin-devkit-data`
Action: `diagnostics`
Observed: request `dk_mqmj72ju_ef8937f3` returned `overallStatus: broken` across 46 diagnostic items.
Impact: DevKit can load, but at least one diagnostic check is reporting unhealthy. The next pass should inspect the specific failed diagnostic item in the UI or function response.

### P3 - User Delete Leaves Related Documents

Panel: Users
Function: `admin-devkit-data`
Action: `delete-user`
Observed: the DevKit delete-user action removed the auth user and profile, but left the audit user's `subscriptions` and `ai_credits` rows. They were removed manually during cleanup.
Impact: repeated admin deletes may leave orphaned subscription/credit documents.

### P3 - Appwrite Functions Panel Lint Warning

Panel: Appwrite Functions
File: `src/components/dev-kit/DeployHubsPanel.tsx`
Observed: targeted ESLint warning for missing `loadFunctions` dependency in `useEffect`.
Impact: low immediate risk, but should be fixed to avoid stale callback behavior.

## Final Status

The DevKit is broadly functional against live Appwrite. The main blocker found is Email Automations sync configuration. The delete-user cleanup gap is a real product issue but did not leave audit residue after manual cleanup. Build is healthy and the branch remains synced.

## Follow-Up Fix Status

Implemented in the follow-up change on 2026-06-20:
- Email Automations now supports `RESEND_SEGMENT_ALL_USERS` with `RESEND_AUDIENCE_ALL_USERS` as a legacy fallback, and sync returns a setup-required state instead of a 500 when configuration is missing.
- DevKit diagnostics now recognizes Admin Sentry by its deployed Appwrite function id `6a0760710000ff231048`.
- DevKit user delete now removes owned `subscriptions`, `ai_credits`, and `notifications` rows before profile/auth cleanup.
- The Appwrite hub deployment workflow and script now propagate the Resend segment/audience variables.
- The Appwrite Functions panel React hook warning is resolved.

Follow-up verification still required after deployment:
- Re-run live diagnostics and confirm `overallStatus` is no longer broken due to Admin Sentry.
- Re-run Email Automations stats/sync against live `admin-email`.
- Re-run seeded delete-user cleanup and confirm no subscription/credit/notification residue remains.
