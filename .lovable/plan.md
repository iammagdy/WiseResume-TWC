

# Fix: Black Gap Below Editor Content

## Root Cause

Using `min-h-[calc(100dvh-10rem)]` does NOT solve the problem because:

- `min-height` on a flex container does NOT make its `flex-1` children stretch to fill it
- The container's **actual** height collapses to its content's natural height
- The flex children (`Tabs`, `TabsContent`, scroll area) all use `flex-1` expecting a fixed-height parent
- Result: content renders at natural height, leaving a black gap below

## Fix

**File: `src/pages/EditorPage.tsx` (line 966)**

Change `min-h-` to `h-` (fixed height):

```
Before: <main className="flex-1 flex flex-col overflow-hidden min-h-[calc(100dvh-10rem)]">
After:  <main className="flex-1 flex flex-col overflow-hidden h-[calc(100dvh-10rem)]">
```

With a fixed `h-`, the flex column has a definite height, so all `flex-1` children (Tabs container, TabsContent, scroll area) properly expand to fill the remaining space. The editor already manages its own internal scrolling, so it does not need to participate in AppShell's scroll.

| Change | File | Line | What |
|--------|------|------|------|
| `min-h-` to `h-` | `EditorPage.tsx` | 966 | Give flex container a definite height so children fill it |

No database changes. No new dependencies.
