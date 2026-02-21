

# Further Reduce Splash Screen Animations

## Current State
The previous optimization pass already removed Framer Motion infinite loops and reduced stars to 12. However, there are still **~28 animated elements** running simultaneously, which can cause jank on low-end mobile devices.

## Remaining Issues

1. **Orbital ring** still uses `animation: infinite` CSS (line 195) -- the only remaining infinite loop
2. **12 star particles** -- each is a separate `<motion.div>` with individual animation calculations
3. **3 ripple rings** -- 3 extra animated elements that expand outward
4. **10 letter `<motion.span>`s** -- each with its own staggered animation; could be simplified

## Changes to `src/components/AnimatedSplash.tsx`

### 1. Remove orbital ring infinite animation
Replace `infinite` with a single 3s rotation. Since the splash dismisses at 3.2s, one full rotation is all that's needed. Change line 195 from `animation: 'splash-orbit 3s linear infinite'` to `animation: 'splash-orbit 3s linear 1'` (runs once).

### 2. Reduce stars from 12 to 6
6 stars are enough for ambient sparkle on a mobile screen. Cuts animated DOM nodes by 6.

### 3. Remove ripple rings entirely
The ripple rings (lines 153-164) add 3 animated elements for a subtle effect. Removing them saves 3 `<motion.div>` instances with no meaningful visual loss -- the light burst and glow ring already provide the "expanding energy" feel.

### 4. Simplify text to a single `<motion.div>` fade-in
Replace the 10 individual `<motion.span>` letter animations with a single `<motion.h1>` that fades and slides in as one unit. This removes 9 animated elements. The shimmer gradient still runs on the parent, so the text still looks premium.

### Summary of element reduction

| Element | Before | After |
|---|---|---|
| Stars | 12 | 6 |
| Ripple rings | 3 | 0 |
| Letter spans | 10 | 1 (single h1) |
| Orbital ring | infinite CSS | single iteration |
| **Total animated nodes** | **~28** | **~12** |

### Expected Result
- 57% fewer animated DOM nodes
- Zero infinite loops (CSS or JS)
- Smoother startup on mid/low-end Android devices
- Visual quality remains high: light burst, glow, logo bounce, shimmer text, and tagline all preserved

