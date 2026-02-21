

# Performance Improvements Across the App

## Overview
After the splash screen optimizations, several other components still run **infinite Framer Motion loops** and unnecessary background animations that consume GPU/CPU cycles -- especially on pages the user spends the most time on (home, editor, bottom tab bar).

---

## Changes

### 1. HomeHeroSection.tsx -- Remove infinite loops

**Problem**: 4 orbiting particles with `repeat: Infinity` + logo floating with `repeat: Infinity` = 5 infinite Framer Motion animation loops running the entire time the home screen is visible.

**Fix**:
- Replace the 4 orbiting `motion.div` particles with a single CSS `@keyframes` orbit animation on a container, or remove them entirely (they're barely visible behind the logo)
- Replace the logo `animate={{ y: [0, -6, 0] }}` infinite loop with a CSS animation (`animate-float` class) to move it off the JS thread
- The wave emoji rotation already runs once -- no change needed

### 2. HomeBackground.tsx -- Move style tag to module level

**Problem**: The inline `<style>` tag with the `@keyframes twinkle` is rendered inside the component, meaning it's in the DOM tree and re-evaluated on re-renders.

**Fix**:
- Move the keyframe injection to module level (same pattern already used in AnimatedSplash.tsx)
- The 12 twinkling stars use CSS-only `infinite` animations which is fine for GPU-composited layers, but reduce count to 8 since most are off-screen on mobile

### 3. BottomTabBar.tsx -- Replace pulsing notification dots

**Problem**: Up to 3 notification dot `motion.div` elements with `repeat: Infinity` scale animations running constantly on the primary navigation bar (visible on every screen).

**Fix**:
- Replace Framer Motion `animate={{ scale: [1, 1.3, 1] }}` with a simple CSS `animate-pulse` class (already available via Tailwind)
- This moves the animation from JS to CSS, eliminating 3 Framer Motion animation loops from every page

### 4. AIFloatingButton.tsx -- Remove infinite pulse ring

**Problem**: A `motion.span` with `repeat: Infinity` scale+opacity animation runs behind the FAB at all times on the editor page.

**Fix**:
- Replace with CSS `animate-pulse` or a CSS `@keyframes` animation
- The FAB is always visible on the editor, so this saves one perpetual JS animation loop

### 5. ResumeCard.tsx -- Remove infinite "Continue" arrow bounce

**Problem**: Each resume card with a "Continue" label has a `motion.div` with `repeat: Infinity` translating x back and forth.

**Fix**:
- Replace with CSS `animate-bounce` or remove entirely -- the arrow icon already implies direction
- If the user has 5+ resumes, this is 5+ infinite JS loops on the dashboard

### 6. EditorDemo.tsx (landing page) -- Scope animation to viewport

**Problem**: The typing/scoring demo loop runs continuously even when scrolled out of view. It uses `requestAnimationFrame` for scoring and `setTimeout` chains for typing.

**Fix**:
- Add an `IntersectionObserver` to pause the loop when the component is not visible
- This prevents wasted CPU when users scroll past the demo on the landing page

---

## Summary

| Component | Issue | Fix |
|---|---|---|
| HomeHeroSection | 5 infinite FM loops | CSS animation + remove particles |
| HomeBackground | Inline style tag | Module-level injection |
| BottomTabBar | 3 infinite FM dot pulses | CSS `animate-pulse` |
| AIFloatingButton | 1 infinite FM pulse ring | CSS animation |
| ResumeCard | N infinite FM arrow bounces | CSS or remove |
| EditorDemo | Runs off-screen | IntersectionObserver pause |

**Total**: Eliminates ~10+ perpetual Framer Motion JS animation loops from commonly visited pages, moving visual effects to CSS where possible.

No visual changes -- all animations look the same, they just run more efficiently.

