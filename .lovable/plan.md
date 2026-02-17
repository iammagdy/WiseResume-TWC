
## Remove Sparkline Trend Line from Dashboard Resume Cards

The red sparkline trend line below each score ring on the home screen adds visual noise and doesn't look good at this size. It will be removed.

### Change

**File: `src/components/dashboard/ResumeListCard.tsx`**

1. Remove the lazy import of `ATSScoreTrendChart` (line 42) and the related imports of `lazyWithRetry` (line 39), `Suspense` (line 40), and `useATSScoreHistoryStore` (line 38)
2. Remove the `scoreHistory` variable that feeds data to the chart (around line 84)
3. Remove the sparkline rendering block (lines 203-207) that shows the `ATSScoreTrendChart` below the `ScoreRing`

The `ScoreRing` (circular ATS score indicator) stays -- only the trend line underneath is removed.

No other files are affected since `ATSScoreTrendChart.tsx` itself remains available for use in other views (e.g., detail pages).
