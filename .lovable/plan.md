
# Fix the Persistent Mobile Black Bar in Editor

## Problem
Despite changing the outer `<main>` to `bg-background`, there is a CSS rule in `src/index.css` (lines 28-30) that forces the editor scroll container back to the darker card color:

```css
.editor-scroll-container {
  background: hsl(var(--card)) !important;
}
```

This `!important` override applies `hsl(var(--card))` (a darker shade) to the scroll container, which is the element that actually fills the visible area below the content. On mobile, when section content is short (e.g., Contact), this creates the visible dark band between the last field and the bottom tab bar.

## Fix

**File: `src/index.css` (lines 27-30)**

Change the forced background from `--card` to `--background`:

```css
/* Before */
.editor-scroll-container {
  background: hsl(var(--card)) !important;
}

/* After */
.editor-scroll-container {
  background: hsl(var(--background)) !important;
}
```

This makes the scroll container's empty space match the app's base background color, so any gap below content blends seamlessly with the area behind the bottom tab bar.

## Why This Wasn't Caught Before
The previous fixes targeted the outer `<main>` element's Tailwind class (`bg-card` to `bg-background`), but this CSS rule with `!important` on the inner `.editor-scroll-container` was overriding everything, keeping the darker color in the actual visible scroll area.

One-line value change. No other files affected.
