# Feature Specification: Jobs and Applications

**Last Verified:** 2026-08-10
**Status:** Visible Production Feature
**Location:** `Project Atlas/features/jobs-applications.md`

---

## 1. User Goal

Let authenticated users browse remote jobs, save job context, tailor application materials, and track application progress without exposing another user's records.

## 2. Routes

* `/jobs` - First-class workspace Remote Jobs feed, save actions, and Fast Tailor entry.
* `/applications` - Application tracker/list.
* `/application/:id` - Application detail/tracker route.

## 3. Main Frontend Files

* `src/pages/RemoteJobsPage.tsx` - Remote feed, save, job actions, and Fast Tailor orchestration.
* `src/pages/ApplicationsPage.tsx` - Application list/tracker.
* `src/pages/ApplicationTrackerPage.tsx` - Application detail.
* `src/hooks/useJobs.ts` - Owner-scoped saved job reads and mutations.
* `src/hooks/useSavedJobPostings.ts` - Merged saved-job source.
* `src/hooks/useJobApplications.ts` - Owner-scoped application reads and mutations.
* `src/lib/appwriteOwnerPermissions.ts` - Canonical owner read/update/delete permissions for new documents.

## 4. Data and Functions

* **Owner collections:** `jobs` and `job_applications`.
* **Remote-feed functions:** `get-remote-jobs`, `job-feed-sync`, and `track-job-action`.
* **Related AI:** Fast Tailor uses `ai-gateway` for Tailoring and Cover Letter work.
* **Document security:** Both owner collections use `documentSecurity: true`, collection-level `create("users")`, and owner-only document read/update/delete permissions.

## 5. Current Behavior

* The Jobs feed is visible to authenticated users in the shared workspace sidebar (between Tailoring Hub and Activity), mobile workspace navigation sheet, workspace command palette, and normal workspace shell/top bar.
* `/jobs` is titled `Jobs`, ahead of the `/job/:id` Job Details prefix mapping; English and Arabic navigation labels are `Jobs` and `الوظائف`.
* The feed positions itself as `Remote Jobs` with the supporting copy “Find remote opportunities and tailor your resume in one click.” It retains its actual sync and source indicators and does not claim unproven verification.
* Saved job queries run only after authentication is ready and filter by the current `user_id`.
* New saved jobs and application records use `ownerDocumentPermissions(user.id)`.
* Application statuses include saved, applied, screening, interviewing, offer, rejected, tailored, and ready-to-apply states.
* Fast Tailor can create a `ready_to_apply` application after generating the related materials.
* Tailoring result pages may look up the related owner-scoped application to reconstruct job context.

## 6. Rules and Risks

* Browser queries must never use collection-wide cross-user access.
* `jobs` and `job_applications` must retain document security and owner document permissions.
* The legacy browser `tailor_history` collection is not a replacement for job/application lineage.
* Full Fast Tailor production generation remains a separate QA follow-up; do not infer it from feed loading or dialog behavior alone.
* Authenticated Broadcast schema drift is unrelated to these collections.

## 7. Evidence

* [`owner-permissions-realtime-csp-2026-07-21.md`](../qa/production-stabilization/owner-permissions-realtime-csp-2026-07-21.md)
* [`critical-functionality-smoke-audit-2026-07-21.md`](../qa/production-stabilization/critical-functionality-smoke-audit-2026-07-21.md)

## 2026-07-24 Security Hardening (Deployed)

Recovery workflow `30101982337` deployed only the three Jobs hubs. `job-feed-sync` is no longer Client-SDK executable, retains its native `0 */6 * * *` schedule, and denied an anonymous probe with 401; one approved internal sync completed. `get-remote-jobs` remains public and completed an anonymous read. `track-job-action` now requires an Appwrite user and denied an anonymous probe with 401. Authenticated owner-scoped action and cross-user mutation browser QA remain pending.

## 2026-08-10 Workspace Exposure (Production Verified)

PR #175 merged the `/jobs` route promotion as `1d937467` without changing its backend or product workflows. The normal Vercel production deployment `dpl_2Exk8ZwPRwYDP4SMYefSAM8nSZnd` is ready. Local validation covered focused jobs/navigation tests, TypeScript, production build, and an unauthenticated hard refresh that preserved `/jobs` as the login redirect target. An authenticated production session verified the sidebar exposure/active state, workspace title, real feed, search, advanced filters, and saved-job persistence with cleanup. A mobile render exposed the menu affordance and Jobs controls, while browser-controller timeouts prevented a sheet-tap assertion; verify that one interaction on a physical device. Appwrite deployment is not required.
