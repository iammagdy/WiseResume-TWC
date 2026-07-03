# PWA Removal — Status & Returning-Visitor Recovery

## Final state (Task #15, 2026-04-22)

The app is fully de-PWA'd. No manifest, no service worker, no install prompt.

- `public/manifest.json`, `public/manifest-wisehire.json` — **deleted**
- `public/custom-sw.js` (tombstone) — **deleted**
- `public/icons/` (all PWA icon sizes) — **deleted**
- All PWA HTML meta tags (`<link rel="manifest">`, `theme-color`,
  `apple-mobile-web-app-*`, `mobile-web-app-capable`, splash links) — **removed**
- `InstallPrompt`, `InstallButton` components — **deleted**
- `usePushNotifications` hook — **deleted**
- `PushNotificationSettings` component — **deleted**
- `OfflineIndicator` component — **deleted**

No browser will show an "Install" or "Add to Home Screen" prompt for this origin.

---

## Returning-visitor SW cleanup

Any user who had the old Workbox SW (pre-v3.5.0) installed still gets cleaned up
automatically on their next visit via two mechanisms shipped in Task #22 / Task #5:

1. **Boot-time unregister** (`src/main.tsx`): calls
   `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`
   on every page load (fire-and-forget, guarded). Removes any stale registration
   regardless of its scope or script path.

2. **ErrorBoundary "Clear site data" button**: if the app crashes, the error
   boundary offers a clear-site-data action (`clearSiteData` in `ErrorBoundary.tsx`)
   that explicitly unregisters all SWs and wipes Cache Storage before reloading.

The `public/custom-sw.js` tombstone has been removed (Task #15) since the
boot-time unregister in `main.tsx` is sufficient and the tombstone's coverage
window has long passed.

---

## Manual fallback for stuck users

If a user reports still seeing stale content or SW activity, direct them to
clear site data manually:

### Chrome / Edge (desktop)

1. Open the site.
2. Press `F12` → **Application** tab → **Storage** → **Clear site data**.
3. Close and reopen the site.

### Safari (desktop, macOS)

1. **Develop** menu → **Empty Caches**.
2. **Settings** → **Privacy** → **Manage Website Data…** → remove the site.
3. Quit Safari (`Cmd+Q`), reopen, visit the site.

### Chrome (Android)

1. `⋮` menu → **Settings** → **Site settings** → **All sites** → tap the site → **Clear & reset**.
2. Reopen from a fresh tab.

### Safari (iOS)

1. **Settings** → **Safari** → **Advanced** → **Website Data** → find the site → swipe left → **Delete**.
2. Reopen the site.

> **Note:** The "Clear site data" button inside the app's error boundary
> (`ErrorBoundary.tsx`) does the same thing automatically — suggest that first.
