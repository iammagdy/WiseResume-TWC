# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-05
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

* **`c3667976`** — `fix(jobs): repair Fast Tailor tracking and unchanged-output guard` ← **LAST**
* **`858cc775`** — `fix(jobs): commit remote company sources config for reproducible job-feed-sync deploys`
* **`e0c84414`** — `chore(devkit): update generated source hashes for deployed remote jobs hubs`
* **`875e0ec5`** — `feat(jobs): implement fast tailor click safety, credit validation, status badge styles, and database updater force backfill`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: COMPLETED_LOCAL_DEVELOPMENT — AI routing upgraded with DeepSeek default, specific key_slot override logic, approved model pool, Key Slot selector UI, and resume-section-ai alignment. Local validation passes.
* **Last Session**: Implemented `key_slot` database storage and resolution in the `ai-gateway`, `inspect-ai-keys`, and `resume-section-ai` Appwrite Functions. Re-aligned curated models in `src/lib/devkit/aiTestSlotModels.ts` to the approved model pool (e.g. `openai/gpt-oss-120b`, `stepfun-ai/step-3.7-flash`, etc.). Upgraded `AIRoutingSwitcher.tsx` to render Key Slot dropdowns, support cascading resets, and save overrides containing `keySlot` integers. Re-computed all serverless function hashes to prevent drift detection false-positives.
* **Current State**: All local tests pass. All Vitest suites pass. Gateway routing checks pass. Drift detection computed successfully.

---

## 4. Next Recommended Tasks

1. **Deploy Hub Functions to Appwrite**: Deploy the modified hubs to Appwrite:
   - `ai-gateway`
   - `inspect-ai-keys`
   - `resume-section-ai`
   - Use: `node scripts/deploy_hubs.cjs --only=ai-gateway,inspect-ai-keys,resume-section-ai`. Do NOT use target-all.
2. **Owner Production Smoke Verification (`/devkit` AI Routing)**: Verify that the dynamic overrides can be configured in DevKit:
   - Go to `/devkit` -> AI Tools Map.
   - Choose a provider, custom model, and specific Key Slot for a feature (e.g. `Career Coach Chat`).
   - Click "Save All".
   - Probe routes or trigger a test ping to verify the specific key slot is utilized by the gateway.
3. **Owner Production Smoke Verification (`/jobs`)**: Test direct URL `https://wiseresume.app/jobs` in Vercel production deployment.

---

## 5. Blocked / Pending Owner Verification

* **LinkedIn OAuth Browser Verification**: PENDING_OWNER_VERIFICATION (requires manual browser check using owner credentials or test accounts on the deployed site).
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
