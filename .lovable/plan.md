

## Smart Job Tailoring and Version Comparison

### Overview

Two features: (1) a "Set Target Job" button on dashboard resume cards that opens a job analysis modal with match scoring and one-tap tailoring, and (2) a clickable "tailored versions" badge that opens a side-by-side version comparison view with diff highlighting and merge/switch actions.

---

### Part 1: Set Target Job from Dashboard

**Current state**: `ResumeListCard` shows "No target job set" as plain text (line 261). The `TailorSheet` already has full job URL parsing (`JobUrlParser`), AI tailoring, and match scoring -- but it's only accessible from the editor page.

**What changes**:

**New file: `src/components/dashboard/SetTargetJobSheet.tsx`**

A bottom sheet modal that reuses existing components:

1. **Input section**: Reuses `JobUrlParser` component for URL paste or manual description entry
2. **"Analyze Job" button**: Calls the existing `tailor-resume` edge function (via `tailorResumeWithProgress`) to extract job title, required skills, responsibilities, and keywords
3. **Match Analysis display**: Shows match score with colored progress bar, missing skills list, weak areas, and strong areas -- data already returned by the tailor result (`overallScore`, `missingSkills`, `sectionScores`)
4. **"Tailor Resume" button**: Creates a new tailored resume in DB (same logic as `TailorSheet.handleApplyChanges` -- inserts into `resumes` table with `parent_resume_id`, `target_job_title`, `target_company`, `job_match_score`)
5. **Save to card**: Updates the master resume's `target_job_title` and `target_company` fields via the existing `updateResume` mutation

**File: `src/components/dashboard/ResumeListCard.tsx`**

- Replace "No target job set" text (line 261-263) with a clickable `[+ Set Target Job]` button
- Add state `showTargetJobSheet` to control the new sheet
- When `hasTargetJob` is true, show target job info with match score badge and make it clickable to edit/change
- Display format: "Target icon + Company - Job Title (78% match)" when job is set

**File: `src/pages/DashboardPage.tsx`**

- No major changes needed; the sheet opens from within `ResumeListCard`
- Pass `refetch` callback so the card refreshes after tailoring

**Editor banner**: The editor already shows target job info via the `NextStepBanner` component. After setting a target job from the dashboard, the editor will pick it up from the DB fields on the resume.

---

### Part 2: Version Comparison View

**Current state**: The "X tailored versions" badge in `ResumeGroup` (line 82-97) only toggles expand/collapse of the version list. `CompareSheet` exists but only compares original vs. single tailor result (not two saved versions). `diffUtils.ts` has all the diff logic needed (`compareSkills`, `diffText`, `compareExperience`).

**What changes**:

**New file: `src/components/dashboard/VersionCompareSheet.tsx`**

A full-height bottom sheet for comparing two resume versions:

1. **Version selector**: Two dropdown selectors at the top, each listing available versions (master + tailored). Pre-selects the first two versions.
2. **Desktop layout (>=768px)**: Side-by-side columns using CSS grid `grid-cols-2`. Each column shows the version name, target job, and section-by-section content.
3. **Mobile layout (<768px)**: Stacked vertically with swipeable tabs (two tabs: "Version 1" / "Version 2") plus a "Diff" tab showing unified diff view.
4. **Diff rendering**: Uses existing `diffText`, `compareSkills`, `compareExperience` from `diffUtils.ts`. Added text in green, removed in red strikethrough, unchanged in default color.
5. **Synchronized scrolling** (desktop): Both columns share a scroll handler that syncs scroll positions.
6. **Actions footer**:
   - "Use Version 1" / "Use Version 2": Sets the selected version as the current resume in the store and navigates to editor
   - "Merge Changes": Opens a section-by-section picker where user selects which sections to take from which version, then creates a new resume with the merged content

**File: `src/components/dashboard/ResumeGroup.tsx`**

- Make the "X tailored versions" badge (line 82-97) open the `VersionCompareSheet` instead of just toggling expand
- Add a small expand/collapse chevron separately so users can still browse versions
- Pass `masterResume` and `tailoredVersions` to the compare sheet

---

### What Does NOT Change

- All editor functionality, AI features, data persistence
- PDF generation and export
- Existing `TailorSheet` in the editor (remains fully functional)
- `CompareSheet` (still used by TailorSheet for single-result comparison)
- Version history in the editor
- Database schema (all needed columns exist: `parent_resume_id`, `target_job_title`, `target_company`, `job_match_score`)
- ATS scoring

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/dashboard/SetTargetJobSheet.tsx` | New -- job URL/paste modal with analysis and tailoring |
| `src/components/dashboard/VersionCompareSheet.tsx` | New -- side-by-side version comparison with diffs |
| `src/components/dashboard/ResumeListCard.tsx` | Add "Set Target Job" button, open sheet |
| `src/components/dashboard/ResumeGroup.tsx` | Make versions badge open compare sheet |

### Implementation Order

1. `SetTargetJobSheet.tsx` (new, reuses `JobUrlParser` and tailor logic)
2. `ResumeListCard.tsx` (integrate target job button + sheet)
3. `VersionCompareSheet.tsx` (new, reuses `diffUtils`)
4. `ResumeGroup.tsx` (wire up compare sheet to versions badge)

