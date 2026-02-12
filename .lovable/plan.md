

# Fix: Show Resume Activity in Timeline + Make Stats Clickable

## Problem
1. **Empty Timeline**: The "Recent Activity" section shows nothing because it only queries `tailor_history`, `job_applications`, and `cover_letters` (all empty). It ignores the `resumes` table, which has 8 entries including created and tailored resumes.
2. **Dead Stat Tiles**: The 4 stat cards (Resumes Created, Tailored Versions, etc.) are not tappable. The user expects to tap "Tailored Versions" and see the tailored resumes.

## Solution

### 1. Add Resume Events to ActivityTimeline (`ActivityTimeline.tsx`)
- Add a new type `'resume_created' | 'resume_tailored'` to the `TimelineEntry` union
- Query the `resumes` table alongside the existing queries
- For each resume: if `parent_resume_id` is null, it's a "Created" event; if present, it's a "Tailored" event
- For tailored resumes, show the `target_job_title` and `target_company` as the job context
- Add new icons: FileText for created, Scissors for tailored
- Show "Created 6 days ago", "Tailored 1 day ago", etc.

### 2. Make Stat Tiles Clickable (`JobActivityStats.tsx`)
Each tile navigates to a relevant detail view when tapped:
- **Resumes Created** -- navigates to `/dashboard` (where original resumes live)
- **Tailored Versions** -- navigates to `/dashboard` with a query param like `?filter=tailored` (or simply scrolls to tailored group)
- **Jobs Analyzed** -- scrolls down to the activity timeline (since job analysis entries show there)
- **Cover Letters** -- scrolls to timeline filtered to cover letters

Add `onClick` handlers with `useNavigate`, subtle press animation (`active:scale-95`), and cursor pointer styling to make them feel interactive.

### 3. Visual Polish
- Add a subtle chevron-right icon or arrow indicator on each stat tile to hint they're tappable
- Add `transition-transform active:scale-[0.97]` to tiles for tactile press feedback

## Files to Modify

**`src/components/applications/ActivityTimeline.tsx`**
- Add `resumes` query to the `Promise.all`
- Map original resumes as `type: 'resume_created'` entries
- Map tailored resumes as `type: 'resume_tailored'` entries with job title/company from `target_job_title`/`target_company`
- Add icons and label text for the new types
- Tapping a resume entry navigates to `/editor?id={resumeId}`

**`src/components/applications/JobActivityStats.tsx`**
- Accept `useNavigate` and add `onClick` to each tile
- "Resumes Created" and "Tailored Versions" navigate to `/dashboard`
- "Jobs Analyzed" and "Cover Letters" smooth-scroll to the timeline section on the same page
- Add press feedback animation and chevron hint

**`src/pages/ApplicationsPage.tsx`**
- Add an `id="activity-timeline"` anchor on the timeline section so stat tiles can scroll to it

## Result
- The timeline will immediately show all 8 resume events (7 created + 1 tailored for "Account Supervisor @ Loynova")
- Each entry shows relative time ("1 day ago", "3 days ago", etc.)
- Stat tiles feel interactive with press animation and navigation
- The app feels intelligent -- everything the user does is automatically documented
