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

* **Session Status**: COMPLETED & VERIFIED IN PRODUCTION — Fast Tailor tracking and unchanged-output guardrail fully implemented, tested, and pushed.
* **Last Session**: Fixed the `user?.$id` vs `user?.id` mismatch in `useRemoteJobs.ts` which was causing action tracking updates to silently fail. Implemented a robust client-side `hasMeaningfulChanges` guardrail on the Fast Tailor flow in `RemoteJobsPage.tsx` using a local `computeMatchScore` utility. Corrected picker dialog timing by closing it immediately on confirm, and added a tailored status badge to remote job cards.
* **Current State**: `/jobs` feed Fast Tailor flow is fully operational and correct. All 22 tests pass. TypeScript compiler type checks clean. Production build completes successfully. Pushed to `main` branch (commit `c366797697441064eccc42b377f0726a38b7127f`).
* **Last Completed Task**: Pushed the frontend tracking fixes, the new `useRemoteJobs.test.tsx` hook unit test suite, and the `RemoteJobsPage.test.tsx` updates.

---

## 4. Next Recommended Tasks

1. **Owner Production Smoke Verification (`/jobs`)**: Test direct URL `https://wiseresume.app/jobs` in browser:
    - Verify top freshness banner ("Last updated: ...", "Sources: Remotive, WWR, Jobicy, Remote OK, Arbeitnow").
    - Test Role Group filter pills (e.g. "Easy / Entry Level", "Customer Support", "Tech / Programming") and verify live job counts.
    - Verify formatted salary badges (`$20/hour`, `$3,000/month`, `$80k/year`, `Salary not listed`).
    - Verify bunny.net job has its fake `€500/year` salary removed and shows `Salary not listed` (`untrusted low`).
    - Test Fast Tailor button click flow (confirm loading state is shown and redirects to tailoring result page).
    - Verify tailored application status remains `ready_to_apply` until clicking "Apply on website" and confirming submission.
2. **Owner Production Smoke Verification — Resume Fixes**: Test on `https://wiseresume.app` with an existing account:
    - Login to an existing account → confirm no "no CV" onboarding flash (dashboard loads with existing CVs).
    - Upload a new CV → confirm email/phone are extracted correctly.
    - Confirm newly uploaded CV defaults to WiseResume Classic template (not Modern/purple).
3. **Targeted Deployment of `inspect-ai-keys`**: Deploy `inspect-ai-keys` Appwrite Function via GitHub Actions (`deploy-appwrite-hubs.yml` with `target=inspect-ai-keys`) or `node scripts/deploy_hubs.cjs --only=inspect-ai-keys`. Do NOT use `target=all`.
4. **Owner Production Smoke Verification (`/devkit` AI Keys)**: Manual owner test of slot completion pings, "Test All Keys", and persisted test statuses in production DevKit.
5. **Owner Production Smoke Verification (`/devkit2`)**: Owner manual smoke check of `/devkit2` admin login, Command Home live stats, `Cmd+K` palette, and Integration Map in production.

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
