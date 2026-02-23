

# Fix the Empty Black Gap in Editor Tab Content

## Problem
On mobile, the editor tab content area stretches to fill available vertical space (`flex-1`), but the actual content (section cards + Previous/Next buttons) often doesn't fill the full height. This creates a large dark empty gap between the navigation buttons and the bottom tab bar.

The `mt-2` default on `TabsContent` (line 42 of tabs.tsx) is already overridden with `mt-0` in EditorPage, so that's not the direct cause -- the real culprit is the flex layout forcing the scroll container to be taller than its content needs.

## Changes

### 1. Remove flex-col stretching from mobile editor TabsContent
**File:** `src/pages/EditorPage.tsx` (line 1213)

Change the editor TabsContent from stretching (`flex-1 flex flex-col`) to simply allowing natural overflow scrolling. The content should fill available space but the scroll container shouldn't force empty space below content.

- Change `pb-16` on the scroll container (line 1215) to `pb-24` -- this ensures the last piece of content can scroll above the bottom tab bar, but only when there IS content to scroll.
- The key fix: make the scroll container use `flex-1` but ensure its children don't create dead space by removing `flex flex-col` from the inner content wrapper if present.

### 2. Make renderEditorContent fill naturally without dead space
**File:** `src/pages/EditorPage.tsx` (line 1215)

Change the scroll container class from:
```
editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-16 space-y-0 flex flex-col
```
to:
```
editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-24 space-y-0
```

Removing `flex flex-col` prevents the container from stretching its children to fill the viewport, so content ends naturally. Increasing `pb-16` to `pb-24` ensures the Previous/Next buttons have enough clearance above the bottom tab bar when scrolled to the bottom.

### Summary
Two class changes on one line in `EditorPage.tsx`. The empty black gap disappears because the scroll container no longer forces its children into a flex column layout that stretches to fill the viewport.

