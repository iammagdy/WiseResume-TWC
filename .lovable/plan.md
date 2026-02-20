

# Fix White Frame During Loading

## Problem
During page load/refresh, a white frame flashes because the `html` element has no background color set. The dark background only applies once Tailwind processes `body`'s `bg-background` class and the theme JS runs.

## Changes

### 1. `index.html` -- Add inline background to `<html>` element
Add `style="background-color: #0a0a14"` directly on the `<html>` tag. This ensures the viewport is dark from the very first paint, before any CSS or JS loads.

### 2. `src/index.css` -- Set `html` background in base layer
Add `background-color: hsl(var(--background))` to the existing `html` rule (line 183-188), and also add it to `#root`:

```css
html {
  background-color: hsl(var(--background));
  /* ...existing font rules... */
}

#root {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: hsl(var(--background));
}
```

### 3. `src/components/ui/PageLoadingSpinner.tsx` -- Ensure spinner uses dark bg
The spinner already uses `bg-background` which is correct -- no change needed here.

### What stays the same
- All routing, business logic, and component behavior
- Theme switching logic
- All layout components (AppShell, MobileLayout, BottomTabBar)
- The inline loading spinner in `index.html` (already dark)

### Files modified
- `index.html` -- add inline `background-color` on `<html>`
- `src/index.css` -- add `background-color` to `html` rule, add `#root` rule

