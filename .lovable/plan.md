

# Fix Bright Flash on Tab Click

## Problem
When clicking a tab, the active pill indicator flashes bright red for ~2 seconds before settling to the correct subtle appearance. This happens because the `gradient-primary` class applies a full-opacity gradient, and `opacity-[0.06]` is animated separately by framer-motion during the `layoutId` transition.

## Solution

**File: `src/components/layout/BottomTabBar.tsx`** (line 93-97)

Replace the `gradient-primary opacity-[0.06]` approach with a direct low-opacity background color baked into the style. This way the color is always subtle -- no animation can flash it brighter.

Changes:
- Remove the `gradient-primary` class and `opacity-[0.06]` from the pill
- Instead, use inline `style={{ background: 'hsl(var(--primary) / 0.06)' }}` so the opacity is part of the color itself and cannot be animated separately
- Keep the `border border-primary/10` for shape definition
- Add `initial={false}` to the `motion.div` to prevent entry animation flash on first render

This is a single-element fix in one file.

