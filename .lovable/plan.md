

# Add Smooth Tab Transitions with Framer Motion

## Overview
Add animated tab content transitions in the Portfolio Editor so switching between Setup, Design, and More tabs feels fluid and polished.

## Approach
Use `framer-motion`'s `AnimatePresence` and `motion.div` with a horizontal slide + fade effect. The direction of the slide will match the tab order (sliding left when moving forward, right when going back).

## Changes

### `src/pages/PortfolioEditorPage.tsx`
1. Import `AnimatePresence` and `motion` from `framer-motion`
2. Track the previous tab index to determine slide direction (use a `useRef` to store previous tab index)
3. Wrap the tab content area in `AnimatePresence mode="wait"`
4. Wrap each tab's content (`SetupTab`, `DesignTab`, `MoreTab`) in a `motion.div` with:
   - `key={activeTab}` so AnimatePresence detects the switch
   - `initial`: slight horizontal offset (20px in slide direction) + opacity 0
   - `animate`: x=0, opacity=1
   - `exit`: slight offset in opposite direction + opacity 0
   - `transition`: short duration (~0.2s) with easeInOut
5. Respect reduced motion via a check on `window.matchMedia('(prefers-reduced-motion: reduce)')` -- if true, set duration to 0

### Technical Details
- Tab index map: `setup=0`, `design=1`, `more=2`
- Direction: `newIndex > oldIndex` slides content from right; otherwise from left
- Animation duration: 200ms with `easeInOut` easing
- No layout shifts: the container dimensions stay stable since all tabs render in the same scrollable area

