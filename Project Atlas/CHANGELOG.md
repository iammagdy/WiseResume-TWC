# Project Atlas Changelog

**Last verified:** 2026-05-15
**Type:** changelog
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/SOURCE_OF_TRUTH_MAP.md`
**Canonical owner:** this file

---

## 2026-05-15 - Bolt Repo Slimming (5 MB Import Cap)

### Summary
Prepared a slim branch so `iammagdy/WiseResume-TWC` can be imported into bolt.new, which enforces a hard ~5 MB GitHub tarball size cap.

### Root cause
The repo HEAD contained large committed Appwrite hub build artifacts (`.tar.gz` / `.zip`) and image-heavy documentation assets (screenshots). bolt.new imports by downloading the GitHub tarball and rejects repos over 5 MB.

### What changed
- Removed committed hub archives from the repo HEAD on branch `codex/bolt-slim` (root artifacts and `appwrite-hubs/*.tar.gz` + `auth-master.zip`).
- Removed image-heavy documentation assets: `screenshots/`, `docs/screenshots/`, `.canvas/assets/`.
- Updated `.gitignore` to prevent re-adding generated archives and those removed asset directories.
- Added session log: `Project Atlas/05-Migration to Appwrite/21-Session-Log-2026-05-15-Bolt-Repo-Slimming.md`.

### Verification
- Staged-tree archive size (gzipped) measured at ~3.28 MB (below bolt.new 5 MB cap).

### Current state
- Slimming work exists locally on branch `codex/bolt-slim` and must be committed/pushed to affect GitHub imports.

---

## 2026-05-15 - UI Follow-up Fixes

### Summary
Resolved the two follow-up issues left open after the main UI/UX stabilization pass: the recurring `useAppSettings` authorization warning and the landing mobile animated headline rendering issue.

### Root cause
The settings warning came from a direct browser read of `app_settings` on routes where that collection is not readable for the current user. The landing mobile issue came from reusing the desktop typewriter overlay pattern on a narrow mobile layout where an in-flow animated line is the correct model.

### What changed
- Updated `src/hooks/useAppSettings.ts` so expected Appwrite `401/403` settings-read failures fall back to defaults without warning spam.
- Added `src/hooks/__tests__/useAppSettings.test.tsx` to verify silent fallback for expected auth failures and warnings for unexpected failures.
- Added `src/components/landing/TypewriterHeadlineLine.tsx` and moved both `WiseResumeHero` and `LandingHeroShell` to the shared headline-line structure.
- Changed the landing mobile headline to an in-flow animated word line while preserving the desktop width-reservation behavior on `sm+`.
- Increased the mobile `.lp-typewriter-line` min-height in `src/pages/index-landing.css`.
- Updated `reports/ui-ux-stabilization-audit-2026-05-15.md` and added `Project Atlas/05-Migration to Appwrite/19-Session-Log-2026-05-15-UI-Followups.md`.

### Verification
- `npm exec vitest run src/hooks/__tests__/useAppSettings.test.tsx src/components/landing/__tests__/TypewriterHeadlineLine.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification on the real local WiseResume server confirmed the settings warning no longer appears and the mobile landing headline renders correctly.

### Current state
- The two follow-up issues from the second-pass UI audit are fixed locally.
- No backend or deployment changes were required.

---

## 2026-05-15 - UI/UX Stabilization Pass

### Summary
Implemented the frontend stabilization pass for the confirmed shell, dashboard, tailor, upload, and landing UX issues, then documented the second-pass route sweep separately from the original fixes.

### Root cause
The regressions were caused by frontend layout and hierarchy problems rather than backend failures: mobile shell spacing did not account for both the Ask FAB and bottom nav, returning-user actions were buried or truncated on dashboard, and the tailor first screen combined a broken closed-state selector with an overloaded entry flow.

### What changed
- Added route-aware mobile shell spacing and Ask FAB suppression rules for fixed-footer pages.
- Tightened desktop navigation chrome without changing IA.
- Reworked dashboard returning-user actions, loading copy, selection discoverability, and upload-card mobile layout.
- Fixed the tailor resume selector closed state and removed the associated React key warning.
- Reframed the tailor first screen into a clearer step sequence and stacked the job URL controls on mobile.
- Increased landing hero spacing on mobile before the next content band.
- Added focused tests for shell layout, dashboard hero CTA behavior, and tailor URL control layout.
- Added `reports/ui-ux-stabilization-audit-2026-05-15.md` and `Project Atlas/05-Migration to Appwrite/18-Session-Log-2026-05-15-UI-UX-Stabilization.md`.

### Verification
- `npm exec vitest run src/components/layout/__tests__/appShellLayout.test.ts src/components/dashboard/__tests__/DashboardHero.test.tsx src/components/editor/tailor/__tests__/JobUrlParser.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification covered authenticated dashboard/upload/tailor checks, public mobile checks for `/` and `/pricing`, and a second-pass route sweep across auth, job-seeker, and WiseHire surfaces.

### Current state
- The confirmed UI issues from the original audit are fixed locally.
- No Appwrite schema, function, or deployment changes were required for this pass.
- The second-pass sweep found two follow-up items to track separately: a recurring `useAppSettings` authorization warning and an existing mobile landing animated-title rendering issue.

---

## 2026-05-15 - Function Ownership Implementation

### Summary
Implemented the source-owned function routing plan for AI contracts, DevKit direct calls, coupons, WiseHire, public share password verification, and safe first-pass performance cleanup.

### Root cause
The frontend invoked several function names that were either routed through generic AI gateway behavior or not owned by the local `appwrite-hubs/` inventory. Structured AI callers expected typed JSON while most local gateway routes returned generic chat content.

### What changed
- Added Appwrite hubs: `coupons`, `wisehire-gateway`, and `public-share`.
- Routed coupon, WiseHire, and protected-share calls through owned local hubs in `src/lib/appwrite-functions.ts`.
- Added typed structured AI responses for high-risk AI gateway features while keeping `parse-resume` as the dedicated normalized route.
- Moved audited DevKit direct calls and Live Activity probes to owned `admin-devkit-data` / `resume-section-ai` paths.
- Removed the active unowned `submit-contact-request` fallback from feedback reporting.
- Rewrote `scripts/README.md` to point operators at Appwrite hub deployment and mark Supabase/edge scripts as legacy audit aids.
- Updated deploy inventory and Appwrite function manifest for the new hubs.
- Removed mixed dynamic/static import warnings for `captureErrorShim` and `pdf/textPreprocessor`.

### Verification
- `node --check` passed for modified/new Appwrite hubs and `scripts/deploy_hubs.cjs`.
- `npm exec tsc -- --noEmit` passed.
- `npm run build` passed.
- Remaining build warning: large chunks for heavy modules such as OCR, doc export, monitoring, DevKit, and charts.

### Current state
- Local source is ready for deployment.
- Live Appwrite was not redeployed in this session; the updated hubs must be deployed before live behavior can be claimed fixed.

---

## 2026-05-15 - Codebase health audit documented

### Summary
Added a dedicated Atlas session log for the read-only codebase health audit covering Appwrite function ownership, AI contract drift, legacy migration remnants, and performance risks.

### What changed
- Created `Project Atlas/05-Migration to Appwrite/16-Session-Log-2026-05-15-Codebase-Health-Audit.md`.
- Recorded the verified root findings from source inspection without changing application code.

### Verification
- `npm exec tsc -- --noEmit` passed during the audit session.
- `npm run build` passed during the audit session.
- Workspace remained clean on `main...origin/main`.

---

## 2026-05-14 - Root README Added

### Summary
Added a professional root `README.md` for the GitHub repository so the project has a clear SaaS-grade entry point for developers, operators, and AI agents.

### What changed
- Created a root README covering product positioning, platform surfaces, architecture, repository map, local setup, commands, environment notes, deployment path, and Atlas rules.
- Linked the README to the canonical Atlas files instead of duplicating deployment-sensitive operational truth.

### Verification
- Markdown file created at repo root.
- Atlas changelog updated to record the documentation change.

---

## 2026-05-14 - DevKit Operations Hub Auth/Deploy Stabilization

### Summary
Stabilized the DevKit panel auth path and deployment workflow for the panels that were showing `Unauthorized`, then simplified the sidebar into fewer operations surfaces.

### Root cause
DevKit login returns a signed token from `admin-devkit-data`, but several panels depend on standalone admin Appwrite Functions. The local standalone sources accept signed tokens, but the deploy workflow rebuilt only a subset of hubs and could leave live functions stale. Stale standalone functions reject the signed token and show `Unauthorized`.

### What changed
- Email Automations, Portfolios, Visitors, Testmail Inbox, and Mission Control live-visitors now use the shared DevKit client path for their standalone admin functions.
- DevKit sidebar now merges Visitors + Analytics + Onboarding into Growth & Traffic, and merges Email Automations into the Email hub.
- The Appwrite hub deploy workflow now rebuilds every deployed hub from source and validates archive shape before deployment.
- `scripts/deploy_hubs.cjs` now includes missing admin hubs, syncs shared admin variables to every admin hub, syncs Resend variables to email hubs, and runs safe smoke executions when `DEVKIT_PASSWORD` is available.

### Verification
- `npm exec tsc -- --noEmit` passed.
- `git diff --check` passed.
- Browser E2E reached `/devkit`, but full tab-by-tab testing is blocked until the DevKit password is supplied because the local DevKit session is locked.

---

## 2026-05-14 - Public Page Navigation Stall Fixed

### Summary
Fixed `/pricing` and other public utility pages appearing to load but then failing to navigate when the Dashboard button or similar links were clicked.

### Root cause
The routes were valid and rendered. The failure was a browser runtime stall caused by the animated WebGL Aurora background running on non-landing public pages. Chromium logged GPU `ReadPixels` stall warnings, and the in-app browser could render `/pricing` while click execution timed out. This made navigation look broken even though React routing was present.

### What changed
- `src/components/landing/AuroraLayer.tsx` now keeps WebGL Aurora only on the real landing pages (`/` and `/enterprises`).
- `src/components/landing/AuroraBackground.tsx` and `src/components/landing/Aurora.tsx` support `forceCssFallback`, so utility pages keep the branded background without starting the WebGL renderer.
- `/pricing`, `/sign-in`, `/whats-new`, `/auth*`, and `/p/*` now use the CSS fallback background.

### Verification
- In-app browser: loaded `http://localhost:5000/pricing`, clicked `Dashboard`, and landed on `http://localhost:5000/dashboard`.
- Headless browser smoke: `/pricing` rendered with zero fresh WebGL/GPU stall warnings; unauthenticated `/dashboard` redirected to `/auth?mode=login`.
- `npm exec tsc -- --noEmit` passed.

---

## 2026-05-13 - Deploy admin-devkit-data: Resend Vars + Redeployment Wiring

### Summary
Wired the CI deploy pipeline so that the `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` environment variables are automatically provisioned on the `admin-devkit-data` Appwrite Function when the GitHub Actions workflow runs. This unblocks the plan-change notification and email side-effects added in the previous entry.

### What changed
- `scripts/deploy_hubs.cjs` — added `ensureVariable` calls for `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` on `admin-devkit-data` after the hub deployment loop.
- `.github/workflows/deploy-appwrite-hubs.yml` — exports `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` from GitHub secrets into the deploy step so the deploy script can read them.

### Manual steps still required (one-time)
Add the three secrets to the GitHub repository (`Settings → Secrets and variables → Actions`):
- `RESEND_API_KEY` — same Resend API key already used by `admin-email`
- `RESEND_FROM_EMAIL` — e.g. `hello@thewise.cloud`
- `RESEND_FROM_NAME` — e.g. `WiseResume`

Then trigger the **Deploy AI Hubs** workflow (`workflow_dispatch`) from GitHub Actions. The script will deploy `admin-devkit-data` and set all three variables in one run.

### Smoke test
After the workflow completes: set a test user's plan in DevKit → confirm the user's notification appears in their bell icon and a transactional email arrives in their inbox.

---

## 2026-05-13 - Plan Change: Realtime Reflect + Notify User

### Summary
Three-part fix so that when God Mode DevKit sets a permanent plan or grants a trial, the target user's browser reflects the change immediately and they receive both an in-app notification and a transactional email.

### Root causes addressed
1. **Stale frontend cache** — `useMe` had `staleTime: 5 * 60 * 1000` with no push invalidation. `invalidateQueries(['me'])` in the admin's browser only cleared the admin's cache.
2. **No notification** — `handleSetPlan` and `handleGrantTrial` in `admin-devkit-data` never wrote to `notifications`.
3. **No email** — neither handler called Resend.

### What changed
- `src/hooks/useMe.ts` — added Appwrite Realtime subscription on `databases.main.collections.subscriptions.documents`. On any event the hook calls `queryClient.invalidateQueries({ queryKey: ['me', user.id] })` and unsubscribes on cleanup. Plan reflects in ~2 seconds without polling.
- `appwrite-hubs/admin-devkit-data/src/main.js` — added:
  - `resendRequest(method, path, body)` — minimal Resend REST helper (same pattern as `admin-email`)
  - `planUpgradeEmailHtml(email, planLabel, durationLabel)` — styled email template matching `baseTemplate` (indigo header, 560px max-width)
  - `createPlanNotification(databases, userId, planLabel, durationLabel, log)` — writes to `notifications` collection with `type: 'system'`, correct title/message, `is_read: false`, permissions scoped to `Role.user(userId)`. Non-fatal (try/catch + warning log).
  - `sendPlanUpgradeEmail(userId, planLabel, durationLabel, log)` — fetches user email via `getUser()`, sends via Resend. Skips gracefully when `RESEND_API_KEY` is absent. Non-fatal.
  - Both `handleSetPlan` and `handleGrantTrial` now call both helpers via `Promise.allSettled` after the DB write succeeds, so neither can block or fail the primary plan change.

### Env vars required in `admin-devkit-data` Appwrite Function
Add these in Appwrite Console → Functions → `admin-devkit-data` → Variables:
- `RESEND_API_KEY` — Resend API key (same value already used in `admin-email`)
- `RESEND_FROM_EMAIL` — sender address (e.g. `hello@thewise.cloud`)
- `RESEND_FROM_NAME` — sender name (e.g. `WiseResume`)

### Verification
- `npm exec tsc -- --noEmit` passed.
- `admin-devkit-data` must be redeployed after this commit for changes to take effect on live.

---

## 2026-05-13 - DevKit Login Spinner And Profile Action Fix

### Summary
Fixed the `/devkit` login button getting stuck in a loading state and corrected a DevKit profile drawer action contract that could dispatch the wrong backend action.

### What changed
- `devKitLogin` now times out after 15 seconds instead of waiting forever for an Appwrite SDK execution promise.
- Shared DevKit panel calls now time out after 20 seconds and return structured `NETWORK_ERROR` results.
- `UserDetailDrawer` now sends `profile_action: "get"` under the top-level `action: "update-profile"` contract instead of duplicate `action` keys.
- Redeployed `admin-devkit-data` as deployment `6a0415154ff4ed2b537e`.

### Verification
- `npm exec tsc -- --noEmit` completed successfully.
- Local browser smoke test on `localhost:5000/devkit` with a deliberately wrong password re-enabled the submit button instead of leaving it spinning.
- Live Appwrite `verify-devkit-session` wrong-password execution used deployment `6a0415154ff4ed2b537e`, completed, and returned HTTP `401` with code `INVALID_PASSWORD`.

---

## 2026-05-13 - DevKit Operations Data Restored

### Summary
Fixed misleading and broken DevKit operations data by making Appwrite Auth the source of truth for admin users and by separating active-user resumes from orphaned resume documents.

### What changed
- `admin-devkit-data` now uses internal REST GET helpers for Appwrite read/list calls instead of `node-appwrite` GET helpers that send request bodies.
- `overview-stats` now returns active-user-owned resume count, raw resume document count, orphan count, and the unverified Auth user list.
- `list-users-page` now pages from Appwrite Auth users first, then joins profiles, subscriptions, credits, and per-user resume counts.
- `set-plan` now writes only schema-valid subscription/profile fields and clears stale trial fields; `useMe` computes active trial effective plan from existing fields.
- DevKit UI now shows unverified and missing-profile users clearly and removes visible Supabase wording from the DevKit surfaces touched here.
- Redeployed `admin-devkit-data` as deployment `6a040bea5ae7d378180b`.

### Why
The DevKit was mixing old assumptions with current Appwrite data. Live Appwrite has 2 Auth users, 1 profile, and 34 resume documents; 31 resume documents are orphaned from deleted/nonexistent Auth users. Counting raw resume documents made infrastructure look wrong, and using profiles as the God Mode source hid the unverified Auth user.

### Verification
- Local handler execution against live Appwrite returned 2 Auth users, 1 verified user, 3 active-user-owned resumes, 31 orphaned resume documents, and `test@thewise.cloud` as the unverified user.
- A same-plan `set-plan` smoke test for the verified user returned success and the joined user list still showed `premium`.
- `npm exec tsc -- --noEmit` completed successfully.
- Live deployment status is `ready`; `verify-devkit-session` wrong-password execution returns `INVALID_PASSWORD` with empty runtime stderr.

---

## 2026-05-13 - DevKit Login Runtime Restored

### Summary
Fixed the live DevKit "Access denied" blocker by redeploying `admin-devkit-data` with a valid Appwrite Function artifact.

### What changed
- Rebuilt `admin-devkit-data.tar.gz` from `appwrite-hubs/admin-devkit-data/` so `package.json`, `src/main.js`, and `node_modules/` are at the archive root.
- Redeployed Appwrite Function `admin-devkit-data` as deployment `6a0407d342fbb7593d4d` with entrypoint `src/main.js`.
- Updated the DevKit Atlas cards to record the verified root cause and the Appwrite-native recovery path.

### Why
The login failure was not caused by the entered password. The live function failed before password verification with `Cannot find module 'node-appwrite'`, so the frontend collapsed the runtime failure into a generic "Access denied" toast.

### Verification
- New deployment status is `ready`.
- A deliberately wrong `verify-devkit-session` request now completes with HTTP `401`, code `INVALID_PASSWORD`, and empty runtime stderr, proving the function boots and auth handling is reachable.

---

## 2026-05-13 - DevKit Full Stability Audit & Remediation

### Summary
Full audit and fix of the DevKit developer tools. Resolved two frontend crashes, consolidated 14+ missing Appwrite Functions into the existing `admin-devkit-data` hub, fixed error reporting, and deployed 4 previously unbuilt functions to production.

### What changed

#### Frontend (no deployment required)
- **`TestItem.tsx`** — Added `result = { status: 'idle' }` default prop to prevent crash when `results[test.id]` is `undefined` before any test runs.
- **`DevKitRunner.tsx`** — Fixed prop name mismatch: `expandedJson` → `isExpanded`, `onToggleJson` → `onToggleExpand`, removed non-existent `globalRunning` prop. Added `?? { status: 'idle' }` fallback for result.
- **`VisitorsPanel.tsx`** — Fixed `[object Object]` error display: replaced `throw fnErr` (raw object) with `throw new Error(msg)` extraction and replaced `String(e)` in catch blocks with `e instanceof Error ? e.message : String(e)`.
- **`AdminUsersPanel.tsx`** — Rerouted all 11 admin mutation invocations (`admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-save-note`, `admin-impersonate`, `admin-merge-identity`, `admin-delete-user`, bulk operations) to `admin-devkit-data` with action-based routing.
- **`UserDetailDrawer.tsx`** — Rerouted all 14 admin invocations (`admin-audit-logs`, `admin-save-note`, `admin-update-profile`, `admin-get-identity`, `admin-merge-identity`, `admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-revoke-sessions`, `admin-delete-user`, `admin-wisehire-reset-user`, `admin-list-user-content`) to `admin-devkit-data` with action-based routing.

#### Backend (`admin-devkit-data` Appwrite Function)
Added 16 new action handlers: `set-plan`, `grant-trial`, `revoke-trial`, `suspend-user`, `set-credits`, `save-note`, `delete-user`, `merge-identity`, `revoke-sessions`, `list-user-content`, `update-profile`, `get-identity`, `user-audit-logs`, `wisehire-reset-user`, `live-activity`, `impersonate`, `get-resume-detail`.

Extended `requiredFunctions` diagnostics list from 7 → 11 entries. Removed stale `keysInSupabaseVault: false` Supabase relic.

#### Appwrite Deployments
- `admin-devkit-data` — redeployed with all new handlers (status: `ready`)
- `admin-visitor-analytics` — first live deployment (status: `ready`)
- `admin-testmail` — first live deployment (status: `ready`)
- `admin-impersonate` — first live deployment (status: `ready`)
- `admin-onboarding-funnel` — created and deployed as new function (status: `ready`)

### Why
- Smoke Runner was crashing on mount due to prop name mismatch between `DevKitRunner` and `TestItem` and an unguarded `undefined` result access.
- Visitors Panel showed `[object Object]` for all errors because Appwrite error objects were stringified with `String(e)` rather than `.message` extraction.
- 14 admin action buttons in God Mode and UserDetailDrawer were calling non-existent standalone Appwrite Functions. Consolidating into `admin-devkit-data` avoids deploying 14+ separate functions.

### Verification
- `npx tsc --noEmit` — 0 errors ✓
- All 4 new Appwrite deployments confirmed `status: ready` ✓

---

## 2026-05-13 - Fix infinite loading skeleton across protected routes


### Summary
Fixed a critical bug where the application would get stuck in a loading skeleton state indefinitely after the recent AuthContext refactor.

### What changed
- Updated multiple downstream files (`DashboardPage.tsx`, `InterviewPage.tsx`, `ProfilePage.tsx`, `JobSeekerRoute.tsx`, `WiseHireGuard.tsx`) to consume the newly renamed `authSettled` and `authReady` properties from `useAuth()`.
- Updated test files (`Auth-D3.test.tsx`, `ApplicationsTracker-D9.test.tsx`, `ApplicationsDeadline-D9.test.tsx`, `ApplicationsAnalytics-D9.test.tsx`) to match the new auth context shape.

### Why
The previous performance fix renamed `supabaseSettled` and `supabaseReady` to `authSettled` and `authReady` inside `AuthContext.tsx` and `ProtectedRoute.tsx`. However, the downstream consumers were still attempting to destructure `supabaseSettled` from `useAuth()`. This resulted in `undefined`, causing the `!supabaseSettled` checks to evaluate to true, which trapped those pages in a permanent loading skeleton.

### Verification
- `npx tsc --noEmit` completed successfully.
- Visual verification confirmed the dashboard now loads correctly and does not hang.

---

## 2026-05-13 - PDF.js worker bootstrap repair for CV upload

### Summary
Fixed the real browser-side CV upload blocker by replacing the broken PDF.js worker bootstrap and reclassifying worker startup failures so valid files no longer show up as damaged.

### What changed
- Replaced the old blob/classic-worker PDF.js bootstrap with a direct module-worker configuration through `GlobalWorkerOptions.workerPort`.
- Added a dedicated PDF worker runtime failure classification so browser startup failures no longer collapse into `CORRUPTED`.
- Updated upload recovery copy so only genuine invalid PDFs get damaged-file messaging.
- Verified the parser in a real browser context using `tests/e2e/fixtures/sample-resume.pdf`.

### Why
The previous implementation was still guessing at the failure. The verified issue was that PDF.js could not start its worker in the browser because the wrapper called `importScripts(...)` on a module-worker path, which broke before any resume text extraction happened.

### Verification
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Real browser-context verification:
  - `extractTextFromPDF(sample-resume.pdf)` succeeds
  - `parseResumePDF(sample-resume.pdf)` returns `success: true`

---

## 2026-05-13 - Live ai-gateway redeploy + Atlas functions rename

### Summary
Completed the live Appwrite `ai-gateway` redeploy for the resume parser fix and renamed the canonical Atlas backend-card section from `edge-functions/` to `functions/`.

### What changed
- Rebuilt `ai-gateway.tar.gz` with dependencies and redeployed it to the live Appwrite Function.
- Activated the new `ai-gateway` deployment and verified the live `parse-resume` execution path now returns structured `ResumeData`.
- Improved `src/lib/appwrite-functions.ts` so Appwrite envelope errors that contain an embedded status code are translated more accurately.
- Renamed `Project Atlas/01-Currently Implemented/edge-functions/` to `Project Atlas/01-Currently Implemented/functions/`.
- Updated key Atlas references and section index text so the canonical backend card path no longer uses the stale Supabase-specific folder name.

### Why
The repo-side parser fix was not enough by itself because the browser calls the live Appwrite `ai-gateway` function. Until that live function was redeployed, the dashboard could still hit stale parser behavior. At the same time, the Atlas folder name was misleading future agents by suggesting the old Supabase edge-function model was still the canonical backend-card structure.

### Verification
- Verified live Appwrite `createExecution('ai-gateway', { featureName: 'parse-resume', ... })` now returns `200` with structured `ResumeData`.
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local parser asset endpoint `http://localhost:5000/pdfjs/standard_fonts/FoxitFixed.pfb` returns `200`.

---
## 2026-05-13 - Cross-device CV parsing stabilization

### Summary
Fixed CV upload parsing failures across desktop, iPhone, and Android by correcting the `parse-resume` backend contract, hardening frontend fallback behavior, and making PDF/OCR runtime assets part of normal local setup.

### What changed
- Added a dedicated `parse-resume` path inside `appwrite-hubs/ai-gateway/src/main.js` so the gateway now accepts extracted resume text and returns normalized `ResumeData` instead of a generic chat payload.
- Updated `src/lib/pdfParser.ts` to validate AI parser responses and fall back automatically to the local parser when the payload is malformed or empty.
- Added shared runtime asset checks in `src/lib/pdf/runtimeAssets.ts` and wired the PDF/OCR asset sync into `dev`, `start`, `postinstall`, and `prebuild`.
- Updated upload error handling so missing local parser assets, iPhone/Safari PDF compatibility issues, OCR/browser failures, and real corruption no longer collapse into the same damaged-file message.
- Repaired the parser test setup and updated focused tests to use the current Appwrite-based parsing path.

### Why
The verified root cause was twofold: `parse-resume` had already been routed through `ai-gateway`, but the gateway still treated it like a generic chat request and ignored the extracted resume text contract; on top of that, local PDF/OCR assets were not guaranteed outside build flows, which made device and environment failures look like bad files.

### Verification
- `node scripts/copy-pdf-ocr-assets.mjs`
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local asset endpoints return `200` for PDF.js and Tesseract runtime files.

---

## 2026-05-13 - Local auth fix: redirect dev sessions from 127.0.0.1 to localhost

### Summary
Fixed local login failure where the browser showed `Failed to fetch` on the auth page when the app was opened on `http://127.0.0.1:5000`.

### What changed
- Added a DEV-only redirect in `src/main.tsx` from `127.0.0.1` to `localhost`.
- Added a stability card documenting the verified Appwrite origin mismatch.
- Updated the Auth page Atlas card with the current Appwrite-based auth model and the local development requirement.

### Why
The root cause was a live Appwrite Web platform mismatch, not bad credentials or a broken frontend. The project allows `http://localhost:5000` but rejects `http://127.0.0.1:5000`, so direct browser auth calls failed before the app received a normal API error.

### Verification
- Verified live Appwrite response for `Origin: http://127.0.0.1:5000` returns `403 general_unknown_origin`.
- Verified live Appwrite response for `Origin: http://localhost:5000` returns valid CORS headers.
- Local frontend and API server remained reachable after the redirect was added.

---

## 2026-05-12 - Atlas A-to-Z source map

### Summary
Added `Project Atlas/SOURCE_OF_TRUTH_MAP.md` so future agents and contributors have one clear map for product identity, architecture, AI, DevKit, deployment, implemented features, planned work, governance, and conflict resolution.

### What changed
- Added the A-to-Z Atlas source map.
- Updated `Project Atlas/README.md` so the source map is the first file agents read.
- Re-verified the map against current code references: `package.json`, `src/lib/appwrite.ts`, `src/lib/appwrite-collections.ts`, and `src/lib/appwrite-bridge.ts`.

### Why
After removing competing external documents, the Atlas needed a single orientation page that tells agents exactly where each kind of truth lives and what must not be reintroduced.

### Verification
Documentation-only change. Key deleted outside docs were checked against `main` and returned not found. No runtime tests were required.

---

## 2026-05-12 - Documentation consolidation: Atlas-only source of truth

### Summary
The project documentation model was consolidated so `Project Atlas/` is the only source of truth for WiseResume, WiseHire, The Wise Cloud, architecture, deployment, AI routing, agent rules, and operational state.

### What changed
- Added `Project Atlas/GOVERNANCE.md` as the canonical governance page using the current Appwrite-native architecture.
- Updated Atlas rules and maintenance guidance to remove references to `project-governance/` as a higher authority.
- Folded durable rules from the old governance folder into Atlas language: inspect first, do not guess, preserve working behavior, keep account boundaries strict, document accepted changes, and protect deployment safety.
- Preserved AI routing intent inside `Project Atlas/02-Planned/ai-routing-rollout.md` and removed the old external routing folder as a separate source of truth.
- Removed stale or conflicting Markdown documentation outside `Project Atlas/`.

### Why
The repository had multiple competing documentation surfaces. Some older docs still described Kinde/Supabase as current and claimed `project-governance/` was supreme, while the live project is Appwrite-native and the README already directed agents to the Atlas. This cleanup removes that ambiguity for the owner and future AI agents.

### Verification
This was a documentation-only change. No application code was changed and no runtime test suite was required.
