

# Fix: White Frame Flash on Page Load

## Problem
A white/blank frame briefly appears and then disappears when navigating to pages (especially visible on first load to `/dashboard`). This is caused by the `initial={{ opacity: 0 }}` on the `motion.div` in `AppShell.tsx` -- every time a route mounts, the content starts fully transparent and fades in over 150ms, creating a visible flash.

## Solution
Remove the fade-in animation on initial page mount and only apply it during route *transitions*. This eliminates the blank frame on first load while keeping smooth transitions between tabs.

## Changes

### `src/components/layout/AppShell.tsx`
- Set `initial={false}` on `AnimatePresence` so the first render skips the entry animation entirely (no opacity 0 flash)
- This means the very first page renders instantly at full opacity, but subsequent route changes still animate smoothly

```
Before:
  <AnimatePresence>
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}

After:
  <AnimatePresence initial={false}>
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
```

This is a single-line change. `AnimatePresence initial={false}` tells framer-motion to skip the `initial` animation for the component that's already present on first render, preventing the white flash. Subsequent navigations still get the fade-in effect.

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Add `initial={false}` to `AnimatePresence` |
