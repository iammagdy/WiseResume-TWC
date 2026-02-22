
# Fix Black Bar Above Bottom Tab Bar on Editor Page

## Problem
On the mobile editor (`/editor`), there is a visible black gap between the editor content and the bottom tab bar. This happens because:

1. The AppShell intentionally skips adding `pb-20` (bottom padding for the tab bar) on editor routes
2. The editor's scroll container uses `pb-16` (4rem) which is too small to account for the bottom tab bar height (~5rem)
3. The resulting gap shows the dark background color as a "black bar"

## Fix

### `src/pages/EditorPage.tsx` (line 1214)
Change the mobile editor scroll container's bottom padding from `pb-16` to `pb-24`:

- **Before**: `className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0"`
- **After**: `className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-24 space-y-0"`

The extra padding (`pb-24` = 6rem) ensures the scrollable content clears the bottom tab bar (5rem) plus leaves room for the floating action pill positioned at `bottom-[7rem]`. This prevents the black gap from appearing when the user scrolls to the bottom of the editor.

### Why `pb-24`?
- Bottom tab bar height: ~5rem (`pb-20` equivalent)
- The editor is `overflow-hidden` at the AppShell level, so the scroll container itself needs the padding
- `pb-24` (6rem) gives enough clearance for both the tab bar and the floating action pill
