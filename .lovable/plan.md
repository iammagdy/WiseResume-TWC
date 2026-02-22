

# Fix: Portfolio Page Cannot Scroll

## Root Cause

The `<body>` tag in `index.html` has an inline `style="overflow:hidden;"` that is intended for the initial splash screen loading state. However, this style is **never removed** after React takes over.

- Routes **inside** `AppShell` (like `/dashboard`, `/editor`) are unaffected because `AppShell` creates its own scroll container (`overflow-y-auto` on the inner div).
- Routes **outside** `AppShell` (like `/p/username`, `/share/:token`) render directly under `<body>` and depend on native body scrolling, which is permanently blocked by `overflow:hidden`.

## Fix

### 1. Remove `overflow:hidden` from body after React mounts
**File:** `src/App.tsx`

Add a one-time `useEffect` in `AppRoutes` that removes the body's `overflow:hidden` once the app has mounted:

```typescript
useEffect(() => {
  document.body.style.overflow = '';
}, []);
```

This keeps the splash screen from showing a scrollbar during loading, but unlocks scrolling once the app is ready.

### 2. Ensure PublicPortfolioPage has proper scroll styling
**File:** `src/pages/PublicPortfolioPage.tsx`

Add `overflow-y-auto` to the root `#portfolio-content` div so the page scrolls even if body constraints exist:

Change line 453 from:
```
className={`min-h-screen ${pStyle === 'neon-cyber' ? 'pf-neon-scanline' : ''}`}
```
to:
```
className={`min-h-screen overflow-y-auto ${pStyle === 'neon-cyber' ? 'pf-neon-scanline' : ''}`}
```

## Why Both Changes

- Change 1 is the proper fix: the body should not stay `overflow:hidden` forever.
- Change 2 is a safety net: ensures the portfolio page can scroll independently regardless of parent constraints.

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Remove body overflow:hidden after mount |
| `src/pages/PublicPortfolioPage.tsx` | Add overflow-y-auto to root container |

