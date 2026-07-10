# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-10
**Status:** P1 Production Browser QA Remediation Completed
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

* **`15bb25b8`** — `fix(schema): pre-fetch existing attributes in setup_audit_logs_schema to prevent duplicate checks and timeouts` ← **LAST**
* **`cfac645a`** — `fix(schema): pre-check existing attributes on profiles collection before creation`
* **`38583064`** — `fix: resolve owner QA dashboard and tailoring issues`
* **`78e7055b`** — `fix(schema): resolve profiles collection row-size limit by keeping draft storage client-side`
* **`f251f6a1`** — `docs(changelog): document portfolio interest anonymous execution fix`
* **`6d39c450`** — `fix(security): route sendPortfolioInterest through Vercel API and add owner notification`
* **`ecdc1e47`** — `fix(security): skip Appwrite JWT generation for public share function calls`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: VERIFIED_P1_REMEDIATION_READY_FOR_RETEST — Completed implementation of all 6 P1 browser QA blocker fixes on the local repository. Checked formatting and TypeScript compilation successfully.
* **P1 Fixes Implemented & Verified**:
  - **P1-1 (Tailoring Hub AI Failure)**: Guarded `aiTailor.ts` against null data, and silenced double error toast by utilizing `executeAI`'s `silent: true` parameter, showing only a clean, recoverable error card on the tailoring form and writing safe diagnostic info to console.
  - **P1-2 (Cover Letter No Output)**: Implemented text validations on generated content in `CoverLetterNewPage.tsx`, added manual save fallback via `useCoverLetterMutations` when the backend save fails, and added a fallback display override when returnTo redirect is skipped or fails.
  - **P1-3 (Editor Improve AI Button)**: Resolved stale memoized render-time plan check closures in `EditorPage.tsx` by wrapping the `gate` checks inside deferred callbacks.
  - **P1-4 (Dashboard Metric Mismatch)**: Standardized tailored resume detection across dashboard metric cards, activity bars, details dialog, and tabs list filter using the union-based `isTailoredResume` check and propagating `tailoredIds` Set.
  - **P1-5 (Tailored PDF Export Fail)**: Prioritized `resumeDocId` over `resume.id` in `TailorQuickPdfExportDialog.tsx` to handle state lag, and added a warning toast in `TailoringHubResultPage.tsx` when downloading while a resume is still loading.
  - **P1-6 (Preview 404 Route)**: Added `/preview/:id` path matching to the router inside `AppInterior.tsx` and updated `PreviewPage.tsx` to read the ID from `useParams` path parameters as a query parameter fallback.

---

## 4. Next Recommended Tasks

1. **Verify QA Branch for Merge**: Keep all code on the safe branch `audit/production-stabilization-qa`. Review the remote commits and perform a manual, audited git merge/integration into `origin/main` when ready. Do NOT force-push or automatically overwrite `origin/main`.
2. **Deeper Manual QA**:
   - Perform a manual browser QA verification of the `/upload` file and URL import using an authenticated account.
   - Run a mobile UX sweep of the new FeatureGate translation alignment on RTL/Arabic screen views.
3. **Appwrite Console Security Audit**: Audit Appwrite database collection read/write permissions to ensure all custom collections setup in this batch (e.g. `portfolio_session_rate_limits`) have the narrowest access boundaries.

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
