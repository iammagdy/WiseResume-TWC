

# CTA Button Shimmer Sweep + Sticky Header Cinematic Slide

## Overview

Two ambient animations for the public portfolio page:
1. Idle shimmer sweep on the hero CTA buttons ("Share Card" and "Download CV")
2. Replace the Framer Motion sticky header entrance with a CSS transition-based smooth slide-down triggered by IntersectionObserver

---

## ANIMATION 1: CTA Button Idle Shimmer Sweep

### CSS (`src/index.css`)

Add a shimmer-sweep keyframe using the "pause within keyframe" technique. The sweep motion occupies 0%-44% of a 5-second cycle, and 44%-100% holds position off-screen:

```css
@keyframes pf-cta-shimmer {
  0%   { transform: translateX(-150%); }
  44%  { transform: translateX(350%); }
  100% { transform: translateX(350%); }
}

/* Shimmer pseudo-element on CTA buttons */
.pf-cta-shimmer {
  position: relative;
  overflow: hidden;
}
.pf-cta-shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 60%;
  height: 100%;
  background: linear-gradient(105deg,
    transparent 40%,
    rgba(255,255,255,0.18) 50%,
    transparent 60%);
  pointer-events: none;
  animation: pf-cta-shimmer 5s linear infinite;
  z-index: 1;
}

/* Subtler shimmer for outlined buttons */
.pf-cta-shimmer-subtle::before {
  background: linear-gradient(105deg,
    transparent 40%,
    rgba(255,255,255,0.10) 50%,
    transparent 60%);
}
```

Reduced-motion override (add to existing block):
```css
.pf-cta-shimmer::before {
  animation: none;
  opacity: 0;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

Add the `pf-cta-shimmer` class to both CTA buttons in the hero section:

- **"Share Card" button** (line ~1452): Add `pf-cta-shimmer pf-cta-shimmer-subtle` to its `className`. Add `animationDelay: '1s'` to the `::before` via a wrapper style or by using a second modifier class `.pf-cta-shimmer-delay-1` with `animation-delay: 1s`.
  - Since `::before` can't be styled inline, use two CSS modifier classes:
    - `.pf-cta-shimmer-d1::before { animation-delay: 1s; }` (Share Card)
    - `.pf-cta-shimmer-d2::before { animation-delay: 2.8s; }` (Download CV)
- **"Download CV" button** (line ~1464): Add `pf-cta-shimmer pf-cta-shimmer-d2` to its `className`.

The buttons already have `transition-all` and interactive states -- the shimmer `::before` with `pointer-events: none` and `z-index: 1` won't interfere. The buttons already use inline styles for background/border, so `position: relative` and `overflow: hidden` from `.pf-cta-shimmer` are safe additions since the buttons are simple `<button>` elements with `rounded-full` (which implies `overflow` is not set to `visible`).

---

## ANIMATION 2: Sticky Header Cinematic Slide-Down

### Current Implementation

The `StickyHeader` component uses Framer Motion's `AnimatePresence` with conditional rendering (`{visible && <motion.div>}`). This mounts/unmounts the DOM element on visibility toggle.

### New Approach

Replace with an always-rendered `<div>` that uses CSS transitions for slide-in/slide-out, controlled by a class toggle. This avoids mount/unmount and gives smoother cinematic transitions.

### CSS (`src/index.css`)

```css
/* Sticky header slide */
.pf-sticky-header {
  transform: translateY(-100%);
  opacity: 0;
  transition: transform 350ms cubic-bezier(0.22, 1, 0.36, 1),
              opacity 350ms ease;
}
.pf-sticky-header.pf-sticky-visible {
  transform: translateY(0);
  opacity: 1;
}
```

Reduced-motion override:
```css
.pf-sticky-header {
  transition: none;
}
```

### JSX (`src/pages/PublicPortfolioPage.tsx`)

**StickyHeader component (lines 827-870):**

1. Remove `AnimatePresence` wrapper and `motion.div`. Replace with a plain `<div>`.
2. The `<div>` is always rendered (no conditional `{visible && ...}`).
3. Add class `pf-sticky-header` always, and `pf-sticky-visible` when `visible` is true.
4. Keep existing inline styles for backdrop-filter, background, and border-bottom (they're already correct per the spec).
5. Keep `position: fixed`, `top: 0`, `z-index: 50` from the existing `className`.

The existing IntersectionObserver for the hero (lines 1085-1094) already handles toggling `stickyVisible` state -- no changes needed there.

---

## Summary

| File | Change |
|---|---|
| `src/index.css` | Add `pf-cta-shimmer` keyframe + classes, `pf-sticky-header` transition classes, reduced-motion overrides |
| `src/pages/PublicPortfolioPage.tsx` | Add shimmer classes to Share Card and Download CV buttons; refactor StickyHeader from AnimatePresence/motion.div to plain div with CSS transition class toggle |

No data, routing, or dependency changes. Shimmer uses `pointer-events: none` to preserve all click handlers. Sticky header observer already exists and remains unchanged.
