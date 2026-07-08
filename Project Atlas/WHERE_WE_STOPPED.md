# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-09
**Status:** Batch 3/4 Stabilizations Production Complete & Verified
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

* **`f251f6a1`** — `docs(changelog): document portfolio interest anonymous execution fix` ← **LAST**
* **`6d39c450`** — `fix(security): route sendPortfolioInterest through Vercel API and add owner notification`
* **`ecdc1e47`** — `fix(security): skip Appwrite JWT generation for public share function calls`
* **`fb4fa418`** — `fix(audit): harden portfolio and job import flows`
* **`df769530`** — `fix(upload): convert URL object to string in Vercel fetch`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: COMPLETED_PRODUCTION_VERIFIED — The Batch 3 and Batch 4 stabilization fixes have been fully implemented, committed, pushed to the QA branch, deployed to Vercel production, and verified via automated E2E tests.
* **Key Stabilizations Implemented**:
  - **Portfolio Telemetry & Visitor tracking**: Restricted `visit_end` updates in `api/track-portfolio-view.ts` to confirm that the `username` matches the immutable document value before execution, preventing forged visit records.
  - **Durable Interest Rate Limiter**: Replaced in-memory rate limiting with a database-backed rate limit collection (`portfolio_session_rate_limits`) inside `api/portfolio-interest.ts` using `sha256(ip + ':interest')`, allowing up to 5 actions per 10 minutes (fails closed).
  - **Anonymous JWT Generation Fix**: Patched `appwriteFunctions.invoke` in `src/lib/appwrite-functions.ts` to skip checking/requesting a user session JWT (`getAppwriteJWT()`) when the targeted endpoint is a registered public-share action. This resolves the 401 exceptions triggered by guest visitors.
  - **Interest Click Beacon Fix**: Restored direct Vercel API routing (`fetch` to `/api/portfolio-interest`) in `src/lib/portfolioInterest.ts` for visitor interest clicks. This bypasses Appwrite guest SDK preflight/session constraints, resolving the contact button loading hang. Aligned `/api/portfolio-interest` to trigger owner notifications for new clicks.
  - **Job Import SSRF Hardening**: Extended IP filters in the `job-import` serverless hub to block CGNAT (`100.64.0.0/10`), documentation test subnets, IPv6 site/link-local scopes, and added hex-encoded IPv4-mapped IPv6 address extraction.
  - **Job Import Fallback**: Added `persisted`, `fallbackRequired`, and `reason` fields to the `job-import` response. Aligned the `useImportJob` frontend hook to run client-side saves only when `fallbackRequired` is true.
  - **FeatureGate UX & Preview Error**: Redesigned `FeatureGate` to render a premium locked-feature panel with English/Arabic translations. Added an accessible "Resume Not Found" card in `PreviewPage` when a bootstrap query fails.
  - **Tests & Parity**: All 163 Vitest tests are green (fixed missing Arabic catalog keys, password reset test mocks, and Puppeteer headless export parameters).
- **Validation**: Playwright E2E production tracking spec `tests/e2e/specs/28-portfolio-production-tracing.spec.ts` completed successfully in `21.1s` against the live production server `https://wiseresume.app`. All smoke tests for `/upload`, `/portfolio`, `/preview`, and `/api/portfolio-interest` passed.

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
