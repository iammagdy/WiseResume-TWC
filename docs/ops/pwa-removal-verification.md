# PWA Removal — Returning-Visitor Recovery Verification

The tombstone service worker in `public/custom-sw.js` is supposed to:

1. Install + `skipWaiting` (replaces the old Workbox SW).
2. On `activate`: claim all clients (including uncontrolled tabs), delete every
   Cache Storage entry, navigate every open tab to its current URL (which forces
   a reload against the network), then call `registration.unregister()`.
3. On the *next* page load there should be **no** service worker registered and
   no caches.

Browser SW behaviour varies (Chrome vs Safari, desktop vs mobile, regular tab
vs installed home-screen PWA). This doc records that it actually works on each
real browser after the next Hostinger upload of `dist/` (the one shipping
v3.5+ + the updated `custom-sw.js` + the updated `.htaccess`).

If any row fails, ship the **Manual fallback for stuck users** snippet at the
bottom of this file to the affected user.

---

## How to run one row

Pre-conditions for an honest test:

- The browser already has the **OLD** Workbox SW installed from a previous v3.4
  visit. Verify in DevTools → Application → Service Workers **before** doing
  anything. If there's no old SW, this row tells you nothing — find a device
  that actually has it, or re-install v3.4 first.
- Note the version currently displayed in the app (should be v3.4.x).

Steps:

1. Open the live site in the target browser (regular navigation, not a hard
   reload — we're simulating a normal returning visitor).
2. Watch DevTools → Application → Service Workers. Expected:
   - The old SW goes to "redundant".
   - `custom-sw.js` appears, becomes "activated".
3. Watch DevTools → Application → Cache Storage. Expected: all entries
   disappear.
4. The page should auto-reload exactly once (the tombstone's `tab.navigate`).
5. After the reload, the app version banner should read **v3.5+**.
6. Reload the tab manually one more time. Expected: DevTools → Application →
   Service Workers shows **no** registration; Cache Storage is empty.

Record the result in the matrix below. "Pass" = all six expectations met.

---

## Verification matrix

Fill this in after the next Hostinger upload. Use one row per real device.

| Date (UTC) | Browser            | Device / OS         | Old SW present before? | SW replaced? | Caches wiped? | Auto-reload to v3.5+? | No SW after 2nd reload? | Result | Notes |
|------------|--------------------|---------------------|------------------------|--------------|---------------|------------------------|--------------------------|--------|-------|
|            | Chrome (latest)    | Desktop / macOS     |                        |              |               |                        |                          |        |       |
|            | Chrome (latest)    | Desktop / Windows   |                        |              |               |                        |                          |        |       |
|            | Safari (latest)    | Desktop / macOS     |                        |              |               |                        |                          |        |       |
|            | Chrome (latest)    | Android phone       |                        |              |               |                        |                          |        |       |
|            | Safari (latest)    | iOS phone           |                        |              |               |                        |                          |        |       |
|            | Installed home-screen PWA shortcut | (note OS + how it was installed) |  |              |               |                        |                          |        |       |

Add extra rows for any other browser / device a real user reports being on.

---

## Known gotchas while testing

- **Safari (desktop and iOS)** only checks for SW updates on navigation, not on
  reload. If nothing happens after a plain reload, close the tab and reopen the
  URL fresh.
- **iOS Safari** caps Cache Storage and SW lifetime aggressively; if the old SW
  is already gone before you start, that's normal — that row is moot.
- **Installed home-screen PWA**: the install is just a shortcut into the same
  origin, so the same SW lifecycle applies. But on iOS the standalone window
  may not surface DevTools — verify by also opening the URL in regular Safari
  on the same device and checking there.
- **Chrome DevTools "Update on reload"** must be **off** for an honest test —
  with it on, Chrome bypasses the normal update path and the result doesn't
  represent a real returning visitor.

---

## Manual fallback for stuck users

Ship this verbatim to anyone whose browser failed the matrix above (or who
reports still seeing v3.4 after the deploy). `ErrorBoundary.tsx` already
exposes a "Clear site data" button via `clearSiteData`, so the first thing to
try is just clicking that — these are the manual steps for when the user can't
even get the app to render.

### Chrome / Edge (desktop)

1. Open the site.
2. Press `F12` (or `Cmd+Opt+I` on macOS) to open DevTools.
3. Go to the **Application** tab.
4. In the left sidebar click **Storage**.
5. Click **Clear site data** (leave all checkboxes ticked).
6. Close the tab, reopen the site.

### Safari (desktop, macOS)

1. Safari menu → **Settings** → **Advanced** → tick *Show Develop menu in menu bar*.
2. **Develop** menu → **Empty Caches**.
3. Safari menu → **Settings** → **Privacy** → **Manage Website Data…** →
   search for the site → **Remove**.
4. Quit Safari (`Cmd+Q`), reopen, visit the site.

### Chrome (Android)

1. Open the site.
2. Tap the `⋮` menu → **Settings** → **Site settings** → **All sites** →
   tap the site → **Clear & reset**.
3. Reopen the site from a fresh tab.

### Safari (iOS)

1. **Settings** app → **Safari** → **Advanced** → **Website Data** → search for
   the site → swipe left → **Delete**.
2. Reopen the site.

### Installed home-screen PWA shortcut

1. Delete the home-screen icon (long-press → Remove / Uninstall).
2. Follow the matching browser instructions above to clear the site's data.
3. Visit the site fresh from the browser. The PWA is intentionally not coming
   back (see `docs/ops/pwa-removal-verification.md`); use the regular browser
   tab from now on, or re-add a plain bookmark to the home screen.

---

## If a row fails repeatedly

That means the tombstone in `public/custom-sw.js` isn't enough on that
browser. Capture:

- exact browser + OS version,
- DevTools → Application → Service Workers screenshot (status of both old SW
  and `custom-sw.js`),
- DevTools → Console output during the visit,

and open a follow-up so the tombstone can be hardened (e.g. forcing a hard
reload via `Clear-Site-Data` response header on `index.html`, or shipping a
small inline `<script>` in `index.html` that calls
`navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`
unconditionally as a belt-and-braces second line of defence).
