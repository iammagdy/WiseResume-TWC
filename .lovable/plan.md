
# Full Mobile Audit — Findings & Fix Plan

## What Was Audited

Every layer of the mobile stack was read in full:
- `capacitor.config.ts`, `index.html`, `manifest.json`, `custom-sw.js`
- `AppShell`, `BottomTabBar`, `MobileLayout`, `ProtectedRoute`, `AppRoutes`
- `useBackButton`, `useAppLifecycle`, `useKeyboardAwareScroll`, `useStatusBar`, `useDeepLinking`
- `AuthPage`, `OnboardingPage`, `DashboardPage`, `InterviewPage`, `EditorPage`
- `navigation.ts`, `haptics.ts`, `tailwind.config.ts`

---

## What Is Already Done Well

- `h-[100dvh]` layout prevents iOS address-bar resize jank
- `WebkitOverflowScrolling: touch` + `overscrollBehavior: contain` on scroll containers
- `Capacitor.isNativePlatform()` guard on all native-only APIs
- `useBackButton` with explicit `BACK_ROUTES` map (no unreliable `history.length`)
- `useAppLifecycle` flushes pending saves on background via both `visibilitychange` (PWA) and `appStateChange` (Capacitor)
- `useKeyboardAwareScroll` sets `--keyboard-height` CSS var and toggles `keyboard-open` class
- Biometric lock with OS-screenshot curtain on app background
- Haptics on every tab press, confirmation, and destructive action
- `active:scale-95` on all interactive elements
- `touch-manipulation` on all buttons
- `pt-safe` / `pb-safe` safe-area utilities on headers and footers
- PWA manifest with maskable icons, portrait lock, standalone display
- Service worker with Workbox precaching, font cache, API network-first, and push notification handler
- 44px+ touch targets on critical interactive elements
- `useShakeDetect` for shake-to-bug-report
- `useStatusBarThemeSync` updating `meta[name=theme-color]`
- `useDeepLinking` for Capacitor URL deep links
- `useUnsavedChangesGuard` intercepting navigation and back button before losing data
- Biometric setup sheet, timeout settings, and lock screen

---

## Issues Found (Ordered by Severity)

### 1. CRITICAL — `useAppLifecycle` is Defined But Never Called in `AppRoutes`

`useAppLifecycle` exists and is well-written, but **it is not registered anywhere globally**. `AppRoutes` runs `useBackButton`, `useStatusBarThemeSync`, `useDeepLinking`, `useShakeDetect` — but **not** `useAppLifecycle`. This means:
- App backgrounding does NOT flush pending saves on the global level
- Only the Editor page uses it locally — all other pages that auto-save (cover letters, portfolio) have no lifecycle flush

**Fix:** Call `useAppLifecycle` in `AppRoutes` with a global `onBackground` handler that dispatches a custom `app:save-draft` event, and have the editor listen to that event as a fallback.

### 2. HIGH — `haptics.ts` Uses Web Vibration API Only — Capacitor Haptics Not Wired

The current `haptics.ts` uses `navigator.vibrate()` which:
- Works on Android Chrome, but is **completely blocked on iOS Safari** (Apple does not support the Vibration API)
- Does not use Capacitor's `@capacitor/haptics` plugin which gives proper native UIImpactFeedbackGenerator on iOS and HapticFeedback on Android

The `@capgo/capacitor-native-biometric` package is already in `package.json`. The project has `@capacitor/core` v8. `@capacitor/haptics` should be added and the `haptics.ts` file updated to use it with a web fallback.

**Fix:** Upgrade `haptics.ts` to try `Capacitor.isNativePlatform()` → `Haptics.impact()` / `Haptics.notification()` → fallback to `navigator.vibrate()`.

### 3. HIGH — Status Bar Plugin Not Actually Controlling Native Status Bar

`useStatusBar.ts` only updates the HTML `meta[name=theme-color]` tag. On iOS and Android native builds, the actual status bar background and icon color (dark/light text) is controlled by `@capacitor/status-bar`. Without it:
- Status bar text stays default (often white-on-white or black-on-black depending on OS)
- iOS dark mode does not get corrected status bar tint
- The comment on line 19 of `useStatusBar.ts` acknowledges this gap: `"For native apps, we'd use @capacitor/status-bar here"`

**Fix:** Install `@capacitor/status-bar` and call `StatusBar.setStyle()` + `StatusBar.setBackgroundColor()` inside `useStatusBarThemeSync`, guarded by `Capacitor.isNativePlatform()`.

### 4. HIGH — `manifest.json` Missing `share_target`, `id` Field, and Screenshots

PWA manifest is missing:
- `"id": "/"` field (required by Chrome for consistent PWA identity across installs)
- `screenshots` array is empty — app stores and Chrome install UX require at least 1 screenshot to show "Add to Home Screen" with a rich preview
- No `share_target` declaration (app cannot receive shared content from the OS share sheet)
- `"lang": "en"` is missing (best practice for PWA)

**Fix:** Add `"id"`, `"lang"`, at least a placeholder `screenshots` entry with dimensions, and optionally `share_target`.

### 5. MEDIUM — `useBackButton` Missing `onboarding` Route in Exit Logic

`EXIT_ROUTES = ['/', '/dashboard']` — but the Onboarding page (`/onboarding`) is a modal-like first-run screen. If a user on `/onboarding` presses Android back, it navigates to `/dashboard` per `BACK_ROUTES`. That's correct. **But** if the user reaches onboarding immediately after sign-up and there are no resumes, going to `/dashboard` shows an empty state. The issue is that `/onboarding` is not guarded — any authenticated user who hasn't completed onboarding can still go to Dashboard by pressing back during onboarding step 1. This should trigger an exit confirmation, not a back navigation.

**Fix:** In `BACK_ROUTES`, keep `/onboarding` → `/dashboard` but add a check in `handleTabPress` on BottomTabBar that if the user is on onboarding, don't allow navigation away (or mark onboarding as skipped first).

### 6. MEDIUM — `index.html` Missing iOS PWA Meta Tags for Full-Screen Experience

Current `index.html` has `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style`, but is missing:
- `apple-mobile-web-app-title` (app name shown under icon on iOS home screen — currently inherits page `<title>` which is long: "Wise Resume - AI Resume Editor")
- `apple-touch-startup-image` (iOS splash screen for PWA — without it, PWA shows white flash on launch)
- `<meta name="mobile-web-app-capable">` is present, but the Apple-specific one needs `content="yes"` — currently correct

**Fix:** Add `apple-mobile-web-app-title` with short name "Wise Resume" and startup image meta tags for common iOS screen sizes.

### 7. MEDIUM — No Splash Screen Hide Logic for Capacitor Native Build

`capacitor.config.ts` sets `launchShowDuration: 3000` and `launchAutoHide: false` — meaning the splash screen stays visible for 3 full seconds then never auto-hides. The code dispatches `app:auth-ready` in `AuthContext` (line 43), but **nothing listens to that event to hide the splash screen**. This means:
- On native, the app sits on the splash for 3 seconds even if auth resolves in 0.3s
- After auth resolves, there's no call to `SplashScreen.hide()`

**Fix:** Import and call `SplashScreen.hide()` from `@capacitor/splash-screen` when `app:auth-ready` fires (or directly in `AuthContext` after auth resolves).

### 8. LOW — `useDeepLinking` Has a Fragile URL Parse

```typescript
const slug = event.url.split('.app').pop();
```
This splits on `.app` which only works for URLs ending in `.app` (like `wiseresume.app/dashboard`). If the deep link URL uses a custom scheme like `com.wiseresume.app://dashboard` or the domain changes, the slug will be wrong. It should parse the URL properly.

**Fix:** Use `new URL(event.url).pathname` instead of the `.app` string split.

### 9. LOW — `AppShell` Missing `useAppLifecycle` and `useKeyboardAwareScroll`

`AppShell` is the top-level shell for all protected routes but does not call `useKeyboardAwareScroll` (only `MobileLayout` does). Since most pages use `AppShell` (not `MobileLayout`), the keyboard CSS variable and `keyboard-open` class are only set when a `MobileLayout` child is rendered. Most pages go through `AppShell` directly.

**Fix:** Move `useKeyboardAwareScroll` call into `AppShell` (or into `AppRoutes`) so it's globally active.

### 10. LOW — `BottomTabBar` Has a Navigation Gap for `/resignation-letter` Sub-Routes

`TAB_ROUTES` in `AppShell.tsx` includes `/resignation-letter` but the bottom tab bar tabs array has no match for it — so the bottom nav shows but no tab is highlighted as active. Same issue for `/cover-letter`, `/career`, `/guides`, `/examples`, `/templates`, `/notifications`, `/profile`. These routes show the nav bar but appear "tabless."

This isn't a crash, but it's visually confusing — the user can't tell where they are in the app hierarchy.

**Fix:** This is acceptable UX (sub-routes are secondary) but the `Activity` tab should `matchPaths` these secondary routes so at minimum the user sees a parent context: `/applications` tab could match `/job`, `/application`; the `Home` tab could match the rest.

---

## Files to Change

| File | Change |
|---|---|
| `src/lib/haptics.ts` | Add Capacitor Haptics with web fallback |
| `src/hooks/useStatusBar.ts` | Add `@capacitor/status-bar` native control |
| `src/App.tsx` | Call `useAppLifecycle` globally in `AppRoutes` |
| `src/components/layout/AppShell.tsx` | Add `useKeyboardAwareScroll` globally |
| `src/hooks/useDeepLinking.ts` | Fix URL parsing with `new URL()` |
| `src/contexts/AuthContext.tsx` | Call `SplashScreen.hide()` after auth resolves |
| `public/manifest.json` | Add `id`, `lang`, `screenshots`, `short_name` fix |
| `index.html` | Add `apple-mobile-web-app-title` and startup meta |
| `src/components/layout/BottomTabBar.tsx` | Extend `matchPaths` for Activity tab secondary routes |

### Package to install
- `@capacitor/haptics` (native haptic engine for iOS + Android)
- `@capacitor/status-bar` (native status bar color and style control)
- `@capacitor/splash-screen` (programmatic splash screen hide)

---

## What Does NOT Need Changing

- `useBackButton` — correct and robust
- `useAppLifecycle` logic itself — just needs to be wired globally
- `useKeyboardAwareScroll` logic — just needs to be at AppShell level
- `useUnsavedChangesGuard` — well implemented
- The PWA service worker — solid Workbox setup with correct push handling
- Auth flow — session expiry, guest migration, social auth all correct
- Onboarding flow — safe areas, animations, touch targets all correct
- `AppShell` scroll architecture — correct Android WebView scroll pattern
- Biometric lock — security curtain and lock screen fully implemented
