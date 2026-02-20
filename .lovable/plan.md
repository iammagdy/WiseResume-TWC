

# Fix: Google and Apple Sign-In Failing on Native APK

## Root Cause

On native APK builds, `Capacitor.isNativePlatform()` is `true`, but the code's branching logic doesn't account for it. Here's what happens:

1. `isLovableDomain` is `false` on APK (hostname is `localhost`, not `lovable.app`)
2. So the code enters the `else` branch and calls `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true`
3. It then does `window.location.href = data.url` -- this navigates the **Capacitor WebView itself** away to Google/Apple
4. After OAuth completes, the provider redirects to `https://localhost/auth/callback`
5. But the WebView has already navigated away from the app -- the redirect either fails silently or opens in an external browser, never returning tokens to the app

The intent filters in the APK manifest are set up for deep links, but deep links only work when an **external** browser redirects back to the app -- not when the WebView itself navigates away.

## Solution

Use `@capacitor/browser` plugin to open the OAuth URL in a **Chrome Custom Tab** (system browser overlay) instead of navigating the WebView. The Custom Tab handles the OAuth flow externally, and when the provider redirects to `https://localhost/auth/callback`, the deep link intent filter catches it and routes back into the app.

### Changes

### 1. Install `@capacitor/browser`
Add `@capacitor/browser` as a dependency. This plugin opens URLs in Chrome Custom Tabs on Android (and SFSafariViewController on iOS), keeping the WebView untouched.

### 2. Update `src/lib/socialAuth.ts`
For native platforms, instead of `window.location.href = data.url`, use `Browser.open({ url: data.url })`. This opens the OAuth flow in a system browser overlay. When Google/Apple redirects back to `https://localhost/auth/callback`, the intent filter intercepts it as a deep link, which fires `appUrlOpen` in the existing `useDeepLinking` hook, navigating to `/auth/callback` where the PKCE code is exchanged.

After `Browser.open()`, also listen for `Browser.addListener('browserFinished')` to handle the case where the user manually closes the browser without completing sign-in (reset the loading state).

### 3. Update `src/hooks/useDeepLinking.ts`
After navigating to the auth callback route on a deep link, call `Browser.close()` to dismiss the Chrome Custom Tab overlay so the user sees the app again.

### 4. Update `.github/workflows/build-apk.yml`
No changes needed -- the existing intent filters for `https://localhost/auth/callback` already handle the redirect correctly.

## Technical Details

```text
Current (broken) flow:
User taps "Sign in with Google"
  -> WebView navigates to accounts.google.com
  -> User authenticates
  -> Google redirects to https://localhost/auth/callback
  -> WebView shows blank/error (localhost doesn't exist as a real server)

Fixed flow:
User taps "Sign in with Google"
  -> Chrome Custom Tab opens accounts.google.com (WebView stays intact)
  -> User authenticates
  -> Google redirects to https://localhost/auth/callback
  -> Android intent filter catches the deep link
  -> appUrlOpen fires, navigates to /auth/callback inside WebView
  -> Chrome Custom Tab is closed
  -> PKCE code exchanged, user lands on /dashboard
```

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `@capacitor/browser` dependency |
| `src/lib/socialAuth.ts` | Use `Browser.open()` on native instead of `window.location.href` |
| `src/hooks/useDeepLinking.ts` | Call `Browser.close()` after auth callback deep links |

## Risk Assessment
- Low risk: `@capacitor/browser` is an official Capacitor plugin, widely used for exactly this OAuth pattern
- The web flow is completely unchanged -- only native platform behavior is modified
- Existing deep linking and auth callback code already handles the PKCE exchange correctly
