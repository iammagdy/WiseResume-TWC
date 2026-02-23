
# Fix: Editor Dark Gap Below Content

## Problem

The dark area below the editor card (visible below the Previous/Next buttons) is the page's `bg-background` color showing through. Making the scroll container transparent (the last fix) actually made things worse because now the very dark page background is fully visible in the empty space.

## Root Issue

The scroll container takes `flex-1` to fill the screen height, but the card content is shorter than the available space. The remaining space shows whatever background color is behind it. No matter what color we set, if the card and the area below it don't match, there's a visible seam.

## Solution: Match Everything to the Card Color

Instead of transparency or stretching, simply set the **scroll container background to match the card background exactly**. Since the card sits on top of the container, if both are the same solid color, the gap becomes invisible.

### Changes

**`src/index.css`** (lines 27-30):

Replace the transparent rule with a rule that sets the scroll container to the exact card color, using `!important` to beat the native-app cascade:

```css
/* Editor: match scroll container to card color so no gap is visible */
.editor-scroll-container {
  background: hsl(var(--card)) !important;
}
```

This single CSS change ensures:
- The scroll container and the glass-card are the same solid color
- No visible seam or "black bar" between the card bottom and the container
- Works on both web and native-app contexts (the `!important` beats all overrides)
- No layout hacks needed (no flex-1 stretching, no min-h-full wrappers)
- Other pages keep their normal styling since `.editor-scroll-container` only exists on the editor page
