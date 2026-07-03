# Project Atlas — Active Operational & Handover State

**Last Verified:** 2026-07-03
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

* **`ceace5c1`** — `docs(atlas): add routing rules, handover state, and AI agent skills scaffold`
* **`0727589e`** — `docs(atlas): add QA test-suite map and test-output routing governance`
* **`8d356f9e`** — `docs(atlas): update master changelog, rules, and governance for archive policy`
* **`f7693c00`** — `docs(atlas): consolidate legacy docs into historical archive`
* **`bc2e7c25`** — `docs: finalize Atlas normalization merge status`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: Project Atlas Documentation Governance & Organization Cleanup.
* **Current State**: Project Atlas governance cleanup executed on branch `docs/atlas-governance-cleanup`. Stale Supabase/legacy specs archived, misplaced feature plans relocated, missing living specs created (`ai/ai-gateway.md`, `qa/PLAYWRIGHT_E2E_SUITE.md`), and `SOURCE_OF_TRUTH_MAP.md` updated.
* **Last Completed Task**: Executed Project Atlas docs-only governance cleanup. Relocated 32 historical files to `archive/`, added caution disclaimers, fixed broken links, created missing living specs, and aligned source-of-truth inventory map.

---

## 4. Next Recommended Tasks

1. **Owner Review of Governance Cleanup**: Obtain owner approval to commit and push `docs/atlas-governance-cleanup` branch.
2. **AI Gateway Production Verification**: Verify Appwrite `ai-gateway` serverless function execution and response handling in production.
3. **Turnstile Captcha Verification**: Verify Cloudflare Turnstile siteverify response handling for public portfolio contact submissions under live browser conditions.
4. **DevKit Visitor Analytics Monitoring**: Audit Cairo-day boundary aggregation in `admin-visitor-analytics`.

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
