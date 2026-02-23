
# Fix the Mobile Black Bar -- Remove Card Visual Boundaries

## Problem
Despite making the glass-card background and the scroll container the same solid `--card` color, the cards still have visible **borders and shadows** from the `.glass-card` class:
- `border: 1px solid hsl(var(--border) / 0.4)`
- `box-shadow: 0 4px 24px -4px hsl(var(--primary) / 0.08), inset 0 1px 0 hsl(var(--foreground) / 0.04)`

These create a visible edge at the bottom of the card. Below that edge, the empty scroll container area (same `--card` color) appears as a distinct "dark bar" because the card has a bordered, shadowed appearance that makes the unbounded area below stand out by contrast.

## Solution: Two-Part Fix

### 1. Remove borders and shadows from editor glass-cards
Update the existing scoped CSS rule to also strip borders and shadows, so the card surface and the empty space below are visually indistinguishable.

**File: `src/index.css` (lines 32-37)**

```css
.editor-scroll-container .glass-card {
  background: hsl(var(--card)) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
}
```

### 2. Make the content wrapper actually stretch to fill the viewport
Add `flex-1` to the wrapper div so it fills the scroll container's visible height. Then add a spacer element at the bottom of `renderEditorContent()` that grows to consume remaining space, preventing any background from peeking through.

**File: `src/pages/EditorPage.tsx`**

On line 1218, change the wrapper to also include `flex-1`:
```tsx
<div className="flex flex-col min-h-full flex-1">
```

At the end of `renderEditorContent()` (after the Section Navigation div, before the closing Fragment), add a flex spacer:
```tsx
{/* Spacer to fill remaining viewport height */}
<div className="flex-1" />
```

## Why This Works
- Removing borders and shadows means the card blends seamlessly into the scroll container background -- no visible edge between "card" and "empty space"
- The flex spacer ensures the content wrapper stretches to fill any remaining height, so even if there were a color difference, no gap would appear
- Both fixes together guarantee zero visible seam on any content height

## Trade-off
- Editor section cards lose their subtle border and shadow styling, making them appear as flat surfaces without distinct card edges. The content is still visually organized by the section header and left accent stripe (the `before` pseudo-element on SectionCard).

## Technical Details
- Two files modified: `src/index.css` and `src/pages/EditorPage.tsx`
- Two CSS properties added to existing rule (`border: none`, `box-shadow: none`)
- One class addition (`flex-1`) and one small spacer div added
- No impact on desktop layout (content fills viewport there already)
