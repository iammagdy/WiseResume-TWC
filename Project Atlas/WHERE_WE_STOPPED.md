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

* **`108e5ac4`** — `fix(security): production stabilization hardening pass` (merged PR #139)
* **`dc8f9d0d`** — `docs(atlas): update session closeout and handover state`
* **`a74f6011`** — `feat(devkit): add AI key and model tester`
* **`a42e2b3e`** — `fix(core): resolve useLocale, Appwrite SecurityError, and React hook resilience`
* **`37b4555e`** — `docs(atlas): document devkit2 phase 3b step 1 closeout`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: Production stabilization hardening pass — completed, merged (PR #139), and deployed. All 6 findings fixed: DA-01 (CRITICAL), DA-02 (CRITICAL), AG-05 (HIGH), PP-01 (HIGH), EXP-02 (MEDIUM), D-01 (MEDIUM). Vercel frontend auto-deployed. Three Appwrite hubs deployed via targeted workflow (`email-service`, `admin-devkit-data`, `ai-gateway`). Post-deploy drift check confirms all 3 hubs IN SYNC.
* **Current State**: Production stabilization phase complete. PR #139 (`108e5ac4`) merged to main. Vercel production deployed. Appwrite hubs deployed. Source hashes match. All 26 tests pass.
* **Last Completed Task**: Production stabilization hardening — implementation, merge, Vercel deployment, targeted Appwrite deployment, post-deploy verification, and documentation closeout.

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification**: Manual owner verification of all production stabilization fixes (PP-01 contactEmail removal on public portfolio, EXP-02 download navigation fix, etc.).
2. **Targeted Deployment of `inspect-ai-keys`**: Deploy `inspect-ai-keys` Appwrite Function via GitHub Actions workflow (`deploy-appwrite-hubs.yml` with target `inspect-ai-keys`) or `node scripts/deploy_hubs.cjs --only=inspect-ai-keys`. Do NOT use `target=all`.
3. **Owner Production Smoke Verification (`/devkit` AI Keys)**: Manual owner test of slot completion pings, "Test All Keys", and persisted test statuses in production DevKit.
4. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.

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
