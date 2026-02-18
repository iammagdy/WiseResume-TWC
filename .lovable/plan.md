
# APK Build Failure — Root Causes & Fixes

## What's Broken and Why

Three distinct issues are causing the GitHub Actions APK build to fail or produce a broken output. They are all in the workflow YAML and `capacitor.config.ts`.

---

## Issue 1 (Critical) — Java is set up AFTER Android is added

**File:** `.github/workflows/build-apk.yml`

**Problem:** The workflow steps are in this order:
1. `Add Android platform` (`npx cap add android`)
2. `Sync Capacitor` (`npx cap sync android`)
3. **Then** `Setup Java 21`
4. `Build APK` (Gradle)

On GitHub Actions' `ubuntu-latest`, `npx cap add android` itself generates Android Gradle wrapper files. If Java is not configured before this step, Gradle bootstrapping can fail or pick up the wrong JVM. The `Build APK` step then fails because Gradle detects a Java version mismatch.

**Fix:** Move `Setup Java 21` to be the **first** step (right after `Install dependencies`, before anything Capacitor-related).

---

## Issue 2 (Critical) — `urlSchemes` is not a valid `CapacitorConfig` top-level property

**File:** `capacitor.config.ts` line 5

**Problem:** `CapacitorConfig` (from `@capacitor/cli`) does not have a `urlSchemes` top-level property. The URL scheme for deep linking on Android is configured in `strings.xml` (an Android resource file), not in `capacitor.config.ts`. When `npx cap add android` processes this config file, it may throw a TypeScript compile error or simply ignore the property — but in Capacitor 8, strict mode config validation can cause the `cap add` step to fail entirely.

The correct approach: remove `urlSchemes` from `capacitor.config.ts` and instead inject it via the GitHub Actions workflow by patching `strings.xml` (similar to how the icons are already injected), or simply remove it since Capacitor handles the custom scheme via the `appId` as default.

**Fix:** Remove `urlSchemes: ['wiseresume']` from `capacitor.config.ts`.

---

## Issue 3 (Medium) — PWA `workbox.navigateFallbackDenylist` is silently ignored

**File:** `vite.config.ts` lines 33–35

**Problem:** When using `strategies: "injectManifest"`, the `workbox` config key at the top level of `VitePWA()` is **ignored**. The `navigateFallbackDenylist` (which prevents `/~oauth` from being intercepted by the service worker) must be specified inside `injectManifest`, not in `workbox`. This is a known vite-plugin-pwa behavior difference between `generateSW` and `injectManifest` strategies.

This causes the service worker to intercept OAuth redirects, producing the `SecurityError` visible in the console logs. It doesn't break the APK build directly but produces a broken PWA output that is bundled into the APK.

**Fix:** Move `navigateFallbackDenylist` from the `workbox` key to inside the `injectManifest` key, and remove the now-empty `workbox` block. Since `injectManifest` mode uses the custom `public/custom-sw.js` directly, the correct place for this exclusion is actually in `custom-sw.js` itself — but the build-time manifest injection won't intercept it anyway. The proper minimal fix is to remove the `workbox` block entirely (it has no effect in `injectManifest` mode) and add the deny rule inside `injectManifest`:

```ts
injectManifest: {
  globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  dontCacheBustURLsMatching: /~oauth/,
},
```

---

## Exact Changes

### Change 1 — `capacitor.config.ts`: Remove invalid `urlSchemes`

**Lines 4–6** (current):
```ts
appId: 'com.wiseresume.app',
urlSchemes: ['wiseresume'], // Custom URL scheme for deep linking
appName: 'Wise Resume',
```

**After fix:**
```ts
appId: 'com.wiseresume.app',
appName: 'Wise Resume',
```

The deep linking via the `wiseresume://` scheme is handled natively by Capacitor's app ID and the `useDeepLinking` hook — no config change needed in `capacitor.config.ts`.

---

### Change 2 — `.github/workflows/build-apk.yml`: Move Java setup before Capacitor

**Current order (lines 14–66):**
1. Setup Node.js
2. Install dependencies
3. Build web app
4. Add Android platform ← Capacitor
5. Sync Capacitor ← Capacitor
6. Inject custom icons
7. **Setup Java 21** ← Too late!
8. Build APK

**Fixed order:**
1. Setup Node.js
2. **Setup Java 21** ← Moved to here
3. Install dependencies
4. Build web app
5. Add Android platform
6. Sync Capacitor
7. Inject custom icons
8. Build APK

Also add `VITE_SUPABASE_PROJECT_ID` to the build env vars to fully match the expected env shape, and add a Gradle cache step to speed up subsequent builds.

---

### Change 3 — `vite.config.ts`: Remove no-op `workbox` block

Remove the `workbox: { navigateFallbackDenylist: [/^\/~oauth/] }` block since it has no effect in `injectManifest` mode. The service worker file (`public/custom-sw.js`) already handles routing directly — there is no `navigateFallback` registered there, so the denylist entry was never being applied anyway.

---

## Summary Table

| # | File | Change | Impact |
|---|---|---|---|
| 1 | `capacitor.config.ts` | Remove `urlSchemes` (not a valid `CapacitorConfig` key) | Fixes `npx cap add android` TypeScript validation failure |
| 2 | `.github/workflows/build-apk.yml` | Move `Setup Java 21` before Capacitor steps, add Gradle cache | Fixes Gradle JVM mismatch on `ubuntu-latest` |
| 3 | `vite.config.ts` | Remove no-op `workbox` block in `injectManifest` mode | Fixes PWA service worker console `SecurityError` |

No TypeScript files, hooks, or database code need to change. All three fixes are localized to config and CI files only.
