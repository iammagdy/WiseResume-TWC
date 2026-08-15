# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-08-15
**Status:** `FULL_POST_CHANGE_REGRESSION_AUDIT_PASS_WITH_WARNINGS` — PR #187 remains merged into `main` with commit `2f779f36041cbd49117f4b15e6e87c179b1bc5da`; PR #188 public-share fix and PR #189 Appwrite permissions-shape fix are merged; deployment status remains `NOT_DEPLOYED`; no Appwrite or manual Vercel deployment was performed
**Location:** `Project Atlas/WHERE_WE_STOPPED.md`

---

## Full post-change regression audit (2026-08-15)

* **Verdict:** `PASS_WITH_WARNINGS`. The complete matrix covers all 111 source-declared routes: 46 `PASS`, 14 `PASS_WITH_WARNING`, 1 `PRODUCT_BUG`, 26 `FIXTURE_BLOCKED`, 18 `ACCESS_BLOCKED`, 5 `EXPECTED_REDIRECT`, and 1 `EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR`. Fatal console errors: `0`. Unexpected network failures: `0`. The route-level `ENVIRONMENT_ISSUE` total is `0`; real mobile viewport and full dark-theme testing remain environment-limited and are not claimed as passes.
* **Proven regression:** `/share/:token` blanked during slow/missing lookup because `SharePage.tsx` returned `null` while the retrying public-share query was loading. PR #188 merged the `ShareSkeleton` fix and one focused regression test into `main`; no separate production verification of the fix is claimed here.
* **Production:** Public, authenticated, Arabic/RTL, WiseHire public, DevKit v2, and representative protected routes rendered stable states. The former `/devkit` CommonJS crash was not reproduced; legacy `/devkit` remained at admin-session verification because its targeted backend was not deployed.
* **Deployment:** `NOT_DEPLOYED`. Workflow runs `31871663976` and `31875957559` both failed before deployment at the `ai_runtime_receipts` schema assertion (`permissionsIsArray=false, permissionCount=unknown, documentSecurity=false`); no function was deployed. The confirmed root cause was a repository/model-shape bug: the assertion read `collection.permissions`, while Appwrite Collection responses expose `$permissions`. PR #189 merged the corrected fail-closed assertion. No Appwrite Console, schema, permissions, secrets, environment variables, data, or manual Vercel deployment were changed.
* **PRs:** #188 — [fix(share): render loading state for public share lookups](https://github.com/iammagdy/WiseResume-TWC/pull/188) — merged; final reviewed head `9e13bb649b9f90965895adbdfce61f3648b774bf`, implementation commit `49a2a9d33698f2dd143f747553fbe4005288898a`, merge commit `888ac4cdb13aea3728eb966db521918b1bf57db5`. #189 — [fix(appwrite): read Collection permissions from `$permissions`](https://github.com/iammagdy/WiseResume-TWC/pull/189) — merged with merge commit `fd88f91c13003764eac45955dbff8d92586b77bd`; reviewed head `7ef73c275181a594cb2856cfee4433cb5ce7c073`. Applicable checks passed; TestSprite remains the known non-applicable `No tests detected` warning.
* **Report:** [`reports/2026-08-15-full-post-change-regression-audit.md`](./reports/2026-08-15-full-post-change-regression-audit.md)
* **Stop point:** PR #188 and PR #189 are merged; local main is synchronized and clean. The final read-only repository preflight remains to be run. Do not deploy from this task; any Appwrite deployment requires separate explicit owner authorization. After a future approved deployment, reverify both public-share variants and the legacy DevKit panels.

## AI runtime receipts schema contract remediation (2026-08-15)

* **Status:** `MERGED_VALIDATED_NOT_DEPLOYED`. PR #187 (`fix/ai-runtime-receipts-schema-contract` → `main`) matched implementation head `f99f250e85dfee468df2e3d99888333505114978`, received one docs-only follow-up, and merged with commit `2f779f36041cbd49117f4b15e6e87c179b1bc5da`.
* **Failed workflow:** Run `31871663976` failed at `scripts/setup_ai_runtime_receipts_schema.cjs`; no Appwrite function was deployed.
* **Security:** The current live collection was observed with `permissions=[]` and `documentSecurity=false`; the reported security assertion failure is not reproducible now, and its historical operand/origin is `UNKNOWN`.
* **Contract:** `request_id`, `hub`, `feature_id`, `status`, `completed_at`, and `expires_at` are now required in the repository contract. Other attributes and indexes remain unchanged.
* **Validation:** Focused AI runtime schema tests passed (8 tests); relevant Node syntax checks, TypeScript, and diff checks passed. PR Validation, Security validation, Vercel, and Vercel Preview Comments passed. TestSprite failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** `NOT_DEPLOYED`. No Appwrite setup or deployment, manual Vercel deployment, schema/permission mutation, secret/environment change, or production-data change occurred. The next action is a separate owner-authorized targeted deployment preflight after merge.

## DevKit production crash hotfix (2026-08-15)

* **Status:** `MERGED_PENDING_VERCEL_PRODUCTION_STATUS_AND_TARGETED_APPWRITE_DEPLOYMENT`. PR #185 (`fix/devkit-module-boundary-hotfix` → `main`) matched head `46dc76f16a037d86a73d11b74f27a7e15ad744c6` and merged with commit `fe68327897ad95e924fb2941bcc5af44d156895e`.
* **Root cause:** `/devkit` browser code imported the CommonJS Appwrite hub runtime `appwrite-hubs/admin-devkit-data/src/completion-health.js`, causing `ReferenceError: module is not defined` in the browser bundle.
* **Fix:** Frontend now uses browser-safe ESM `src/lib/devkit/completionHealth.ts`; backend CommonJS behavior remains unchanged and semantics remain identical.
* **Validation:** Focused DevKit suite passed with 1 file / 10 tests; TypeScript, diff check, relevant backend syntax checks, and production build passed. Existing large-chunk warnings are non-blocking.
* **Checks:** PR Validation, Vercel preview, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Boundary:** No Appwrite deployment or manual Vercel deployment occurred. No schema/permission change, secret/environment change, or production-data change occurred. All Appwrite deployments remain blocked pending separate targeted preflight approval; only normal Vercel production deployment status remains to be observed.
* **Report:** [`reports/devkit/2026-08-15-module-boundary-hotfix.md`](./reports/devkit/2026-08-15-module-boundary-hotfix.md)
* **Stop point:** PR #185 merge and Atlas closeout are complete. Await only the normal Vercel production deployment status; any Appwrite deployment requires a separate approved targeted-deployment task.

## DevKit Phase 1 PR #184 merge closeout (2026-08-15)

* **PR verification:** PR #184 (`fix/devkit-phase1-live-data` → `main`) had the required head `04251b41f6661e1eb33f8f034cfa52b119e5a8bc`. PR Validation, Security Validation, Vercel, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Merge:** PR #184 merged successfully at `2026-08-15T06:17:32Z` with merge commit `9ff1f14a353cc2a82d95bee722e2e4f54f4f6580`; `origin/main` is at the same SHA and contains the feature head.
* **Deployment:** `MERGED_PENDING_TARGETED_DEPLOYMENT`. No Appwrite deployment, manual Vercel deployment, schema/permission change, secret/environment change, account change, or production-data change occurred. The automatic PR preview is not a production deployment.
* **Next targeted Appwrite functions:** `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and the PR #181 `email-service` candidate after exact function-ID/status confirmation. Do not use `target=all`.
* **Report:** [`reports/devkit/2026-08-15-phase1-merge.md`](./reports/devkit/2026-08-15-phase1-merge.md)
* **Stop point:** Merge and documentation closeout are complete. Any deployment requires a separate approved targeted-deployment task and post-deployment verification.

## DevKit live verification closeout (2026-08-14)

* **Verdict:** `LIVE_PARTIALLY_VERIFIED_WITH_CONFIRMED_MISMATCHES`. The authenticated production DevKit session reached Home, Data Integrity, Users, Visitor Deep Dive, AI Health, AI Keys, Observability, Functions, Mission Control, and Diagnostics. App Overview and Onboarding remained skeleton/unavailable during repeated captures.
* **Confirmed live mismatches:** Data Integrity showed 44 Auth Users versus 33 Verified plus 10 Unverified; AI Health showed 44 attributed calls under a `last 50 calls` label; AI Health provider pings were successful while AI Keys marked OpenRouter Slot 1 `Rate Limited`; and `ai-gateway` plus `admin-devkit-data` showed `Needs Redeploy` hash drift.
* **Confirmed live scope disclosures:** Visitor Deep Dive disclosed a 5,000-event cap. Observability displayed explicit empty states. Diagnostics returned 47 healthy, 0 warning, 0 broken, and 0 not configured. Mission Control reported 28/28 deployed and no new drift for its posture check, which is distinct from source-hash parity.
* **P1/P2 classifications:** P1-01 `CONFIRMED_CODE_ONLY`; P1-02 `DOWNGRADED`; P2-01 `CONFIRMED_CODE_ONLY`; P2-02 `CONFIRMED_LIVE`; P2-03 `CONFIRMED_CODE_ONLY`; P2-04 `CONFIRMED_CODE_ONLY`; P2-05 `DOWNGRADED`.
* **Evidence boundary:** Protected Function response bodies were not replayed or retained as independent raw exports; therefore exact equality for every displayed aggregate is not claimed. No code, Appwrite, schema, permissions, environment variables, secrets, accounts, production data, deployments, or destructive DevKit actions were changed.
* **Report:** [`reports/devkit/2026-08-14-live-data-verification.md`](./reports/devkit/2026-08-14-live-data-verification.md)
* **Stop point:** Live verification and documentation closeout are complete. Do not implement fixes or run deployment/Appwrite operations from this task. Any remediation requires a separate approved task.

---

## DevKit Phase 1 fix branch closeout (2026-08-14)

* **Branch/commit:** `fix/devkit-phase1-live-data` at implementation commit `c1600bc0a176b6af4911aefa94cfd82364532ea6`, created from clean `main`.
* **Verdict:** `IMPLEMENTED_VALIDATED_NOT_DEPLOYED`. The scoped DevKit fixes are implemented locally and validated; no PR was opened and no merge or deployment occurred.
* **Implementation:** Exact unverified Auth totals now accompany an explicitly labelled ten-user sample; backend failures use `null` plus availability/error semantics; legitimate Premium/Pro zeroes remain zero; AI transport reachability is separate from stored completion/key/model health; the usage card reports the actual returned sample and Unknown/Unattributed rows; App Overview and Onboarding have bounded terminal states.
* **Validation:** Focused Phase 1 tests passed: 1 file / 4 tests. `npx tsc --noEmit`, changed-hub `node --check`, `git diff --check`, and `npm run build` passed. Existing Vite large-chunk warnings are non-blocking.
* **Deployment drift:** Read-only production Functions inspection confirmed `ai-gateway` and `admin-devkit-data` `Needs Redeploy`. `ai-gateway` is pending PR #181 debt; `admin-devkit-data` has PR #181 drift plus this branch’s changes. `admin-onboarding-funnel` was live `In Sync` before this branch and now needs a targeted deploy for the new error propagation. Distinct `email-service` parity was not visible in the fresh loaded slice; visible `admin-email` was `In Sync`, so the PR #181 `email-service` target remains to be confirmed before deployment.
* **Future targeted deploys:** `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and the confirmed PR #181 `email-service` target after exact-ID/status confirmation. Do not use `target=all`; obtain owner approval and run the required targeted workflow/preflight.
* **Boundary:** No Appwrite, schema, permissions, secrets, environment variables, accounts, production data, or destructive DevKit action changed.
* **Report:** [`reports/devkit/2026-08-14-phase1-fix.md`](./reports/devkit/2026-08-14-phase1-fix.md)
* **Stop point:** Implementation, local validation, read-only drift inspection, and Atlas documentation are complete. Push this branch for review only; do not open a PR, merge, or deploy from this task.

---

## Email/password login closeout (2026-08-14)

### Final production verification (2026-08-14)

* **Production deployment:** The canonical site `https://wiseresume.app` returned HTTP 200 from Vercel. Atlas identifies the current Vercel deployment as `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX`, status `READY`, with production aliases. The public response did not expose a commit SHA; the merged behavior was verified from the served AuthPage/AuthBold asset markers.
* **Successful login:** `PASS`. Authorized credentials redirected to `https://wiseresume.app/dashboard`, and the authenticated workspace rendered normally.
* **Invalid credentials:** `PASS`. A deliberately invalid non-user pair displayed only the generic `Invalid email or password. You can reset your password if needed.` message. No raw Appwrite error, credential, token, or internal detail appeared.
* **Email/password handling:** The deployed bundle includes email-only `.trim()` and exact password handoff. The observed successful login used the requested surrounding-email-whitespace path, but direct byte-level capture of the real submitted password was not performed.
* **Safe diagnostics:** `PASS` for the observed session; no console output or credential/token logging was observed after login.
* **Unverified:** Rate-limit, network/service-failure, and unknown-auth-error UI paths were not intentionally triggered in production. Autofill/password-manager causation remains `UNCONFIRMED`.


* **Merge:** PR #183 (`fix/login-error-classification` → `main`) merged successfully with merge commit `4bea728dba622ae2124d0192241cc7b26bdf6076`. Final `main` contains both login-fix commits `f29e612f` and `1f38dbb`.
* **Confirmed root cause:** The production email/password login path masked every Appwrite/authentication exception as `Invalid email or password`, so users could not distinguish invalid credentials from network, rate-limit, service, or unknown failures.
* **Merged behavior:** Safe user-facing authentication error classification, credential-safe diagnostics, submit-time DOM reconciliation for stale controlled/autofill/password-manager values, email surrounding-whitespace trimming only, and exact password preservation.
* **Historical boundary:** Autofill/password-manager state mismatch remains `UNCONFIRMED` as the cause of the historical incident. The verified root cause is login error masking.
* **Validation:** Required PR checks completed successfully; focused authentication tests, TypeScript validation, `git diff --check`, and production build passed. The non-required TestSprite pre-check reported `No tests detected` and did not block merge.
* **Deployment:** `PRODUCTION_LOGIN_VERIFIED_WITH_UNVERIFIED_FAILURE_PATHS`. No Appwrite change, schema/permission change, secret/environment change, manual Vercel deployment, or production-data change occurred. The current Vercel deployment is recorded as `READY`; runtime-to-Git SHA mapping is not exposed by the public response and is supported by served bundle markers.
* **Stop point:** Main is merged and final read-only production login verification is complete for deployment identity, successful login, invalid credentials, input-handling markers, and safe diagnostics. Do not change Appwrite or claim the historical autofill hypothesis as proven. Optional future QA may exercise rate-limit/network/service/unknown-error presentation in a non-production environment.

---

## Public-repository P2 remediation closeout (2026-08-14)

* **Scope:** Remediation branch `security/public-audit-p2-remediation`, based on the public-audit baseline `main` at `71b2864a5bb09b4082729db59950e2dc778abba3`. The corrected audit interpretation is seven P2 findings, with no P0 or P1 discovered during remediation.
* **Implementation status:** All seven P2 code/test gaps were addressed locally: React Router `7.18.2`; atomic AI quota reservation and release; cryptographic reset OTPs; nonce-bound, single-use internal reset HMAC requests; durable PDF rate/concurrency and input/output bounds in the production Vercel route; trusted Vercel IP extraction across anonymous routes; and a reliable security suite with a path-filtered, secret-free CI workflow.
* **Schema status:** The repository-controlled setup script now provisions `chat_sessions`, `admin_reset_request_nonces`, `pdf_export_rate_limits`, and `pdf_export_active_leases` with expiry indexes and server-only permissions. `chat_sessions.question_count` is optional for Appwrite compatibility; the AI gateway backfills missing legacy counters to zero before atomic reservation. Attribute readiness is polled before dependent indexes. Production schema application has not occurred.
* **Validation:** The fresh final check passed `git diff --check`, `npx tsc --noEmit`, `npm run build`, the focused security suite (`24` files / `129` tests after the legacy-counter, schema-readiness, and Appwrite-ID regressions), the complete repository suite (`189` files passed, `1` skipped; `1,088` tests passed, `8` skipped, `1` todo), three changed-hub `node --check` commands, the Appwrite SDK schema API contract check, and `npm audit --omit=dev` with zero vulnerabilities. Required PR checks `Typecheck + portfolio tests` and `Security regression suite` completed successfully; the non-required TestSprite pre-check reported `No tests detected` and did not block merge. Source-hash regeneration remains represented in the committed remediation manifest.
* **Git state:** PR #181 was merged into `main` with merge commit `6acb230f2948653826b73c64877bec3617c1bead`. The merged remediation commit `432409d0b3e5a8ca8ce320ae41409f93db085c38` is contained in `origin/main`; the documentation-only post-merge closeout follows on `main`.
* **Deployment state:** `MERGED_PENDING_DEPLOYMENT`. The exact Appwrite targets requiring the approved targeted workflow are `ai-gateway`, `email-service`, and `admin-devkit-data`; that workflow runs `scripts/setup-security-collections.cjs` before deploying any of those affected hubs. Vercel deployment remains pending; the trusted Vercel client-IP behavior still requires live verification against spoofed headers after deployment. No `target=all` deployment was used, and no production schema mutation occurred.
* **Owner actions:** After deployment, verify that Vercel does not allow caller-supplied IP headers to change the trusted client identity using a normal-versus-spoofed-header integration test. Enable GitHub Secret Scanning and Push Protection. These external checks are not claimed as verified from the sandbox.
* **Stop point:** PR #181 is merged, and this post-merge documentation closeout is the final local action. No Appwrite deployment, Vercel deployment, production schema mutation, or production configuration change was performed.

---

## Current email-verification closeout (2026-08-13)

* **Final status:** `EMAIL_VERIFICATION_PRODUCTION_VERIFIED`. The corrected Appwrite Verification template persisted with a non-empty subject, body, and required `{{redirect}}` variable. No manual Appwrite verification, duplicate resend, secret inspection, or credential recording occurred.
* **Verified production path:** authenticated WiseResume user -> `email-service` -> official Appwrite email-verification lifecycle -> Appwrite Custom SMTP -> Resend -> Appwrite Verification template -> WiseResume verification link -> explicit confirmation action -> Appwrite email verification true. Appwrite owns the lifecycle and token; Resend is transport. No custom parallel token system, stale server-token helper, or direct Resend verification branch is active.
* **Production evidence:** one controlled resend completed through `email-service` with HTTP `200`, Appwrite accepted the request, and Resend recorded the verification message as delivered. The owner confirmed receipt; the real link and explicit WiseResume action completed verification, routed to onboarding, and triggered a welcome email that Resend also recorded as delivered.
* **Scope closed / still pending:** signup verification request handling, verification delivery and completion, welcome-email delivery, and two-owner Jobs account-state isolation are closed. LinkedIn first-time and existing-user production verification remain pending. Jobs remains `VISIBLE_PRODUCTION_FEATURE`; tracker deletion, Saved Jobs rendering, deleted-resume tombstone, populated Jobs UI QA, and read-only diagnosis of `0 remote jobs / Not yet synced` remain separate pending work.

---

## 1. Current Verified System Snapshot

* **Production Domain:** `https://wiseresume.app`
* **Repository:** `iammagdy/WiseResume-TWC`
* **Active Branch:** `main`. Current post-merge main is `4bea728dba622ae2124d0192241cc7b26bdf6076`, which contains PR #183’s login-fix commits `f29e612f` and `1f38dbb`; the earlier `8fc45e010722f72ed7f3dc9a9f252eeb19045c83` remains only as the PR #179 synchronization baseline.
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel. Current production is documentation-only deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for commit `e7e92aba0261a5e587c766654dc9bf601732072d`; latest verified code-bearing production remains `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`.
* **Backend Platform:** Appwrite Cloud (`fra.cloud.appwrite.io`).
* **Authentication:** Appwrite Auth.
* **Database & Storage:** Appwrite Databases (`main` DB) and Appwrite Storage (`avatars` and asset buckets).
* **AI Architecture:** Server-side Appwrite `ai-gateway` function.
* **Payments/Billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary / deprioritized product module.

---

## 2. Latest Important Commits

* **`4bea728d`** - `Merge pull request #183 from iammagdy/fix/login-error-classification` - **LOGIN ERROR-MASKING FIX MERGED; VERCEL DEPLOYMENT AND LIVE LOGIN VERIFICATION PENDING**
* **`cfcaf82e`** - `Merge pull request #178 from iammagdy/codex/fix-verification-delivery` - **OFFICIAL APPWRITE EMAIL-VERIFICATION LIFECYCLE MERGED; PRODUCTION DELIVERY NOW VERIFIED**
* **`5225c130`** - Auth/jobs stabilization production release - **FRONTEND PRODUCTION DEPLOYED; REMAINING LINKEDIN AND JOBS QA IS SEPARATE**
* **`fdbfb8de`** - `Merge pull request #173 from iammagdy/codex/ai-runtime-receipts-ci-schema` - **CI SCHEMA PROVISIONING MERGED; TARGETED APPWRITE RUNTIME VERIFIED**
* **`6d07a24e`** - `Merge pull request #172 from iammagdy/codex/qa-runtime-observability-fixtures` - **RUNTIME RECEIPT OBSERVABILITY MERGED**
* **`e7e92aba`** - `docs(atlas): record broadcast production verification` - **DOCUMENTATION PUSHED; DOCS-ONLY VERCEL DEPLOYMENT READY**
* **`51271e0a`** - `fix(broadcast): align workspace delivery with Appwrite schema` - **PRODUCT FIX PUSHED, DEPLOYED, AND PRODUCTION VERIFIED**
* **`a14b306d`** - `fix(tailoring): preserve project dates and metadata` - **PRODUCT FIX PUSHED, DEPLOYED, AND PRODUCTION VERIFIED**
* **`66df7a39`** - `fix(tailoring): recover async results in production` - **PRODUCTION RECOVERY FIX PUSHED AND VERIFIED**
* **`ac4065f1`** - `perf(tailoring): bound AI execution and recovery` - **PRODUCT FIX PUSHED AND DEPLOYED**
* **`9e7020a0`** - `perf(portfolio): protect slow hero paint` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED WITH COLD-MOBILE LCP WARNING**
* **`18110bb8`** - `perf(portfolio): remove residual avatar contention` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`8bab2a66`** - `perf(portfolio): defer noncritical public work` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`da5968bb`** - `perf(portfolio): optimize public mobile critical path` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`e319737f`** - `perf(editor): reduce resume hydration startup delay` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`ddf16e16`** - `perf(frontend): remove public route overhead` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED WITH AUTHENTICATED BROADCAST SCHEMA WARNING**
* **`d6f0709e`** - `fix(analytics): remove browser GeoJS lookup` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`854ac418`** - `fix(appwrite): restore owner access and realtime connectivity` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`29e8eec8`** - `fix(tailoring): restore ATS PDF and DOCX result exports` - **PRODUCT FIX PUSHED AND PRODUCTION VERIFIED**
* **`eb8587e9`** - `docs(qa): close P2/P3 closeout documentation after production verification`
* **`69eebee6`** — `docs(cover-letter): document and implement cover letters schema attributes and indexes in setup script`
* **`65619950`** — `fix(cover-letter): persist saved letters with owner permissions`
* **`465c93dc`** — `fix(ai-gateway): resolve tailoring route metadata crash`
* **`b3cb0d91`** — `fix(qa): address confirmed P1 browser QA blockers`
* **`15bb25b8`** — `fix(schema): pre-fetch existing attributes in setup_audit_logs_schema to prevent duplicate checks and timeouts`
* **`cfac645a`** — `fix(schema): pre-check existing attributes on profiles collection before creation`
* **`38583064`** — `fix: resolve owner QA dashboard and tailoring issues`
* **`78e7055b`** — `fix(schema): resolve profiles collection row-size limit by keeping draft storage client-side`
* **`f251f6a1`** — `docs(changelog): document portfolio interest anonymous execution fix`
* **`6d39c450`** — `fix(security): route sendPortfolioInterest through Vercel API and add owner notification`
* **`ecdc1e47`** — `fix(security): skip Appwrite JWT generation for public share function calls`

---

## 3. Where We Stopped & Current Active Focus

* **Email verification recovery (2026-08-11 to 2026-08-13):** `CLOSED` as `EMAIL_VERIFICATION_PRODUCTION_VERIFIED`. The historical request/transport investigation concluded with the actual root cause: the Appwrite Verification template had whitespace-only subject and message fields and no `{{redirect}}`. After the approved template correction, one controlled resend completed through `email-service` with HTTP `200`, Appwrite accepted the request, and Resend recorded the message as delivered. The owner confirmed inbox receipt; the real verification link and explicit WiseResume action completed Appwrite verification and routed to onboarding. The welcome email was also sent and delivered. No manual verification or further owner action remains for email verification.

* **Current Auth and Jobs scope:** Auth short-viewport scrolling, signup verification request handling, verification delivery/completion, welcome-email delivery, and A->B->A account-state isolation are closed. The two-owner verification proved independent saved-job state across account switches and User-A cleanup. LinkedIn first-time and existing-user production verification remain pending. Jobs remains `VISIBLE_PRODUCTION_FEATURE`; tracker deletion, broader Saved Jobs rendering, deleted-resume tombstone, populated Jobs UI QA, and read-only diagnosis of `0 remote jobs / Not yet synced` remain pending and must not be promoted from this closeout.

### Historical email-recovery evidence (superseded as a current blocker)

The dated entries immediately below preserve the investigation trail. Their `OWNER_ACTION_REQUIRED`, delivery-failure, fallback, and fixture-blocked classifications were resolved by the verified 2026-08-13 template correction and production proof above; they are not active email-verification status.

* **Read-only verification-email trace (2026-08-11):** `OWNER_ACTION_REQUIRED`. Initial execution `6a7afac5396ba739be3a` (`200`, completed, `1s`) and cooldown-permitted resend execution `6a7afb564390b4d78def` (`200`, completed, `246ms`) both confirm the Appwrite fallback branch: the verification secret was unavailable to the function and Appwrite owned the mail request. Neither recorded a Resend send; read-only Resend activity found no matching recipient event. Strongest root cause: `APPWRITE_FALLBACK_NOT_DELIVERABLE`; secondary product issue: `FALSE EMAIL DELIVERY SUCCESS`. The owner must restore a usable Appwrite verification-mail template/mailer or make the branded Resend path available. No manual verification, additional account, inbox access, secret inspection, code, deployment, or configuration mutation occurred.

* **Production verification delivery failure (2026-08-11):** `OWNER_ACTION_REQUIRED`. After owner-authorized fresh-account signup, the account was created and the verification page loaded. The initial send and one cooldown-permitted resend both returned client success, but the owner-confirmed inbox received neither message. No manual verification, additional account, inbox access, secret inspection, or configuration modification occurred. Exact known boundary is `ACCOUNT_CREATION_AND_CLIENT_FUNCTION_RESULT_SUCCESS` → `MAIL_DELIVERY_UNCONFIRMED_FAILURE`; the frontend does not surface the function `delivery` discriminator. Owner must read the corresponding Appwrite `email-service` executions and Resend delivery activity to determine Appwrite-fallback versus Resend transport, suppression, sender/domain, or provider rejection. Do not make any external change until that evidence is available.

* **Email-service verification follow-up (2026-08-11):** `PRODUCTION_QA_FIXTURE_BLOCKED`. After the owner completed Resend production configuration, official run `31481279174` again deployed exactly `email-service`; target validation, source-hash recomputation, source-hash manifest alignment, and deployment all passed, with unrelated Jobs-sync/schema paths skipped. Secret values were not inspected. Disposable-inbox access is blocked by browser policy, so actual signup/resend receipt, verification completion, welcome email, LinkedIn, A→B→A, tracker deletion, Saved Jobs, and tombstone QA await an owner-provided accessible disposable inbox plus designated safe QA identities. No more configuration change is currently indicated.

* **Auth recovery + Jobs state stabilization release (2026-08-11):** `OWNER_ACTION_REQUIRED`. PR `#177` merged as `5225c130`; Vercel production `dpl_5YpEvmcVUeiyhh3DJuK2K38EMZ5n` is ready. Official Appwrite run `31480913343` deployed exactly `email-service` (deployment `6a7af4d3a5df0ba745b2`, source hash `bc17f522…d72f487`) and no other hub. Workflow logs show the Resend API key and sender values are empty while Appwrite’s verification template is blanked for branded Resend delivery. Do not perform or report real signup/resend email delivery until an owner supplies the Resend API/sender configuration; do not change it automatically. Current authenticated `/jobs` still reports `0 remote jobs` / `Not yet synced` with no 360 px overflow (`ENVIRONMENT ISSUE`). LinkedIn new/existing user QA, A→B→A isolation, tracker deletion, Saved Jobs, and deleted-resume production mutations remain pending safe authorized identities after email delivery is unblocked.

* **Auth recovery + Jobs state stabilization (2026-08-11):** `TESTED_LOCAL_NOT_DEPLOYED` on `codex/fix-auth-jobs-stabilization`; stop before commit/push/deploy. Fixed the AuthBold short-viewport scroll boundary, signup's ignored email-service `{ error }` result, safe OAuth session/profile-seed recovery states, Appwrite-only verification delivery when the secret is unavailable to the function, owner-namespaced resume persistence, Saved Jobs source-of-truth leakage, tracker delete propagation/invalidation, translation scope, and deleted-tailored-resume wording. Focused Vitest (`6` files / `18` tests), deleted-result focused test (`1` pass), TypeScript, email-service syntax, and diff checks pass. Production browser audit was read-only: `/jobs` has no horizontal overflow at 360–1440 px, but it currently reports zero jobs / not synced (`ENVIRONMENT ISSUE`). Production verification of signup delivery, resend, new/existing LinkedIn, account A→B→A, and all populated-job controls remains pending deployment and authorized QA identities. Appwrite deployment required after review: **`email-service` only**; Vercel deployment required for frontend changes.

* **Remote Jobs Feed workspace exposure (2026-08-10):** `VISIBLE_PRODUCTION_FEATURE`, merged by PR #175 as `1d937467` and deployed through Vercel's normal production integration (`dpl_2Exk8ZwPRwYDP4SMYefSAM8nSZnd`, ready). The existing authenticated `/jobs` feed is visible in the desktop sidebar, mobile workspace navigation, command palette, and workspace top bar; it uses the normal shared workspace shell. `/jobs` has an explicit title before `/job`, preserving Job Details routing. English/Arabic labels and feed positioning are localized. No Appwrite hub, job sync, schema, persistence, Fast Tailor, AI, tracking, or credit behavior changed. Focused Vitest passed `8` files / `44` tests; TypeScript, production build, no-sourcemap, and diff checks passed. A local unauthenticated hard refresh correctly redirects to login with `/jobs` retained as the redirect target. Authenticated production QA verified sidebar navigation/active state, title, real feed data, search, advanced filters, and saved-job persistence plus cleanup. The mobile render showed the menu affordance and jobs controls; browser-controller timeouts prevented a sheet-tap assertion, so that one physical-device interaction remains a lightweight owner follow-up. Appwrite deployment was not required.

* **Dependency remediation runtime closeout (2026-08-10):** `DEPENDENCY_REMEDIATION_VERIFIED_READY_WITH_DEFERRED_SECURITY_MIGRATION`. PR #172 merged as `6d07a24e`; PR #173 merged as `fdbfb8de` after adding one target-aware trusted CI step that provisions `ai_runtime_receipts` before deploying any selected receipt-writing hub. Official workflow `31375728081` succeeded for exactly `admin-devkit-data,ai-gateway,job-import,resume-section-ai`; the server-only collection schema was ready before deployment. The authorized, read-only DevKit panel then recorded exactly one new completed, one-credit, `miss` receipt for deterministic `ai-gateway`, `resume-section-ai`, and guarded public-fixture `job-import` flows. The section-AI preview was not applied. The fixture remains `noindex,nofollow` and absent from the Remote Jobs feed. WiseHire HR fixture QA is still a separate owner-created/manual follow-up.

* **Repository synchronization review (2026-08-09):** Local `main` and `origin/main` were fetched and verified at the same commit, `34e2210a` (`chore(deps): update form-data in admin-deploy-hubs (#159)`), with `0` commits ahead and `0` behind and a clean worktree. The fetch only discovered current remote Dependabot branch references; it did not change `main`. The five commits after the 2026-07-24 Atlas handover are dependency-maintenance changes only, so the production verification status and active operational focus below remain unchanged.

* **Dependabot/dependency security audit (2026-08-09):** Read-only Atlas report: `Project Atlas/security/dependency-security-audit-2026-08-09.md`. The authenticated GitHub Dependabot inventory could not be read from this workspace, so no current GitHub total is claimed. A public-OSV scan of every committed root and hub lockfile found 72 supplemental manifest-advisory instances (23 high, 49 moderate), concentrated in stale Axios/form-data locks across six hubs. No confirmed WiseResume exploit or P0 was established. Recommended next work, only after authenticated GitHub alert reconciliation and owner approval: a medium-risk, six-hub Axios/form-data lock-refresh batch with targeted validation and no `target=all` deployment.

* **Dependency security remediation (2026-08-10):** Production runtime evidence is complete for the receipt-writing WiseResume paths. The remediation source merged in PR #170; follow-up PR #172 provided sanitized receipts and PR #173 made their server-only schema a pre-deploy CI requirement. The four receipt-writing hubs above were deployed only through the official target-filtered workflow, then deterministic browser QA proved a successful provider-backed path per hub with one factual credit and no duplicate receipt. Current authenticated Dependabot inventory is 0 critical, 0 high, and 3 medium React Router advisories. React Router v6 remains `DEFERRED_SECURITY_MIGRATION`; the remaining WiseHire HR fixture is a separate secondary-product follow-up. Full evidence: `Project Atlas/security/dependency-security-audit-2026-08-09.md` section 18.

* **Session Status:** `PUBLIC_REPOSITORY_HARDENING_PRODUCTION_BROWSER_VERIFIED_WITH_RESIDUAL_WARNINGS`.
  - PR #148 merged the hardening implementation; PR #158 (`78656e7f`, merged `0d030df4`) corrected three ignored hub lockfiles after failed workflow `30100163770` stopped with 25 ready deployments.
  - Recovery workflow `30101982337` deployed only `job-feed-sync`, `get-remote-jobs`, and `track-job-action`; all are ready, the 28-function live policy verifier reports 28/28 matches, and one approved internal sync completed.
  - `job-feed-sync` retains `execute: []` and `0 */6 * * *`; anonymous `job-feed-sync` and `track-job-action` probes returned 401, while public `get-remote-jobs` completed. No rollback, broad rollout, secret change, or history rewrite occurred.
  - Authenticated two-owner browser QA is verified: User-A saved state persisted through reload, a distinct User-B retained independent saved state for the same public job after User-A cleanup, and User-A cleanup persisted. No account identifiers, tokens, or fixture details are recorded.
  - The supported mutation path derives the caller from a JWT-backed Appwrite account, accepts no client-selected owner or action-document ID, scopes records by the derived owner/action key, and assigns owner-only permissions. Normal non-admin `/devkit` denial remains verified.
  - Broader visual Jobs QA remains outside this security closeout. Residual warnings: GitHub security controls require owner enablement, `admin-sentry` lacks transport-level replay expiry, and historical credential cleanup remains separately pending under `Project Atlas/security/credential-history-cleanup-plan-2026-07-24.md` with no authorized history rewrite.

* **Session Status**: `BROADCAST_DELIVERY_PRODUCTION_VERIFIED_WITH_EMPTY_COLLECTION_WARNING` - The authenticated Broadcast schema/query failure is fixed in production without broadening Appwrite permissions.
* **Broadcast Closeout (2026-07-24)**:
  - Product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42` is production verified; targeted Appwrite workflow `30051406249` deployed only `admin-devkit-data`, and deployment `6a629b8351abe36cd0c3` is `ready`.
  - Authenticated workspace routes return `/api/broadcasts` HTTP 200 without the prior warning; the tested public Portfolio route makes no Broadcast request.
  - Current production is the subsequent documentation-only Vercel deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` (`READY`), which contains the same product code as verified deployment `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr`.
  - Active warnings: the collection has zero records, so content visibility/dismissal remains test-proven rather than live-content-proven; the unrelated Select warning and Public Portfolio cold-mobile LCP warning remain.
  - Verdict: Broadcast and stabilization smoke `PASS_WITH_WARNINGS`; product is not blocked. Detailed evidence: `Project Atlas/qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md`.
* **Session Status**: `TAILORING_PROJECT_METADATA_VERIFIED_READY` - The confirmed project-date loss was fixed at the gateway and frontend merge boundaries, deployed, and verified with one controlled production Tailoring action.
* **Project Metadata Preservation Resolution (2026-07-24)**:
  - **Root Cause**: `MULTIPLE_LAYERS`. `buildTailorMessages()` omitted project chronology/current/URL metadata; the structured output omitted current/URL fields; the gateway preserved only IDs; and the generic frontend spread allowed blank AI values and AI-only projects.
  - **Fix**: Tailoring now sends supported source project metadata, matches by stable ID first with deterministic unique-name/role fallback only when IDs are absent, preserves source identity/chronology/current/URLs, retains source order, rejects unmatched/ambiguous/AI-only projects, and allows AI rewriting only for approved content fields.
  - **Validation**: Focused Vitest passed `7` files / `63` tests. Gateway project-metadata, routing, and recovery scripts passed. `node --check`, TypeScript, build, source-hash recomputation, and `git diff --check` passed.
  - **Deployment**: Product commit `a14b306da29e4ac7a1db16e85fcc54c790c3727c` is live in Vercel deployment `dpl_BC5DxdhG1wEJR1m3TBuxhf9ZDfjm`. Targeted Appwrite workflow `30048216417` deployed only `ai-gateway`; deployment `6a628eafd09be552df71` is `ready`, hash `6a61da4d2b3efa73449ca7e3f77ebb6797d35dd005ff8f01f81644439bd72d12`.
  - **Production Proof**: One initial action created exactly one new child resume `6a62910a0013a37009a3`. Provider execution `6a6290fa703089c4479e` used DeepSeek `deepseek-chat`; request telemetry recorded `12.199 s`, no fallback, one two-credit charge, and no idempotency hit. The two result-only polling executions made no provider call.
  - **Integrity Proof**: The source timestamp remained `2026-07-23T22:05:28.458+00:00`. Both source projects retained their exact IDs, dates, current states, and URL states in the child while both descriptions changed materially. Result-page display, refresh, direct reopen, and export preview all retained the dates.
  - **Historical Finding Preserved**: Earlier child resume `6a6283f40001464122f4` remains evidence of the pre-fix project-date defect; this later resolution does not rewrite that finding.
  - **Verdict**: Tailoring `VERIFIED_READY`; quick functionality audit `CLOSED`; performance sequence `CLOSED_WITH_PORTFOLIO_LCP_WARNING`.
  - **Evidence**: `Project Atlas/qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md`.
* **Documentation Reconciliation (2026-07-23)**:
  - Added the missing Critical Functionality Smoke, Premium Cover Letter, July Production Performance Audit, and final rich Tailoring evidence reports.
  - Corrected current AI architecture to document `resume-section-ai` and `job-import` exceptions.
  - Corrected the Appwrite deployment workflow name and 28-function registry.
  - Removed stale current Hostinger, Kinde/Supabase, Cover Letter access-blocked, and meaningful-Tailoring-pending claims from living docs.
* **Previous Session Status**: PERFORMANCE_PHASE_4_TAILORING_PASS_WITH_WARNINGS - Tailoring has bounded provider and frontend waits, safe async Appwrite execution, idempotent result retrieval, actionable failure/no-result states, and no automatic provider retry.
* **Performance Phase 4 (2026-07-22 to 2026-07-23)**:
  - **Confirmed Root Cause**: Two historical Tailoring executions (`6a6086ce7a33f9ad3e62`, `6a6086f0a9630fc42edb`) failed at Appwrite's exact 30-second synchronous execution ceiling. The old gateway could spend about 195 seconds across a 65-second primary, same-provider retry, and fallback, while the frontend had no effective bounded transport wait and automatically retried once. Stale pending idempotency rows and a short credit-lock TTL increased recovery risk.
  - **Bounded Backend**: Tailoring now has a 68-second total gateway budget, a 42-second primary attempt, one 23-second cross-provider fallback, a five-second minimum remaining-attempt gate, and a two-second cleanup reserve. Tailoring same-provider retry is disabled; routing order and models are unchanged.
  - **Bounded Frontend**: The browser starts one asynchronous provider execution and waits at most 75 seconds. It never automatically starts a second provider request. Duplicate clicks are blocked, cancellation stops waiting, and failures do not save or navigate.
  - **Production Transport Recovery**: Production proved browser users cannot read async execution status through `getExecution`. Recovery commit `66df7a39` falls back to authenticated result-only polling. The gateway long-polls the existing idempotency cache for at most eight seconds per lookup; these lookups never invoke a provider or deduct credit.
  - **Idempotency/Credits**: Successful or failed Tailoring outcomes are cached before final response; stale pending rows expire after 80 seconds; failed results are consumed so an explicit retry can start one new job. The Tailoring credit lock is 78 seconds. Controlled tests prove one charge on success and no charge on provider timeout or unusable output.
  - **Validation**: Focused frontend recovery tests passed `5` files / `24` tests. Gateway routing and Tailoring recovery integration scripts passed. `node --check`, focused ESLint, `git diff --check`, TypeScript, production build, and no-sourcemap verification passed. The broader phase run passed `174` files / `1,004` tests with one skipped file and one todo; four load-sensitive tests timed out under full-suite concurrency and passed in isolated reruns.
  - **Deployment Status**: Vercel production deployment for recovery commit `66df7a3978c79a525742a6c07ab2836a4ca0cadf` succeeded as GitHub deployment `5579487506` (`https://wise-resume-d700lmekx-iam-magdy.vercel.app`). Targeted Appwrite workflow run `30042810382` deployed only `ai-gateway`; deployment `6a627b81bff27daaf366` is `ready`, source hash `244f6be15693770dc1c6129a8e258c4fc956a6ddd04793522edc314ab712adc0`, and the safe smoke returned HTTP 200.
  - **Production Evidence**: One post-fix request created exactly two Appwrite executions: provider execution `6a627c387a11d6e9ae91` completed in `4.754 s` with DeepSeek success in `2.902 s`; result-only execution `6a627c398ed25d37f977` completed in `3.653 s`. One `ai_request_logs` row recorded one two-credit charge and no idempotency hit. The UI exited loading in under the 75-second cap and displayed the actionable unchanged-output state with Retry/Edit controls; it did not save or navigate.
  - **Superseded Warning**: The first production `Test Resume` fixture produced no meaningful changes. The richer follow-up is now complete and exposed the project-date preservation defect documented above.
  - **Report**: `Project Atlas/reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md`.
* **Session Status**: PERFORMANCE_PHASE_3_PUBLIC_PORTFOLIO_PASS_WITH_WARNINGS - Public Portfolio mobile CLS, avatar delivery, request startup, and optional-work contention were materially improved and production verified. The strict cold-mobile LCP target remains unmet, so this phase is not `VERIFIED_READY`. No Appwrite hub, schema, permission, auth, AI, credits, environment, or settings change was performed.
* **Performance Phase 3 (2026-07-22)**:
  - **Confirmed Baseline**: Direct production mobile throttling measured `15.388 s` LCP, `0.346` CLS, approximately `3.672 s` estimated TBT, `1,882,125` transferred bytes, and `110` requests. Gate/data started near `8.64 s`; the original Appwrite avatar `/view` was fetched twice at approximately `446 KB` per request and finished near LCP.
  - **Implemented Critical Path**: Exact `/p/:username` and `/ar/p/:username` routes now bypass `AppInterior`; their existing gate and sanitized data queries begin in the route shell and share React Query keys with the page. The page and hero no longer require Framer Motion before first render. Monitoring waits ten seconds on exact portfolio routes, and below-fold sections/contact/chat wait four seconds after portfolio data.
  - **Avatar and CLS**: First-party Appwrite `/preview` WebP sources use bounded responsive dimensions, explicit image size, eager/high-priority loading, and a native hero image over the existing initials fallback. Production now issues one `432 px` avatar request of `11.25-11.28 KB`. Typewriter space, the chat launcher, and avatar geometry are reserved; final mobile CLS is `0.064` median.
  - **Final Local Evidence**: Five cache-cleared production-build preview runs measured `5.144-7.556 s` LCP (median `6.100 s`), `0.040-0.061` CLS, and a single approximately `11.27 KB` avatar request. Optional chunks began after LCP in every run. Vite preview serves uncompressed assets and is retained as a relative diagnostic, not the production acceptance result.
  - **Final Production Evidence**: Three cold mobile runs measured `5.124 s`, `5.860 s`, and `6.408 s` LCP (median `5.860 s`), `0.064` median CLS, and `0.922 s` median estimated TBT. Warm mobile LCP was `2.784 s`. Gate/data begin near `3.62/3.64 s` in the median trace, each completes in about one second, and hero visibility is `5.249 s` median.
  - **Acceptance**: Mobile CLS `<0.1` and avatar `<100 KB` pass. Cold-mobile LCP `<4.0 s` does not pass. Closing the residual requires a separately approved public-entry/provider or pre-React data-start architecture decision; the remaining delay occurs before optional portfolio chunks.
  - **Production Behavior**: `/p/magdy`, `/ar/p/magdy`, and `/p/explore-test-123-updated-001` rendered without horizontal overflow. Contact rendered; analytics returned `200`; the interest action returned `200 {ok:true}` through the API path that creates the owner notification. Public gate/data responses exposed none of the scanned `user_id`, owner ID, password hash, portfolio settings, or contact-email fields.
  - **Protected QA Limitation**: The documented `testprotected` fixture is stale. Production gate/data report `exists: false` / `Portfolio not found`, so live wrong-password/correct-unlock QA was unavailable. Focused frontend security tests and both portfolio Hub contract scripts pass. Realtime notification delivery was not safely observable anonymously because notification reads are owner-scoped.
  - **Deployment Status**: Vercel deployment `dpl_9hA3b3zKGZXddKKYrC4WmG54gBUn` is `READY`/`PROMOTED` for SHA `9e7020a0b7ce25c62b00425351ca537cb8d9e612`; aliases include `wiseresume.app`, `www.wiseresume.app`, and `resume.thewise.cloud`. Appwrite deployment: `NOT REQUIRED`.
  - **Report**: `Project Atlas/reports/performance/performance-phase-3-public-portfolio-remediation-2026-07-22.md`.
* **Session Status**: PERFORMANCE_PHASE_2_EDITOR_STARTUP_PRODUCTION_VERIFIED_WITH_KNOWN_RESIDUAL_WARNINGS - Editor route bootstrap now keys the first document query from the URL, rejects stale store data until the requested document is confirmed, bounds the blocking Appwrite read, and provides distinct slow/error/missing states. Product commit `e319737f43527a5528b66b165e3a09bc22b5b07e` is deployed and verified on production. No Appwrite deployment, schema/permission change, auth architecture change, AI/credits change, persistence-model change, or unrelated feature change was performed.
* **Performance Phase 2 (2026-07-22)**:
  - **Confirmed Root Cause**: `EditorPage` called `useResume(currentResumeId)` before its passive URL-sync effect copied `?id=`/`?resumeId=` into the persisted Zustand store. A stale store ID could therefore query or render the previous resume first; an empty store delayed direct bootstrap. The blocking `getDocument` had no explicit timeout and inherited global retries. A separate Editor eight-second safety timer could redirect to Dashboard while this chain was unresolved.
  - **Readiness Fix**: The URL resume ID is now the synchronous first-render query key. Only a matching, owner-confirmed document can initialize editable state; stale store content is treated as unavailable. The Editor does not wait for the full resume library.
  - **Bounded UX**: The blocking document read has a `5,000 ms` timeout and `retry: false`. Immediate `Loading resume...` UI changes to a slow notice after `2,500 ms`; network/timeout failures offer Retry and Dashboard, while a true missing document has a separate state. The racing eight-second Editor redirect was removed.
  - **Validation**: Focused startup tests passed `2` files / `11` tests; the related regression set passed `9` files / `47` tests; TypeScript, build, focused changed-file ESLint, and `git diff --check` passed. The full Vitest run passed `170` files / `983` tests with one skipped file and one todo; three Tailoring export tests timed out only under full-suite concurrency, while the complete file passed `8/8` in isolation.
  - **Local Performance**: Five production-build hard refreshes reached interactive inputs in `1.263-1.763 s`, median `1.485 s`; Preview matched input readiness and the slow notice never activated.
  - **Deployment Status**: Vercel deployment `dpl_GLhcMR5mu95pRBSKw8VwSbNmEpx4` reached `READY` for full SHA `e319737f43527a5528b66b165e3a09bc22b5b07e`; aliases include `wiseresume.app`, `www.wiseresume.app`, and `resume.thewise.cloud`. Appwrite deployment was not required.
  - **Production Performance**: Five warm hard refreshes reached interactive inputs/Preview in `1.434-2.400 s`, median `1.653 s`, meeting the `<2.5 s` target. One cold post-deployment run took `4.427 s` and is retained as an outlier. Five Dashboard-to-Editor browser runs completed correctly; the recorded `3.123-3.143 s` includes the browser automation click-stabilization wait and is not a pure application timing claim.
  - **Production Correctness**: Switching from `explore-test-blank-123` to `Test Resume` never displayed the previous resume; loading appeared before the correct target. A harmless name marker autosaved, survived hard refresh, and appeared in Preview; it was then cleared, autosaved, and verified absent after another refresh.
  - **Request Evidence**: React Query integration tests prove one `getDocument` call for a stable resume ID and one call per target during route switching, with retries disabled. The selected in-app browser backend did not expose a production request timeline, so exact production Appwrite request count is `UNKNOWN`, not inferred.
  - **Console Evidence**: Production emitted no Editor/resume load errors. All `15` observed warnings were the existing authenticated Broadcast `active` schema mismatch.
  - **Remaining Performance Risks**: Public Portfolio mobile LCP/CLS/avatar behavior and Tailoring no-result/timeout behavior remain open. Authenticated Broadcast schema drift remains a separate Appwrite task.
* **Session Status**: PERFORMANCE_PHASE_1_PRODUCTION_VERIFIED_WITH_BROADCAST_SCHEMA_WARNING - The universal charts dependency, public Editor prefetch, and public standalone Broadcast query have been removed from the public path. Product commit `ddf16e168516be84ecce7816821585291fc290fe` is deployed and verified on production. No Appwrite deployment, schema/permission change, auth architecture change, AI change, CSP change, dependency replacement, or redesign was performed.
* **Performance Phase 1 (2026-07-22)**:
  - **Confirmed Charts Root Cause**: Rollup absorbed the shared `clsx` helper into the manually assigned `charts` chunk. The main entry then imported that helper from `charts`, producing `entry -> shared helper -> charts -> Recharts/D3` on every route.
  - **Chunk Ownership Fix**: `clsx`, `class-variance-authority`, and `tailwind-merge` now live in a small `ui-utils` chunk. Recharts/D3 remain isolated in the lazy `charts` chunk. PDF/DOCX, OCR, DevTools, and monitoring chunk boundaries remain lazy and separate.
  - **Editor Prefetch Fix**: `EditorPage` was removed from the global deferred prefetch list. Existing route-aware authenticated prefetch in `AppInterior` remains, so Dashboard may warm Editor while public routes do not.
  - **Broadcast Fix**: Public standalone routes and pre-auth states do not mount the authenticated Broadcast query. Authenticated workspace routes still issue the query after auth readiness, and failures now log a scoped warning.
  - **Build Evidence**: Initial payload changed from `1,642,130` to `1,211,201` raw bytes, `481,898` to `369,199` gzip bytes, and `408,529` to `315,710` Brotli bytes. Initial JavaScript Brotli changed from `316,689` to `223,870` bytes. The `93,229`-byte Brotli charts chunk is no longer in the public entry. Editor remains a lazy `57,547`-byte Brotli chunk and is not globally prefetched.
  - **Validation**: Focused Vitest passed `2` files / `7` tests; the post-build Node contract passed `3` tests; focused source ESLint passed; `npx tsc --noEmit`, `npm run build`, sourcemap check, and `git diff --check` passed. `vite.config.ts` retains one pre-existing `@typescript-eslint/no-require-imports` lint finding at line 129.
  - **Deployment Status**: Vercel deployment `dpl_FrRqPrrkm2nYXVSe7KXvnRqV8qP9` reached `READY` for full SHA `ddf16e168516be84ecce7816821585291fc290fe`; aliases include `wiseresume.app`.
  - **Production Browser Evidence**: `/`, `/pricing`, `/guides`, `/examples`, and `/p/magdy` rendered with no charts, Editor, or Broadcast request and no new console issues. `/dashboard` retained intentional Editor prefetch. Navigating from Dashboard to `/editor?id=6a30964e000f3d1807de` loaded the Editor chunk and rendered the Export control without console errors.
  - **Mobile Evidence**: At `390x844`, observed landing assets were `75` requests / `817,244` compressed-body bytes; public portfolio assets were `109` requests / `1,506,749` bytes. Both had zero charts, Editor, and Broadcast requests. The selected browser diagnostics did not expose LCP/TBT, and Google PageSpeed returned HTTP `429`; LCP/TBT are therefore `UNKNOWN`, not passed.
  - **Known Warning**: The authenticated Dashboard correctly emits the Broadcast query, but production Appwrite returns `400 Invalid query: Attribute not found in schema: active`. This is existing schema drift outside this frontend-only pass. Public routes no longer issue that failing query. Do not broaden permissions or change schema without a separately approved Appwrite task.
  - **Remaining Performance Risks**: Editor hard-refresh/hydration delay, Public Portfolio mobile LCP/CLS/avatar behavior, and Tailoring no-result/timeout behavior remain open and were not changed.
* **Session Status**: GEOJS_BROWSER_LOOKUP_REMOVED_PRODUCTION_VERIFIED - The browser-side visitor country lookup to GeoJS has been removed, committed, pushed, deployed by Vercel Git integration, and production browser verified. No CSP broadening, Appwrite hub deployment, Appwrite schema change, environment variable change, provider change, AI change, or credit-path change was performed.
* **GeoJS Browser Lookup Resolution (2026-07-21)**:
  - **Classification**: Browser GeoJS was `OPTIONAL_ANALYTICS_ENRICHMENT` with `PRIVACY_RISK`, not a required product dependency. It did not support auth, security, payments, AI, exports, Tailoring, Cover Letters, or user-visible workflows.
  - **Confirmed Root Cause**: `src/lib/visitorTrack.ts` attempted `https://get.geojs.io/v1/ip/country.json` directly from the browser during page-view tracking. The active production CSP intentionally omitted GeoJS from `connect-src`, producing a console CSP warning.
  - **Implemented Fix**: Removed the browser GeoJS request, browser country cache, and re-flush path. Visitor events now leave `country` unset client-side; the existing `track-visitor-event` Appwrite ingestion path may enrich missing country from Appwrite request metadata when available.
  - **CSP Decision**: Did not add `https://get.geojs.io` to CSP. Production CSP remains limited to existing first-party Appwrite, Realtime, captcha, AI/provider, email, and telemetry endpoints.
  - **Validation**: Focused GeoJS regression tests passed; `node tests/hubs/track-visitor-event.test.cjs`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
  - **Deployment Status**: Product commit `d6f0709ecb517b5c8f246825765867bfd6ce24c5` deployed to Vercel production as `dpl_EwaBNSHJ2LSF6NiKnMfjnhzPro3n`, reached `READY`, and `origin/main` matched local `main` before Atlas closeout docs.
  - **Production Browser Evidence**: Production landing and authenticated dashboard emitted no `get.geojs.io` or `country.json` requests, no GeoJS CSP violation appeared, `track-visitor-event` executions continued, visitor event payloads contained no browser-derived `country`, Appwrite account returned 200, and Appwrite Realtime websocket probes opened successfully.
  - **Residual Risk**: The Appwrite `track-visitor-event` hub still contains a server-side GeoJS fallback if Appwrite country headers are unavailable. That path is outside the browser CSP issue and was not deployed or changed in this session.
* **Previous Session Status**: OWNER_PERMISSIONS_REALTIME_CSP_PRODUCTION_VERIFIED - The owner-scoped access fix for `user_preferences`, `jobs`, and `job_applications` has been implemented, committed, pushed, deployed by Vercel Git integration, and production browser verified. Appwrite schema setup and owner-permission migration were applied through repo-controlled scripts only. No Appwrite hub deploy, environment variable change, provider change, AI change, or credit-path change was performed.
* **Owner Permissions and Realtime CSP Fix (2026-07-21)**:
  - **Confirmed Root Causes**: `user_preferences`, `jobs`, and `job_applications` had `documentSecurity: false`; existing document permissions were ignored and `user_preferences` documents lacked owner permissions. Browser runtime still attempted server-only `tailor_history` reads. The active Vite meta CSP omitted `wss://fra.cloud.appwrite.io`.
  - **Implemented Fix**: New documents in the affected owner collections now receive owner read/update/delete permissions. Repo scripts now idempotently enforce document security and `create("users")` collection permissions for `user_preferences`, `jobs`, and `job_applications`, then backfill owner document permissions from `user_id`.
  - **Tailor History Resolution**: Browser runtime no longer reads `tailor_history`; dashboards, applications, activity, saved jobs, and Tailoring Result context derive current tailoring history from owner-scoped resume lineage and tailoring metadata.
  - **CSP Resolution**: `wss://fra.cloud.appwrite.io` is present in the active production CSP meta tag, and authenticated browser websocket probes opened successfully.
  - **Live Migration Counts**: Final dry-run after production browser verification reported `user_preferences scanned=22 updated=0 already_correct=22`, `jobs scanned=4 updated=0 already_correct=4`, and `job_applications scanned=0 updated=0`.
  - **Validation**: Changed Node scripts passed `node --check`; related Vitest suite passed 17 files / 121 tests; `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
  - **Deployment Status**: Product commit `854ac4185c0a4e89196c73a2d4704babb571270d` deployed to Vercel production as `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p`, reached `READY`, and `origin/main` matches local `main`.
  - **Production Browser Evidence**: Authenticated QA browser loaded `/dashboard`; Appwrite account returned 200; runtime and direct browser checks for `user_preferences`, `jobs`, and `job_applications` returned 200/201 with zero affected 401s; no runtime `tailor_history` requests were observed; Appwrite Realtime websocket opened.
  - **Residual Risk**: Browser GeoJS lookup has since been removed by commit `d6f0709e`; see the GeoJS Browser Lookup Resolution entry above.
* **Previous Session Status**: TAILORED_RESULT_EXPORT_FIX_PRODUCTION_VERIFIED - The Tailoring Result ATS PDF and Word/DOCX export defect has been fixed, committed, pushed, deployed by Vercel Git integration, and production browser verified. No Appwrite deployment, Appwrite schema change, environment variable change, provider change, AI change, or credit-path change was performed.
* **Tailoring Result Export Fix (2026-07-21)**:
  - **Confirmed Root Cause**: Designed PDF used `TailorQuickPdfExportDialog` and a user-activated native PDF download, while ATS PDF and DOCX opened `/preview?id=<tailoredId>&action=...`. `PreviewPage.tsx` intentionally converts URL export actions into a fallback CTA and does not auto-download, leaving the result page buttons inert.
  - **Implemented Fix**: `src/pages/TailoringHubResultPage.tsx` now exports ATS PDF and DOCX directly from the loaded tailored resume snapshot, with duplicate-click guards and export-specific toasts. `src/components/job-match/TailorResultExportPanel.tsx` now shows disabled/loading states for those exports.
  - **Regression Coverage**: Added `src/pages/__tests__/TailoringHubResultPage.export.test.tsx` for tailored document identity, ATS mode options, DOCX generator input, duplicate-click guards, failure handling, and Designed PDF behavior.
  - **Validation**: Focused Tailoring Result export tests passed (8 tests), adjacent Preview/Tailoring tests passed (31 tests), `npx tsc --noEmit` passed, `npm run build` passed, and `git diff --check` passed with Windows line-ending warnings only.
  - **Local Browser Artifacts**: Local authenticated route `/tailoring-hub/result/6a5f3d920002ef6c80c5` downloaded `Job.pdf` (54,571 bytes, `%PDF-1.4`), `Job_Resume_ATS.pdf` (49,291 bytes, `%PDF-1.4`), and `QA_Manual_User_Resume.docx` (8,303 bytes, valid DOCX ZIP with 20 entries). Parsed artifacts contained the tailored QA resume text and did not contain the source marker.
  - **Deployment Status**: Product commit `29e8eec89c72de8eba60d77e401814482c16bf97` deployed to Vercel production as `dpl_8W6Dbf7G2G9EALDLx1pPQU4kfN9x`, reached `READY`, and the project domains include `wiseresume.app`.
  - **Production Browser Artifacts**: Production route `https://wiseresume.app/tailoring-hub/result/6a5f3d920002ef6c80c5` downloaded `Job.pdf` (22,156 bytes, `%PDF-1.4`), `Job_Resume_ATS.pdf` (22,228 bytes, `%PDF-1.4`), and `QA_Manual_User_Resume.docx` (8,303 bytes, valid DOCX ZIP with 20 entries). Parsed artifacts contained tailored QA resume text and did not contain the source marker.
* **Previous Session Status**: P2_P3_REMEDIATION_PRODUCTION_VERIFIED_WITH_FAST_TAILOR_CREDIT_LIMIT_CAVEAT — The consolidated P2/P3 QA Remediation Pass is completed and verified against production for commit `aaf77e87`.
* **P2/P3 Remediation Closed**:
  - **Mock Interview (`/interview`)**: **PASS**. Resume selector auto-selected latest/active resume. Dropdown populated with 22 options and retrieved resumes via network (200 success).
  - **LinkedIn Optimizer (`/ai-studio/linkedin`)**: **PASS**. Active resume context resolved successfully and the `Generate LinkedIn Content` CTA was enabled (resumes query returned 200).
  - **A/B Compare (`/ai-studio/ab-compare`)**: **PASS**. A/B dropdown triggers appeared, Resume A dropdown populated with 22 options, and selection worked.
  - **Cover Letter Save (`/cover-letter/new`)**: **PASS**. Generation succeeded, manual Save successfully created the Appwrite document (`POST` returned 201), and redirected to `/cover-letter/edit/<id>`.
  - **Fast Tailor Caveat**: **VERIFIED**. The `/jobs` feed successfully loaded 50 active jobs from the database. Fast Tailor dialog opened, and resume selection and confirm actions worked. E2E generation execution was blocked as expected by daily credit limit enforcement because the QA account had `22/20` credits used. Thus, UI wiring and credit limits were verified; full generation after a credit reset remains a follow-up.
  - **Quick Tailor Normalization (Option A)**: Mapped raw resumes returned by `useResumes()` using `dbToResumeData` inside a `useMemo` early in `QuickTailorSheet.tsx`, resolving incorrect property accesses (`id`, `contactInfo`, `experience.length`) inside renders and deletion checks.
  - **Fast Tailor Cover Letter Security Guardrails**:
    - Appended strict auth validation checks at the start of the tailoring flow to exit early if `user.id` is missing.
    - Attached explicit owner-only document permissions when creating cover letters via `databases.createDocument` inside `RemoteJobsPage.tsx` to prevent `401` authorization errors. Note: Fast Tailor cover-letter owner-permission code fix has been implemented; full production Fast Tailor flow verification is pending until active test job data is available or a controlled test job can be used.
* **P2 Step 1 Closed — Cover Letter Save & Attributes Setup**:
  - **Environment**: `https://wiseresume.app`
  - **Verified Areas**:
    - **Cover Letter Save**: Save returns `201` with correct owner permissions, redirects to `/cover-letter/edit/<id>`, and loads successfully.
    - **Database Schema**: Collection attributes (`title`, `job_title`, `company`, `content`, `tone`, `template_style`, `resume_id`) and index `user_id_idx` are fully provisioned and verified in production.
* **P1 CLOSED — 6/6 original P1 blockers passed production browser retest**:
  - **Environment**: `https://wiseresume.app`
  - **Verified Areas**:
    - **Tailoring Hub**: Tailoring completes successfully through the fixed `ai-gateway` and redirects to the tailored result page.
    - **Cover Letter**: Generation returns visible output inside the preview container on the form page.
    - **Editor "Improve with AI"**: Toolbar button is clickable and opens the improvement panel.
    - **Dashboard Metrics**: Card metrics and tab badges counts match perfectly after page refresh (verified at `11`).
    - **Tailored PDF Export**: Downloads the correct tailored resume PDF file (`Job.pdf` downloaded successfully).
    - **Preview Route**: Both `/preview?id=` query parameter and `/preview/:id` path parameter variants resolve and render the resume correctly.
* **Automation / Test Script Adjustments**:
  - Updated the E2E script `run_qa.js` to select a non-blank, non-tailored resume to prevent early-exit on the zero-change guardrail.
  - Adjusted the PDF download flow to click the final "Download PDF" button inside the export dialog.
  - Updated the Cover Letter submit button selector to support dynamic labels (`Generate & return to bundle`).
  - Corrected the dashboard count comparison to verify matching totals without hardcoding the temporary value `10`.

---

## 4. Next Recommended Tasks

1. **Public Portfolio Architecture Decision**: Phase 3 materially reduced transfer, CLS, avatar cost, request delay, and optional contention, but cold-mobile LCP remains `5.860 s` median against the `<4.0 s` target. Any follow-up must separately approve a smaller public entry/provider graph or an earlier pre-React server-function request strategy without duplicating or weakening the gate architecture.
2. **Fast Tailor E2E Generation Verification**: Verify the full end-to-end tailoring and Cover Letter generation flow once QA credits or a controlled test account are available.
3. **Optional Server-Side Visitor Country Privacy Review**: The browser GeoJS request is removed and no CSP allowance is needed. If visitor country analytics remain important, separately review whether the existing Appwrite `track-visitor-event` server-side GeoJS fallback should be retained, replaced with first-party request metadata only, or removed.
4. **Existing Cover Letter Permissions Migration**: Existing Cover Letter documents, if any, may not have owner document-level permissions and may need a separate safe owner-permission migration/inspection. (Non-blocking follow-up).
5. **Deeper Manual QA**:
   - Perform a manual browser QA verification of the `/upload` file and URL import using an authenticated account.
   - Run a mobile UX sweep of the new FeatureGate translation alignment on RTL/Arabic screen views.
6. **Appwrite Console Security Audit**: Audit Appwrite database collection read/write permissions to ensure all custom collections setup in this batch (e.g. `portfolio_session_rate_limits`) have the narrowest access boundaries.

---

## 5. Blocked / Pending Owner Verification

* **Protected Portfolio Production Fixture**: `testprotected` now returns `Portfolio not found`. A safe current protected fixture is required to repeat live wrong-password and correct-unlock QA.
* **Portfolio Realtime Notification Observation**: The interest API returned `200 {ok:true}` and creates the owner notification before responding, but an authenticated owner session is required to observe the Realtime notification event safely.
* **LinkedIn OAuth Browser Verification**: PENDING_OWNER_VERIFICATION (requires manual check using owner credentials or test accounts on the deployed site).
* **Public Portfolio Contact Form (Turnstile Captcha)**: Blocked in automated E2E browser environments because Cloudflare Turnstile rejects headless automation contexts. Verified working via manual owner submission in production.
* **Billing / Payments Activation**: Blocked on explicit project owner business decision.

---

## 6. Do-Not-Reopen Constraints

> [!CAUTION]
> Every developer and AI agent MUST respect these immutable project constraints:
>
> 1. **Do NOT restore Supabase or Kinde**: WiseResume is Appwrite-native. Supabase and Kinde have been completely removed.
> 2. **Do NOT treat Hostinger or `resume.thewise.cloud` as current deployment truth**: Production hosting is Vercel (`wiseresume.app`).
> 3. **Do NOT re-enable billing without explicit owner decision**: Billing is intentionally disabled / Coming Soon.
> 4. **Do NOT treat `Project Atlas/archive/` as current truth**: Archive files are historical-only and non-canonical.
> 5. **Do NOT perform target-all function deploys (`target=all`)**: Always specify targeted function directories (e.g. `node scripts/deploy_hubs.cjs --only=job-import`).
> 6. **Do NOT force-push or overwrite `origin/main`**: Start from a freshly verified branch and preserve unrelated owner work. The stale `audit/production-stabilization-qa` branch warning is no longer current.

---

## 7. How to Update This File

When completing a task or ending a work session:
1. Update **Section 3 (Where We Stopped & Current Active Focus)** with the exact status.
2. Update **Section 2 (Latest Important Commits)** with new commit hashes.
3. Add any new blocked items or recommendations to **Section 4 & 5**.
4. Log the update in `Project Atlas/CHANGELOG.md`.
