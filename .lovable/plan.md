

# Fix Landing Page Scroll Lag

## Root Cause

The landing page has three major performance bottlenecks causing scroll jank:

1. **SpaceBackground parallax**: Three `motion.div` layers (`yFar`, `yMid`, `yNear`) are bound to `useScroll`/`useTransform`, causing Framer Motion to recalculate transforms on every single scroll frame. This is the primary culprit.
2. **Excessive `whileInView` animations**: Nearly every element on the page (comparisons, features, trust pillars, section headers) has its own `motion.div` with intersection observer-based animations, creating dozens of active observers.
3. **Large blurred orbs**: Three 260-320px elements with `blur-[70-80px]` are expensive to composite, especially on mobile GPUs.

## Solution

Strip out the expensive parallax system and simplify animations while keeping the visual appeal.

### 1. Simplify `SpaceBackground.tsx`
- **Remove all parallax**: Delete `useScroll`, `useTransform`, and the three `motion.div` parallax layers. Replace with static `div` elements -- the gradients and nebula are barely perceptible during scroll anyway.
- **Remove Framer Motion import entirely** from this component (it becomes pure CSS).
- **Reduce blur values**: Drop orb blur from 70-80px to 40-50px.
- **Reduce star count**: 30 to 15 stars (fewer DOM nodes with CSS animations).
- **Keep shooting stars** (only 2, lightweight CSS-only).

### 2. Simplify `Index.tsx` animations
- **Remove per-item staggered animations** for comparisons, features, and trust pillars. Instead, animate each *section wrapper* once with a single `whileInView` fade-in.
- **Remove `slideIn` and `popIn` variants** (they use per-item delays creating many observed elements).
- **Keep hero fade-in** animations (only 4-5 elements, runs once on load).
- **Keep `scaleIn` for the two demo cards** (only 2 elements, runs once).

### 3. Remove `willChange: 'transform'` declarations
These force GPU layer promotion for elements that no longer animate on scroll.

## Files Modified

| File | Changes |
|---|---|
| `src/components/landing/SpaceBackground.tsx` | Remove Framer Motion, remove parallax layers, use static divs, reduce stars to 15, lower blur values |
| `src/pages/Index.tsx` | Remove per-item `slideIn`/`popIn`/`inView` from list items; wrap sections in single `whileInView` fade; keep hero and demo card animations |

## Result
- Scroll handler goes from recalculating 3 transform values per frame to zero
- Intersection observers drop from ~20+ to ~4 (one per section)
- Blur compositing cost reduced by ~40%
- Visual result is nearly identical -- gradients, stars, and shooting stars remain; sections still fade in on scroll but as groups instead of individual items

