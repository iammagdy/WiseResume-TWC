

# Fix the Mobile Black Bar -- The Real Root Cause

## Problem
All previous attempts changed background colors between `--card` and `--background`, but the actual issue is **transparency contrast**. The `.glass-card` class uses `background: hsl(var(--card) / 0.5)` (50% opacity) with `backdrop-filter: blur(16px)`. This means the card surfaces appear visually different from the solid `--card` background behind them. When content is short (e.g., Contact tab with only 3 fields), the solid-colored empty space below the last card contrasts with the semi-transparent cards above, creating the visible dark band.

## Root Cause
- `.glass-card` background: `hsl(var(--card) / 0.5)` -- 50% transparent with blur
- `.editor-scroll-container` background: `hsl(var(--card))` -- 100% solid
- These look different to the eye, creating a visible seam where the card ends and empty space begins

## Solution

Make `.glass-card` elements inside the editor fully opaque so they match the scroll container background exactly. This eliminates any visual contrast between card surfaces and the empty space below them.

### File: `src/index.css`

Add a scoped CSS rule that forces editor section cards to be opaque:

```css
/* Editor: make glass-cards opaque so they blend with the scroll container */
.editor-scroll-container .glass-card {
  background: hsl(var(--card)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
```

This makes the cards and the scroll container visually identical -- both solid `--card` color -- so there is no visible seam regardless of content height.

## Why Previous Fixes Failed
- Changing `bg-card` to `bg-background` (or vice versa) only shifted which shade of dark the empty space was. It never addressed the transparency difference between the glass-card surfaces and the solid background.
- Adding `min-h-full` wrapper didn't stretch the content because the parent is a flex container with `overflow-y-auto` -- `min-h-full` has no fixed reference height to expand to.

## Trade-off
Editor cards lose the frosted-glass blur effect and become flat solid surfaces. This is consistent with the existing native-app optimization (which already does the same for `body.native-app .glass-card`) and actually improves rendering performance on mobile.

## Technical Details
- One CSS rule addition in `src/index.css`
- No changes to `EditorPage.tsx`
- Desktop layout is also affected but since content fills the viewport there, it's invisible
- The scoped selector `.editor-scroll-container .glass-card` ensures only editor cards are affected; all other glass-cards in the app remain semi-transparent
