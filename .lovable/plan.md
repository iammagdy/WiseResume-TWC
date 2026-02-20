

# Fix: Portfolio Floating Buttons Layout on Mobile

## Problem

The "Customize" and "View Live" floating buttons at the bottom of the Portfolio Editor page overflow the viewport on small screens (375px). They use `left-1/2 -translate-x-1/2` centering with `flex gap-2`, causing the "View Live" button to get clipped off the right edge. Additionally, both the floating pill and the PWA Install banner sit at `z-40` at roughly the same vertical position, causing visual overlap.

## Solution

### File: `src/pages/PortfolioEditorPage.tsx` (FloatingCustomizePill component, lines 1191-1219)

**Change 1: Constrain width and add horizontal padding**
- Replace `left-1/2 -translate-x-1/2` with `left-4 right-4` so the container respects viewport edges
- Add `justify-center` to keep buttons centered within the safe area
- Add `max-w-sm mx-auto` to prevent excessive width on tablets

**Change 2: Stack buttons vertically on very narrow screens (below 375px)**
- Use `flex-wrap justify-center` so buttons wrap gracefully if space is tight

**Change 3: Raise the floating pill above the PWA install banner**
- Change `bottom-[calc(5rem+env(safe-area-inset-bottom))]` to `bottom-[calc(7rem+env(safe-area-inset-bottom))]` to clear both the tab bar and the install banner
- This matches the staggering hierarchy: tab bar (base) -> install banner (5.5rem) -> floating pill (7rem)

### Result
- Buttons stay within viewport bounds on all screen sizes
- No overlap with PWA Install banner
- Touch targets remain at 44px minimum height
- Visual centering is preserved

