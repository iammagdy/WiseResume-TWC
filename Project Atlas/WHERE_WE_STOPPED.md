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

* **Current Active Focus**: Redesigned Localized Transactional Email System implemented locally and fully verified across email-service, frontend callers, DevKit panels, and unit test suite.
* **Current State**: All 4 transactional email templates (`verification`, `password-reset` OTP, `password-changed`, `welcome`) redesigned to premium dark canvas with crimson accents and high-DPI logo header. Full `ar` / `en` locale routing implemented with `<html lang="..." dir="...">`, font fallbacks (`Noto Sans Arabic` vs `Inter`), and localized subjects/body copy.
* **Last Completed Task**: Completed implementation of redesigned localized transactional email templates in `appwrite-hubs/email-service/src/main.js`, updated frontend callers (`AccountSection.tsx`, `UserDetailDrawer.tsx`, `AdminUsersPanel.tsx`, `DevKitRunner.tsx`, `EmailTransactionalStudioPanel.tsx`), added locale Vitest test cases in `passwordResetOtp.test.ts`, verified syntax (`node --check`), run full unit test suite (16 tests passed), and ran TypeScript typecheck (`npx tsc --noEmit`).

---

## 4. Next Recommended Tasks

1. **Targeted Appwrite Deployment (`email-service`)**: Upon owner approval, deploy target `email-service` using the official `Deploy Appwrite Hubs` workflow. Do NOT use `target=all`.
2. **AI Gateway Production Verification**: Verify Appwrite `ai-gateway` serverless function execution and response handling in production (`wiseresume.app`).
3. **DevKit Visitor Analytics Monitoring**: Audit Cairo-day boundary aggregation in `admin-visitor-analytics`.

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
