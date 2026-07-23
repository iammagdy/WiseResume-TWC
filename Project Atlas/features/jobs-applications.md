# Feature Specification: Jobs and Applications

**Last Verified:** 2026-07-23
**Status:** Active Production Feature - Owner Access Verified
**Location:** `Project Atlas/features/jobs-applications.md`

---

## 1. User Goal

Let authenticated users browse remote jobs, save job context, tailor application materials, and track application progress without exposing another user's records.

## 2. Routes

* `/jobs` - Remote jobs feed, save actions, and Fast Tailor entry.
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
