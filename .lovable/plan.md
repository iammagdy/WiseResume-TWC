

# Fix: Remove framer-motion from ALL Editor Sub-Components

## Problem
The editor page still freezes because three key child components use `framer-motion` extensively. Even though we removed Radix Tabs and framer-motion from EditorPage itself, the child components still create the same infinite setState loop through framer-motion's internal ref management interacting with React 18's concurrent rendering.

The offending components:
- **StepperNav** -- `motion.div` with `animate` on every step circle + animated progress line
- **ProgressBar** -- `motion.div` wrapper + `motion.div` for each dot with staggered animations
- **AIAssistantBar** -- `motion.div` with `layout` prop (worst offender), `AnimatePresence`, stagger variants throughout
- **AIIntroTooltip** -- `AnimatePresence` + nested `motion.div` elements

## Changes

### 1. `src/components/editor/StepperNav.tsx`
- Replace `motion.div` for progress line with a plain `div` using CSS `transition-all` for width changes
- Replace `motion.div` for step circles with plain `div` using CSS transitions
- Remove `framer-motion` import

### 2. `src/components/editor/ProgressBar.tsx`
- Replace `motion.div` wrapper with a plain `div`
- Replace `motion.div` dots with plain `div` elements
- Replace `motion.circle` SVG with a plain `circle` using CSS transition for stroke
- Remove `framer-motion` import

### 3. `src/components/editor/AIAssistantBar.tsx`
- Remove the `layout` prop from the outer `motion.div` (this is the most likely crash trigger)
- Replace `AnimatePresence` + `motion.div` for expanded content with CSS-based show/hide
- Replace all `motion.div` stagger variants with plain `div` elements
- Replace chevron `motion.div` rotation with CSS `transform` + `transition`
- Remove `framer-motion` import

### 4. `src/components/editor/AIIntroTooltip.tsx`
- Replace `AnimatePresence` + `motion.div` overlay with a plain conditional `div`
- Use CSS animations (`animate-in fade-in-0`) for the card entrance
- Remove `framer-motion` import

## Summary

| File | Change |
|------|--------|
| `src/components/editor/StepperNav.tsx` | Replace all motion elements with CSS-transitioned divs |
| `src/components/editor/ProgressBar.tsx` | Replace motion elements with plain divs |
| `src/components/editor/AIAssistantBar.tsx` | Remove `layout` prop, replace AnimatePresence/motion with CSS |
| `src/components/editor/AIIntroTooltip.tsx` | Replace AnimatePresence/motion with CSS animations |

This comprehensively removes framer-motion from the entire editor rendering tree, eliminating the root cause of the infinite loop.
