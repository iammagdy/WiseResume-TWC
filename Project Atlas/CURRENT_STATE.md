# WiseResume Current Production State Snapshot

**Last Verified:** 2026-08-15
**Status:** Canonical Production Snapshot - AI runtime receipts schema contract remediation validated on branch `fix/ai-runtime-receipts-schema-contract`; workflow `31871663976` failed before deployment; PR not opened; all Appwrite deployments remain blocked pending review of the contract fix; DevKit module-boundary crash hotfix PR #185 merged; DevKit Phase 1 PR #184 remains merged pending targeted deployment; DevKit Live Verification Completed With Confirmed Mismatches and Unverified/Code-Only Findings; Login Error-Masking Fix Production Verified; Email Verification Production Verified; Broadcast Delivery Verified; Tailoring Verified Ready; Portfolio LCP Warning Retained
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`

---

## AI runtime receipts schema contract remediation (2026-08-15)

* **Status:** `IMPLEMENTED_VALIDATED_NOT_DEPLOYED`. Branch `fix/ai-runtime-receipts-schema-contract` tightens the repository contract for six confirmed live-required fields and adds focused regression coverage. No Appwrite setup script or deployment was run.
* **Failed workflow:** Run `31871663976` stopped at `scripts/setup_ai_runtime_receipts_schema.cjs`; no function deployment occurred.
* **Security finding:** The current live `ai_runtime_receipts` collection was observed with `permissions=[]` and `documentSecurity=false`, so the reported server-only assertion failure is not reproducible from the present state. The exact historical failing operand and drift origin are `UNKNOWN`.
* **Contract finding:** The deterministic repository mismatch was that `request_id`, `hub`, `feature_id`, `status`, `completed_at`, and `expires_at` were marked optional while the confirmed live schema requires them. Other attribute/index contracts are unchanged.
* **Safety:** Server-only behavior remains enforced; diagnostics expose only permissions-array status, permission count, and document-security value. No automatic production security repair, permission broadening, or collection replacement was added.
* **Validation:** Focused suite passed with 8 tests; relevant Node syntax checks, `npx tsc --noEmit`, and `git diff --check` passed.
* **Readiness:** `READY_FOR_PR`; branch push and review remain required before any deployment consideration.

## DevKit production crash hotfix (2026-08-15)

* **Status:** `MERGED_PENDING_VERCEL_PRODUCTION_STATUS_AND_TARGETED_APPWRITE_DEPLOYMENT`. PR #185 (`fix/devkit-module-boundary-hotfix` → `main`) matched head `46dc76f16a037d86a73d11b74f27a7e15ad744c6` and merged with commit `fe68327897ad95e924fb2941bcc5af44d156895e`.
* **Root cause:** Browser code imported the CommonJS Appwrite hub runtime `appwrite-hubs/admin-devkit-data/src/completion-health.js`, whose `module.exports` was evaluated in the browser and caused `ReferenceError: module is not defined` on `/devkit`.
* **Fix:** Frontend code now uses browser-safe ESM `src/lib/devkit/completionHealth.ts`; the deployable backend CommonJS classifier remains unchanged, preserving identical slot-health semantics.
* **Validation:** Focused DevKit suite passed with 1 file / 10 tests; `npx tsc --noEmit`, `git diff --check`, relevant backend `node --check` commands, and `npm run build` passed. Existing Vite large-chunk warnings remain non-blocking.
* **Checks:** PR Validation, Vercel preview, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Boundary:** No Appwrite deployment or manual Vercel deployment occurred. No schema/permission change, secret/environment change, account change, or production-data change occurred. All Appwrite deployments remain blocked pending a separate approved targeted-deployment task; only normal Vercel production deployment status remains to be observed.
* **Report:** [`reports/devkit/2026-08-15-module-boundary-hotfix.md`](./reports/devkit/2026-08-15-module-boundary-hotfix.md)

## DevKit Phase 1 PR #184 merge closeout (2026-08-15)

* **Verdict:** `MERGED_PENDING_TARGETED_DEPLOYMENT`. PR #184 head `04251b41f6661e1eb33f8f034cfa52b119e5a8bc` was merged into `main` with merge commit and final remote `main` SHA `9ff1f14a353cc2a82d95bee722e2e4f54f4f6580`.
* **Checks:** PR Validation, Security Validation, Vercel, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** No Appwrite deployment, manual Vercel deployment, schema/permission change, secret/environment change, account change, or production-data change occurred. The automatic PR Vercel preview is not production deployment authorization.
* **Next targeted Appwrite candidates:** `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and the PR #181 `email-service` candidate after exact-ID/status confirmation. Do not use `target=all`.
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
* **Email recovery deployment context:** the official workflow previously deployed exactly `email-service` with source-hash alignment. The final template correction required no code change or new deployment; no Appwrite or Vercel deployment was initiated for this documentation closeout.

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
