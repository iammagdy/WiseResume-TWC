

## Fix Score Rollback on Cancel and Ensure Real AI Scoring

### Root Cause

1. **Score drops on cancel**: When the user closes the AIEnhanceSheet (even without applying anything), the `onOpenChange` handler always clears the score cache and re-calls the `score-resume` edge function. Since the AI model is non-deterministic (temperature: 0.2), the same resume can get 85% one time and 78% the next.

2. **No distinction between "applied changes" vs "cancelled"**: The sheet's `onOpenChange(false)` fires identically whether the user applied 4 enhancements or simply swiped down to dismiss.

### Solution

Track whether any enhancements were actually applied. Only clear the cache and re-score if changes were made. If the user cancels, preserve the existing score.

### Changes

**File: `src/components/editor/ai/AIEnhanceSheet.tsx`**
- Add a new optional prop: `onEnhanced?: () => void`
- Call `onEnhanced()` whenever a section result is applied (inside `applyResult`) -- this signals to the parent that real changes happened

**File: `src/pages/ResumeDetailPage.tsx`**
- Add a ref `enhancedRef = useRef(false)` to track if any enhancements were applied during the sheet session
- Pass `onEnhanced={() => { enhancedRef.current = true }}` to `AIEnhanceSheet`
- In `onOpenChange(false)`:
  - If `enhancedRef.current` is true: clear cache, re-score with updated resume, reset the ref
  - If `enhancedRef.current` is false (user cancelled): do nothing, keep existing score
- Store the previous `healthScore` in a ref before opening the sheet, so if re-scoring fails, we can restore it

### Flow After Fix

| Action | Result |
|--------|--------|
| User sees 85%, taps "Improve Score" | Sheet opens, score stays 85% |
| User cancels/dismisses sheet | Sheet closes, score stays 85% (no re-score) |
| User applies 3 sections, then closes | Cache cleared, AI re-scores with enhanced content, new score displayed |
| Re-score fails (network error, rate limit) | Previous 85% score is restored |

### Technical Details

- The `score-resume` edge function already calls the real AI (gemini-2.5-flash-lite) -- the scoring IS real. The issue was only that re-scoring on cancel produced a slightly different result due to AI non-determinism.
- The `enhancedRef` pattern avoids unnecessary state re-renders and is reset to `false` each time the sheet opens.
- No changes needed to the edge function itself -- it already produces genuine AI-powered scores.

