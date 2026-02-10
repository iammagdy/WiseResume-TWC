

# Fix: Infinite Loading on Editor Page

## Root Cause Analysis

After analyzing the codebase, I found **three interconnected issues** causing the app to show a loading skeleton forever on the `/editor` route:

### Issue 1: Failed Lazy Imports with No Recovery (Primary Cause)
All page routes use `React.lazy()` wrapped in `Suspense`. If the JavaScript chunk fails to load (network hiccup, stale service worker cache, etc.), the Suspense fallback (skeleton) stays visible **forever** with no retry mechanism or error feedback.

### Issue 2: AnimatePresence `mode="wait"` Delays Route Transitions
The `AppShell` uses `AnimatePresence mode="wait"`, which forces the old page to fully complete its exit animation before the new page begins rendering. This adds artificial delay on every route change and can interact badly with Suspense -- the skeleton only starts showing AFTER the exit animation finishes.

### Issue 3: `navigate()` Called During Render (Anti-Pattern)
In `EditorPage.tsx` (line 189-192), if `currentResume` is null, the component calls `navigate()` during the render phase and returns `null`. This is a React anti-pattern that can cause silent failures or render loops in React 18 concurrent mode.

---

## Changes

### 1. `src/App.tsx` -- Add Retry-Capable Lazy Loading

Create a `lazyWithRetry` wrapper that retries failed chunk imports up to 2 times with a delay, then does a hard page reload as a last resort (fixes stale service worker chunks). This prevents infinite skeleton states from network errors.

```typescript
function lazyWithRetry(factory: () => Promise<{ default: React.ComponentType }>) {
  return lazy(() =>
    factory().catch((err) => {
      // Retry once after 1s
      return new Promise<{ default: React.ComponentType }>((resolve) =>
        setTimeout(() => resolve(factory()), 1000)
      ).catch(() => {
        // Final fallback: reload page to bust stale SW cache
        window.location.reload();
        return { default: () => null };
      });
    })
  );
}
```

Apply this to all lazy page imports:
```typescript
const EditorPage = lazyWithRetry(() => import("./pages/EditorPage"));
const DashboardPage = lazyWithRetry(() => import("./pages/DashboardPage"));
// ...etc for all lazy routes
```

### 2. `src/components/layout/AppShell.tsx` -- Remove `mode="wait"` from AnimatePresence

Change `AnimatePresence mode="wait"` to just `AnimatePresence`. This allows the new page to start rendering immediately while the old page exits, eliminating the transition delay. Also simplify the motion.div to remove the initial/exit animations that add perceived latency.

Before:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2, ease: "easeInOut" }}
  >
```

After:
```tsx
<motion.div
  key={location.pathname}
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.15 }}
>
```

### 3. `src/pages/EditorPage.tsx` -- Replace `navigate()` During Render with `<Navigate>`

Replace the anti-pattern of calling `navigate()` during render with React Router's `<Navigate>` component, which is the correct declarative approach.

Before:
```tsx
if (!currentResume) {
  navigate(user ? '/dashboard' : '/');
  return null;
}
```

After:
```tsx
import { Navigate } from 'react-router-dom';
// ...
if (!currentResume) {
  return <Navigate to={user ? '/dashboard' : '/'} replace />;
}
```

### 4. `src/App.tsx` -- Add Suspense Timeout Fallback

Add an `ErrorBoundary` around each route's `Suspense` so that if a lazy import throws (after retries fail), the user sees an error message with a retry button instead of an infinite skeleton.

---

## Summary of File Changes

| File | Change | Impact |
|------|--------|--------|
| `src/App.tsx` | Add `lazyWithRetry` wrapper + ErrorBoundary per route | Prevents infinite skeleton from failed chunk loads |
| `src/components/layout/AppShell.tsx` | Remove AnimatePresence `mode="wait"`, simplify transition | Faster route transitions, eliminates transition deadlock |
| `src/pages/EditorPage.tsx` | Replace `navigate()` with `<Navigate>` component | Fixes React anti-pattern, prevents render loop |

## Testing
- Hard-refresh the app and navigate to `/editor` -- should load immediately or show error message if chunk fails
- Navigate between pages rapidly to confirm no transition delays
- Test with slow 3G throttling to verify the retry mechanism works

