

## Auto-Refresh ATS Trend on Import and Edits via Lazy-Loaded Charts

### Overview
Currently, ATS score history is only recorded when explicit scoring happens (dashboard background scoring, manual re-score, import preview). Two key gaps exist:
1. **Editor edits never trigger re-scoring** -- the editor auto-saves every 3s but never calls `scoreResume`, so the trend chart doesn't grow during editing sessions.
2. **Import uses a throwaway temp ID** -- the `triggerATSScoring` in UploadPage generates a random UUID for the score cache, but when the resume is actually created with a real database ID, the initial import score is never recorded against that real ID.

This plan closes both gaps so the ATS trend chart auto-refreshes after imports and edits.

---

### Changes

**1. Record the import ATS score under the real resume ID after import**

File: `src/pages/UploadPage.tsx`

In `handleImportConfirm`, after the resume is successfully created (we have `newResume.id`), check if `importATSScore` is available. If so, record it in the history store under the real ID:

```
useATSScoreHistoryStore.getState().addScore(newResume.id, importATSScore);
```

This ensures the very first data point in the trend chart uses the permanent resume ID, not a discarded temp UUID.

**2. Auto-score after editor auto-save completes**

File: `src/pages/EditorPage.tsx`

After `saveToCloud` succeeds (line ~248, after `setLastSavedAt`), trigger a background ATS re-score using the `useResumeScore` hook. This is throttled to avoid excessive API calls:

- Import `useResumeScore` and `useATSScoreHistoryStore`
- Add a `lastScoreTimeRef` ref initialized to 0
- After successful save, check if at least 60 seconds have elapsed since the last score
- If so, call `scoreResume(currentResumeId, resume, new Date().toISOString())` via `requestIdleCallback` to avoid blocking the UI
- This automatically records to the history store (already wired in `useResumeScore`)

The 60-second throttle prevents hammering the edge function during active typing while still capturing meaningful edit checkpoints.

**3. Lazy-load the trend chart in ResumeDetailPage (already done, verify)**

The `ATSScoreTrendChart` is already lazy-loaded via `lazyWithRetry` in both `ResumeListCard` and `ResumeDetailPage`. No changes needed here -- just confirming the charts will reactively show new data points since they read from the Zustand store (`useATSScoreHistoryStore`), which triggers re-renders on updates.

---

### Technical Details

| File | Change |
|------|--------|
| `src/pages/UploadPage.tsx` | Record `importATSScore` under real resume ID after create |
| `src/pages/EditorPage.tsx` | Add throttled post-save ATS scoring with `requestIdleCallback` |

**No new files, no database changes, no new dependencies.**

The throttle (60s minimum between scores) balances trend granularity against API cost. The `requestIdleCallback` wrapper ensures scoring never blocks typing or save operations on low-end devices.

