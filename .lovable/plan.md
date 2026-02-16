

## Add "Score Unavailable" Visual Indicator

### Problem

After the backend reliability fixes, `tailor-resume` now returns `null` for `overallScore` and `sectionScores` when the AI fails to produce valid scores. However, the UI components still access these as required objects (e.g., `tailorResult.overallScore.before`), which will crash with a TypeError on null access. Users would see a white screen instead of useful feedback.

### Affected Components

| Component | What breaks |
|-----------|------------|
| `TailorSheet.tsx` | `tailorResult.overallScore.before/after`, `tailorResult.sectionScores.*`, `effectiveScore` calculation |
| `SetTargetJobSheet.tsx` | `overallScore?.after \|\| 0` renders "0%" instead of "unavailable" |
| `ScoreComparison.tsx` | Receives `beforeScore`/`afterScore` as required numbers; crashes if null passed |
| `JobCompareCard.tsx` | Direct `.overallScore.after` and `.sectionScores.*` access |
| `CompareScoreBars.tsx` | Direct `.overallScore.after` and `.sectionScores.*` access |
| `SectionChangeCard` calls | `impactScore` calculation crashes on null section scores |

### Solution

**Step 1: Update TypeScript types** (`src/types/resume.ts`)

Make `overallScore` and `sectionScores` optional (nullable) in `EnhancedTailorResult`:

```typescript
overallScore: { before: number; after: number } | null;
sectionScores: SectionScores | null;
```

**Step 2: Add a reusable `ScoreUnavailable` indicator component**

Create a small inline component that displays a styled "Score unavailable" message with an info icon, used wherever scores might be null. This keeps the UI informative instead of showing zeros or crashing.

**Step 3: Update `SetTargetJobSheet.tsx`**

- When `overallScore` is null: show the `ScoreUnavailable` indicator instead of "0%"
- When `sectionScores` is null: hide the "Section Breakdown" block entirely (already partially guarded with `{sectionScores && ...}`)
- For the database write (`job_match_score`): use `0` as fallback since the column requires a number

**Step 4: Update `TailorSheet.tsx`**

- Guard `effectiveScore` calculation: return `null` when `overallScore` is null
- Guard `ScoreComparison` rendering: only render when both `overallScore` and `sectionScores` are present; otherwise show `ScoreUnavailable`
- Guard `SectionChangeCard` `impactScore` props: use `0` when `sectionScores` is null
- Guard the database insert `job_match_score`: use `overallScore?.after ?? 0`
- Guard tailor history save: use `overallScore ?? { before: 0, after: 0 }` for the history record

**Step 5: Update `ScoreComparison.tsx`**

- No changes needed since the parent will only render it when scores are available (guarded at call site)

**Step 6: Update `JobCompareCard.tsx` and `CompareScoreBars.tsx`**

- Add null-safe access with `?.` and fallback to 0 for score display
- Show "N/A" text when scores are null

### Visual Design

The "Score unavailable" indicator will be:
- A compact banner with an `AlertTriangle` icon
- Muted styling: `bg-muted/50 text-muted-foreground border border-border/50 rounded-xl p-4`
- Text: "Score unavailable -- AI couldn't calculate scores for this analysis. The tailored content is still valid."
- Placed exactly where the score circle/comparison would normally appear

### Files to Change

| File | Change |
|------|--------|
| `src/types/resume.ts` | Make `overallScore` and `sectionScores` nullable |
| `src/components/dashboard/SetTargetJobSheet.tsx` | Add null guards + ScoreUnavailable fallback |
| `src/components/editor/TailorSheet.tsx` | Add null guards for score display, effectiveScore, SectionChangeCard impact, DB writes |
| `src/components/editor/tailor/JobCompareCard.tsx` | Add null-safe access on scores |
| `src/components/editor/tailor/CompareScoreBars.tsx` | Add null-safe access on scores |

No new files needed -- the ScoreUnavailable indicator will be an inline element in each component to keep things simple.
