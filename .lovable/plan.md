
# Fix the Mobile Black Bar in Editor -- For Real This Time

## Problem
The previous fixes changed background colors but haven't solved the core issue. The empty space below the last form card (e.g., the Phone field on the Contact tab) and above the bottom tab bar is still clearly visible as a dark band on mobile. Changing between `--card` and `--background` just shifts the shade of darkness -- neither eliminates the visual gap.

## Root Cause
On mobile, the editor content (form cards) doesn't fill the full scrollable area. The `editor-scroll-container` has `pb-24` (padding for the tab bar), but the actual card content is shorter than the viewport. The remaining empty space shows the container's background color, which contrasts with the semi-transparent `glass-card` surfaces above it, creating a visible "black bar."

## Solution: Three-Part Fix

### 1. Make editor content fill the full scroll area
Add `min-h-full` to the content wrapper and make the last section card stretch to fill remaining space using flexbox. This ensures there's no empty gap below the content.

**File: `src/pages/EditorPage.tsx` (line 1213-1219)**

Wrap the content in a flex container that fills the scroll area:

```tsx
<TabsContent value="editor" className="flex-1 min-h-0 overflow-hidden mt-0 flex flex-col">
  <div
    className="editor-scroll-container flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-24 space-y-0"
    ref={scrollContainerRef}
  >
    <div className="flex flex-col min-h-full">
      {renderEditorContent()}
    </div>
  </div>
</TabsContent>
```

### 2. Revert scroll container background to match cards
Change the `.editor-scroll-container` CSS back to use `--card` so the empty space (if any) blends with the card surfaces rather than showing the darker base background.

**File: `src/index.css` (line 29)**

```css
.editor-scroll-container {
  background: hsl(var(--card)) !important;
}
```

### 3. Set the editor `main` back to `bg-card`
The outer fixed container should also use `bg-card` to ensure consistent coloring across the full viewport.

**File: `src/pages/EditorPage.tsx` (line 974)**

```tsx
<main className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-card">
```

## Why This Works
- The `min-h-full` wrapper ensures content stretches to fill the scroll area, eliminating most of the visible gap
- Using `bg-card` / `--card` everywhere in the editor makes any remaining empty space blend seamlessly with the glass-card surfaces (both use `--card` as their base)
- The bottom tab bar's `glass-surface` (which also uses `--card`) will blend naturally with the editor behind it

## Technical Notes
- Only two files are modified: `src/pages/EditorPage.tsx` and `src/index.css`
- Desktop and tablet layouts are unaffected (they already fill the viewport)
- The `pb-24` padding remains to ensure content doesn't hide behind the bottom tab bar
