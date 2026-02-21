

# Fix: Remove Black Gap in Editor — Final Approach

## Root Cause

The editor sits inside AppShell's **scroll container** (a `div` with `overflow-y-auto`). Inside a scroll container, `flex-1` does NOT constrain a child to fill the parent's height — the child just sizes to its content and the rest is empty black space.

The hierarchy is:
```text
AppShell (h-[100dvh])
  main (flex-1, overflow-hidden)
    scroll-div (flex-1, overflow-y-auto)  <-- THIS breaks flex-1 for children
      motion.div (flex-1)
        EditorPage main (flex-1)  <-- flex-1 is IGNORED, sizes to content
```

Since the editor content (form fields) is shorter than the viewport, the remaining space shows as a black gap.

## Solution

Force the editor's root `<main>` to use a fixed viewport height (`h-[100dvh]`) so it doesn't rely on `flex-1` (which fails in scroll containers). This was tried before but failed because the AppShell header was adding extra height. Since we already hide the AppShell header for editor routes, `h-[100dvh]` should work — BUT the AppShell scroll container itself also needs to stop scrolling for the editor route so the editor can manage its own scroll internally.

The real fix: **Make the AppShell scroll container NOT scroll for editor routes** by switching from `overflow-y-auto` to `overflow-hidden` when on the editor. This lets the editor's internal `flex-1` chain work correctly because the parent is no longer a scroll container.

### File 1: `src/components/layout/AppShell.tsx` (line 67)

Change the scroll div to conditionally disable scrolling for editor routes:

```tsx
// Before:
className="flex-1 flex flex-col min-h-0 w-full overflow-y-auto"

// After:
className={cn(
  "flex-1 flex flex-col min-h-0 w-full",
  isEditorRoute ? "overflow-hidden" : "overflow-y-auto"
)}
```

This makes `flex-1` on the editor's children actually work, since the parent is no longer a scroll container. The editor manages its own scrolling internally via `editor-scroll-container` with `overflow-y-auto`.

### File 2: `src/pages/EditorPage.tsx` (no changes needed)

The current `flex-1 flex flex-col overflow-hidden` on the root `<main>` is correct — once the parent stops being a scroll container, `flex-1` will properly fill the available height.

## Summary

| File | Line | Change |
|------|------|--------|
| `AppShell.tsx` | 67 | Use `overflow-hidden` instead of `overflow-y-auto` for editor routes |

One line change. No database changes. No new dependencies.

## Why This Works

- Non-editor pages: scroll div uses `overflow-y-auto` as before (pages can scroll normally)
- Editor page: scroll div uses `overflow-hidden`, making `flex-1` propagate correctly down to the editor, which manages its own internal scrolling via `editor-scroll-container`
