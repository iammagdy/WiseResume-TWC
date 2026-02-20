
# Add Star-Field Background to Splash Screen

## Overview
Add a subtle animated star-field behind the splash screen content, with stars that drift slowly inward toward the logo and twinkle, creating a "vibrant space" feel consistent with the app's theme.

## Implementation

### Modify `src/components/AnimatedSplash.tsx`

**Add a star-field layer** between the background and the existing glow/logo content:

- Generate ~30 small star particles using `useMemo`, each with random position, size (1-3px), opacity, and animation delay
- Render them as small `motion.div` circles with two animation effects:
  1. **Twinkle**: Opacity oscillates between 0.2 and 0.8 over 2-4s (using Framer Motion `animate` with `repeat: Infinity`)
  2. **Drift inward**: Stars slowly translate toward center (the logo) over the 3-second splash duration, creating a subtle convergence effect
- Add a faint nebula gradient overlay (similar to `HomeBackground.tsx` style) with two radial gradients using primary/accent colors at very low opacity (~0.08)
- All particle animations are skipped when `prefersReduced` is true -- stars render as static dots instead

**Star generation:**
```typescript
const stars = useMemo(() => 
  Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    opacity: Math.random() * 0.4 + 0.2,
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
  })),
[]);
```

**Each star rendered as:**
- A `motion.div` with `position: absolute`, placed by percentage
- `animate` with opacity keyframes `[star.opacity, 0.8, star.opacity]` repeating infinitely
- A secondary subtle `x`/`y` drift toward `50%, 50%` (center) over the splash duration

**Nebula overlay:** Two fixed radial gradients (primary at top-left, accent at bottom-right) at ~8% opacity, purely decorative.

### No other files changed
This is a visual-only enhancement to the existing `AnimatedSplash.tsx` component.

## Technical Notes
- No new dependencies -- uses existing Framer Motion
- 30 particles is lightweight; each is a tiny div with CSS animations
- `useMemo` prevents regeneration on re-render
- Respects `prefers-reduced-motion` by showing static dots only
- Stars render behind the logo/text via lower z-index ordering in the JSX (rendered before the glow/logo elements)
