

# Remove Editor Bottom Bar and Make Buttons Floating

## Problem
The bottom action bar (PDF, Preview, ATS buttons) at the bottom of the editor content area creates a visible "black bar" that takes up significant screen space. Combined with the AppShell layout, this bar causes the half-black-screen appearance.

## Solution
Remove the fixed bottom action bar entirely and convert its buttons into a floating pill that hovers above the BottomTabBar, similar to the existing `FloatingCreateButton` pattern.

## Changes

### 1. `src/pages/EditorPage.tsx`

**Remove the bottom action bar** (lines 1220-1249):
Delete the entire `div` containing the PDF, Preview, and ATS buttons from inside `TabsContent value="editor"`.

**Remove `h-[100dvh]` from root `<main>`** (line 966):
Change back to just `flex-1` since the black gap was caused by this bar, not the height calc:
```
<main className="flex-1 flex flex-col overflow-hidden">
```

**Add a floating action pill** rendered via `createPortal` to `document.body`, positioned at `bottom-[7rem]` (above the BottomTabBar). It will contain the same 3 buttons (PDF, Preview, ATS) in a compact horizontal pill with glass styling:

```tsx
{isMobile && mobileEditorTab === 'editor' && createPortal(
  <div className="fixed bottom-[7rem] left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1.5 rounded-full bg-background/90 backdrop-blur-xl border border-border/50 shadow-lg">
    <Button size="sm" onClick={handleQuickDownload} ...>PDF</Button>
    <Button variant="outline" size="sm" onClick={Preview} ...>Preview</Button>
    <Button variant="outline" size="sm" onClick={ATS} ...>ATS</Button>
  </div>,
  document.body
)}
```

### 2. `src/components/layout/AppShell.tsx`

**Revert the `pb-20` conditional** back to include editor routes, since the editor no longer has its own bottom bar stealing space. Or keep the current `!isEditorRoute` exclusion since the floating pill handles its own positioning.

No changes needed here -- the current state (no `pb-20` for editor) is correct for the floating approach.

## Summary

| # | File | What |
|---|------|------|
| 1 | `EditorPage.tsx` | Remove bottom action bar (lines 1220-1249) |
| 2 | `EditorPage.tsx` | Change root `<main>` from `h-[100dvh]` to just `flex-1 flex flex-col overflow-hidden` |
| 3 | `EditorPage.tsx` | Add floating pill with PDF/Preview/ATS buttons via portal, positioned above BottomTabBar |

No database changes. No new dependencies.
