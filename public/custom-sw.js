import { precacheAndRoute } from 'workbox-precaching';

// Activate new service worker immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
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
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Workbox precaching injection point
precacheAndRoute(self.__WB_MANIFEST);

// Always fetch latest HTML for page navigations (network-first)
// Falls back to cache only when offline
const navigationHandler = new NetworkFirst({
  cacheName: 'navigation-cache',
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});
registerRoute(new NavigationRoute(navigationHandler));

// Runtime caching for Google Fonts
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase edge functions – always network
registerRoute(
  /^https:\/\/.*\.supabase\.co\/functions\/.*/i,
  new NetworkOnly()
);

// Supabase REST API – network first with short cache
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Push Notification Handlers ───

self.addEventListener('push', (event) => {
  let data = {
    title: 'WiseResume',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    url: '/',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        url: payload.url || data.url,
      };
    }
  } catch (e) {
    try {
      if (event.data) data.body = event.data.text();
    } catch (_) {}
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: 'app-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url },
  };

  event.waitUntil(
    (async () => {
      try {
        await self.registration.showNotification(data.title, options);
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        windowClients.forEach((client) => {
          client.postMessage({ type: 'PUSH_RECEIVED', payload: data });
        });
      } catch (err) {
        console.error('[SW] Failed to display notification:', err);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
