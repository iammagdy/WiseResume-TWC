

## APK / Hybrid Mobile Readiness Audit

### Current State Summary

The app already has strong mobile foundations: Capacitor config, PWA manifest, service worker with workbox, safe-area utilities, keyboard-aware scrolling, back button handling, haptics, offline banner, and a bottom tab bar. The audit below identifies remaining gaps.

---

### MUST-FIX BEFORE APK

#### 1. Service Worker Missing `navigateFallbackDenylist` for OAuth

The `vite-plugin-pwa` config in `vite.config.ts` uses `injectManifest` but does not set a `navigateFallbackDenylist`. The `/~oauth` callback route (used by Lovable Cloud auth) could be cached by the service worker, breaking OAuth login flows.

**File:** `vite.config.ts`
**Fix:** Add `navigateFallbackDenylist: [/^\/~oauth/]` inside the `injectManifest` block, or add a `navigateFallback` + denylist in the workbox config.

---

#### 2. External Links Open in WebView (No In-App Browser)

8+ files use `target="_blank"` on `<a>` tags (LinkedIn, privacy policy, Google AI Studio, job URLs). In a Capacitor WebView, these either fail silently or navigate the entire WebView away from the app, losing state.

**Fix:** Create a helper `openExternal(url)` utility that uses `@capacitor/browser` (or `window.open` with `_system` on native) and replace all `target="_blank"` anchor tags with button+onClick calls to it. For the web fallback, use `window.open(url, '_blank')`.

**Files affected:** `SettingsPage.tsx`, `AISettingsSheet.tsx`, `ApplicationCard.tsx`, `ActivityTimeline.tsx`, `JobDetailPage.tsx`, `LinkedInImportSheet.tsx`, `ApplicationDetailSheet.tsx`, `downloadUtils.ts`

---

#### 3. `body` Has `padding-top: env(safe-area-inset-top)` Globally

In `src/index.css` (line 171), the body applies `padding-top: env(safe-area-inset-top)`. This creates double-padding when combined with `pt-safe` on headers and the `AppShell`. On Android WebViews without notches, this is harmless; on iPhones with notches, headers that already use `pt-safe` get extra spacing.

**Fix:** Remove `padding-top` and `padding-bottom` from the body rule. Let individual layout components (`AppShell`, `MobileLayout`, `BottomTabBar`) handle safe areas via `pt-safe` / `pb-safe`, which they already do.

---

#### 4. Capacitor Config Uses Wrong `appId`

The `capacitor.config.ts` uses `appId: 'com.wiseresume.app'`, but the Lovable-provided ID should be `app.lovable.1d3d9943c1ba4253b6336b1457b9b330`. Additionally, the config lacks the `server.url` for hot-reload during development.

**Fix:** Update `capacitor.config.ts`:
- `appId` to `app.lovable.1d3d9943c1ba4253b6336b1457b9b330`
- `appName` to `wiseresume`
- Add `server.url` pointing to the sandbox preview URL for dev hot-reload

---

#### 5. Landing Page (`/`) Has No Bottom Nav and No Back-to-App Path

The Index route renders outside `AppShell`, so authenticated users who navigate to `/` see no bottom tab bar and no way to return to the dashboard except the CTA button. On Android, the hardware back button calls `App.exitApp()` on `/`.

**Fix:** For authenticated users, auto-redirect from `/` to `/dashboard` (already partially done via the CTA, but should be an immediate redirect in the `Index` component or via `ProtectedRoute` logic).

---

#### 6. No `<meta>` Tag to Prevent Telephone Number Auto-Detection

Some Android WebViews auto-detect phone numbers in text and turn them into links, which can break resume content display.

**Fix:** Add `<meta name="format-detection" content="telephone=no">` to `index.html`.

---

### NICE-TO-HAVE

#### 7. Splash Screen Timing May Show White Flash

The Capacitor splash screen is set to 2000ms with `launchAutoHide: true`, but the React app may take longer to hydrate on older devices. The HTML inline spinner helps, but there is no coordination between splash hide and app-ready.

**Fix:** Set `launchAutoHide: false` in capacitor config, and programmatically call `SplashScreen.hide()` after the auth state resolves (in `AuthContext` or `App.tsx`).

---

#### 8. Toast Notifications Overlap with Status Bar on Some Devices

The toast CSS (line 1110-1115) adds `padding-top: env(safe-area-inset-top)` to the toaster, but the toast position (`top`) combined with safe-area padding may not account for the Android status bar height in WebViews.

**Fix:** Test and adjust by adding a small extra top offset (e.g., 8px) for the toast container on mobile, or position toasts at the bottom on mobile to avoid status bar conflicts entirely.

---

#### 9. No `user-select: none` on Interactive UI Surfaces

Long-press on buttons, tab bar items, and cards can trigger text selection or the WebView's context menu, breaking the native feel. The `.no-select` utility exists but is not applied globally to interactive elements.

**Fix:** Add `-webkit-user-select: none; user-select: none;` to `button`, `[role="tab"]`, `[role="button"]`, and `.touch-manipulation` elements in `index.css`.

---

#### 10. `overscroll-behavior: none` Only on Body

The body has `overscroll-behavior: none` but scrollable containers inside (like the editor scroll area) can still trigger Android's pull-to-refresh or iOS elastic bounce when wrapped in a WebView.

**Fix:** Add `overscroll-behavior: contain` to `.flex-1.overflow-y-auto` containers in `AppShell` and `MobileLayout`.

---

### FUTURE / OPTIONAL

#### 11. Deep Link Handling Not Configured

No Capacitor `appLinks` or Android intent filters are configured. URLs like `wiseresume.lovable.app/share/xyz` won't open the app.

**Fix:** Add `plugins.DeepLinks` config in `capacitor.config.ts` and corresponding Android intent filters.

---

#### 12. No Network-Change Retry for Lazy Chunks

`lazyWithRetry` retries once after 1.5s, but doesn't listen for network restoration. If the user loses connectivity during a chunk load, they may see the error boundary.

**Fix:** In the retry logic, add a `navigator.onLine` check and wait for the `online` event before retrying.

---

#### 13. Haptics Use Web Vibration API Only

The current haptics implementation uses `navigator.vibrate()`, which works on Android but is ignored on iOS. For true native haptics, use `@capacitor/haptics` plugin.

**Fix:** Swap `navigator.vibrate()` calls for `Haptics.impact()` from `@capacitor/haptics` when on a native platform, falling back to `navigator.vibrate()` on web.

---

### Priority Summary

| Priority | Issue | Effort |
|----------|-------|--------|
| Must-fix | SW missing `navigateFallbackDenylist` | Small (1 line) |
| Must-fix | External links break WebView | Medium (utility + 8 files) |
| Must-fix | Double safe-area padding on body | Small (remove 2 lines) |
| Must-fix | Wrong Capacitor `appId` | Small (config update) |
| Must-fix | Landing page traps authenticated users | Small (redirect logic) |
| Must-fix | Missing telephone format-detection meta | Small (1 line) |
| Nice-to-have | Splash screen white flash | Small (config + 1 call) |
| Nice-to-have | Toast overlap with status bar | Small (CSS tweak) |
| Nice-to-have | Missing user-select on interactive elements | Small (CSS addition) |
| Nice-to-have | Overscroll on inner containers | Small (CSS addition) |
| Future | Deep link handling | Medium |
| Future | Network-aware lazy retry | Small |
| Future | Native haptics via Capacitor plugin | Medium |

