
# Fix: Large Empty Gap Below Editor Content on Mobile

## Root Cause

The AppShell (`src/components/layout/AppShell.tsx`, line 66) applies `pb-20` (80px bottom padding) to the `<main>` wrapper for ALL routes that show the bottom tab bar -- including the editor route. This padding reserves space so the bottom nav doesn't overlap content on scrollable pages.

However, the editor page manages its own layout differently: it uses `flex-1 flex flex-col overflow-hidden` with an internal scroll container. The `pb-20` on the `<main>` wrapper shrinks the available height for the entire editor by 80px, AND the editor's own scroll container already has `pb-16` (64px) to pad content above the bottom nav.

The combined effect: ~144px of wasted vertical space below the last section card, which appears as a large empty block (now bg-card colored) taking up nearly half the screen on shorter sections like Contact.

## Fix

**File: `src/components/layout/AppShell.tsx` (line 66)**

Exclude the editor route from the `pb-20` padding, since the editor handles its own bottom spacing internally:

```
// Before:
showBottomNav && "pb-20 lg:pb-0"

// After:
showBottomNav && !isEditorRoute && "pb-20 lg:pb-0"
```

`isEditorRoute` is already defined on line 24, so no new variables are needed.

## Why This Works

- Other pages (Dashboard, Settings, etc.) still get `pb-20` to clear the bottom nav
- The editor page already has `pb-16` on its scroll container, which provides enough clearance for the bottom tab bar
- Removing the outer 80px padding gives the editor its full viewport height, eliminating the large empty gap below short sections like Contact

## Files Changed
1. `src/components/layout/AppShell.tsx` -- 1 line change (add `!isEditorRoute` condition)
