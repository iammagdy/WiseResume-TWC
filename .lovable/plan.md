

# Fix Landing Page Lag and "See It in Action" Not Rendering on Mobile

## Problem

The landing page is laggy on mobile and "See It in Action" appears to not render. After profiling, three major causes were identified:

1. **The logo image (`wise-ai-logo.png`) is 2.5MB** -- loaded twice on the page (hero + header), causing massive delay on mobile connections. This alone explains most of the perceived lag.
2. **SpaceBackground uses heavy GPU effects** -- three large blurred orbs (`blur-[40px]`), nebula gradients, and continuous star/shooting-star animations all compete for GPU time on low-end phones.
3. **Expensive infinite `boxShadow` animations** on badge pills -- `boxShadow` changes trigger paint on every frame, causing jank that makes the demos appear stuck.
4. **Too many nested `motion.div` wrappers** with `whileInView` inside the cards -- each one creates its own IntersectionObserver and transition, adding overhead and delaying when child content (including the demos) becomes visible.

## Fix Plan

### 1. Compress the logo image
Replace the 2.5MB PNG with a compressed WebP version (target under 50KB). This alone will cut 5MB+ of network transfer and dramatically speed up page load.

**File:** `src/assets/wise-ai-logo.png` -- replace with optimized version (or convert to WebP and update imports).

### 2. Simplify SpaceBackground on mobile
Reduce the blur radius on floating orbs from `blur-[40px]` to `blur-[20px]` and lower opacity. Remove shooting star animations entirely (they're barely visible on small screens). Keep twinkling stars but reduce count from 15 to 8.

**File:** `src/components/landing/SpaceBackground.tsx`

### 3. Remove expensive boxShadow pulse animations
Replace the infinite `boxShadow` animation on badge pills ("AI-Powered" and "Live Website") with a simple CSS `opacity` pulse, which is GPU-composited and free of paint cost.

**File:** `src/pages/Index.tsx` (lines 432-436, 503-506)

### 4. Flatten motion.div nesting in "See It in Action" cards
Remove the individual `motion.div` wrappers around badge, title, description, demo, and CTA inside each card. Instead, keep only the outer card `motion.div` with `whileInView` and use simple CSS `animation-delay` on inner elements for the stagger effect. This reduces from 5 IntersectionObservers per card to 1.

**File:** `src/pages/Index.tsx` (lines 416-558)

### 5. Lower EditorDemo IntersectionObserver threshold
Change `threshold: 0.2` to `threshold: 0.05` so the animation triggers as soon as the phone frame is barely visible, preventing the "not rendering" perception on mobile.

**File:** `src/components/landing/EditorDemo.tsx` (line 24)

## Summary of Changes

| File | Change |
|------|--------|
| `src/assets/wise-ai-logo.png` | Compress from 2.5MB to under 50KB |
| `src/components/landing/SpaceBackground.tsx` | Reduce blur, fewer stars, remove shooting stars |
| `src/components/landing/EditorDemo.tsx` | Lower IntersectionObserver threshold to 0.05 |
| `src/pages/Index.tsx` | Remove inner motion.div wrappers in cards; replace boxShadow pulse with opacity pulse |

No new dependencies. No database changes. The "See It in Action" demos (EditorDemo and PortfolioDemo) keep their full animation loops unchanged.
