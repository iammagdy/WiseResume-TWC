# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-22
**Status:** Performance Phase 2 Editor Startup Production Verified with Known Residual Warnings
**Location:** `Project Atlas/WHERE_WE_STOPPED.md`

---

## 1. Current Verified System Snapshot

* **Production Domain:** `https://wiseresume.app`
* **Repository:** `iammagdy/WiseResume-TWC`
* **Active Branch:** `main`
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel (Production deployment ID: `dpl_GLhcMR5mu95pRBSKw8VwSbNmEpx4` for the latest verified code-bearing change).
* **Backend Platform:** Appwrite Cloud (`fra.cloud.appwrite.io`).
* **Authentication:** Appwrite Auth.
* **Database & Storage:** Appwrite Databases (`main` DB) and Appwrite Storage (`avatars` and asset buckets).
* **AI Architecture:** Server-side Appwrite `ai-gateway` function.
* **Payments/Billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary / deprioritized product module.

---

## 2. Latest Important Commits

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

1. **Performance Phase 3 Decision**: Measure and fix Public Portfolio mobile LCP/CLS/avatar behavior. Keep Tailoring no-result/timeout investigation isolated from portfolio and Editor work.
2. **Broadcast Schema Decision**: Inspect the live `broadcasts` collection and intended announcement contract in a separately approved Appwrite task. The current authenticated query expects `active`, but production schema does not provide it.
3. **Cover Letter Pro/Premium Retest**: Retest Cover Letter flows using a Pro/Premium QA account; current Free QA account keeps this `BLOCKED_EXTERNAL_ACCESS`.
4. **Fast Tailor E2E Generation Verification**: Verify the full end-to-end tailoring and cover letter generation flow once QA credits or a controlled test account are available.
5. **Optional Server-Side Visitor Country Privacy Review**: The browser GeoJS request is removed and no CSP allowance is needed. If visitor country analytics remain important, separately review whether the existing Appwrite `track-visitor-event` server-side GeoJS fallback should be retained, replaced with first-party request metadata only, or removed.
6. **Existing Cover Letter Permissions Migration**: Existing cover letter documents, if any, may not have owner document-level permissions and may need a separate safe owner-permission migration/inspection. (Non-blocking follow-up).
7. **Deeper Manual QA**:
   - Perform a manual browser QA verification of the `/upload` file and URL import using an authenticated account.
   - Run a mobile UX sweep of the new FeatureGate translation alignment on RTL/Arabic screen views.
8. **Appwrite Console Security Audit**: Audit Appwrite database collection read/write permissions to ensure all custom collections setup in this batch (e.g. `portfolio_session_rate_limits`) have the narrowest access boundaries.

---

## 5. Blocked / Pending Owner Verification

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
> 6. **Do NOT force-push or overwrite `origin/main`**: A branch/repo mismatch risk exists on main; keep changes isolated on `audit/production-stabilization-qa`.

---

## 7. How to Update This File

When completing a task or ending a work session:
1. Update **Section 3 (Where We Stopped & Current Active Focus)** with the exact status.
2. Update **Section 2 (Latest Important Commits)** with new commit hashes.
3. Add any new blocked items or recommendations to **Section 4 & 5**.
4. Log the update in `Project Atlas/CHANGELOG.md`.
