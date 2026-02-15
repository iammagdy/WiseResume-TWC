

## Add ATS Score Label, "Improve Score" Button, and Remove Duplicate Completion Card

### Changes

**File: `src/pages/ResumeDetailPage.tsx`**

1. **Remove the "Complete" card from the 3-col grid** (lines 192-205): The first tile showing `95% Complete` duplicates the ProgressBar rendered just below it. Change the grid from 3 columns to 2 columns, keeping only "Sections" and "Tailored" tiles.

2. **Add "ATS Score" label and "Improve Score" button to the ScoreRing section** (lines 184-189):
   - Always render the score section (not just when `healthScore` exists)
   - If `healthScore` exists: show `ScoreRing` at 80px size, an "ATS Score" label below, and an "Improve Score" button
   - If no cached score: show a "Score Resume" button to trigger on-demand scoring via `useResumeScore().scoreResume`
   - "Improve Score" button sets resume context in the store and navigates to `/editor?action=enhance`

3. **Add scoring state**: Import `scoreResume` from `useResumeScore`, add `isScoring` state to track when scoring is in progress

**File: `src/pages/EditorPage.tsx`** (minor addition)
- On mount, check `searchParams.get('action')` -- if it equals `'enhance'`, auto-open the AI Enhance sheet so the user lands directly in the improvement flow with comparison diffs

### Updated Layout

```text
+----------------------------------+
|      Template Preview Card       |
+----------------------------------+
|     ScoreRing (80px, ATS: 72%)   |
|          "ATS Score"             |
|     [ Improve Score ] button     |
+----------------------------------+
|   Resume 95% Complete ========   |  <-- ProgressBar (kept)
+----------------------------------+
|    4/5     |      0             |
|  Sections  |   Tailored         |  <-- 2-col grid (completion card removed)
+----------------------------------+
```

### Technical Details

| File | Change |
|------|--------|
| `src/pages/ResumeDetailPage.tsx` | Remove completion card from grid, add ATS label + Improve Score button, on-demand scoring |
| `src/pages/EditorPage.tsx` | Check `?action=enhance` query param to auto-open AI Enhance sheet |

- "Improve Score" uses `setCurrentResume` / `setCurrentResumeId` / `setSelectedTemplate` then `navigate('/editor?action=enhance')`
- On-demand scoring uses `scoreResume(resumeData)` from the existing `useResumeScore` hook
- All buttons maintain 44px min touch targets and `active:scale-95`
- ScoreRing enlarged to 80px for better visibility with the label

