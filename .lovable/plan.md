

# Fix Bottom Tab Bar Active Indicator

## Problem
The active tab pill indicator appears as a solid red rectangle (see screenshot). With the primary color changed to red, the `gradient-primary` background at `opacity-[0.12]` is too visually heavy -- red is a more attention-grabbing color than purple and needs lower opacity.

## Fix

**File: `src/components/layout/BottomTabBar.tsx`** (line 95)

- Reduce the pill opacity from `opacity-[0.12]` to `opacity-[0.06]` so it reads as a subtle tinted highlight rather than a solid block
- Reduce the pill's inset so it doesn't fill the entire tab area edge-to-edge: change `inset-x-2` to `inset-x-3` for more breathing room
- Add a subtle border to the pill (`border border-primary/10`) to define its shape without relying on fill opacity

These are small CSS tweaks on a single element (the `motion.div` with `layoutId="tab-pill"` on line 93-97).

