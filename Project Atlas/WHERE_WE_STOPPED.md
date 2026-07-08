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

* **`34c4966c`** — `fix(devkit): enhance test route feedback with fallback attempt logs and align default routes` ← **LAST**
* **`c15c4d5f`** — `test(devkit): add comprehensive switcher dirty state and save activation tests`
* **`322284f6`** — `fix(devkit): initialize route override state when changing model or slot on default routes`
* **`aa37afd1`** — `fix(devkit): clarify AI routing state and model tester UX`
* **`dd247691`** — `fix(devkit): stabilize AI routing save UX and key tester diagnostics`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: READY_PENDING_OWNER_BROWSER_VERIFICATION — Frontend route test feedback, save UX dirty-state tracking, fallback attempt logs visualization, separate function route labeling for `resume-section-ai`, and static default route alignment are code-tested, verified, and successfully deployed to Vercel production and Appwrite hubs (`admin-devkit-data`, `ai-gateway`).
* **Last Session**:
  - Enhanced `ai-gateway` to track failed candidate calls (timeouts, rate limits, bad keys, or unconfigured keys) and return them in the response metadata (`meta.attempts`) for admin test runs.
  - Updated `AIRoutingSwitcher.tsx` to read the fallback attempts log and render it under the Route Mismatch / error blocks in the table, giving admins precise reasons for fallbacks.
  - Labeled `resume-section-ai` with a `[Separate Function Route]` badge in the UI and a warning note, explaining that the test button simulates its routing configuration while its actual production execution runs via the separate `resume-section-ai` Appwrite function.
  - Resolved a routing default mismatch where `admin-devkit-data` defaulted `resume-section-ai` to `groq` while `ai-gateway` and the UI catalog defaulted to `deepseek/deepseek-chat`.
  - Staged, committed, pushed (`34c4966c`), and deployed the modified hubs (`admin-devkit-data` and `ai-gateway`) via local targeted deploy, followed by production Vercel deployment.
* **Current State**: All local tests pass. All Vitest suites pass. Gateway routing checks pass. Drift detection computed successfully.

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification (`/devkit` AI Routing)**: Verify that the dynamic overrides can be configured in DevKit:
   - Go to `https://wiseresume.app/devkit` -> AI Tools Map.
   - Choose a provider (e.g., OpenRouter), custom model (e.g., `meta-llama/llama-3.3-70b-instruct:free`), and specific Key Slot for a feature (e.g. `Career Coach Chat`).
   - Click "Save All".
   - Wait ~60s for the gateway route cache to reset (or probe test/ping).
   - Click "Test" to run a route test. If there is a route mismatch, inspect the "Attempt history" to see the specific errors returned by the preferred provider.
2. **Key Rotation/Configuration**: If OpenRouter key/model fails in the attempts history (e.g., with `401 Unauthorized`), check/configure `OPENROUTER_KEY_1` env var in Appwrite console settings for the `ai-gateway` and `resume-section-ai` functions.
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
