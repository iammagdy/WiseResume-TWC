

# Always Load the Latest App Version

## Problem
When a user visits the app (especially when not logged in), the service worker can serve a stale cached version of the HTML shell from a previous deployment. This happens because `precacheAndRoute` intercepts navigation requests and serves the old cached `index.html` before the new service worker has a chance to activate and take over.

## Root Cause
The `precacheAndRoute(self.__WB_MANIFEST)` in `custom-sw.js` caches all assets including the HTML document. For navigation requests (page loads), the old service worker serves the cached HTML immediately. Even though `skipWaiting` + `clients.claim` + auto-update are configured, there's a race condition: the stale page loads first, then the new SW activates in the background.

There is no explicit `NetworkFirst` route for navigation requests, so the precache always wins.

## Solution
Two changes to ensure users always get the latest version:

### 1. Add NetworkFirst strategy for navigation requests (custom-sw.js)
Add a `NavigationRoute` with `NetworkFirst` strategy **after** `precacheAndRoute`. This ensures:
- The app always tries to fetch the latest HTML from the network first
- Falls back to cache only if offline (so the app still works offline)
- JS/CSS assets remain precached (they have hashed filenames so staleness isn't an issue)

### 2. Clean up old caches on activation (custom-sw.js)
Add cache cleanup in the `activate` handler to delete any stale precache entries from previous service worker versions, preventing old assets from lingering.

## Technical Details

**File: `public/custom-sw.js`**

Add import for `NavigationRoute`:
```js
import { registerRoute, NavigationRoute } from 'workbox-routing';
```

Add after `precacheAndRoute(self.__WB_MANIFEST)`:
```js
// Always fetch latest HTML for page navigations (network-first)
// Falls back to cache only when offline
const navigationHandler = new NetworkFirst({
  cacheName: 'navigation-cache',
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});
registerRoute(new NavigationRoute(navigationHandler));
```

Add old-cache cleanup in the `activate` handler:
```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Purge any old non-workbox caches
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => !k.startsWith('workbox-') && !k.startsWith('google-fonts') && !k.startsWith('gstatic-fonts') && !k.startsWith('supabase-api') && !k.startsWith('navigation-cache'))
            .map(k => caches.delete(k))
        )
      ),
    ])
  );
});
```

These two additions ensure every page load attempts to fetch the latest HTML from the server, eliminating stale landing pages.

