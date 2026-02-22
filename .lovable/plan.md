
# Enhance Public Portfolio Scroll UX

## Current State
The public portfolio page (`/p/username`) has basic scroll infrastructure (sticky header, SectionNav, IntersectionObserver for analytics tracking) but lacks polished scroll interactions that make it feel native and usable on mobile.

## Issues Identified

1. **No scroll-to-top button** -- After scrolling through 10+ sections, the user has no quick way back to the hero
2. **SectionNav active pill doesn't track correctly** -- The IntersectionObserver in SectionNav uses `rootMargin: '-30% 0px -70% 0px'` which conflicts with the sticky header (48px) and nav bar itself (~44px), causing the "About" pill to stay highlighted when the user is already viewing Experience
3. **No scroll progress indicator** -- Other pages in the app use `ScrollProgressBar` but the portfolio page has none, giving no sense of position in a long page
4. **Floating CTA button overlaps content** -- The chat widget and contact CTA float at bottom-right but there's no scroll-aware fade/slide to reduce visual clutter at the top of the page

## Planned Changes

### 1. Add Scroll-to-Top Button
- **File**: `src/pages/PublicPortfolioPage.tsx`
- Add a floating "back to top" button (arrow-up icon) that appears after scrolling past the hero section
- Fades in/out smoothly, uses `scroll-behavior: smooth`
- Positioned bottom-left to avoid conflict with the chat widget (bottom-right)
- 44x44px touch target, accent-colored

### 2. Fix SectionNav Active Tracking
- **File**: `src/components/portfolio/public/SectionNav.tsx`
- Adjust IntersectionObserver `rootMargin` to account for the sticky header (48px) and the nav bar itself (~44px): change to `'-20% 0px -60% 0px'`
- This ensures sections are marked active when they're actually visible in the viewport below the fixed UI

### 3. Add Scroll Progress Bar
- **File**: `src/pages/PublicPortfolioPage.tsx`
- Add a thin accent-colored progress bar at the very top of the page (below the sticky header, 3px tall)
- Reuse the existing window scroll listener already in the component
- Shows percentage of page scrolled, styled with the portfolio's accent color

### 4. Smooth Scroll Enhancements
- **File**: `src/pages/PublicPortfolioPage.tsx`
- Add `scroll-behavior: smooth` to the root portfolio container
- Ensure SectionNav tap-to-scroll accounts for sticky header offset (currently scrolls to `block: 'start'` which goes behind the header)

## Technical Details

### Scroll-to-Top Button (new inline component)
```text
- Uses existing `stickyVisible` state (true when hero is out of view)
- onClick: window.scrollTo({ top: 0, behavior: 'smooth' })
- Styled with accent color, 44x44 touch target
- Positioned fixed bottom-left with safe-area padding
- Uses framer-motion AnimatePresence for enter/exit
```

### SectionNav rootMargin Fix
```text
Current:  { threshold: 0.2, rootMargin: '-30% 0px -70% 0px' }
Updated:  { threshold: 0.15, rootMargin: '-100px 0px -65% 0px' }
```
The `-100px` top margin accounts for the fixed header (48px) + nav bar (~44px). The `-65%` bottom margin ensures a section is active when it occupies the upper third of the viewport.

### SectionNav scroll offset fix
```text
Current: el.scrollIntoView({ behavior: 'smooth', block: 'start' })
Updated: window.scrollTo({ top: el.offsetTop - 100, behavior: 'smooth' })
```
The 100px offset accounts for sticky header + section nav height.

### Scroll Progress Bar
```text
- Thin 3px bar fixed below the sticky header (top: 48px)
- Width transitions from 0% to 100% based on scroll position
- Uses the portfolio accent color
- Only visible when stickyVisible is true (after scrolling past hero)
```

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` | Add scroll-to-top button, scroll progress bar, smooth scroll CSS |
| `src/components/portfolio/public/SectionNav.tsx` | Fix rootMargin for active tracking, fix scroll offset for tapped pills |
