

# Fix Landing Page Scroll Lag and Broken Fade-Out

## Problem
Every animated section on the landing page uses `viewport: { once: false }`, which means all elements re-trigger their entrance animations every time they enter/exit the viewport during scrolling. This causes:
- Laggy scrolling due to dozens of simultaneous re-animations
- Broken fade-out effect (elements snap to their `initial` state instead of staying visible)

## Solution
Change all `viewport: { once: false }` to `viewport: { once: true }` in the animation helpers. This means each element animates in once and stays visible permanently -- no re-triggering, no lag, no jarring resets on scroll-up.

## Technical Details

### File: `src/pages/Index.tsx`

**4 animation helpers to update (lines 223-264):**

| Helper | Line | Change |
|---|---|---|
| `inView()` | 229 | `once: false` to `once: true` |
| `slideIn()` | 240 | `once: false` to `once: true` |
| `scaleIn()` | 251 | `once: false` to `once: true` |
| `popIn()` | 262 | `once: false` to `once: true` |

Each helper spreads `viewport: { once: true, amount: 0.2 }` (or `0.3` for `popIn`) so the animation fires once when the element scrolls into view and never re-triggers.

### No other files changed
- `SpaceBackground.tsx` parallax and star animations are fine (CSS keyframes, not scroll-triggered re-renders)
- No dependency changes needed

