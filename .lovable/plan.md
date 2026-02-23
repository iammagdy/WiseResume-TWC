
# Fix the Mobile Black Bar in Editor

## Problem
The editor's outer `<main>` uses `bg-card` as its background color. On mobile, when the section content (e.g., Contact) doesn't fill the full viewport, a large empty dark area appears between the last content card and the bottom tab bar. This reads as a "black bar" to users.

This only appears on mobile because:
- Mobile has a single-column layout with shorter content
- Desktop uses a side-by-side layout that fills the viewport
- The BottomTabBar only renders on mobile, creating a visible boundary

## Root Cause
`bg-card` (HSL 240 15% 8%) is slightly different from `bg-background` (HSL 240 20% 4%), creating a subtle but visible color contrast in the empty space. Combined with the glass-surface content cards above and the glass bottom tab bar below, this area stands out as a distinct dark band.

## Fix
**File: `src/pages/EditorPage.tsx` (~line 974)**

Change the editor's `<main>` background from `bg-card` to `bg-background`:

```
Before: "fixed inset-0 z-40 flex flex-col overflow-hidden bg-card"
After:  "fixed inset-0 z-40 flex flex-col overflow-hidden bg-background"
```

This makes the empty space match the app's base background, so it blends seamlessly with the area behind the bottom tab bar instead of appearing as a distinct dark band.

One-line change, mobile-only visual impact. Desktop and tablet are unaffected since the editor content fills the viewport on those screen sizes.
