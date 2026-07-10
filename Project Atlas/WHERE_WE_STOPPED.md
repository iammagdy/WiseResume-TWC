# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-10
**Status:** P2/P3 QA Remediation Pass Completed (Local Verified)
**Location:** `Project Atlas/WHERE_WE_STOPPED.md`

---

## 1. Current Verified System Snapshot

* **Production Domain:** `https://wiseresume.app`
* **Repository:** `iammagdy/WiseResume-TWC`
* **Active Branch:** `audit/production-stabilization-qa`
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel (Production deployment ID: `dpl_HzSUMD5ajKEu5TbKsTXEXftMnUSf`).
* **Backend Platform:** Appwrite Cloud (`fra.cloud.appwrite.io`).
* **Authentication:** Appwrite Auth.
* **Database & Storage:** Appwrite Databases (`main` DB) and Appwrite Storage (`avatars` and asset buckets).
* **AI Architecture:** Server-side Appwrite `ai-gateway` function.
* **Payments/Billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary / deprioritized product module.

---

## 2. Latest Important Commits

* **`69eebee6`** — `docs(cover-letter): document and implement cover letters schema attributes and indexes in setup script` ← **LAST**
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

* **Session Status**: P2_P3_REMEDIATION_IMPLEMENTED_PENDING_PRODUCTION_VERIFICATION — The consolidated P2/P3 QA Remediation Pass is implemented and verified locally; production verification is pending.
* **P2/P3 Remediation Closed**:
  - **Resume Picker & Selector Mismatch (Option B)**: Fixed all `.id` vs `.$id` property name mismatches on raw Appwrite database objects using `getResumeDocumentId`. Verified:
    - `/interview` page loader selects the master/latest resume automatically.
    - `/interview` dropdown displays options and restores draft sessions correctly.
    - `/ai-studio/linkedin` page loads the current resume correctly, ensuring optimization buttons are not disabled.
    - A/B Compare sheet dropdowns populate and select resumes successfully.
    - Create Resume Dialog correctly pre-fills fields when opened with `parentResumeId`.
    - Cover Letter Edit Page resolves linked resume correctly and loads user-selected custom accent colors.
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

1. **Audit and Fix Remaining 401 Queries**: Resolve other queries that return 401 under user sessions (e.g. `tailor_history` and `user_preferences` collections).
2. **Existing Cover Letter Permissions Migration**: Existing cover letter documents, if any, may not have owner document-level permissions and may need a separate safe owner-permission migration/inspection. (Non-blocking follow-up).
3. **Verify QA Branch for Merge**: Keep all code on the safe branch `audit/production-stabilization-qa`. Review the remote commits and perform a manual, audited git merge/integration into `origin/main` when ready. Do NOT force-push or automatically overwrite `origin/main`.
4. **Deeper Manual QA**:
   - Perform a manual browser QA verification of the `/upload` file and URL import using an authenticated account.
   - Run a mobile UX sweep of the new FeatureGate translation alignment on RTL/Arabic screen views.
5. **Appwrite Console Security Audit**: Audit Appwrite database collection read/write permissions to ensure all custom collections setup in this batch (e.g. `portfolio_session_rate_limits`) have the narrowest access boundaries.

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
