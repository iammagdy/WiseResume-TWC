

## Fix: Score Disappears After Closing Enhance Sheet

### What's Happening

Two issues are causing the score to vanish:

1. **The `score-resume` function was not deployed** -- all scoring calls were returning 404 errors. This has been fixed just now by redeploying the function.

2. **Cache cleared before re-score succeeds** -- When you apply enhancements and close the sheet, the code immediately clears the cached score (line 407) and THEN attempts to re-score. If the re-score fails (network error, timeout, etc.), the cache is empty and the UI shows "Score Resume" instead of your previous score. The score should only be replaced once the new score is successfully computed.

### The Fix

**File: `src/pages/ResumeDetailPage.tsx`**

Change the post-enhancement flow so the cached score is NOT cleared before re-scoring. Instead:
- Call `scoreResume` without clearing the cache first
- The `scoreResume` function will overwrite the cache only when it succeeds
- If scoring fails, the previous score remains visible (e.g., still shows 69%)
- Remove the `clearCachedScore` call from the `onOpenChange` handler -- let the successful score response naturally replace the old cache entry

Since `scoreResume` in `useResumeScore.ts` uses a cache key based on `resumeId + updatedAt`, and the database save changes `updated_at`, the old cache entry won't match anyway. The fix is to let `scoreResume` write the new entry without explicitly deleting the old one first.

Additionally, update `scoreResume` in `useResumeScore.ts` to NOT skip scoring when a cache hit exists for cases where a force-refresh is needed (pass an optional `force` parameter).

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/ResumeDetailPage.tsx` | Remove `clearCachedScore` call in the post-enhancement `onSuccess` handler. Instead, pass a force flag to `scoreResume` so it always re-scores after enhancements. Keep the old cached score visible until the new one arrives. |
| `src/hooks/useResumeScore.ts` | Add an optional `force` parameter to `scoreResume` that bypasses the cache check, ensuring a fresh score is fetched even when a cached entry exists. |

### What This Guarantees

- The score never "disappears" -- the old score stays visible until the new one is ready
- If re-scoring fails, the user still sees their last known score
- After successful re-scoring, the new score replaces the old one seamlessly
- The `score-resume` edge function is now deployed and working (was returning 404)

