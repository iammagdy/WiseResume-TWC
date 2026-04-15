# Remove Public Job Board Feature

## What & Why
Phase 20 added a public-facing job board, apply buttons, and a job seeker application tracker — all of which push WiseHire towards feeling like a job marketplace (LinkedIn, Indeed). This contradicts the product's actual purpose: an internal AI tool that helps recruiting companies and agencies do their work better. These features should be removed to keep the product clean and focused.

## Done looks like
- `/jobs`, `/jobs/:companySlug`, `/jobs/:companySlug/:roleSlug` routes are gone
- `/my-applications` route and page are removed
- The JD Library no longer shows publish/unpublish icons or Live badges
- The `PublishRoleSheet`, `JobCard`, `ApplyButton` components are deleted
- `usePublicJobs.ts` and `useApplications.ts` hooks are removed
- The `publishRole` mutation is removed from `useJDs.ts`; the `WiseHireRole` type no longer includes `slug/published/location/remote_ok/salary_min/salary_max/employment_type`
- `useWiseHireAccount.ts` reverts the `slug` field from `WiseHireCompany`
- `App.tsx` has no `PublicJobBoardPage`, `PublicJobPage`, or `MyApplicationsPage` imports or routes
- `AppShell` `TAB_ROUTES` no longer includes `/my-applications`
- The `wisehire-apply` edge function is decommissioned (remove from UI; leave DB tables untouched)
- TypeScript compiles with 0 errors and the app runs

## Out of scope
- Touching the database — the schema columns and tables added in Phase 20 can stay; no need to migrate them back
- The `source` column on `wisehire_candidates` can remain (it's harmless)
- Removing the deployed edge function from Supabase infrastructure (just remove the UI callers)

## Tasks
1. **Delete job-board UI files** — Remove the entire `src/components/wisehire/job-board/` directory and `src/pages/jobs/` directory. Remove `src/pages/wisehire/MyApplicationsPage.tsx`.

2. **Revert JDLibrary** — Strip the publish/unpublish icons, "Live" badge, and `PublishRoleSheet` reference from the JD library component, restoring it to its pre-Phase-20 state (copy, delete buttons only).

3. **Revert hooks** — Remove `src/hooks/wisehire/usePublicJobs.ts` and `src/hooks/wisehire/useApplications.ts`. In `useJDs.ts`, remove the `publishRole` mutation and revert `WiseHireRole` to not include the new publish fields. In `useWiseHireAccount.ts`, remove the `slug` field from `WiseHireCompany` and revert the select query.

4. **Clean App.tsx and AppShell** — Remove the three `/jobs/*` public routes and `/my-applications` protected route from App.tsx. Remove the lazy imports for the deleted pages. Remove `/my-applications` from `AppShell` TAB_ROUTES. Remove the `Globe` icon import from `WiseHireShell` if unused.

5. **TypeScript check and app restart** — Confirm 0 type errors, app starts clean.

## Relevant files
- `src/components/wisehire/job-board/`
- `src/pages/jobs/`
- `src/pages/wisehire/MyApplicationsPage.tsx`
- `src/components/wisehire/jd-writer/JDLibrary.tsx`
- `src/hooks/wisehire/useJDs.ts`
- `src/hooks/wisehire/usePublicJobs.ts`
- `src/hooks/wisehire/useApplications.ts`
- `src/hooks/wisehire/useWiseHireAccount.ts`
- `src/App.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/wisehire/WiseHireShell.tsx`
