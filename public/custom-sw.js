// Tombstone service worker. PWA was removed; this file exists only so
// browsers that previously installed the old Workbox SW pick up an
// update, run the cleanup below once, and end with no SW registered.
// Hostinger serves this file with `Cache-Control: no-cache` (.htaccess)
// so the browser's normal SW update check always sees this version.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // claim() + includeUncontrolled ensures we reach tabs that were
    // previously bound to the old worker.
    try { await self.clients.claim(); } catch (_) {}

    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (_) {}

    try {
      const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const tab of tabs) {
        try { tab.navigate(tab.url); } catch (_) {}
      }
    } catch (_) {}

    try { await self.registration.unregister(); } catch (_) {}
  })());
});

self.addEventListener('fetch', () => { /* pass-through */ });
