# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-09
**Status:** Profiles Portfolio Schema Cleaned & Production Verified
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

* **`78e7055b`** — `fix(schema): resolve profiles collection row-size limit by keeping draft storage client-side` ← **LAST**
* **`f251f6a1`** — `docs(changelog): document portfolio interest anonymous execution fix`
* **`6d39c450`** — `fix(security): route sendPortfolioInterest through Vercel API and add owner notification`
* **`ecdc1e47`** — `fix(security): skip Appwrite JWT generation for public share function calls`
* **`fb4fa418`** — `fix(audit): harden portfolio and job import flows`
* **`df769530`** — `fix(upload): convert URL object to string in Vercel fetch`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: COMPLETED_QA_FIXES — Completed implementation and verification of the five manual QA findings.
* **Fixes Implemented**:
  - **AI Concurrency & Rate Limiting**: Added a 5-minute stale cutoff and plan-based concurrent limits (Free: 2, Pro: 3, Premium: 4) to `ai-gateway`, mapped `'too_many_concurrent_jobs'` to a user-friendly error toast, and added a cancel-abort guard to Editor `TailorSheet.tsx`.
  - **Saved Resumes Label Mismatch**: Replaced translation key for Saved Jobs card to avoid displaying "Saved resumes: 0".
  - **Tailored Resumes Count**: Switched card value to show total tailored resumes count, with weekly activity in the subtext.
  - **Onboarding Checklist Visibility**: Hid onboarding checklist for power users (3+ resumes, or at least 1 tailored resume) or when all steps are completed.
  - **Privacy Consent Fallback**: Implemented a `sessionStorage` fallback alongside `localStorage` to ensure consent is remembered within incognito/private sessions.
  - **Local Validation**: Ran TypeScript compilation, production build, and all Vitest unit tests (all passed successfully).

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
