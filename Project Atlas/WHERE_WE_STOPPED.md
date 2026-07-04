# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-04
**Status:** Canonical Project Handover & Active Focus
**Location:** `Project Atlas/WHERE_WE_STOPPED.md`

---

## 1. Current Verified System Snapshot

* **Production Domain:** `https://wiseresume.app`
* **Repository:** `iammagdy/WiseResume-TWC`
* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel (main branch auto-deploys frontend).
* **Backend Platform:** Appwrite Cloud (`fra.cloud.appwrite.io`).
* **Authentication:** Appwrite Auth exclusively.
* **Database & Storage:** Appwrite Databases (`main` DB) and Appwrite Storage (`avatars` and asset buckets).
* **AI Architecture:** Server-side Appwrite `ai-gateway` function.
* **Billing / Payments:** Currently **disabled** or marked **Coming Soon**.
* **WiseHire:** Secondary / deprioritized product module.

---

## 2. Latest Important Commits

* **`ea713958`** — `feat(devkit): route admin password reset via internal HMAC signed service requests`
* **`c4bc9fea`** — `fix(devkit): validate delegated admin auth response`
* **`b7e43412`** — `fix(devkit): use lightweight delegated email auth`
* **`18d6263a`** — `fix(devkit): accept signed admin tokens in email service`
* **`6a38a20e`** — `chore(devkit): fix admin operations and impersonation storage`
* **`cbadbe84`** — `docs(license): mark repository as proprietary`
* **`70ce4a5b`** — `chore(security): sanitize public-readiness repository hygiene`
* **`1ad325aa`** — `docs(readme): prepare repository for public visibility`
* **`81e35bbe`** — `docs(atlas): update session closeout and handover state`
* **`720626b2`** — `docs(atlas): clean Project Atlas governance structure`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: DevKit Admin Password Reset Link flow implemented locally and verified with 26 Vitest tests, TypeScript compiler, Node syntax checks, and Vite production build.
* **Current State**: Implemented direct secure password reset link flow (`https://wiseresume.app/auth/reset-password?email=...&challengeToken=...`). Admin requests route `UserDetailDrawer` / `EmailManagementPanel` -> `admin-devkit-data` (`send-admin-password-reset-link`) -> internal HMAC request -> `email-service` (`internal-send-admin-password-reset-link`). High-entropy challenge tokens (32 bytes) are hashed at rest (`challenge_token_hash`). Legacy reset path in `admin-email` is deprecated and throws explicit error.
* **Last Completed Task**: Completed implementation and full validation suite (26 Vitest tests passed, `npx tsc --noEmit` passed, `npm run build` passed, source hashes regenerated). Appwrite deployment NOT performed (pending owner authorization). Targeted deploy list: `admin-devkit-data,email-service,admin-email`.

---

## 4. Next Recommended Tasks

1. **AI Gateway Production Verification**: Verify Appwrite `ai-gateway` serverless function execution and response handling in production (`wiseresume.app`).
2. **DevKit Visitor Analytics Monitoring**: Audit Cairo-day boundary aggregation in `admin-visitor-analytics`.

---

## 5. Blocked / Pending Owner Verification

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
> 5. **Do NOT perform target-all function deploys (`target=all`)**: Always specify targeted function directories (e.g. `--only=ai-gateway`).
> 6. **Do NOT perform unapproved Appwrite or Vercel deployments**: Deployments require explicit owner authorization.

---

## 7. How to Update This File

When completing a task or ending a work session:
1. Update **Section 3 (Where We Stopped & Current Active Focus)** with the exact status.
2. Update **Section 2 (Latest Important Commits)** with new commit hashes.
3. Add any new blocked items or recommendations to **Section 4 & 5**.
4. Log the update in `Project Atlas/CHANGELOG.md`.
