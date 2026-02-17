

## Fix: Prevent Unnecessary Scoring When Closing Enhance Sheet Without Changes

### What's Happening

When you open "Improve Score" and close it without doing anything, two things go wrong:

1. The scoring process starts automatically in the background (wasting API calls)
2. The score disappears and shows "Score Resume" button instead

### Root Cause

The `onOpenChange` handler in `ResumeDetailPage.tsx` has a guard (`enhancedRef.current`) that should prevent save+re-score when nothing was changed. However, the issue is that the Sheet component's internal behavior can still trigger side effects. Additionally, if a previous enhancement session changed the `updated_at` timestamp, the cache key no longer matches the old score, causing it to appear as if the score was lost.

### The Fix

**File: `src/pages/ResumeDetailPage.tsx`**

1. Move the `setCurrentResume` / `setCurrentResumeId` / `setSelectedTemplate` calls from the "Improve Score" button click into the `onOpenChange(true)` handler, ensuring they only run once when the sheet actually opens
2. Add an early return in `onOpenChange(false)` when `enhancedRef.current` is false -- do nothing at all, just close the sheet
3. Ensure the `getCachedScore` call uses the latest `dbResume.updated_at` from the re-fetched query data (after invalidation) rather than the stale value from before the save

**File: `src/hooks/useResumeScore.ts`**

4. Add a `getCachedScoreByPrefix` method that finds a cached score for a resume ID regardless of `updated_at`, so the UI can always show the most recent known score even if `updated_at` has changed. This prevents the "Score Resume" button from appearing when a score exists but under a different cache key.

### Technical Details

In `ResumeDetailPage.tsx`:
- The `onOpenChange` handler will be simplified: when closing without changes, only `setShowEnhance(false)` runs -- no refs reset, no scoring, no saves
- The "Improve Score" button handler remains the same but the store setup happens in `onOpenChange(true)` to avoid duplication

In `useResumeScore.ts`:
- Add `getLatestCachedScore(resumeId)` that iterates the score cache to find any entry matching the resume ID prefix, returning the most recent one. This way, even if `updated_at` changed, the old score stays visible until a new one replaces it.

### What This Guarantees

- Opening and closing the Enhance sheet without changes: zero API calls, score stays visible
- After applying improvements: save to DB, re-score, update cache -- all as before
- Score never shows "Score Resume" if any cached score exists for that resume

