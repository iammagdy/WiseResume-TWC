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

* **`bbb3830a`** — `fix(schema): update permissions and throttle job-feed-sync` ← **LAST**
* **`033d44d4`** — `fix(hubs): sanitize job payload properties in job-feed-sync`
* **`fed6c3ed`** — `fix(hubs): register job feed hubs in appwrite.json`
* **`8cedd294`** — `feat(jobs): add hidden remote jobs feed MVP`
* **`ee136d35`** — `fix(i18n): add missing top bar notification label`

---

## 3. Where We Stopped & Current Active Focus

* **Session Status**: COMPLETED & VERIFIED IN PRODUCTION — Remote Jobs Feed MVP deployed and initial feed ingested.
* **Last Session**: Remote Jobs Feed MVP (`/jobs`).
* **Current State**: `/jobs` hidden MVP page fully deployed to production (`https://wiseresume.app/jobs`). Appwrite schema collections (`job_feed_items`, `user_job_actions`, `job_feed_sync_runs`) and targeted function hubs (`job-feed-sync`, `get-remote-jobs`, `track-job-action`) deployed via GitHub Actions workflow run `28755483329`. Initial feed ingested successfully with 229 remote jobs stored in `job_feed_items` and verified via sync log.
* **Last Completed Task**: Deployed hidden `/jobs` MVP feature with Appwrite backend, ran initial sync (229 jobs ingested), verified schema permissions, deduplication, inline application tracking, and pre-filled Tailoring Hub routing.

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification — Resume Fixes**: Test the following on `https://wiseresume.app` with an existing account:
   - Login to an existing account → confirm no "no CV" onboarding flash (dashboard loads with existing CVs).
   - Upload a new CV → confirm email/phone are extracted correctly.
   - Confirm newly uploaded CV defaults to WiseResume Classic template (not Modern/purple).
   - Confirm LinkedIn OAuth → no profile sync issues, name and email populated, profile completion > 0%.
2. **Owner Production Smoke Verification — Auth UX**: Test duplicate-email LinkedIn OAuth conflict → confirm friendly error message is shown in English and Arabic.
3. **Targeted Deployment of `inspect-ai-keys`**: Deploy `inspect-ai-keys` Appwrite Function via GitHub Actions (`deploy-appwrite-hubs.yml` with `target=inspect-ai-keys`) or `node scripts/deploy_hubs.cjs --only=inspect-ai-keys`. Do NOT use `target=all`.
4. **Owner Production Smoke Verification (`/devkit` AI Keys)**: Manual owner test of slot completion pings, "Test All Keys", and persisted test statuses in production DevKit.
5. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.
6. **Connect LinkedIn (future)**: If owner wants "Link LinkedIn Account" for existing email/password users, implement a "Connected Accounts" section in Settings using `account.createOAuth2Session` while the user is already authenticated. Not started — requires owner approval.

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
