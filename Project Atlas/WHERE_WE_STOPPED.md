# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-21
**Status:** Owner Permissions and Appwrite Realtime CSP Production Verified
**Location:** `Project Atlas/WHERE_WE_STOPPED.md`

---

## 1. Current Verified System Snapshot

* **Production Domain:** `https://wiseresume.app`
* **Repository:** `iammagdy/WiseResume-TWC`
* **Active Branch:** `main`
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel (Production deployment ID: `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p`).
* **Backend Platform:** Appwrite Cloud (`fra.cloud.appwrite.io`).
* **Authentication:** Appwrite Auth.
* **Database & Storage:** Appwrite Databases (`main` DB) and Appwrite Storage (`avatars` and asset buckets).
* **AI Architecture:** Server-side Appwrite `ai-gateway` function.
* **Payments/Billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary / deprioritized product module.

---

## 2. Latest Important Commits

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

* **Session Status**: OWNER_PERMISSIONS_REALTIME_CSP_PRODUCTION_VERIFIED - The owner-scoped access fix for `user_preferences`, `jobs`, and `job_applications` has been implemented, committed, pushed, deployed by Vercel Git integration, and production browser verified. Appwrite schema setup and owner-permission migration were applied through repo-controlled scripts only. No Appwrite hub deploy, environment variable change, provider change, AI change, or credit-path change was performed.
* **Owner Permissions and Realtime CSP Fix (2026-07-21)**:
  - **Confirmed Root Causes**: `user_preferences`, `jobs`, and `job_applications` had `documentSecurity: false`; existing document permissions were ignored and `user_preferences` documents lacked owner permissions. Browser runtime still attempted server-only `tailor_history` reads. The active Vite meta CSP omitted `wss://fra.cloud.appwrite.io`.
  - **Implemented Fix**: New documents in the affected owner collections now receive owner read/update/delete permissions. Repo scripts now idempotently enforce document security and `create("users")` collection permissions for `user_preferences`, `jobs`, and `job_applications`, then backfill owner document permissions from `user_id`.
  - **Tailor History Resolution**: Browser runtime no longer reads `tailor_history`; dashboards, applications, activity, saved jobs, and Tailoring Result context derive current tailoring history from owner-scoped resume lineage and tailoring metadata.
  - **CSP Resolution**: `wss://fra.cloud.appwrite.io` is present in the active production CSP meta tag, and authenticated browser websocket probes opened successfully.
  - **Live Migration Counts**: Final dry-run after production browser verification reported `user_preferences scanned=22 updated=0 already_correct=22`, `jobs scanned=4 updated=0 already_correct=4`, and `job_applications scanned=0 updated=0`.
  - **Validation**: Changed Node scripts passed `node --check`; related Vitest suite passed 17 files / 121 tests; `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed.
  - **Deployment Status**: Product commit `854ac4185c0a4e89196c73a2d4704babb571270d` deployed to Vercel production as `dpl_87S6QpMiXnETKAEsfA7bEPyScm4p`, reached `READY`, and `origin/main` matches local `main`.
  - **Production Browser Evidence**: Authenticated QA browser loaded `/dashboard`; Appwrite account returned 200; runtime and direct browser checks for `user_preferences`, `jobs`, and `job_applications` returned 200/201 with zero affected 401s; no runtime `tailor_history` requests were observed; Appwrite Realtime websocket opened.
  - **Residual Risk**: An unrelated visitor tracking request to `https://get.geojs.io/v1/ip/country.json` remains blocked by CSP and should be handled as a separate P3 follow-up.
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

1. **Cover Letter Pro/Premium Retest**: Retest Cover Letter flows using a Pro/Premium QA account; current Free QA account keeps this `BLOCKED_EXTERNAL_ACCESS`.
2. **Fast Tailor E2E Generation Verification**: Verify the full end-to-end tailoring and cover letter generation flow once QA credits or a controlled test account are available.
3. **GeoJS CSP Follow-up**: Decide whether visitor geolocation should be allowed via `connect-src https://get.geojs.io` or removed/reworked; current production CSP blocks that request.
4. **Existing Cover Letter Permissions Migration**: Existing cover letter documents, if any, may not have owner document-level permissions and may need a separate safe owner-permission migration/inspection. (Non-blocking follow-up).
5. **Deeper Manual QA**:
   - Perform a manual browser QA verification of the `/upload` file and URL import using an authenticated account.
   - Run a mobile UX sweep of the new FeatureGate translation alignment on RTL/Arabic screen views.
6. **Appwrite Console Security Audit**: Audit Appwrite database collection read/write permissions to ensure all custom collections setup in this batch (e.g. `portfolio_session_rate_limits`) have the narrowest access boundaries.

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
