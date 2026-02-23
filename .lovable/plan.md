

# Fix: Stale App Version After PWA Update

## Problem
The app keeps loading old versions after deployments. The current `onNeedRefresh` handler calls `updateSW(true)` which activates the new service worker, but the page itself is never reloaded. The old JavaScript bundles remain in memory, so the user sees a stale UI until they manually refresh the browser.

## Solution
Add `window.location.reload()` after the service worker update completes. This ensures the page reloads with the new assets served by the freshly activated service worker.

### File: `src/main.tsx`

Change the `onNeedRefresh` callback to reload the page after activating the new SW:

```typescript
const updateSW = registerSW({
  onNeedRefresh() {
    updateSW(true).then(() => {
      window.location.reload();
    });
  },
  onOfflineReady() {
    console.log('[SW] App ready for offline use');
  },
});
```

`updateSW(true)` returns a Promise that resolves once `skipWaiting` + `clients.claim` have completed. Calling `reload()` after that guarantees the browser fetches all assets through the new service worker.

## Why Previous Behavior Was Broken
- `updateSW(true)` activates the new service worker in the background
- But the page's already-loaded JavaScript bundles (from the old deployment) stay in memory
- The user continues seeing the old UI until a manual page refresh
- This explains why changes "don't stick" -- the code was deployed but never actually loaded

## Risk
- Minimal. The reload happens only when a new service worker version is detected (i.e., after a deployment). Users experience one automatic page refresh per deployment, which is standard PWA behavior.

