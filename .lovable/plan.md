

## Real-Time ATS Score Trend Visualization Across Save Events

### Overview
Track ATS scores over time (each time a resume is scored after a save) and display a sparkline trend chart on the dashboard card and a detailed trend view on the resume detail page. This gives users a visual history of how their resume quality evolves with each edit.

---

### How It Works

1. Every time a resume is scored (after auto-save, manual re-score, or AI enhancement), the score is appended to a local history
2. The dashboard `ResumeListCard` shows a tiny sparkline next to the `ScoreRing` indicating the trend direction
3. The `ResumeDetailPage` shows a full trend chart with labeled data points
4. History is stored locally in a Zustand store (persisted to localStorage) -- no database changes needed since ATS scores are already ephemeral/cached

---

### Implementation Steps

**Step 1: Create ATS Score History Store**

New file: `src/store/atsScoreHistoryStore.ts`

A small Zustand store with `persist` middleware:

```text
State shape:
  history: Record<resumeId, Array<{ score: number; timestamp: string; categories: {...} }>>

Actions:
  addScore(resumeId, healthScore) -- appends to array, caps at 20 entries per resume
  getHistory(resumeId) -- returns sorted array
  clearHistory(resumeId) -- for delete cleanup
```

Each entry stores the overall score, timestamp, and the 4 category scores. Capped at 20 data points per resume to keep localStorage lean.

**Step 2: Record scores automatically in `useResumeScore`**

File: `src/hooks/useResumeScore.ts`

After a successful score is cached (line 144), also call `atsScoreHistoryStore.getState().addScore(resumeId, score)`. This is a single line addition that captures every scoring event across the entire app (dashboard background scoring, manual re-score, import scoring, editor scoring).

**Step 3: Create `ATSScoreTrendChart` component**

New file: `src/components/dashboard/ATSScoreTrendChart.tsx`

Two modes:
- **Sparkline mode** (compact): A tiny 80x32px area chart with no axes, just the line + gradient fill. Used on dashboard cards.
- **Full mode**: A 280px-tall area chart with X-axis (date labels), Y-axis (0-100), colored zones (red < 50, amber 50-79, green >= 80), and tooltip on tap. Used on detail page.

Uses `recharts` via the existing `chart.tsx` wrapper (`ChartContainer`, `ChartTooltip`).

Shows a small trend arrow + delta badge (e.g., "+12 pts" in green or "-5 pts" in red) comparing the latest score to the previous one.

**Step 4: Integrate sparkline into `ResumeListCard`**

File: `src/components/dashboard/ResumeListCard.tsx`

Below the `ScoreRing`, render a small `ATSScoreTrendChart` in sparkline mode when 2+ data points exist for that resume. Lazy-loaded to avoid loading recharts for users who haven't scored yet.

**Step 5: Integrate full chart into `ResumeDetailPage`**

File: `src/pages/ResumeDetailPage.tsx`

Below the existing ATS Score section (after the `ScoreRing` and action buttons), add a collapsible "Score Trend" card with `ATSScoreTrendChart` in full mode. Only shown when 2+ historical data points exist.

**Step 6: Clean up history on resume delete**

File: `src/pages/DashboardPage.tsx`

In `confirmDelete`, after `deleteResume.mutate` succeeds, call `clearHistory(resumeId)` to remove stale trend data.

---

### Technical Details

**No database changes required.** Score history is stored client-side in localStorage via Zustand persist. This is appropriate because:
- ATS scores are already ephemeral (in-memory cache)
- The trend is a convenience visualization, not critical data
- Keeps the feature zero-latency with no API calls

**Performance considerations:**
- Recharts is already in the bundle but not yet imported anywhere -- it will be lazy-loaded via `React.lazy` wrapping the chart component
- Sparkline renders are lightweight (no axes, no tooltip)
- History capped at 20 entries per resume

**Files to create:**

| File | Purpose |
|------|---------|
| `src/store/atsScoreHistoryStore.ts` | Zustand store for score history |
| `src/components/dashboard/ATSScoreTrendChart.tsx` | Sparkline + full trend chart |

**Files to modify:**

| File | Change |
|------|---------|
| `src/hooks/useResumeScore.ts` | Add 1 line to record score in history store after caching |
| `src/components/dashboard/ResumeListCard.tsx` | Add lazy sparkline below ScoreRing |
| `src/pages/ResumeDetailPage.tsx` | Add collapsible full trend chart in ATS section |
| `src/pages/DashboardPage.tsx` | Clear history on resume delete |

