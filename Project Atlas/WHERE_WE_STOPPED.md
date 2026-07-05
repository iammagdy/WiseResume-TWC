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

* **`5d5ac0db`** — `feat(auth): sync LinkedIn profile and handle conflict UX`
* **`a496916f`** — `feat(auth): add LinkedIn SSO button`
* **`108e5ac4`** — `fix(security): production stabilization hardening pass` (merged PR #139)
* **`dc8f9d0d`** — `docs(atlas): update session closeout and handover state`
* **`a74f6011`** — `feat(devkit): add AI key and model tester`

---

## 3. Where We Stopped & Current Active Focus

* **Current Active Focus**: LinkedIn SSO implementation and stabilization is complete.
* **Current State**: LinkedIn SSO login button successfully added, localized, and tested. Auto-sync of user name/email into the profile document is implemented (with display_name schema constraints handled gracefully), duplicate email conflict UX mapping added, and profile completion hint interpolation bug fixed.
* **Last Completed Task**: Profile sync, fallback display names, and OAuth conflict error mapping UX implementation, accompanied by 3 new unit test suites (all 25 tests passing, zero compilation or build errors).

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification**: Manual owner verification of all production stabilization fixes (PP-01 contactEmail removal on public portfolio, EXP-02 download navigation fix, etc.).
2. **Targeted Deployment of `inspect-ai-keys`**: Deploy `inspect-ai-keys` Appwrite Function via GitHub Actions workflow (`deploy-appwrite-hubs.yml` with target `inspect-ai-keys`) or `node scripts/deploy_hubs.cjs --only=inspect-ai-keys`. Do NOT use `target=all`.
3. **Owner Production Smoke Verification (`/devkit` AI Keys)**: Manual owner test of slot completion pings, "Test All Keys", and persisted test statuses in production DevKit.
4. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.
5. **Owner LinkedIn OAuth Verification**: Verify that the LinkedIn OAuth redirection, consent screen, callback, and session creation succeed on the production deployment.

---

## 5. Blocked / Pending Owner Verification

* **LinkedIn OAuth Browser Verification**: PENDING_OWNER_VERIFICATION (requires manual browser check using owner credentials or test accounts on the deployed site).
  * **LinkedIn Developer Portal Authorized Redirect URL** (OAuth 2.0 Settings):
    `https://fra.cloud.appwrite.io/v1/account/sessions/oauth2/callback/linkedin/69fd362b001eb325a192`
  * **WiseResume Success URLs** (used by frontend client redirects):
    * `https://wiseresume.app/auth/callback`
    * `https://wiseresume.app/ar/auth/callback`
  * **WiseResume Failure URLs**:
    * `https://wiseresume.app/auth?error=oauth_failed`
    * `https://wiseresume.app/ar/auth?error=oauth_failed`
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
