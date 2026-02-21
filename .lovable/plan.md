
# Fix: Half Black Screen on Editor Page

## Root Cause

The editor page has a **nested layout conflict** between `AppShell` and `EditorPage`:

1. **AppShell** (line 57-63) applies `pb-20` (80px bottom padding) to `<main>` when bottom nav is visible, reserving space for the `BottomTabBar`
2. **AppShell's inner scroll div** (line 64-68) has `overflow-y-auto` making it a scroll container
3. **EditorPage** (line 966) renders as `flex-1 flex flex-col min-h-0 overflow-hidden` -- it expects to fill a fixed-height parent and manage its own scrolling internally
4. But inside AppShell's scrollable div, `flex-1` doesn't constrain to viewport height -- it just takes the content's natural height

The result: the editor content renders at its natural (short) height, and the remaining space below is empty black background. The `pb-20` from AppShell adds even more black space at the bottom.

## Fix (2 changes)

### 1. EditorPage: Set minimum height to fill viewport
**File: `src/pages/EditorPage.tsx` (line 966)**

Change the root `<main>` element to use `min-h-[calc(100dvh-theme(spacing.10)-theme(spacing.20))]` so it fills the available viewport space (100dvh minus AppShell header 40px minus bottom nav 80px). This ensures the flex column layout has enough height for its children to expand into, preventing the black gap.

Simplified approach: use `min-h-[calc(100dvh-10rem)]` which accounts for the header + bottom nav chrome.

### 2. EditorPage scroll container: Ensure it grows to fill
**File: `src/pages/EditorPage.tsx` (line 1213-1215)**

The `TabsContent` for "editor" and its inner scroll div already use `flex-1`, but with the parent having proper min-height, they will now correctly fill the space. No additional change needed here beyond fixing the root element height.

## Summary

| Change | File | Line | What |
|--------|------|------|------|
| Root layout height | `EditorPage.tsx` | 966 | Add `min-h-[calc(100dvh-10rem)]` to ensure editor fills viewport |

This single CSS change eliminates the black gap by giving the flex column layout a proper minimum height to work within. No database changes, no new dependencies.
