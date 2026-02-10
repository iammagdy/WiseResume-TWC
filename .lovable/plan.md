

# Fix Resume Card Layout Shift on Initial Load

## Problem
When the dashboard first loads, the resume card appears in a "bare" state (no left border accent, no AI nudge, loading score ring) and then visibly changes ~2 seconds later once the health score API returns. This creates a jarring layout shift.

## Root Cause
The card's appearance depends heavily on `healthScore` data that loads asynchronously:
- The left colored border only appears when `healthScore` exists
- The AI improvement nudge only appears when `healthScore.topImprovement` exists
- The ScoreRing switches from a pulsing placeholder to the actual score

All three changes happening at once create a noticeable visual jump.

## Solution
Make the pre-score state visually consistent with the post-score state so the transition is seamless:

### File: `src/components/dashboard/ResumeListCard.tsx`

1. **Always show the left border** -- use a neutral/muted border color when no score is available yet, so the card width and position don't shift when the score loads
2. **Reserve space for the AI nudge** -- add a placeholder skeleton line for the nudge area when the score hasn't loaded yet, so the card height stays stable
3. **Clean up unused `FileText` import** -- it's no longer used in this component

### File: `src/components/dashboard/ScoreRing.tsx`

4. **Improve loading state** -- instead of a plain pulsing circle with "...", show a shimmer skeleton that matches the final ring's dimensions exactly (same size, same shape), preventing any size jitter

## Technical Details

### Left Border (ResumeListCard.tsx)
Current: border only renders when `healthScore` exists
```
healthScore && healthScore.overallScore >= 80 && "border-l-4 border-l-success"
```
Fixed: always show `border-l-4`, defaulting to `border-l-muted` when no score
```
"border-l-4",
healthScore
  ? healthScore.overallScore >= 80 ? "border-l-success"
    : healthScore.overallScore >= 60 ? "border-l-warning"
    : "border-l-destructive"
  : "border-l-muted"
```

### AI Nudge Placeholder (ResumeListCard.tsx)
When `healthScore` is null and the card is still scoring, show a small shimmer bar where the nudge text would appear:
```
{!healthScore && (
  <div className="mt-1.5 h-4 w-3/4 rounded bg-muted animate-pulse" />
)}
```

### ScoreRing Loading (ScoreRing.tsx)
Replace the basic pulsing circle with a proper circular shimmer skeleton that matches the SVG ring dimensions, keeping layout stable.

### Files Modified
1. `src/components/dashboard/ResumeListCard.tsx` -- stable border + nudge placeholder + remove unused import
2. `src/components/dashboard/ScoreRing.tsx` -- improved loading skeleton
