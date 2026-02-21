

# Fix: Black Gap Below Editor — The Real Root Cause

## Why all previous fixes failed

The EditorPage sits inside AppShell's **scroll container** (a div with `overflow-y-auto`). In a scroll container, children are NOT constrained to the parent's height — they can grow beyond and scroll. This means:

- `flex-1` on EditorPage does NOT force it to fill the container
- `h-[calc(100dvh-2.5rem)]` creates a fixed box, but the AppShell header + safe-area padding means the available space is less than `100dvh - 2.5rem`, causing the editor to slightly overflow AND leaving a black gap visible when the page loads

Additionally, the AppShell renders its own "WiseResume" header bar for the editor route, but the editor already has its own header. This wastes ~40px of vertical space.

## The Fix (2 changes)

### 1. Hide AppShell header on editor routes

The editor has its own header with back button, title, template picker, etc. The AppShell "WiseResume / Editor" header is redundant.

**File: `src/components/layout/AppShell.tsx` (line 44)**

Change `{showBottomNav && (` to `{showBottomNav && !isEditorRoute && (`

This hides the duplicate header, giving the editor the full viewport minus only the bottom tab bar.

### 2. EditorPage: use full viewport height, subtract nothing

With no AppShell header above it, the editor container should use the full viewport height. The BottomTabBar is `position: fixed` and overlays on top, so no subtraction needed. The editor's own internal `pb-16` on the scroll area already provides clearance for the bottom tab bar.

**File: `src/pages/EditorPage.tsx` (line 966)**

Change from:
```
h-[calc(100dvh-2.5rem)]
```
to:
```
h-[100dvh]
```

## Summary

| # | File | Line | Change |
|---|------|------|--------|
| 1 | `AppShell.tsx` | 44 | Hide AppShell header for editor routes: `showBottomNav && !isEditorRoute && (` |
| 2 | `EditorPage.tsx` | 966 | Use full viewport: `h-[100dvh]` instead of `h-[calc(100dvh-2.5rem)]` |

No database changes. No new dependencies.

