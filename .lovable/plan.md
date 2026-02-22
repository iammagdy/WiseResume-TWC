

# Fix Black Bar Above Bottom Tab Bar on Editor (Root Cause)

## Problem
The previous `pb-24` fix only added scroll padding inside the editor's scrollable area. The actual issue is structural: the AppShell's `<main>` element explicitly excludes editor routes from receiving `pb-20` bottom padding (line 66 of AppShell.tsx). This means:

1. The editor's content area extends behind the fixed bottom tab bar
2. When content is short (e.g., Contact section with 3 fields), the dark `bg-background` is visible between the last field and the tab bar
3. This creates the "black bar" appearance

## Fix

### 1. `src/components/layout/AppShell.tsx` (line 66)
Remove the `!isEditorRoute` exception so the editor route also gets `pb-20`:

- **Before**: `showBottomNav && !isEditorRoute && "pb-20 lg:pb-0"`
- **After**: `showBottomNav && "pb-20 lg:pb-0"`

This pushes the editor's content area up by 5rem, so it no longer extends behind the tab bar. The fixed tab bar sits in that cleared space instead.

### 2. `src/pages/EditorPage.tsx` (line 1214)
Revert the scroll padding from `pb-24` back to `pb-16` since the AppShell now handles tab bar clearance:

- **Before**: `pb-24`
- **After**: `pb-16`

The `pb-16` provides additional scroll clearance for the floating action pill (positioned at `bottom-[7rem]`), which is still needed within the editor scroll area.

## Why This Works
- `pb-20` on AppShell's `<main>` ensures the editor layout ends ABOVE the tab bar
- The editor still manages its own internal scrolling with `overflow-hidden` on its container
- The floating action pill still clears properly with `pb-16` inside the scroll container
- All other routes continue to work as before since they already had `pb-20`

