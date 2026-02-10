

# Fix DashboardStats Layout Shift and Visual Duplication

## Problem
Two issues on the dashboard:

1. **Layout shift**: The stats row (score ring, resume count, best score) inside the hero card is hidden until `avgScore > 0`, then suddenly appears ~2 seconds later, causing the card to grow and push content down.

2. **Visual duplication**: The same `ScoreRing` component appears in the hero card (avg score) AND on each resume card (individual score), at similar sizes, making it feel like elements are duplicated.

## Changes

### File: `src/components/dashboard/DashboardStats.tsx`

1. **Always show the stats row** when `totalResumes > 0`, even before scores load. Replace the `avgScore > 0` guard with just `totalResumes > 0`.
2. **Show loading state for the score ring** when `avgScore === 0` (scores still loading) -- use `ScoreRing` with `isLoading` prop so the ring placeholder is visible from the start, preventing layout shift.
3. **Show "---" or skeleton for bestScore** while scores are loading.
4. **Remove entrance animations** (`initial={{ scale: 0.8, opacity: 0 }}`, `initial={{ opacity: 0, x: -10 }}`) from the stats row items. The parent `motion.div` already handles the hero card entrance; these stacked animations cause the "popping in" effect.
5. **Differentiate the hero ScoreRing** -- increase the size or add a label like "AVG" below it to make it visually distinct from the per-card score rings.

## Technical Details

### Stats Row Visibility (line 115)
```
// Before
{totalResumes > 0 && avgScore > 0 && (

// After
{totalResumes > 0 && (
```

### ScoreRing Loading
```tsx
<ScoreRing
  score={avgScore}
  size={72}
  strokeWidth={5}
  isLoading={avgScore === 0}
/>
```

### Remove Per-Item Animations
Replace `motion.div` wrappers around stats items with plain `div` elements, keeping only the parent hero card animation.

### BestScore Loading
```tsx
<p className="text-lg font-bold leading-tight">
  {bestScore > 0 ? bestScore : '—'}
</p>
```

