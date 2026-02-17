

## Fix: Add AI Health Badge to Dashboard and Fix Scroll Indicator

### Issue 1: AI Health Badge Missing on Dashboard
The `AIHealthBadge` only appears on routes listed in `AI_ROUTES` (line 12 of `AppShell.tsx`). `/dashboard` is not in that list, so the badge never renders on the dashboard.

**Fix**: Add `/dashboard` to the `AI_ROUTES` array in `src/components/layout/AppShell.tsx`.

### Issue 2: Scroll Bar Not Reflecting Real Scroll Position
The dashboard scrolls inside a nested `div` in `AppShell.tsx` (line 42) with `overflow-y-auto`. The global CSS sets the scrollbar to only 4px wide with a subtle primary color thumb. On many mobile devices and in WebView/preview environments, this thin scrollbar is either invisible or doesn't visually track scroll position well because the scroll container is the inner div, not the window.

**Fix**: Add a thin scroll progress bar at the top of the dashboard that tracks the actual scroll position of the content area. This provides a clear, always-visible indicator of how far the user has scrolled.

### Technical Details

**File: `src/components/layout/AppShell.tsx`**
1. Add `/dashboard` to the `AI_ROUTES` array so the health badge appears
2. Add a `ref` to the scrollable `div` and track scroll progress with a thin fixed bar at the top of the content area

**File: `src/components/layout/ScrollProgressBar.tsx`** (new file)
A small component that:
- Takes a scroll container ref
- Listens to the `scroll` event on that container
- Renders a thin (2-3px) fixed bar at the top showing scroll progress as a percentage fill using the primary color
- Uses `requestAnimationFrame` for smooth updates without jank

