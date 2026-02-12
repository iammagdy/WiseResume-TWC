

# Fix Stale Chunk Import Errors

## Problem

After code deployments, the browser's service worker or cache may still reference old JavaScript chunk filenames (e.g., `HowItWorks-Br6zRkRb.js`). When these chunks are requested, they return 404 errors, causing the app to crash and show the "Something went wrong" error screen.

Two gaps exist:

1. **Landing page lazy imports bypass the retry logic** -- `src/pages/Index.tsx` uses raw `lazy()` instead of `lazyWithRetry()`, so stale chunk failures on the landing page are not retried or recovered.

2. **ErrorBoundary "Try Again" doesn't reload** -- The "Try Again" button resets React state but re-attempts the same stale import URL, which fails again immediately. For chunk loading errors specifically, a full page reload is needed to fetch the updated manifest.

## Changes

### 1. `src/components/ErrorBoundary.tsx`
- Detect chunk loading errors in `handleRetry` (check if error message contains "dynamically imported module" or "Failed to fetch")
- When a chunk error is detected, call `window.location.reload()` instead of just resetting state
- This busts the stale cache and fetches the new asset manifest

### 2. `src/pages/Index.tsx`
- Replace all `lazy()` calls with `lazyWithRetry()` (imported from or duplicated from `App.tsx`)
- This adds automatic retry + reload behavior for all landing page lazy-loaded sections (SocialProofBar, WhyWiseResume, HowItWorks, FeatureGrid, TemplateGallery, BottomCTA)

### 3. `src/lib/lazyWithRetry.ts` (new file)
- Extract the `lazyWithRetry` utility from `App.tsx` into its own shared module so both `App.tsx` and `Index.tsx` (and any future lazy imports) can reuse it
- Update `App.tsx` to import from this new shared module instead of defining it inline

## Technical Details

The chunk error detection in ErrorBoundary:

```typescript
private handleRetry = () => {
  const isChunkError = this.state.error?.message &&
    (this.state.error.message.includes('dynamically imported module') ||
     this.state.error.message.includes('Failed to fetch') ||
     this.state.error.message.includes('Loading chunk'));

  if (isChunkError) {
    window.location.reload();
    return;
  }

  this.props.onReset?.();
  this.setState({ hasError: false, error: null, errorInfo: null });
};
```

This is a targeted fix -- chunk errors trigger a reload, while other errors continue with the existing reset behavior.

