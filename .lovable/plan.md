

# Fix Animations and Add Polished Transitions

## Problems Identified

1. **PageTransition component exists but is never imported or used by any page** -- it's dead code
2. **AppShell renders routes without AnimatePresence** -- exit animations are impossible; pages just pop in/out
3. **The `animate-fade-in` CSS class on the scroll container only fires once on initial mount**, not on each navigation -- so navigating between pages has zero visual feedback
4. **BottomTabBar uses only basic CSS transitions** -- no sliding active indicator, no icon spring bounce, no visual delight when switching tabs

## Solution

### 1. Add AnimatePresence-based Page Transitions to AppShell

**File: `src/components/layout/AppShell.tsx`**

Wrap the outlet in `AnimatePresence mode="wait"` keyed by `location.pathname`. Each page gets a `motion.div` wrapper with fade + subtle vertical slide (no horizontal slide -- it feels jarring on mobile).

- Import `AnimatePresence` and `motion` from `framer-motion`
- Replace raw `{currentOutlet}` with an `AnimatePresence` block
- Key the inner `motion.div` by `location.pathname` so React treats each route as a unique element
- Use `opacity` + `y` (8px) for a subtle, fast enter/exit (200ms) with an ease-out curve
- The exit animation runs `opacity: 0, y: -8` so the old page fades up while the new one fades in from below
- Scroll the container to top on route change via a `useEffect` on `location.pathname`

### 2. Upgrade BottomTabBar with Framer Motion Animations

**File: `src/components/layout/BottomTabBar.tsx`**

Add three visual enhancements:

**a) Sliding active pill indicator** using `motion.div` with `layoutId="tab-pill"`:
- A shared layout animation that smoothly slides the active background pill from one tab to another
- Uses `layout` transition with spring physics (`stiffness: 500, damping: 35`) for a snappy feel
- Replaces the current static pill `div` which just fades in/out

**b) Icon bounce on selection** using `motion.div` with `animate`:
- When a tab becomes active, the icon does a quick spring scale (1 -> 1.2 -> 1.0) using `useAnimation`
- Inactive icons stay at scale 1 with no animation
- Combined with the existing `haptics.selection()` for a multi-sensory feel

**c) Dot notification pulse**:
- The "new updates" dot gets a subtle scale pulse animation via `motion.span` with `animate={{ scale: [1, 1.3, 1] }}`

### 3. Remove Dead Code

**File: `src/components/layout/PageTransition.tsx`**

Delete this file -- it is unused and the new transition system is built directly into AppShell.

### 4. Add Reduced Motion Support

All new animations will check `useReducedMotion()` from Framer Motion:
- If the user prefers reduced motion, transitions use `opacity` only (no `y` movement) with 0ms duration
- BottomTabBar pill slides instantly (no spring) and icon scale is disabled

---

## Summary of File Changes

| File | Changes |
|---|---|
| `src/components/layout/AppShell.tsx` | Add AnimatePresence + motion.div for route transitions; scroll-to-top on navigate; reduced motion support |
| `src/components/layout/BottomTabBar.tsx` | Add Framer Motion sliding pill (layoutId), icon bounce animation, notification dot pulse; reduced motion support |
| `src/components/layout/PageTransition.tsx` | Delete (unused dead code) |

## Technical Details

### AppShell Transition Pattern

```text
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {currentOutlet}
  </motion.div>
</AnimatePresence>
```

The `mode="wait"` ensures the exiting page finishes its animation before the entering page starts, preventing both pages from being visible simultaneously.

### BottomTabBar Sliding Pill

```text
{active && (
  <motion.div
    layoutId="active-tab-pill"
    className="absolute inset-x-3 top-1 bottom-1 rounded-2xl bg-primary/10 border border-primary/15"
    transition={{ type: "spring", stiffness: 500, damping: 35 }}
  />
)}
```

Framer Motion's `layoutId` automatically animates the pill's position from one tab button to another using the FLIP technique. The spring physics give it a natural, bouncy feel.

### Icon Bounce on Tab Press

```text
<motion.div
  animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
  transition={active ? { duration: 0.3, ease: "easeOut" } : { duration: 0.15 }}
>
  <Icon ... />
</motion.div>
```

The scale keyframes `[1, 1.2, 1]` create a quick "pop" effect when a tab is selected, making it feel responsive and alive.
