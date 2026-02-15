

## Add CV Filename to Editor Header and Route Through Preview Screen

### Overview

Two changes: (1) show the actual resume name in the editor header instead of generic "Edit Resume", and (2) redirect resume clicks to the existing Preview/Detail screen (`/resume/:id`) before entering the editor.

---

### Part 1: Show Resume Name in Editor Header

**File: `src/pages/EditorPage.tsx`**

Replace the static `<h1>Edit Resume</h1>` (line 643) with the actual resume title from `resumeFromDb` or `currentResume`:

- Display: `resumeFromDb?.title || currentResume?.contactInfo?.fullName || 'Edit Resume'`
- For tailored resumes (when `resumeFromDb?.parent_resume_id` exists), the existing Tailored Indicator Banner already shows the job context below the header -- no duplication needed
- The title will be truncated with `truncate` class on mobile (already applied)
- Keep font size at `text-h3` for consistency

This works from ALL entry points because `resumeFromDb` is fetched via `useResume(currentResumeId)` regardless of how the user arrived.

---

### Part 2: Route Resume Clicks Through Preview Screen

The app already has a fully-featured `ResumeDetailPage` at `/resume/:id` with:
- Template thumbnail preview
- Health score ring
- Metadata (template, created date, last edited)
- Action grid (Edit, Preview, Download, Share, Duplicate, Delete)

Currently, most entry points bypass it and go straight to `/editor`. We need to update navigation in these files:

**File: `src/pages/DashboardPage.tsx`**
- Change `handleResumeClick` (around line 178-184) to navigate to `/resume/${resumeId}` instead of setting store state and navigating to `/editor`
- Keep the "Create from scratch" flow going to `/editor` (new resumes have no ID yet)

**File: `src/components/dashboard/ResumeListCard.tsx`**
- Update the card's main click/tap handler to navigate to `/resume/${resume.id}` instead of calling `onEdit(resume.id)`
- Keep the "Edit" action in the dropdown menu calling `onEdit` (which navigates to editor)

**File: `src/components/applications/ResumeListSheet.tsx`**
- Change resume item click to navigate to `/resume/${resumeId}` instead of `/editor?id=...`

**File: `src/components/applications/ActivityTimeline.tsx`**
- Change resume entry click to navigate to `/resume/${entry.resumeId}` instead of `/editor?id=...`

**File: `src/components/dashboard/VersionCompareSheet.tsx`**
- Change "Use this version" to navigate to `/resume/${resume.id}` instead of `/editor?id=...`

**Files NOT changed** (these are intentional direct-to-editor flows):
- Upload flow (new resume, goes to editor)
- Template selection (applying template, goes to editor)
- Profile page Master CV edit (explicit edit action)
- "Tailor Resume" buttons on jobs (opens editor with tailor sheet)
- Preview page "Back to Editor" button
- Existing ResumeDetailPage "Edit" button (already navigates to editor)

---

### Part 3: Enhance ResumeDetailPage for Tailored Resumes

**File: `src/pages/ResumeDetailPage.tsx`**

- Add tailored resume context: if `dbResume.parent_resume_id` exists, show a "Tailored" badge with target job title and company
- Add a "View Original" link to navigate to `/resume/${dbResume.parent_resume_id}`
- Add quick stats panel showing: completion percentage, sections completed count, number of tailored versions (query child resumes count)

---

### Files Summary

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Replace "Edit Resume" with actual resume title |
| `src/pages/DashboardPage.tsx` | Navigate to `/resume/:id` instead of `/editor` |
| `src/components/dashboard/ResumeListCard.tsx` | Card tap goes to `/resume/:id` |
| `src/components/applications/ResumeListSheet.tsx` | Resume click goes to `/resume/:id` |
| `src/components/applications/ActivityTimeline.tsx` | Resume entry click goes to `/resume/:id` |
| `src/components/dashboard/VersionCompareSheet.tsx` | Version click goes to `/resume/:id` |
| `src/pages/ResumeDetailPage.tsx` | Add tailored resume context and quick stats |

### Implementation Order

1. `EditorPage.tsx` -- update header title (quick win)
2. `ResumeDetailPage.tsx` -- enhance with tailored context and stats
3. `DashboardPage.tsx` -- redirect to preview
4. `ResumeListCard.tsx` -- redirect to preview
5. `ResumeListSheet.tsx` -- redirect to preview
6. `ActivityTimeline.tsx` -- redirect to preview
7. `VersionCompareSheet.tsx` -- redirect to preview
