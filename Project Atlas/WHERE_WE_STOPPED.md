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

* **`c834bf20`** — `feat(admin): add devkit2 command center preview`
* **`cc55e542`** — `chore(admin): sync password reset link flow with main`
* **`8c0c6ce7`** — `fix(admin): send secure password reset links`
* **`ab4054f3`** — `design(email): refresh localized transactional templates`
* **`ea713958`** — `feat(devkit): route admin password reset via internal HMAC signed service requests`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: DevKit2 Command Center Phase 3B Step 1 base preview implemented, verified, committed, and pushed to `main` at `c834bf20`.
* **Current State**: New parallel admin route `/devkit2` added to test the redesigned 7-hub Command Center UX safely in production. `/devkit` remains 100% unchanged. `/devkit2` is admin-protected using existing `ProtectedRoute > AdminRoute` and `DevKitSessionProvider` / `devKitLogin()` logic. Renders `DevKit2Shell`, 7-hub sidebar, topbar, `Cmd+K` command palette, and Integration Map modal. Command Home hub reads live safe `home-summary` data. The remaining 6 hubs are labeled structural placeholders. Zero backend or Appwrite function changes. Zero dangerous actions enabled.
* **Last Completed Task**: Pushed commit `c834bf20ef4604c7281d2f77d47df78d57e5085e` (`feat(admin): add devkit2 command center preview`) to `origin/main`. Passed targeted ESLint, `npx tsc --noEmit` (0 errors), and `npm run build` (created `DevKit2Page-DzTgccw_.js` 60.43 kB chunk). Step 2 integration work is deferred for later per owner decision.

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.
2. **DevKit2 Step 2 Read-Only Data Wiring (Deferred)**: Progressively wire placeholder hubs (System Health, Users & Accounts, AI Operations, Growth Analytics, Business Ops, Developer Ops) to read-only `devKitCall` actions when authorized by owner.
3. **Monitor Production Email Traffic**: Monitor real user email verification and password reset traffic after production deployment.

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
