

# Redesign Jobs Tab: Activity Dashboard

## Overview

Transform the Jobs tab from a manual "tracker" into an **automatic activity dashboard** that intelligently aggregates the user's resume-building activity. No manual tracking -- the app pulls data from existing database tables (`resumes`, `tailor_history`, `cover_letters`, `job_applications`) to show the user a smart summary of everything they've done.

## What the User Will See

### Top Section: Stats Hero Card (glass card, matching dashboard style)
Four stat tiles in a 2x2 grid:
- **Resumes Created** -- count of resumes where `parent_resume_id IS NULL` (original CVs only)
- **Tailored Versions** -- count of resumes where `parent_resume_id IS NOT NULL`
- **Jobs Analyzed** -- count of unique entries in `tailor_history` (jobs the user pasted links for)
- **Cover Letters** -- count from `cover_letters` table

### Middle Section: Recent Activity Timeline
A scrollable list showing the user's recent activity, auto-populated from the database:
- Each entry shows: job title, company, date, and what was done (tailored, cover letter generated, applied)
- Entries link to the resume used and show the job URL (tappable to open)
- Deadline shown if available, with color-coded countdown
- Status badge (Applied / Not Yet / Saved)

This replaces the old empty state ("No applications yet / Track first application") with real data from `tailor_history` and `job_applications`.

### Bottom: "Add Manually" Button (secondary, subtle)
Keep the ability to manually add a job, but make it secondary -- a small text button at the bottom, not the primary action.

## Technical Details

### New Hook: `useJobActivityStats`
Create a hook in `src/hooks/useJobActivityStats.ts` that queries:
```
- resumes: COUNT(*) WHERE parent_resume_id IS NULL  (originals)
- resumes: COUNT(*) WHERE parent_resume_id IS NOT NULL  (tailored)
- tailor_history: COUNT(DISTINCT job_title || company)  (jobs analyzed)
- cover_letters: COUNT(*)
```
Returns `{ originals, tailored, jobsAnalyzed, coverLetters, isLoading }`.

### New Component: `JobActivityStats.tsx`
Renders the 2x2 glass stat cards. Uses the same glass-surface styling as the existing dashboard stats row.

### New Component: `ActivityTimeline.tsx`
Merges data from `tailor_history` and `job_applications` into a unified timeline sorted by date. Each entry shows:
- Icon (scissors for tailor, envelope for cover letter, check for applied)
- Job title + company
- Time ago (using date-fns `formatDistanceToNow`)
- Resume name (fetched via resume ID)
- Status badge + deadline if present

### Modified: `ApplicationsPage.tsx`
Complete rewrite of the page layout:
1. Header: rename from "Applications" to "My Activity" or keep "Jobs"
2. Remove the old stats row (Saved/Applied/Interview/Offers/Rejected counts)
3. Remove the StatusFilter bar
4. Add `JobActivityStats` component at top
5. Add `ActivityTimeline` component below
6. Change empty state to: "Your job search activity will appear here as you create resumes and tailor them for jobs" (no "Track first" button as primary)
7. Keep `AddApplicationSheet` accessible via a subtle "Add manually" link
8. Keep `ApplicationDetailSheet` for tapping on timeline entries
9. Keep the reminder bell -- still useful for "I Will" reminders

### Modified: `useJobApplications.ts`
No changes to the hook itself -- it stays as-is since the `job_applications` table is still used. The page just queries additional tables now.

### Files to Create
1. `src/hooks/useJobActivityStats.ts` -- stats aggregation hook
2. `src/components/applications/JobActivityStats.tsx` -- 2x2 stat cards
3. `src/components/applications/ActivityTimeline.tsx` -- unified timeline

### Files to Modify
1. `src/pages/ApplicationsPage.tsx` -- replace tracker UI with dashboard layout

## Result
- The Jobs tab always has content (stats show even if all zeros)
- No "Track first application" empty state -- the app feels smart
- Activity auto-populates as the user tailors resumes and generates cover letters
- Manual adding is still possible but not the primary experience

