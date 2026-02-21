

# AI Resume Import Validation Checklist

## What This Adds

After the user selects sections in the ImportReviewSheet and taps "Import", a new validation checklist screen appears before navigating to the editor. This checklist runs deterministic ATS compatibility checks on the imported data and presents actionable pass/fail items the user can review at a glance.

---

## How It Works

1. User uploads resume and sees the existing ImportReviewSheet
2. User taps "Import Selected"
3. Instead of going straight to the editor, a new **ATSValidationChecklist** sheet slides up
4. The checklist runs **instant deterministic checks** (no AI API call needed -- reuses the existing `resumeCompletionRules.ts` scoring functions plus new ATS-specific validators)
5. Each check item shows a pass/warn/fail icon with a one-line explanation
6. User taps "Continue to Editor" to proceed, or can go back to adjust section selection

---

## Checklist Items (All Deterministic -- No API Cost)

| # | Check | Rule | Status |
|---|-------|------|--------|
| 1 | Contact info complete | Name + email + phone + location all present | Pass/Fail |
| 2 | Professional summary | 50+ words, no first-person pronouns | Pass/Warn |
| 3 | Experience has dates | All entries have start dates | Pass/Warn |
| 4 | Bullet points present | At least 2 achievements per experience entry | Pass/Warn |
| 5 | Action verbs used | Achievements start with strong verbs (Led, Built, etc.) | Pass/Warn |
| 6 | Quantified results | At least 1 bullet contains a number/percentage | Pass/Warn |
| 7 | Skills count adequate | 5+ skills listed | Pass/Warn |
| 8 | Education complete | Institution + degree + dates present | Pass/Warn |
| 9 | No special characters | No emojis, icons, or unusual symbols that break ATS parsers | Pass/Warn |
| 10 | Consistent date format | Dates follow a consistent pattern | Pass/Warn |

---

## New Files

### `src/lib/atsValidationChecks.ts`
- Pure function: `runATSValidation(resume: ResumeData): ATSCheckResult[]`
- Each check returns `{ id, label, description, status: 'pass' | 'warn' | 'fail', tip?: string }`
- Reuses helpers from `resumeCompletionRules.ts` (e.g., `calcContactScore`, `calcSkillsScore`)
- Adds new checks: action verb detection (reuses the `ACTION_VERBS` set pattern from `score-resume` edge function), quantified results (regex for numbers/percentages), special character detection, date consistency

### `src/components/upload/ATSValidationChecklist.tsx`
- Sheet component that renders the checklist
- Takes `parsedData: ResumeData`, `atsScore: ResumeHealthScore | null`, `onContinue: () => void`, `onBack: () => void`
- Shows a summary header: "X of Y checks passed" with a color-coded ring
- Each item is a row with icon (CheckCircle2 green / AlertTriangle amber / XCircle red) + label + expandable tip
- Bottom: "Continue to Editor" primary button + "Go Back" text button
- Animated entrance with staggered item reveals via framer-motion

---

## Changes to Existing Files

### `src/pages/UploadPage.tsx`
- Add new state: `showValidationChecklist: boolean`
- In `handleImportConfirm`: instead of navigating to `/editor` immediately, set `showValidationChecklist = true` and store the filtered data + ATS score
- Add new handler `handleValidationContinue`: performs the actual save-to-cloud + navigate-to-editor logic (moved from current `handleImportConfirm`)
- Add new handler `handleValidationBack`: goes back to the ImportReviewSheet
- Render `<ATSValidationChecklist>` conditionally

### `src/components/upload/ImportReviewSheet.tsx`
- No structural changes needed -- the "Import Selected" button already calls `onImport` which will now trigger the validation step instead of navigating directly

---

## User Flow

```text
Upload File
    |
    v
ImportReviewSheet (select sections + see ATS score)
    |  "Import Selected"
    v
ATSValidationChecklist (pass/warn/fail items)
    |  "Continue to Editor"      |  "Go Back"
    v                            v
Editor Page               ImportReviewSheet
```

---

## Technical Details

- All checks are **deterministic and instant** -- no edge function calls, no AI credits consumed
- The checklist leverages the ATS health score already computed during import (passed through as a prop for the summary ring)
- Action verb set (~50 common verbs) defined as a constant in `atsValidationChecks.ts`
- Special character check uses a regex for emojis and non-ASCII decorative characters
- Date consistency check groups all dates and verifies they follow the same format pattern (e.g., all "MMM YYYY" or all "MM/YYYY")
- Respects `prefers-reduced-motion` for staggered animations
- Mobile-first: 44px minimum touch targets, bottom sheet with safe area padding

