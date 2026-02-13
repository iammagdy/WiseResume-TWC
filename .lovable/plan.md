

## Fix Dashboard Stats - Show Real Scores, Add Tooltips, Compact Layout

### Root Cause

The primary issue is on line 153 of `DashboardStats.tsx`:
```
<ScoreRing score={avgScore} size={72} strokeWidth={5} isLoading={avgScore === 0} />
```

`isLoading` is `true` whenever `avgScore === 0`, which happens both when scores haven't loaded yet AND when no scores exist. The ScoreRing's loading state shows "---" with a pulse animation. Similarly, line 174 shows "---" for bestScore when it's 0.

The `healthScores` object is populated asynchronously by the background scoring loop in `DashboardPage.tsx` (lines 137-160), which calls the `score-resume` edge function for each resume. Until those calls complete, the scores map is empty, so avgScore/bestScore remain 0, triggering the perpetual loading state.

### Changes

#### 1. DashboardStats.tsx - Core Fixes

**Distinguish "loading" from "no scores yet":**
- Accept a new prop `isScoring: boolean` (passed from DashboardPage based on `scoringId !== null` or `Object.keys(healthScores).length < resumes.length`)
- Use `isScoring` for the ScoreRing's `isLoading` prop instead of `avgScore === 0`
- When not scoring and avgScore is 0, show `0` (not "---")

**Replace "BEST" with "Top Score":**
- Change label from "Best" to "Top Score" with a Trophy icon (already using Award, keep it)
- Show `bestScore` value always (show `0` not "---")

**Add tooltips to all three stats:**
- Wrap AVG ring label in a Tooltip: "Average ATS score across all your resumes"
- Wrap Resumes stat in a Tooltip: "Total resumes in your library"  
- Wrap Best stat in a Tooltip: "Your highest resume score"
- Import `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` from UI

**Compact the greeting:**
- Change `text-h1` to `text-lg font-semibold` for the greeting
- Reduce emoji to `text-base` (not pulsing, just a wave)
- Remove the redundant "You have X resumes in your library" subtitle entirely (the stats row already shows the count)

**Show score as percentage:**
- Display `{avgScore}%` in the ScoreRing center and beside stats
- Display `{bestScore}%` for the top score

#### 2. ScoreRing.tsx - Show Percentage Symbol

- Add `%` suffix to the score display (line 78): `{score}%`
- Reduce font size slightly to fit: `text-[10px]` instead of `text-xs` for the 72px ring

#### 3. DashboardPage.tsx - Pass Scoring State

- Compute `isScoring` boolean: `scoringId !== null || (resumes && resumes.length > 0 && Object.keys(healthScores).length < resumes.length)`
- Pass `isScoring` to `DashboardStats`

### Files Modified

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardStats.tsx` | Add tooltips, compact greeting, remove subtitle, fix loading logic, rename "Best" to "Top Score", show percentages |
| `src/components/dashboard/ScoreRing.tsx` | Add `%` suffix to score display, adjust font size |
| `src/pages/DashboardPage.tsx` | Compute and pass `isScoring` prop |

