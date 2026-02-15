

## Add "Re-score" Button Next to "Improve Score"

### Change

**File: `src/pages/ResumeDetailPage.tsx` (lines ~196-208)**

Add a "Re-score" button alongside the existing "Improve Score" button when a health score is displayed. This lets users manually request a fresh AI score without going through the enhancement flow.

### Layout

```text
        [ATS Score Ring: 85%]
           ATS Score

   [Re-score]    [Improve Score]
```

### Details

- Wrap both buttons in a `flex gap-2` row
- **Re-score button**: `variant="outline"`, size `sm`, shows a `RefreshCw` icon, calls `clearCachedScore` then `scoreResume` with current resume data. Shows a `Loader2` spinner while `scoringId` matches.
- **Improve Score button**: unchanged, opens the AIEnhanceSheet
- Both buttons maintain 44px min touch targets and `active:scale-95` feedback
- Import `RefreshCw` from `lucide-react`

### Technical Notes

- Re-score calls `clearCachedScore(dbResume.id, dbResume.updated_at)` first to bust the cache, then `scoreResume(dbResume.id, resumeData, dbResume.updated_at)` for a fresh AI evaluation
- The button is disabled while scoring is in progress (`scoringId === dbResume.id`)

