
# Fix: Black Gap Below Editor — Correct Approach

## Root Cause (why previous fixes failed)

The EditorPage sits inside this hierarchy:

```text
AppShell root (h-[100dvh])
  +-- header (h-10, shrink-0)
  +-- main (flex-1, overflow-hidden, pb-20)
       +-- scroll div (flex-1, overflow-y-auto)  <-- SCROLL CONTAINER
            +-- motion.div (flex-1, flex-col)
                 +-- EditorPage main (h-[calc(100dvh-10rem)])
```

The problem: the scroll div has `overflow-y-auto`, making it a scroll container. In a scroll container, `flex-1` on children does NOT constrain them to the parent's height -- children can grow beyond and scroll. So EditorPage's `h-[calc(100dvh-10rem)]` creates a fixed-height box, but the `pb-20` on AppShell's `<main>` adds 80px of padding that appears as the black gap below.

Additionally, `10rem = 160px` is too much offset -- the header is only 40px and bottom nav is 80px, so the editor ends up 40px too short.

## The Fix (2 files)

### 1. AppShell: Don't apply pb-20 for editor route
The `pb-20` bottom padding reserves space for the BottomTabBar, but the EditorPage already manages its own layout to account for the tab bar. The padding creates the visible black gap.

**File: `src/components/layout/AppShell.tsx` (lines 57-62)**

For routes like `/editor` that manage their own height, skip `pb-20` on the `<main>` element:

```tsx
<main
  id="main-content"
  className={cn(
    "flex-1 flex flex-col min-h-0 overflow-hidden",
    showBottomNav && !isEditorRoute && "pb-20 lg:pb-0"
  )}
>
```

Where `isEditorRoute = location.pathname.startsWith('/editor')`.

### 2. EditorPage: Use 100dvh minus only header (40px)
Since the editor now won't have `pb-20` from AppShell, the height calc only needs to subtract the AppShell header:

**File: `src/pages/EditorPage.tsx` (line 966)**

```tsx
Before: <main className="flex-1 flex flex-col overflow-hidden h-[calc(100dvh-10rem)]">
After:  <main className="flex-1 flex flex-col overflow-hidden h-[calc(100dvh-2.5rem)]">
```

`2.5rem = 40px` = AppShell header height. The BottomTabBar is `position: fixed` so it overlays on top and doesn't need height subtracted.

## Summary

| Change | File | Line | What |
|--------|------|------|------|
| Skip pb-20 for editor | `AppShell.tsx` | 59-62 | Prevent bottom padding from creating black gap |
| Fix height calc | `EditorPage.tsx` | 966 | Use `h-[calc(100dvh-2.5rem)]` (only subtract header) |

No database changes. No new dependencies.
