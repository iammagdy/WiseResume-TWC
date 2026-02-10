
# Fix Resume Card Flash on Initial Load

## Problem
The resume card appears "different" on first load because of entrance animations. The `ResumeGroup` wrapper uses `motion.div` with `initial={{ opacity: 0, y: 20 }}` which makes the card start invisible and shifted down, then animate into place. This creates a visible flash/jank where the card looks wrong before settling.

## Solution
Remove the staggered entrance animations from the resume card rendering. The cards should appear instantly since the page already has its own `PageTransition` wrapper handling the overall page entrance.

## Changes

### File: `src/components/dashboard/ResumeGroup.tsx`
- Change the outer `motion.div` from animated entrance (`initial={{ opacity: 0, y: 20 }}`) to a plain `div` -- no fade/slide on mount
- Keep the `AnimatePresence` animations for the expandable tailored versions section (those are interactive, not initial load)
- Remove the `delay` prop since it's no longer needed for staggered entrance

### File: `src/pages/DashboardPage.tsx`
- Remove `delay={index * 0.05}` from `ResumeGroup` and standalone `ResumeListCard` calls since the stagger animation is being removed

### File: `src/components/dashboard/ResumeListCard.tsx`
- Remove the unused `delay` prop from the interface and component (it was accepted but never used inside the component)

## Why This Fixes It
The page-level `PageTransition` component already handles a smooth entrance for the entire dashboard content. Adding per-card staggered fade-in on top of that creates visual jank -- cards appear blank then pop in one by one. Removing the card-level animation lets them render instantly within the page transition, eliminating the "loading" flash.
