# WiseResume Current Production State Snapshot

**Last Verified:** 2026-08-26
**Status:** `PAYMENTS_SESSION_CLOSED_SSL_PENDING` — The existing PR #198 Production status remains `DEPLOYED_VERIFIED_WITH_WARNINGS`. Payments Phase 2B deployed the exact approved Appwrite Function targets, but the custom RevenueCat webhook domain remains unavailable under strict TLS; no RevenueCat webhook or lifecycle activation occurred.

**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`

---

## Payments Phase 2C Sandbox lifecycle QA — 2026-08-26

* **Verified Pro path:** The existing QA fixture `6a8d5e4c0029004e93c3` has an active Paddle Sandbox Pro subscription represented in RevenueCat by one active Pro entitlement and one Sandbox `PURCHASES_INITIAL_PURCHASE` event. Appwrite has one processed matching `INITIAL_PURCHASE` ledger record and one active `revenuecat_subscription_state` record with `plan=pro`, `entitlement_id=pro`, the approved Pro price, and `will_renew=true`.
* **WiseResume result:** The provider-state row is the exact current Pro source; legacy `subscriptions` has no row for the QA user. The authenticated Arabic RTL UI still shows Pro, `50 / 50` workspace credits, Active status, and `0 / 50` daily usage after navigation/refresh verification.
* **Lifecycle boundary:** Repository-controlled fake-store tests pass 12/12 for TEST no-mutation, Ultimate normalization, lifecycle transitions, duplicate idempotency, stale-event rejection, resolver precedence, and schema contracts. Live duplicate replay, stale events, cancellation, billing issue, expiration, and Ultimate activation remain `UNVERIFIED` because no provider mutation, fabricated event, entitlement grant, or second payment is allowed.
* **Security warning:** A prior RevenueCat app-list response exposed plaintext Paddle Sandbox API-key fields. Values were not copied, stored, printed, reread, or recorded. The owner declined rotation; this remains `UNRESOLVED_SECURITY_WARNING`, and the phase is not fully secure. No further credential-bearing provider view/API was opened after the warning.
* **Evidence:** [`reports/2026-08-26-payments-phase2c-lifecycle-qa.md`](./reports/2026-08-26-payments-phase2c-lifecycle-qa.md)

## Payments Phase 2C sidebar overflow correction — 2026-08-26

* **Frontend merge/deployment:** PR [#216](https://github.com/iammagdy/WiseResume-TWC/pull/216) merged normally into `main` at `82d3640c743442db304c50cb57a229648685b59a`. GitHub Production deployment `6101175755` for that commit completed with `success` at `2026-08-26T09:44:10Z` through the normal Vercel main-branch path; no manual deployment occurred.
* **UI result:** The corrective two-file change makes the navigation region the single sidebar vertical scroll owner and keeps the membership/account footer outside the scroll region. Arabic RTL desktop QA at approximately 1526×811 showed the account/profile control, Manage billing, Pro card, and AI credits `50 / 50` all reachable. Plan & billing opened `/subscription`, which showed Pro, Active, and daily usage `0 / 50`. Dark and light desktop checks showed no visually apparent horizontal clipping.
* **QA boundary:** English LTR and reduced mobile-viewport QA remain `UNVERIFIED` because the connected live UI did not expose the feature-flagged locale switch and the available browser controls did not support viewport resizing. No billing/account mutation was performed. Detailed evidence is in [`reports/2026-08-26-sidebar-pr216-production-closeout.md`](./reports/2026-08-26-sidebar-pr216-production-closeout.md).
* **Payment boundary:** The Paddle Sandbox automatic Pro transaction/subscription evidence and the RevenueCat no-entitlement mismatch remain unchanged. The exact Appwrite source of the current Pro resolution remains `UNKNOWN`/`UNVERIFIED`; resume read-only collection/provider investigation next. Do not repeat payment, grant entitlement, or mutate provider configuration.

## Payments Phase 2B session closeout — 2026-08-23

* **Runtime:** Targeted workflow `32659598098` succeeded from `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` with exactly `revenuecat-webhook,coupons,ai-gateway,admin-devkit-data`; all selected Functions are enabled with latest Appwrite deployments `ready`. The API `live` flag is `false` for each and is not treated as an inferred Production-live claim.
* **Provider-state schema:** `revenuecat_subscription_state` and `revenuecat_event_ledger` are live, server-only, uniquely indexed, and at zero documents. Existing `subscriptions` was not destructively changed.
* **Custom domain:** `revenuecat-webhook.wiseresume.app` resolves through the required CNAME to `fra.cloud.appwrite.io`, but strict TLS fails hostname validation because the presented certificate SAN is `t.sni-820-default.ssl.fastly.net`; the insecure route diagnostic returns HTTP `421`. Current blocker: `APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`.
* **Provider boundary:** No RevenueCat Sandbox webhook or Production webhook was created; no lifecycle events were sent; no real customer subscription state was used; checkout remains disabled and Production payments remain inactive.
* **Credential warning:** A Paddle Sandbox API key was unintentionally exposed by a tool/MCP result during read-only inspection. The secret value is never recorded. Rotation is `ROTATION DEFERRED BY OWNER` and must occur before further provider activation or Production payment work.
* **Next action:** Re-check strict TLS and Appwrite certificate status first in a new session. If pending, stop. If valid, run the three transport smoke tests, then create a Sandbox-only RevenueCat webhook and use only a dedicated non-real test fixture for lifecycle verification.
* **Report:** [`reports/2026-08-23-payments-session-closeout.md`](./reports/2026-08-23-payments-session-closeout.md)

## Sentry production fixes — merged and deployed (2026-08-20)

* **Scope:** The minimal fixes for the Dashboard declaration-order crash, older-browser visitor IDs/web-vitals registration, and Appwrite Realtime heartbeat lifecycle handling were merged in PR #198. The browser Appwrite SDK is `26.2.0`, keeping heartbeat socket-state protection in maintained SDK code rather than a private application override. Current Applications source parity was verified; WISE-RESUME-13 and WISE-RESUME-Q received no speculative fixes.
* **Merge / deployment:** PR #198 merged at `2026-08-20T10:55:06Z` with commit `39c58a338eef75581b910741f932233a2defde63`. GitHub deployment record `6000810045` for environment `Production` completed successfully at `2026-08-20T10:57:02Z`; its Vercel target URL was `https://wise-resume-6fh0vfr31-iam-magdy.vercel.app`. The canonical site returned HTTP 200 with a Vercel cache hit and a last-modified time of `2026-08-20T10:57:27Z`.
* **Validation:** Six focused Vitest files passed with 32 tests; `npx tsc --noEmit`, `npm run build`, the no-sourcemap check, and `git diff --check` passed before merge. Existing Vite large-chunk warnings are advisory. No Appwrite deployment occurred or was required because no Appwrite function, schema, permission, or configuration changed.
* **Browser:** `/` **PASS** — landing rendered normally. `/dashboard` **PASS** — authenticated upload/import succeeded with a synthetic PDF, showed `Import complete!`, and persisted `Synthetic QA Candidate`. `/applications` **PASS_WITH_WARNINGS** — the workspace stabilized with tracker, filters, and activity and no `t is not defined` error. `/editor` **PASS_WITH_WARNINGS** — safely redirected to `/dashboard` without a resume context and did not produce a fatal error. `/tailoring-hub/result/__sentry_audit__` **PASS** — reached the explicit `Tailored resume unavailable` deleted-result terminal state without a blank root or visible Realtime exception. Live tailoring subscription updates were not exercised.
* **Sentry:** The latest read-only 7-day unresolved production query returned only WISE-RESUME-13 with 1 event and 0 users; its first and last seen timestamps were approximately two days before this verification. A direct 7-day aggregation for WISE-RESUME-16 found 5 events, all between `2026-08-19T21:06:53Z` and `2026-08-19T21:07:16Z`, before the deployment. No post-deployment recurrence was observed, and no Sentry issue was resolved, ignored, assigned, or otherwise changed.
* **QA artifact:** The authorized browser QA created a synthetic production resume named `Synthetic QA Candidate` in the Premium Tester account. Delete it manually if desired; no deletion was performed in this closeout.
* **Report:** [`reports/2026-08-20-sentry-production-fixes-local.md`](./reports/2026-08-20-sentry-production-fixes-local.md)

## Full post-change regression audit (2026-08-15)

* **Verdict:** `PASS_WITH_WARNINGS`. The final matrix covers all 111 source-declared routes: 46 `PASS`, 14 `PASS_WITH_WARNING`, 1 `PRODUCT_BUG`, 26 `FIXTURE_BLOCKED`, 18 `ACCESS_BLOCKED`, 5 `EXPECTED_REDIRECT`, and 1 `EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR`. No fatal console errors or unexpected network failures were observed on navigated routes. The required `ENVIRONMENT_ISSUE` route count is 0; mobile viewport and full dark-theme verification remain audit-level environment limitations, not inferred passes.
* **Proven regression:** `/share/:token` showed a blank page during slow/missing lookup because `SharePage.tsx` returned `null` while `usePublicResume` was loading and retrying. PR #188 merged the scoped `ShareSkeleton` fix and focused regression test into `main`; post-deployment verification of `/share/__invalid__` and `/ar/share/__invalid__` showed the skeleton transiently and then the explicit `Resume Not Found` terminal state, with no blank root or fatal console error.
* **Runtime:** The former `/devkit` `ReferenceError: module is not defined` was not reproduced after PR #185 and the authorized deployment. `/devkit` reached a live terminal state with all 24 panels marked `LIVE`; App Overview and Onboarding reached terminal states. `/devkit2` Command Home rendered live summary data; other v2 hubs explicitly remain Step 2 placeholders.
* **Deployment boundary:** Runs `31871663976`, `31875957559`, and `31879539590` failed before function deployment while PR #189 and PR #191 were being validated. Authorized run `31880840961` then passed the repository-controlled preflight/setup gates and deployed exactly the four approved functions. It also performed authorized repository-controlled production setup/configuration mutations: creation of `admin_reset_request_nonces`, `pdf_export_rate_limits`, and `pdf_export_active_leases`; selected function-variable synchronization; auth-template configuration; recovery-template synchronization; and `fn_deployed_hashes` updates. No other function was deployed. No manual Console mutation, `target=all`, unrelated mutation, permission broadening, unauthorized data mutation, or secret disclosure occurred. PR #189 corrected the repository/model-shape bug by reading `collection.$permissions`; PR #191 reconciled the complete live application-attribute contract as optional while preserving server-only fail-closed semantics. Vercel production remained `READY`; no manual Vercel deployment was performed.
* **PRs:** #188 — [fix(share): render loading state for public share lookups](https://github.com/iammagdy/WiseResume-TWC/pull/188) — merged into `main`; its final reviewed head was `9e13bb649b9f90965895adbdfce61f3648b774bf`, with implementation commit `49a2a9d33698f2dd143f747553fbe4005288898a` and merge commit `888ac4cdb13aea3728eb966db521918b1bf57db5`. #189 — [fix(appwrite): read Collection permissions from `$permissions`](https://github.com/iammagdy/WiseResume-TWC/pull/189) — merged into `main` with merge commit `fd88f91c13003764eac45955dbff8d92586b77bd`; its reviewed head was `7ef73c275181a594cb2856cfee4433cb5ce7c073`. #191 — [fix(appwrite): reconcile complete runtime receipts contract](https://github.com/iammagdy/WiseResume-TWC/pull/191) — merged into `main` with final main SHA `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; its squashed implementation commit reconciles all existing application attributes as optional while preserving types, indexes, defaults, and server-only security assertions. Applicable PR checks passed; TestSprite remained the known non-applicable `No tests detected` warning.
* **Report:** [`reports/2026-08-15-full-post-change-regression-audit.md`](./reports/2026-08-15-full-post-change-regression-audit.md)

## Targeted Appwrite deployment and post-deployment verification (2026-08-15)

* **Workflow:** Run `31880840961` completed successfully from main commit `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; exact target input was `ai-gateway,admin-devkit-data,admin-onboarding-funnel,email-service`. Conditional schema/setup preflight passed. No `target=all`, Console deployment, manual setup, or manual Vercel deployment was used.
* **Appwrite function parity:** Function IDs are the four target IDs (the deployment helper maps these hubs directly). All four were enabled, reached `ready`, and showed `In Sync` in the production DevKit inventory. Source hashes are the committed manifest values and match the deployed state.

| Function ID | Deployment ID | Source/deployed SHA-256 | Status |
|---|---|---|---|
| `ai-gateway` | `6a80467d45db108d5cab` | `158da0749573c9c2d7e173c256ee0d77f64c783536fcf920693ed1bb0715fafe` | `ready`, `In Sync` |
| `admin-devkit-data` | `6a804687cfea6415139d` | `6d23504f47c53d72354ca2bb2a46e6bb695b2df0e5442d99d708b7f9075e8804` | `ready`, `In Sync` |
| `admin-onboarding-funnel` | `6a8046923ac36d1cc638` | `efe2a22802e679c8d87e3089c8d284c26563b8c573f9b31b7db8440a0c57553c` | `ready`, `In Sync` |
| `email-service` | `6a80469d1ee51e0246e0` | `744f82a1bd0f4dc9679a9cd30dc56b6195def4f0449f857df6e1bcf510a0548a` | `ready`, `In Sync` |

* **DevKit:** `/devkit` left the admin-session/loading lifecycle and reached a live terminal state with all 24 panels marked `LIVE`. App Overview and Onboarding reached terminal states. Data Integrity and Users reported explicit backend unavailable/error states rather than fake zeroes. AI Health separated transport reachability from completion/key/model health; mixed slots displayed `Degraded / Mixed`; traffic reported the actual 50-record sample with 44 attributed and 6 Unknown/Unattributed. Observability showed a truthful empty state.
* **Public share:** `/share/__invalid__` and `/ar/share/__invalid__` both showed `ShareSkeleton` transiently and then reached `Resume Not Found`; no blank root or fatal console error was observed.
* **Email and route QA:** Read-only architecture and Console evidence proved that `send-verification` makes exactly one Appwrite `POST /account/verifications/email` request, does not call Resend directly, and depends on Appwrite’s configured Custom SMTP transport and Verification template. The live pre-fix template had blank subject/body fields and no saved `{{redirect}}` placeholder; this was a `PRODUCT REGRESSION / DEPLOYMENT CONFIG BUG` caused by repository-controlled template blanking. PR #194 merged the managed-template contract fix, and narrow authorized run `31882493172` targeted only `email-service`, created deployment `6a804f862b4138bc1b06`, and synchronized the functional Verification/recovery templates. The post-deployment Console view remained on a spinner, but the workflow log recorded successful PATCH completion. No approved QA identity/inbox was available, so the end-to-end inbox/link/confirmation lifecycle is `FIXTURE_BLOCKED`; no production email verification is claimed. The Email panel configuration check remained nonterminal with no console output and no send/reset action, classified as `TEST/AUTOMATION ISSUE or EXPECTED LIMITATION`, not a proven product/backend failure. A read-only 22-route HTTP smoke check returned the expected WiseResume shell and no fatal markers for every tested route; unknown-route server 404 semantics and mobile/full dark-theme coverage remain unverified. Unrelated pre-existing `coupons` and `public-share` drift was observed and intentionally not changed.
* **Final verdict for this email-verification workstream:** `FIXTURE_BLOCKED`. The proven repository-controlled blank Verification-template regression was fixed in PR #194 and applied by the narrow `email-service` run `31882493172`; however, no approved safe QA identity/inbox was available to prove message receipt, usable link resolution, Appwrite confirmation, or onboarding routing. This is not a deployment failure. No owner action is required for the completed deployment, but end-to-end email verification must not be described as production-verified until a safe fixture is supplied.

## Email verification safety audit and narrow correction (2026-08-15)

* **Architecture:** `appwrite-hubs/email-service/src/main.js` uses Appwrite’s official verification lifecycle: authenticated user JWT, exactly one `POST /account/verifications/email`, Appwrite-owned token, and Appwrite Custom SMTP/template delivery. It does not call Resend directly for verification.
* **Pre-fix live state:** Appwrite Auth > Templates > Verification showed blank subject and message fields with no saved `{{redirect}}`; Custom SMTP remained enabled with Resend transport metadata. The repository deployment helper had been setting the Verification subject/message to whitespace and logging that Resend was the branded verification sender. No separate proven mechanism transformed the blank Appwrite template into a usable verification message.
* **Classification:** `PRODUCT_REGRESSION / DEPLOYMENT CONFIG BUG`. PR #194 (`fix/email-verification-template-sync`) merged the shared managed-template contract and focused regression tests. The fix validates the redirect placeholder and prevents both deployment helpers from blanking the required template.
* **Narrow correction:** Authorized run `31882493172` targeted `email-service` only, created deployment `6a804f862b4138bc1b06`, reached ready status, synchronized the managed Verification and recovery templates, and updated the email-service deployment hash record. No other function was deployed.
* **QA boundary:** No approved safe QA identity/inbox was available. The requested signup/resend-to-inbox/link/confirmation/Appwrite-verified/onboarding sequence is therefore `FIXTURE_BLOCKED`; no verification token, link, secret, or real-user credential was used or recorded. The Appwrite Console post-deployment view remained a spinner, while the workflow log recorded successful template PATCH completion.
* **Email panel:** The non-destructive configuration check remained nonterminal with no browser-console output and no send/reset action. This is classified as `TEST/AUTOMATION ISSUE or EXPECTED LIMITATION`, not as a proven backend or product failure.

## AI runtime receipts schema contract remediation (2026-08-15; final live-contract reconciliation)

* **Status:** `MERGED_AND_LIVE_VERIFIED`. PR #187 established the earlier six-required-attribute hypothesis, but the subsequent live metadata and workflow evidence showed that contract was not truthful. PR #191 (`fix/appwrite-runtime-receipts-final-preflight` → `main`) superseded it and merged as `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; the authorized targeted deployment later passed the reconciled preflight and completed successfully.
* **Failed workflows:** Runs `31871663976` and `31875957559` stopped at the security assertion; run `31879539590` passed the `$permissions` gate and stopped at the first attribute mismatch: `request_id: required false (expected true)`. These three runs deployed no functions. Authorized run `31880840961` passed the corrected preflight and deployed exactly the four approved functions.
* **Security finding:** The current live `ai_runtime_receipts` collection was observed with `permissions=[]` and `documentSecurity=false`, so the reported server-only assertion failure is not reproducible from the present state. The exact historical failing operand and drift origin are `UNKNOWN`.
* **Contract finding:** The deterministic repository mismatch was the inverse of the earlier PR #187 assumption: the live `ai_runtime_receipts` application contract is all-optional for its existing string, integer, and boolean attributes. The six disputed fields are populated by writers, but writer population does not prove `required=true`. PR #191 changed only those six required flags back to optional; all other attribute types, sizes, defaults, and indexes remain unchanged.
* **Safety:** Server-only behavior remains enforced; diagnostics expose only permissions-array status, permission count, and document-security value. No automatic production security repair, permission broadening, or collection replacement was added.
* **Validation:** Focused suite passed with 8 tests; relevant Node syntax checks, `npx tsc --noEmit`, and `git diff --check` passed. PR Validation, Security validation, Vercel, and Vercel Preview Comments passed. TestSprite failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** The schema contract preflight passed in authorized run `31880840961`. The approved workflow performed the documented repository-controlled setup/configuration mutations, including idempotent collection setup and auth-template/configuration synchronization; it did not perform a manual Console mutation, permission broadening, unauthorized data mutation, or secret/environment disclosure. The four targeted functions subsequently deployed successfully with the exact parity recorded in the post-deployment section above.

## DevKit production crash hotfix (2026-08-15)

* **Status:** `MERGED_AND_PRODUCTION_VERIFIED`. PR #185 (`fix/devkit-module-boundary-hotfix` → `main`) matched head `46dc76f16a037d86a73d11b74f27a7e15ad744c6` and merged with commit `fe68327897ad95e924fb2941bcc5af44d156895e`.
* **Root cause:** Browser code imported the CommonJS Appwrite hub runtime `appwrite-hubs/admin-devkit-data/src/completion-health.js`, whose `module.exports` was evaluated in the browser and caused `ReferenceError: module is not defined` on `/devkit`.
* **Fix:** Frontend code now uses browser-safe ESM `src/lib/devkit/completionHealth.ts`; the deployable backend CommonJS classifier remains unchanged, preserving identical slot-health semantics.
* **Validation:** Focused DevKit suite passed with 1 file / 10 tests; `npx tsc --noEmit`, `git diff --check`, relevant backend `node --check` commands, and `npm run build` passed. Existing Vite large-chunk warnings remain non-blocking.
* **Checks:** PR Validation, Vercel preview, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Boundary:** The former browser crash was absent in post-deployment `/devkit` verification. No manual Vercel deployment or unrelated Appwrite deployment occurred; only the four authorized targets were deployed. No schema/permission change, secret/environment change, account change, or production-data change occurred.
* **Report:** [`reports/devkit/2026-08-15-module-boundary-hotfix.md`](./reports/devkit/2026-08-15-module-boundary-hotfix.md)

## DevKit Phase 1 PR #184 merge closeout (2026-08-15)

* **Verdict:** `MERGED_AND_PRODUCTION_VERIFIED_WITH_WARNINGS`. PR #184 head `04251b41f6661e1eb33f8f034cfa52b119e5a8bc` was merged into `main` with merge commit and final remote `main` SHA `9ff1f14a353cc2a82d95bee722e2e4f54f4f6580`.
* **Checks:** PR Validation, Security Validation, Vercel, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** The Phase 1 behavior was verified through the authorized targeted deployment and live DevKit checks. The automatic PR Vercel preview was not used as production deployment authorization; no unrelated function, schema, permission, secret, environment, account, or production-data change occurred.
* **Deployment result:** The four formerly pending candidates—`ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and `email-service`—were deployed only through authorized run `31880840961` and verified ready/In Sync. Unrelated pre-existing drift was left unchanged. Do not use `target=all`.
* **Report:** [`reports/devkit/2026-08-15-phase1-merge.md`](./reports/devkit/2026-08-15-phase1-merge.md)

## DevKit live verification closeout (2026-08-14)

* **Verdict:** `LIVE_PARTIALLY_VERIFIED_WITH_CONFIRMED_MISMATCHES`. The authenticated production DevKit was read in a live session without any mutation. Core panels loaded or returned explicit states, but App Overview and Onboarding remained skeleton/unavailable, so their analytics values were not verified independently.
* **Confirmed live observations:** Data Integrity displayed 44 Auth Users versus 33 Verified plus 10 Unverified; AI Health displayed 44 attributed calls under a `last 50 calls` label; AI Health provider pings were successful while AI Keys marked OpenRouter Slot 1 `Rate Limited`; and Appwrite Functions marked `ai-gateway` and `admin-devkit-data` `Needs Redeploy` because source/deployed hashes differed.
* **Verified scope:** Visitor Deep Dive explicitly disclosed a 5,000-event cap; Observability showed explicit empty states; Diagnostics reported 47 healthy, 0 warning, 0 broken, and 0 not configured; Mission Control and Diagnostics confirmed deployed/reachable posture but do not replace source-hash parity.
* **Finding classifications:** P1-01 `CONFIRMED_CODE_ONLY`; P1-02 `DOWNGRADED`; P2-01 `CONFIRMED_CODE_ONLY`; P2-02 `CONFIRMED_LIVE`; P2-03 `CONFIRMED_CODE_ONLY`; P2-04 `CONFIRMED_CODE_ONLY`; P2-05 `DOWNGRADED`.
* **Evidence boundary:** Direct independent equality for every protected Function aggregate was not established because raw response bodies were not replayed or retained. No code, Appwrite, schema, permission, environment, secret, deployment, account, production-data, or destructive DevKit action was changed.
* **Report:** [`reports/devkit/2026-08-14-live-data-verification.md`](./reports/devkit/2026-08-14-live-data-verification.md)

## DevKit Phase 1 fix branch (2026-08-14)

* **Status:** `IMPLEMENTED_VALIDATED_NOT_DEPLOYED`. Branch `fix/devkit-phase1-live-data`, implementation commit `c1600bc0a176b6af4911aefa94cfd82364532ea6`, created from clean `main`.
* **Scope:** Exact unverified Auth totals with an explicitly labelled ten-user sample; null-preserving backend failure semantics; effective-plan zero preservation; separate AI transport reachability and stored completion/key/model health; truthful actual usage sample and Unknown/Unattributed rows; bounded App Overview and Onboarding terminal states.
* **Validation:** Focused Phase 1 suite passed with 1 file and 4 tests; `npx tsc --noEmit`, changed-hub `node --check`, `git diff --check`, and `npm run build` passed. Existing Vite large-chunk warnings remain non-blocking.
* **Deployment drift:** Production read-only inspection confirmed `ai-gateway` and `admin-devkit-data` `Needs Redeploy`. `ai-gateway` is legacy PR #181 debt; `admin-devkit-data` has PR #181 drift plus this branch’s new changes. `admin-onboarding-funnel` was live `In Sync` before this branch and now requires a targeted deploy for its new backend error propagation. `email-service` remains a PR #181 targeted candidate, but distinct live parity was not visible in the fresh Functions slice; visible `admin-email` was `In Sync`.
* **Future targeted deploys:** `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and the PR #181 `email-service` candidate after exact-ID/status confirmation. No `target=all` operation is approved.
* **Boundary:** No PR, merge, deployment, Appwrite change, schema/permission change, secret/environment change, account change, production-data change, or destructive DevKit action occurred.
* **Report:** [`reports/devkit/2026-08-14-phase1-fix.md`](./reports/devkit/2026-08-14-phase1-fix.md)

## 1. System Overview

WiseResume is a full-stack, Appwrite-native application for resume building, AI tailoring, cover letter generation, and portfolio publishing.

```txt
[Client Browser]
  |
  +-- Vercel: React 18 / TypeScript 5 / Vite 6 SPA
  |
  +-- Appwrite Cloud (fra.cloud.appwrite.io)
      +-- Appwrite Auth
      +-- Appwrite Databases (main)
      +-- Appwrite Storage
      +-- Appwrite Functions
          +-- ai-gateway
          +-- resume-section-ai
          +-- job-import
          +-- portfolio, admin, email, and jobs hubs
```

## 2. Current Stack and Architecture

* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui, TanStack Query, and Zustand.
* **Frontend hosting:** Vercel. The current production deployment is `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d`; it is `READY` and owns the production aliases. The latest verified code-bearing deployment remains `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`.
* **Backend:** Appwrite Cloud Databases, Storage, and Serverless Functions.
* **Authentication:** Appwrite Auth exclusively.
* **Email verification:** `EMAIL_VERIFICATION_PRODUCTION_VERIFIED`. An authenticated user requests verification through `email-service` and Appwrite's official lifecycle; Appwrite owns the token and completion state, Custom SMTP uses Resend transport, and the configured Verification template supplies `{{redirect}}`. There is no custom parallel verification-token system, and manual Appwrite verification is not part of the normal flow.
* **AI:** Most product AI features route through the server-side `ai-gateway`. The explicitly documented standalone exceptions are `resume-section-ai` and `job-import`; browser code must never call provider APIs directly.
* **AI routing:** Current Tailoring production evidence used DeepSeek `deepseek-chat`. Provider pools and fallback rules are defined server-side; do not infer one universal order for every feature.
* **Payments/billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary and deprioritized.
* **Owner-scoped collections:** `user_preferences`, `jobs`, and `job_applications` use document security, collection-level user create permission, and owner-only document read/update/delete permissions.
* **Realtime CSP:** The active frontend CSP allows `wss://fra.cloud.appwrite.io`.
* **Visitor country:** Browser tracking does not call GeoJS. Server-side enrichment may use Appwrite request metadata; unknown country is acceptable.
* **Workspace Broadcasts:** `broadcasts` is server-only with empty collection permissions. Authenticated clients call the JWT-validated Vercel endpoint `GET /api/broadcasts`; owner-only publish/expire actions run through `admin-devkit-data`.

## 3. Current Product Status

* **Jobs ownership boundary:** `VERIFIED_WITH_RESIDUAL_QA`. A focused two-owner production check proved saved-job account isolation and authorized cleanup across reloads. It does not close tracker deletion, broader Saved Jobs rendering, deleted-resume tombstone, populated Jobs UI, LinkedIn, or the `0 remote jobs / Not yet synced` diagnosis.

* **Critical functionality smoke sequence:** `CLOSED`; follow-up export, owner-permission, Realtime, GeoJS, Premium Cover Letter, and Tailoring content-integrity work is documented and closed.
* **Performance Phase 1:** Closed. Its retained authenticated Broadcast `active` schema warning was resolved and production verified on 2026-07-24.
* **Performance Phase 2:** Editor startup closed with a retained cold-run warning.
* **Performance Phase 3:** Closed for approved scope, but Public Portfolio cold-mobile LCP remains `5.860 s` median against the `<4.0 s` target.
* **Performance Phase 4 timing/recovery:** Bounded provider timing, async execution, result-only recovery, duplicate prevention, idempotency, and exactly-once charging are production verified.
* **Tailoring current status:** `VERIFIED_READY`. Project identity, chronology, current state, and URLs are now preserved at both gateway and frontend merge boundaries. One controlled production action created child resume `6a62910a0013a37009a3`, retained both source projects and their exact metadata, materially rewrote both descriptions, charged exactly two credits, and survived refresh, direct reopen, and export-preview rendering.
* **Premium Cover Letter:** Generation, save, update, durable persistence, owner permissions, and one two-credit charge are proven. The exact original browser refresh/reopen trace was not retained.
* **Broadcast current status:** `PASS_WITH_WARNINGS`. The HTTP 400 is removed in production, authenticated workspace requests return 200, public standalone routes remain silent, and server-side active/expiry filtering plus dismissal are covered by focused tests. Production contains zero Broadcast records, so no real announcement was mutated for live visibility testing.
* **Performance sequence:** `CLOSED_WITH_PORTFOLIO_LCP_WARNING`; the remaining known performance warning is Public Portfolio cold-mobile LCP.
* **Email verification recovery:** `CLOSED`. One controlled resend was accepted by Appwrite through `email-service` (HTTP `200`), reached Resend with status `delivered`, was confirmed by the owner, and completed through the actual WiseResume verification action. Appwrite then marked the user verified, routed to onboarding, and the welcome email was delivered. LinkedIn first-time and existing-user production verification remain pending; Jobs QA is separate and retains its own evidence/status.

* **Email/password login:** `PRODUCTION_LOGIN_VERIFIED_WITH_UNVERIFIED_FAILURE_PATHS`. PR #183 is merged into `main` at `4bea728dba622ae2124d0192241cc7b26bdf6076`; its two login-fix commits `f29e612f` and `1f38dbb` are contained in `main`. Production served the merged AuthPage/AuthBold behavior. Authorized credentials redirected to the dashboard, and a deliberately invalid non-user pair displayed only the generic invalid-credential message. The confirmed root cause was generic masking of every Appwrite login failure as invalid credentials. The merged fix classifies safe failure categories, reconciles submit-time DOM values, trims email only, and preserves passwords exactly. Rate-limit, network/service, and unknown-auth-error paths were not intentionally triggered in production and remain `UNVERIFIED`; historical autofill/password-manager causation remains `UNCONFIRMED`.

## 4. Deployment State

* **Current Vercel deployment:** Atlas identifies documentation-only deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` as `READY` with production aliases. The canonical site returned HTTP 200 from Vercel and served AuthPage/AuthBold chunks containing the merged classifier and submit-time input markers. The public response does not expose a commit SHA, so runtime-to-Git mapping is supported by served bundle markers rather than a public header. Live successful-login and invalid-credential checks passed; rate-limit/network/service/unknown paths remain unverified.
* **Frontend code:** Commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42` remains the latest verified code-bearing deployment (`dpl_Hvot534UMdVDKrLwtDNuQHpiMigr`, `READY`).
* **Broadcast Appwrite target:** `admin-devkit-data` only.
* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`, run `30051406249`.
* **Active deployment:** `6a629b8351abe36cd0c3`, status `ready`.
* **Source hash:** `21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02`.
* **Schema:** `broadcasts` has eight attributes total, zero collection permissions, `documentSecurity: false`, zero documents, and an idempotent post-apply plan of zero.
* **Parity:** Deployed `admin-devkit-data` source matches the repository implementation.
* **Email-verification deployment context:** PR #194 merged the repository-controlled functional Appwrite Verification/recovery template fix. Authorized run `31882493172` targeted exactly `email-service`, created deployment `6a804f862b4138bc1b06`, reached ready status, and synchronized the managed templates. The final inbox/link/confirmation lifecycle remains `FIXTURE_BLOCKED` because no approved safe QA identity/inbox was available; this documentation closeout initiated no additional Appwrite or Vercel deployment.

## 5. Operational Rules

1. Pushes to `main` may trigger Vercel through Git integration. Do not change Vercel settings or environment variables without explicit authorization.
2. Appwrite functions deploy through `.github/workflows/deploy-appwrite-hubs.yml` or `scripts/deploy_hubs.cjs`.
3. Never use `target=all`; deploy only explicitly approved function targets.
4. Production is Vercel plus Appwrite. Hostinger deployment material is historical unless the owner explicitly assigns a separate legacy-domain task.
5. Do not replace Appwrite Auth/backend architecture, reactivate billing, change AI routing/models/credits, or alter schemas/permissions without a scoped owner-approved task.

## 6. Evidence

* [`WHERE_WE_STOPPED.md`](./WHERE_WE_STOPPED.md)
* [`deployment/current-deployment.md`](./deployment/current-deployment.md)
* [`reports/performance/production-performance-audit-2026-07-22.md`](./reports/performance/production-performance-audit-2026-07-22.md)
* [`reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md`](./reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md)
* [`qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md`](./qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md)
* [`qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md`](./qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md)
