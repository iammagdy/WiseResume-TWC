

# Progress Tracking System - Granular Completion Rules and Visual Feedback

## Overview

Replace the current binary (complete/incomplete) section tracking with a granular percentage-based completion system. Add a visual progress bar below the header, upgrade the stepper nav circles with percentage badges, and celebrate section completions with toast notifications and animations.

## Section Completion Rules

Each section gets a percentage score (0-100) based on weighted sub-criteria:

### Contact (5 sub-items)
- Full name present: 20%
- Professional email: 20%
- Phone number: 20%
- Location: 20%
- LinkedIn or Portfolio link: 20%

### Summary (word-count based)
- 0 words: 0%
- 1-19 words: 25% (too short)
- 20-49 words: 50% (getting there)
- 50-149 words: 75% (good length)
- 150+ words or contains 2-4 sentences with 50+ words: 100%

### Work Experience (tiered)
- 0 entries: 0%
- 1 entry with just company+title: 25%
- 1 entry with company+title+dates: 50%
- 1 entry with company+title+dates+2 bullets: 75%
- 2+ entries each with company+title+dates+2 bullets: 100%

### Education (tiered)
- 0 entries: 0%
- 1 entry with just institution: 33%
- 1 entry with institution+degree: 66%
- 1 entry with institution+degree+end date: 100%

### Skills (count-based)
- 0 skills: 0%
- 1-4 skills: 40%
- 5-9 skills: 70%
- 10+ skills: 100%

### Overall Score
Average of all 5 section percentages, rounded to the nearest whole number.

## New File: `src/lib/resumeCompletionRules.ts`

A pure utility module exporting:
- `calcContactScore(contact: ContactInfo): number`
- `calcSummaryScore(summary: string): number`
- `calcExperienceScore(experience: Experience[]): number`
- `calcEducationScore(education: Education[]): number`
- `calcSkillsScore(skills: string[]): number`
- `calcOverallScore(resume: ResumeData): number`
- `getSectionStatus(score: number): 'empty' | 'partial' | 'complete'` (0 = empty, 1-99 = partial, 100 = complete)
- `getNextIncompleteSection(resume: ResumeData): string | null` (returns the section ID of the next incomplete section for "next step" guidance)

This keeps all logic testable and centralized.

## Modified: `src/components/editor/ProgressBar.tsx`

Replace the current binary dot-based progress bar with a proper horizontal bar:
- Shows "Resume XX% Complete" text on the left
- Animated fill bar on the right (uses the existing gradient-primary style)
- Bar smoothly transitions width via CSS `transition: width 0.7s ease-out`
- Uses `calcOverallScore()` from the new utility
- When score reaches 100%, text turns green and shows a sparkle icon

## Modified: `src/components/editor/StepperNav.tsx`

Update the stepper circles to show granular status:
- **Empty (0%)**: Gray circle with section icon (unchanged)
- **In Progress (1-99%)**: Amber/warning border with section icon + small percentage badge (e.g., "40%") positioned at the bottom-right of the circle
- **Complete (100%)**: Green circle with checkmark (unchanged, but now based on 100% not just "has content")
- **Active**: Keep the existing red/primary ring glow for the current section

The percentage badge is a tiny pill: `absolute -bottom-0.5 -right-1 text-[9px] bg-warning text-warning-foreground rounded-full px-1`

## Modified: `src/pages/EditorPage.tsx`

### Updated `sectionStatus`
Replace the current binary `sectionStatus` object with granular scores:
```
const sectionScores = useMemo(() => ({
  contact: calcContactScore(currentResume.contactInfo),
  summary: calcSummaryScore(currentResume.summary),
  experience: calcExperienceScore(currentResume.experience),
  education: calcEducationScore(currentResume.education),
  skills: calcSkillsScore(currentResume.skills),
}), [currentResume]);
```

Derive the boolean `completedSteps` from scores for the stepper: `score >= 100`.

### Section Completion Celebrations
Track previously completed sections in a ref. When a section score transitions from `< 100` to `100`:
- Show a toast: "Contact section complete! Next: Add your professional summary" (with the next incomplete section as guidance)
- The stepper circle animates with a brief scale pulse (CSS `animate-scale-in`)

### SectionCard Status
Map the granular score to the existing 3-state SectionCard status:
- `score === 0` -> `'empty'`
- `score > 0 && score < 100` -> `'partial'`
- `score >= 100` -> `'complete'`

## Technical Details

### Files to Create
1. `src/lib/resumeCompletionRules.ts` -- Pure utility with all scoring functions

### Files to Modify
1. `src/components/editor/ProgressBar.tsx` -- Replace dots with horizontal animated bar + "Resume XX% Complete" text
2. `src/components/editor/StepperNav.tsx` -- Add percentage badges to in-progress steps, accept `sectionScores` prop
3. `src/pages/EditorPage.tsx` -- Use granular scoring, celebration toasts on section completion, pass scores to stepper

### No Database Changes
All completion logic is client-side, computed from the existing `ResumeData` shape.

### Celebration Logic (in EditorPage)
- Use a `useRef<Record<string, boolean>>` to track which sections were previously complete
- On each render where scores change, compare current completion with previous
- If a section just hit 100%, fire a toast with section name and next-step suggestion
- Reset the ref entry if a section drops below 100% (user removed content)

### Toast Messages
- Contact: "Contact section complete! Next: Add your professional summary to stand out."
- Summary: "Professional summary complete! Next: Add your work experience."
- Experience: "Work experience complete! Next: Add your education details."
- Education: "Education section complete! Next: List your key skills."
- Skills: "Skills section complete! Your resume is looking great!"
- All complete: "All sections complete! Your resume is ready for review."

