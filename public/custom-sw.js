// ──────────────────────────────────────────────────────────────────────
// Tombstone service worker
//
// The app is no longer a PWA. This file exists ONLY so that browsers
// which previously installed the old Workbox-based service worker can
// fetch this update, run it once, unregister themselves, wipe every
// cache, and reload all open tabs onto the live (network-served) site.
//
// Path and filename MUST stay `/custom-sw.js` so existing installations
// auto-find it via their normal update check. Hostinger serves this file
// with `Cache-Control: no-cache` (see public/.htaccess) so the update
// check always sees this new contents.
//
// After the unregister + reload, no service worker is registered for
// the origin and the app behaves like a plain SPA — every visit fetches
// the latest deploy directly from Hostinger.
// ──────────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Take control of every tab opened against this origin — including ones
    // that were still bound to the previous (Workbox) service worker — so we
    // can definitely reach them with the reload below. Without claim() +
    // includeUncontrolled, tabs that loaded before this SW took over may
    // never be auto-recovered and stay on stale precached assets.
    try { await self.clients.claim(); } catch (_) {}

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (_) {}

    // Reload every visible tab so it re-fetches index.html (and everything
    // else) directly from the network. Done BEFORE unregister so the
    // navigation request itself is not intercepted by anything stale.
    try {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try { client.navigate(client.url); } catch (_) {}
      }
    } catch (_) {}

    // Finally, retire this worker. The next page load has no SW at all,
    // which is the desired terminal state.
    try { await self.registration.unregister(); } catch (_) {}
  })());
});

self.addEventListener('fetch', () => {
  // Pass through to network. No interception, no cache.
});
