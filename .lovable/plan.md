

## Fix "Improve Score" Flow: Keep User on Detail Page and Re-score After Enhancement

### Problem

1. **Score doesn't update**: After enhancing sections, the ATS score stays the same because:
   - The score is cached by `resumeId:updatedAt` key
   - The `updatedAt` value doesn't change (no DB save happens during enhancement)
   - The resume store updates locally but the score cache is stale

2. **User gets navigated away**: Clicking "Improve Score" navigates to `/ai-studio?action=enhance`, which is disorienting. The user should stay on the resume detail page.

### Solution

Open the `AIEnhanceSheet` directly on the `ResumeDetailPage` instead of navigating away. After the user applies enhancements, automatically re-score the resume and update the displayed ATS score.

### Changes

**File: `src/pages/ResumeDetailPage.tsx`**
- Add `showEnhance` state and import the lazy-loaded `AIEnhanceSheet`
- Change "Improve Score" button from navigating to `/ai-studio?action=enhance` to `setShowEnhance(true)`
- Add an `onOpenChange` handler for the sheet that, when closed after enhancements:
  - Reads the updated resume from the Zustand store
  - Clears the old score cache entry
  - Triggers `scoreResume()` to re-calculate the ATS score with the enhanced content
- Render `<AIEnhanceSheet>` at the bottom of the component

**File: `src/hooks/useResumeScore.ts`**
- Export a `clearCachedScore(resumeId, updatedAt)` function so the detail page can invalidate the stale cache entry before re-scoring
- This allows the same `updatedAt` key to be re-used for a fresh score after local-only changes

**File: `src/pages/AIStudioPage.tsx`**
- Remove the `?action=enhance` auto-open logic (no longer needed since the flow stays on the detail page)

### User Flow (After Fix)

1. User is on Resume Detail page, sees ATS Score 78%
2. Taps "Improve Score"
3. AIEnhanceSheet slides up (user stays on same page)
4. User selects sections, enhances, applies changes
5. User closes the sheet
6. Score automatically re-calculates with enhanced content
7. Updated ATS score appears (e.g., 85%)

### Technical Details

- `clearCachedScore` simply calls `scoreCache.delete(cacheKey(resumeId, updatedAt))`
- After sheet closes, we use `useResumeStore.getState().currentResume` to get the latest enhanced data
- The re-scoring happens transparently using the existing `scoreResume` function
- No navigation occurs at any point -- the user stays on `/resume/:id`

