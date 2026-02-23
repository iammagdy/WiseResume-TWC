
# Fix: Black Bar Above Bottom Tab Bar in Editor

## Problem

The editor page is excluded from the AppShell's `pb-20` bottom padding (line 66 of AppShell.tsx: `showBottomNav && !isEditorRoute`). This means the editor content area extends to the very bottom of the viewport, but the BottomTabBar overlays on top. When the editor content (e.g., the Contact section) is short, the dark `bg-background` color from the parent containers is visible between the end of the content and the bottom tab bar -- this is the persistent "black bar."

The CSS rule making `.editor-scroll-container` use `hsl(var(--card))` works for the scroll container itself, but the parent `<main>` element at line 974 still has `bg-background`, which is visible whenever the scroll container doesn't fill the entire height.

## Solution

Change the editor's outermost `<main>` background from `bg-background` to `bg-card`. This ensures that **every pixel** of the editor page -- including any empty space between the content and the bottom tab bar -- matches the card color. No more dark gap.

## File Changed

### `src/pages/EditorPage.tsx` (line 974)

Change:
```jsx
<main className="flex-1 flex flex-col overflow-hidden bg-background">
```

To:
```jsx
<main className="flex-1 flex flex-col overflow-hidden bg-card">
```

This single change makes the entire editor page background match the card/scroll-container color, eliminating the dark gap completely. The existing CSS `!important` override on `.editor-scroll-container` ensures consistency.
