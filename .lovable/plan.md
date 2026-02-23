

# Fix: Make Editor Scroll Area Transparent (No Black Bar)

## Problem
The current approach forces `hsl(var(--card))` on the scroll container and glass-cards. But `--card` differs from `--background`, creating a visible color band ("black bar") between the editor content and the bottom nav/app shell which uses `--background`. The opaque card color also obscures editor icons.

## Solution
Switch everything to **transparent** backgrounds so the base `bg-background` from the outer `<main>` shows through uniformly. No color mismatch = no visible bar.

### 1. `src/pages/EditorPage.tsx` (line 976)
Change the outer container from `bg-card` to `bg-background`:
```tsx
<main className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-background">
```

### 2. `src/index.css` (lines 27-39)
Replace the opaque card-color overrides with transparent backgrounds:
```css
.editor-scroll-container {
  background: transparent !important;
}

.editor-scroll-container .glass-card {
  background: transparent !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: none !important;
  box-shadow: none !important;
}
```

## Why This Works
- The outer `<main>` provides a single uniform `bg-background` color
- The scroll container is transparent, so `bg-background` shows through
- The glass-cards are transparent, so `bg-background` shows through
- There is no color boundary anywhere -- the entire editor is one flat surface
- Icons and text render directly against `bg-background`, ensuring full visibility

## What Changes Visually
- Editor section cards become fully flat (no card background, no border, no shadow)
- The entire editor area is one uniform background color
- All icons and text remain fully visible against the background
