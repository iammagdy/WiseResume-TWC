

## Fix: Remove White Frame and Prevent Infinite Loading

### Problems
1. **White frame around loading screen**: The `window.location.reload()` in `lazyWithRetry` causes a full page reload that briefly flashes white between the old page teardown and the new page paint. In the dev preview environment, this creates a jarring white border effect.
2. **App loads forever**: After `lazyWithRetry` exhausts its 3 retries and triggers `window.location.reload()`, the same chunk error occurs again on reload. The sessionStorage guard prevents a second reload, but the thrown error gets caught by `Suspense` in a way that can leave the loading spinner showing indefinitely instead of propagating to the `ErrorBoundary`.

### Root Cause
The `window.location.reload()` approach is fundamentally flawed in the dev/preview environment because the same stale module URL keeps failing. The auto-reload creates a reload cycle that ends with a permanent loading spinner.

### Solution
1. **Remove auto-reload from `lazyWithRetry`**: Instead of calling `window.location.reload()`, simply let the error propagate to the `ErrorBoundary`, which already has a user-friendly "Connection hiccup" / "Reload" button. This puts the user in control rather than creating invisible reload loops.

2. **Fix `PageLoadingSpinner` white flash**: Add a timeout in `ProtectedRoute` so that if auth loading takes more than 5 seconds, it stops showing the spinner (auth already has its own 5s timeout, but adding a safety net here prevents the spinner from persisting if something goes wrong).

### Technical Details

**File: `src/lib/lazyWithRetry.ts`**

Remove the `window.location.reload()` logic and the `sessionStorage` guard. Keep the 3-retry logic with exponential backoff, but after all retries fail, simply throw the error so the `ErrorBoundary` catches it and shows the friendly "Connection hiccup" screen with a manual "Reload" button.

```
// Simplified: retry 3 times with backoff, then throw to ErrorBoundary
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(() => retryImport(factory));
}
```

Remove:
- The `RELOAD_KEY` constant and `sessionStorage` logic
- The `window.addEventListener('load', ...)` cleanup
- The `.catch()` block after `retryImport()` that calls `window.location.reload()`

**File: `src/components/layout/ProtectedRoute.tsx`**

No changes needed -- the auth context already has a 5-second timeout that resolves `loading` to `false`. The spinner will disappear once auth resolves.

This approach is simpler, avoids reload loops entirely, and relies on the already-polished `ErrorBoundary` UI for recovery.

