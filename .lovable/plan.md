

# Stats Popups, Master CV, and Profile-CV Sync

## Overview

Three connected features: (1) tapping stat tiles on the Jobs tab opens a popup sheet listing the actual resumes instead of navigating away, (2) introduce a "Master CV" concept where one resume is the user's primary base resume, and (3) the profile page shows CV data as collapsible sections and auto-populates profile fields from the master CV.

## 1. Stats Tile Popups (Jobs Tab)

**Problem**: Tapping "Resumes Created" or "Tailored Versions" navigates to the homepage, which is unhelpful.

**Solution**: Create a new `ResumeListSheet` bottom sheet component. When the user taps a stat tile, the sheet opens showing the relevant resumes (filtered by original vs tailored). Each item shows the resume title, date, and target job if applicable. Tapping an item navigates to the editor.

### New Component: `ResumeListSheet.tsx`
- Bottom sheet with a title ("Resumes Created" or "Tailored Versions")
- Lists resumes filtered by type (original = no `parent_resume_id`, tailored = has `parent_resume_id`)
- Each row: resume title, creation date, target job badge if tailored
- Tapping a row navigates to `/editor?id={resumeId}`
- Uses existing `useResumes()` hook data

### Modified: `JobActivityStats.tsx`
- Remove navigation to `/dashboard` for the first two tiles
- Instead, accept callbacks `onOriginalsTap` and `onTailoredTap` from the parent
- Parent (`ApplicationsPage.tsx`) manages the sheet open state and filter

### Modified: `ApplicationsPage.tsx`
- Add state for the resume list sheet (open/closed, filter type)
- Pass callbacks to `JobActivityStatsCard`
- Render `ResumeListSheet`

## 2. Master CV Concept

**Problem**: No concept of a "primary" or "master" resume that serves as the base for everything.

**Solution**: The `is_primary` boolean column already exists on the `resumes` table (defaults to `false`). We will use it to mark one resume as the master CV.

### How it works:
- When a user sets a resume as "Master CV," we update `is_primary = true` on that resume and `is_primary = false` on all others (via a database function or two queries)
- The master CV gets a crown/star badge on the dashboard and in the resume list sheet
- When creating a new tailored version, the master CV is pre-selected as the source
- The `ResumeListSheet` will show a "Set as Master CV" action on each resume

### New: `useSetMasterCV` mutation
- Added to `useResumes.ts` as a new mutation
- Sets `is_primary = true` on the target, `is_primary = false` on all others
- Invalidates the resumes query cache

### Visual indicator
- A small crown or star badge appears on the master CV card in the dashboard and in the new resume list sheet

## 3. Profile Reflects CV Data (Collapsible Sections)

**Problem**: The profile (EditProfileSheet) has basic fields but no connection to the user's actual CV content.

**Solution**: 
- When a master CV is set (or any CV is imported), auto-populate profile fields (fullName, location, linkedinUrl) from the CV's `contactInfo` if those profile fields are empty
- Add collapsible sections at the bottom of the EditProfileSheet showing the master CV's experience, education, and skills as read-only previews
- These sections use the `Collapsible` component (already exists in the project)

### Modified: `EditProfileSheet.tsx`
- Fetch the master CV using `useResumes()` filtered by `is_primary === true`
- Below the "Professional Details" section, add three collapsible sections:
  - **Experience** -- lists job titles and companies from the master CV
  - **Education** -- lists degrees and institutions
  - **Skills** -- shows skill badges
- Each section is collapsed by default, expandable with a tap
- A subtle note: "From your Master CV" with a link to edit it in the editor
- On first profile setup, if profile fields are empty, auto-fill from master CV contact info

### Auto-sync logic (in `EditProfileSheet` or a helper):
- When the sheet opens, check if `fullName` is empty but master CV has `contactInfo.fullName` -- pre-fill it
- Same for `location` and `linkedinUrl`
- Only pre-fill if the profile field is currently empty (never overwrite user edits)

## Technical Details

### Files to Create
1. `src/components/applications/ResumeListSheet.tsx` -- bottom sheet listing resumes by type

### Files to Modify
1. `src/components/applications/JobActivityStats.tsx` -- replace navigation with callbacks
2. `src/pages/ApplicationsPage.tsx` -- manage sheet state, render ResumeListSheet
3. `src/hooks/useResumes.ts` -- add `setMasterCV` mutation
4. `src/components/settings/EditProfileSheet.tsx` -- add collapsible CV sections and auto-sync logic

### No Database Changes Needed
The `is_primary` column already exists on the `resumes` table with a default of `false`. No migration required.

### Resume List Sheet Design
- Bottom sheet, 70% height
- Header shows the filter title and count
- Each resume card: glass-surface style, shows title, date ("3 days ago"), target job badge, and a crown icon if it's the master CV
- Long-press or a small menu button reveals "Set as Master CV" option
- Tapping the card navigates to `/editor?id=...`

### Collapsible CV Sections in Profile
```
[Experience]              [v]  (collapsed by default)
  Senior Developer at Google
  Junior Dev at Startup
  
[Education]               [v]
  B.Sc Computer Science, MIT

[Skills]                  [v]
  React  TypeScript  Node.js  Python
```
- Uses the existing `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` components
- Read-only display -- editing happens in the resume editor
- Shows "No master CV set" message with a prompt to set one if none exists

