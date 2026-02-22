

# Fix: Always Load the Latest App Version

## Problem

The app uses a service worker (PWA) that caches all files. When a new version is deployed, the old service worker stays active and serves stale cached files until the user manually closes ALL tabs. This means users often see an old version of the app.

Two things are missing:

1. **`skipWaiting()`** in the service worker -- this tells the new service worker to take over immediately instead of waiting for old tabs to close
2. **`clients.claim()`** -- this makes the new service worker control the current page right away
3. **No update detection in the app** -- the app never checks for a new service worker or reloads when one is found

## Solution

### File 1: `public/custom-sw.js`

Add `skipWaiting()` and `clients.claim()` so the new service worker activates immediately:

```js
// At the top, after imports:
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
```

### File 2: `src/main.tsx`

Register the service worker with update detection. When a new version is found, automatically reload the page so the user always gets the latest code:

```tsx
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    // New version available -- update immediately
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[SW] App ready for offline use');
  },
});
```

This calls `updateSW(true)` which tells the waiting service worker to activate and then reloads the page automatically.

## Summary

| # | File | Change |
|---|------|--------|
| 1 | `public/custom-sw.js` | Add `skipWaiting()` on install + `clients.claim()` on activate |
| 2 | `src/main.tsx` | Add `registerSW` with auto-refresh on new version |

No database changes. No new dependencies (registerSW comes from vite-plugin-pwa which is already installed).

## How it works after the fix

1. User opens the app -- service worker is registered
2. A new version is deployed -- browser detects the new service worker in the background
3. New SW calls `skipWaiting()` to activate immediately
4. `onNeedRefresh()` fires in the app, which triggers an automatic reload
5. User always sees the latest version
