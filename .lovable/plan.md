

# Fix: Maximum Update Depth Exceeded on Editor Page

## Root Cause
The `AnimatePresence` in `AppShell.tsx` keeps the old route component mounted briefly during transitions. When the Editor page (which uses Radix `TabsContent` with its internal `Presence` component) is involved in a transition, the overlapping mount/unmount causes Radix's ref-based setState to trigger infinitely.

The `motion.div` inside `AnimatePresence` has no `exit` prop defined, so the old route component lingers without actually animating out -- this creates the conflict window where Radix's Presence detaches and reattaches refs in a loop.

## Solution
Remove `AnimatePresence` from `AppShell.tsx` entirely. Since there is no `exit` animation defined on the `motion.div`, `AnimatePresence` provides no visual benefit -- it only causes route overlap. The `initial`/`animate` fade-in on the `motion.div` still works without `AnimatePresence`.

## Changes

### `src/components/layout/AppShell.tsx`
- Remove `AnimatePresence` wrapper around the `motion.div`
- Remove the `AnimatePresence` import from framer-motion
- Keep the `motion.div` with its fade-in animation (this works standalone)

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Remove `AnimatePresence` wrapper to prevent route overlap that triggers Radix Presence infinite loop |

