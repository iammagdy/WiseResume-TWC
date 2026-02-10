

# Tailor History Export Feature

## Overview

Add an "Export Report" button to the Tailor History sheet that downloads a readable JSON report of all tailoring history entries, following the existing export pattern used in `dataExport.ts`.

## Changes

### 1. Add export function to `src/lib/dataExport.ts`

Add a new `exportTailorHistory` function that:
- Accepts `TailorHistory[]` array
- Formats each entry with job title, company, score before/after, applied sections, date, and the tailor result (summary, skills, experience changes)
- Uses the existing `downloadJson` helper to trigger the download
- Filename: `tailor-history-{date}.json`

### 2. Update `src/components/editor/tailor/TailorHistorySheet.tsx`

- Import `exportTailorHistory` from `dataExport`
- Add a `Download` icon import from lucide-react
- Add an "Export Report" button in the footer next to the existing "Clear History" button
- The button calls `exportTailorHistory(history)` and shows a success toast

### Technical Details

**Export data shape:**
```json
{
  "exportVersion": "1.0",
  "exportDate": "2026-02-10T...",
  "tailorHistory": [
    {
      "jobTitle": "Software Engineer",
      "company": "Google",
      "scoreBefore": 62,
      "scoreAfter": 87,
      "appliedSections": ["summary", "skills", "experience"],
      "date": "2026-02-09T...",
      "tailoredResume": {
        "summary": "...",
        "skills": [...],
        "experience": [...],
        "education": [...]
      }
    }
  ]
}
```

**Footer layout** -- two buttons side by side:
- "Export Report" (outline, primary text) on the left
- "Clear History" (outline, destructive text) on the right

Both files follow existing patterns already in the codebase, keeping the change minimal and consistent.

