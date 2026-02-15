

## Add Tailored Resume Indicator Banner in Editor

### What It Does

When a user opens a tailored resume (one with a `parent_resume_id`), a compact banner appears just below the editor header showing:
- A "Tailored" label with a scissors icon
- The target job title and company (e.g., "Frontend Developer @ Google")
- A tap action to navigate back to the parent (original) resume

This gives users instant context about which tailored CV they're editing and what job it was tailored for.

### What Changes

#### 1. Editor Page (`src/pages/EditorPage.tsx`)

- Read `parent_resume_id`, `target_job_title`, and `target_company` from `resumeFromDb` (already fetched via `useResume`)
- Add a new banner component rendered between the header and the StepperNav when `parent_resume_id` is not null
- Banner layout:
  - Left: Scissors icon + "Tailored" badge (purple/primary tint)
  - Center: Job title and company text, truncated on mobile
  - Right: "View Original" link button that navigates to `/editor?id={parent_resume_id}`
- Styled as a slim, dismissible bar with `bg-primary/10 border-b border-primary/20`
- 36px height, compact text (`text-xs`), full-width

### What Does NOT Change

- Resume data loading or store logic
- StepperNav, section cards, or any editing functionality
- Header layout (banner is added below, not inside the header)
- Navigation flow from Jobs tab (already navigates to `/editor?id=...`)

### Files Summary

| File | Action |
|------|--------|
| `src/pages/EditorPage.tsx` | Add tailored resume indicator banner below header |

### Technical Details

The `resumeFromDb` object (from `useResume(currentResumeId)`) already contains:
- `parent_resume_id: string | null`
- `target_job_title: string | null`
- `target_company: string | null`

The banner conditionally renders when `resumeFromDb?.parent_resume_id` is truthy. No new database queries or hooks needed.

