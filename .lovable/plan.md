

# Performance Analysis and Fixes for WiseResume

## Issues Found

### 1. Landing Page Scroll Handler Updates State on Every Pixel (HIGH)
**File:** `src/pages/Index.tsx` (lines 185-194)

The `onScroll` listener calls `setScrollProgress()` on every scroll event, causing a React re-render on every frame. The `scrollProgress` state is only used for a thin progress bar at the top. This is expensive because it re-renders the entire `Index` component (530 lines of JSX) on every scroll tick.

**Fix:** Replace React state with a direct DOM ref for the scroll progress bar. This eliminates re-renders entirely.

```tsx
// Replace scrollProgress state + onScroll with:
const progressRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const onScroll = () => {
    setScrolled(window.scrollY > 120);
    if (progressRef.current) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progressRef.current.style.width = `${pct}%`;
      progressRef.current.parentElement!.style.display = pct > 0 ? '' : 'none';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

And update the progress bar JSX to use a ref instead of state:
```tsx
<div className="fixed top-0 left-0 right-0 h-[3px] z-[60] pointer-events-none" style={{ display: 'none' }}>
  <div ref={progressRef} className="h-full bg-primary transition-[width] duration-75 ease-out" />
</div>
```

### 2. `BugReportDialog` Eagerly Loaded on Every Page (MEDIUM)
**File:** `src/App.tsx` (line 176)

`BugReportDialog` is rendered outside the router on every page load. The profiler shows it's one of the slowest scripts (932ms). It should be lazy-loaded since it's rarely used (only on shake/error).

**Fix:** Lazy-load it:
```tsx
const BugReportDialog = lazyWithRetry(() => import("@/components/BugReportDialog"));

// In App render:
<Suspense fallback={null}><BugReportDialog /></Suspense>
```

### 3. `WhatsNewDialog` Rendered on Every Route (LOW-MEDIUM)
**File:** `src/App.tsx` (line ~163 inside AppRoutes)

`WhatsNewDialog` is always rendered. It fires a `fetch('/changelog.json')` after 1.5s on every route. It should only render once (inside AppRoutes is fine) but should be lazy-loaded.

**Fix:** Lazy-load it:
```tsx
const WhatsNewDialog = lazyWithRetry(() => import("@/components/WhatsNewDialog"));

// In AppRoutes render:
<Suspense fallback={null}><WhatsNewDialog /></Suspense>
```

### 4. `CommandPalette` Always Mounted (LOW)
**File:** `src/App.tsx`

The `CommandPalette` component + its 20 lucide icon imports are always loaded. It's a power-user feature (Cmd+K). Should be lazy-loaded.

**Fix:** Lazy-load it:
```tsx
const CommandPalette = lazyWithRetry(() => import("@/components/layout/CommandPalette"));
```

### 5. Pre-warm Fetch on Landing Page Fires Unnecessarily (LOW)
**File:** `src/pages/Index.tsx` (lines 178-183)

The `HEAD` fetch to Supabase REST runs on every visit to `/`, even if the user is already authenticated and the connection is warm. Minor but unnecessary network request.

**Fix:** Only fire it once per session:
```tsx
useEffect(() => {
  if (sessionStorage.getItem('backend-warmed')) return;
  sessionStorage.setItem('backend-warmed', '1');
  fetch(SUPABASE_URL + '/rest/v1/', {
    method: 'HEAD',
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  }).catch(() => {});
}, []);
```

### 6. `PortfolioDemo` Interval Never Pauses When Off-Screen (LOW)
**File:** `src/pages/Index.tsx` (lines 60-63)

The `setInterval` for theme cycling runs forever, even when the component is scrolled out of view. Should use `useInView` to pause.

**Fix:** Add visibility check using the existing `useInView` hook, or accept it as low-impact (2s interval is cheap).

## Summary of Changes

| # | File | Issue | Impact |
|---|------|-------|--------|
| 1 | `src/pages/Index.tsx` | Scroll handler causes re-renders every frame | HIGH |
| 2 | `src/App.tsx` | `BugReportDialog` eagerly loaded (932ms) | MEDIUM |
| 3 | `src/App.tsx` | `WhatsNewDialog` eagerly loaded | LOW-MEDIUM |
| 4 | `src/App.tsx` | `CommandPalette` eagerly loaded | LOW |
| 5 | `src/pages/Index.tsx` | Redundant backend pre-warm | LOW |
| 6 | `src/pages/Index.tsx` | PortfolioDemo interval runs off-screen | LOW |

## Additional Improvement Suggestions

- **TTFB is 1021ms** ("needs improvement" per Web Vitals). This is server-side latency — consider enabling CDN caching headers or preloading critical resources.
- **FCP is 1504ms** — the AnimatedSplash blocks content for 3.2s on first visit. Consider reducing splash duration to 2s or skipping it for returning users.
- **lucide-react is 156KB** — the largest dependency. Consider using `lucide-react/dist/esm/icons/*` tree-shaking or importing individual icons to reduce bundle.
- **React 18 ref warnings** in console for `CommandDialog` and `InstallPrompt` — these should be wrapped with `forwardRef` to eliminate warnings.

No database changes required. No new dependencies needed.
