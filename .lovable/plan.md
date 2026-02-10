

# Fix: Maximum Update Depth Exceeded (Root Cause)

## Problem
The previous fix (removing `AnimatePresence`) was incomplete. The real conflict is between:
1. **Radix TabsContent** -- uses an internal `Presence` component that manages visibility via refs and setState
2. **framer-motion `motion.div`** -- wraps each TabsContent's children and also manages refs for animation state

When React mounts/remounts these components, Radix's composed refs (`@radix-ui/react-compose-refs`) call setState on the Presence component, which triggers a re-render, which detaches/reattaches refs, creating an infinite loop.

The `key={location.pathname}` on AppShell's `motion.div` forces a full remount of the editor tree on every navigation, triggering this conflict.

## Solution (Two Changes)

### 1. `src/components/layout/AppShell.tsx` -- Remove the keyed remount
Remove `key={location.pathname}` from the `motion.div`. This prevents forced full-tree remounting when navigating to/from the editor. The outlet already handles route changes naturally via React Router.

### 2. `src/pages/EditorPage.tsx` -- Replace motion.div with CSS animations inside TabsContent
Replace the `motion.div` wrappers inside each `TabsContent` with plain `div` elements using a CSS `animate-in` class. This eliminates the ref conflict between framer-motion and Radix Presence entirely while preserving the fade-in visual effect.

**Before (each tab):**
```tsx
<TabsContent value="contact">
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <SectionCard>...</SectionCard>
  </motion.div>
</TabsContent>
```

**After (each tab):**
```tsx
<TabsContent value="contact">
  <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
    <SectionCard>...</SectionCard>
  </div>
</TabsContent>
```

## Summary

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Remove `key={location.pathname}` to prevent forced remount |
| `src/pages/EditorPage.tsx` | Replace `motion.div` inside TabsContent with CSS-animated divs; remove unused motion import if possible |

