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

* **`a42e2b3e`** — `fix(core): resolve useLocale, Appwrite SecurityError, and React hook resilience`
* **`37b4555e`** — `docs(atlas): document devkit2 phase 3b step 1 closeout`
* **`c834bf20`** — `feat(admin): add devkit2 command center preview`
* **`cc55e542`** — `chore(admin): sync password reset link flow with main`
* **`8c0c6ce7`** — `fix(admin): send secure password reset links`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: DevKit AI Key & Model Tester implementation completed locally. Added real OpenAI-compatible completion pings to `inspect-ai-keys` Appwrite Function (`test-ai-key-slot`, `test-ai-provider`, `test-all-ai-keys`), strict status mapping (`success`, `missing_key`, `invalid_key`, `model_not_found`, `rate_limited`, `provider_error`, `timeout`), graceful `app_settings` test result persistence, and updated `AIKeysPanel.tsx` UI with "Test All Keys", "Test Provider", per-slot "Test", status chips, latency, timestamp, and unsaved model warnings.
* **Current State**: Implementation complete, tested locally (`node --check`, `tsc --noEmit`, Node backend tests, Vitest frontend tests), and source hashes regenerated. Deployment NOT performed (requires targeted deployment of `inspect-ai-keys` Appwrite Function after owner authorization).
* **Last Completed Task**: DevKit AI Key & Model Tester feature implementation & local verification.

---

## 4. Next Recommended Tasks

1. **Targeted Deployment of `inspect-ai-keys`**: Deploy `inspect-ai-keys` Appwrite Function via GitHub Actions workflow (`deploy-appwrite-hubs.yml` with target `inspect-ai-keys`) or `node scripts/deploy_hubs.cjs --only=inspect-ai-keys`. Do NOT use `target=all`.
2. **Owner Production Smoke Verification (`/devkit` AI Keys)**: Manual owner test of slot completion pings, "Test All Keys", and persisted test statuses in production DevKit.
3. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.

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
