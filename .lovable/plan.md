

# Remove Duplicate FAB + Duplicate ATS Score Text

## IMPROVEMENT 1: Remove FloatingCreateButton from Dashboard

The `FloatingCreateButton` is rendered in `DashboardPage.tsx` at lines 841-850. Remove this block entirely. The "New Resume" button in the QuickActionChips row remains untouched.

### File: `src/pages/DashboardPage.tsx` (lines 840-850)
- Delete the entire `FloatingCreateButton` block (the conditional render and the component)
- This only affects the dashboard -- the FAB component file itself stays for use on other pages

## IMPROVEMENT 2: Remove ATS Score Breakdown from Resume Cards

The `ATSScoreBreakdown` section in `ResumeListCard.tsx` at lines 310-328 shows the redundant "ATS Score: XX/100" text below the card content. The circular `ScoreRing` at the top-left (line 216-220) remains.

### File: `src/components/dashboard/ResumeListCard.tsx` (lines 310-328)
- Remove the entire `{/* ATS Score Breakdown */}` block including:
  - The `healthScore` conditional rendering the `ATSScoreBreakdown` component
  - The loading skeleton fallback (`animate-pulse` div)
- This keeps the circular score ring intact while removing the redundant text breakdown

## Summary

| File | Change |
|---|---|
| `src/pages/DashboardPage.tsx` | Remove lines 840-850 (FloatingCreateButton render) |
| `src/components/dashboard/ResumeListCard.tsx` | Remove lines 310-328 (ATSScoreBreakdown section) |

No backend, routing, database, or dependency changes. Both removals are purely visual -- all data, handlers, and other card elements remain intact.

