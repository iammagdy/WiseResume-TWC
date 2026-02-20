

# Capacitor Deep Link Configuration for OAuth on Native APK

## Problem

When a user signs in with Google or Apple on the native APK, the OAuth provider redirects back to `https://hjnnamwgztlhzkeuufln.supabase.co/auth/v1/callback`, which then redirects to `{origin}/auth/callback`. On native Capacitor builds, the WebView origin is `http://localhost` -- but there is no Android App Link or intent filter configured to intercept that redirect and route it back into the app. The result: the browser opens outside the app, or the redirect silently fails.

Additionally, the `AuthCallbackPage` currently only calls `getSession()` which won't work if the tokens arrive as URL hash fragments from the OAuth redirect -- it needs to also handle `exchangeCodeForSession` for PKCE flows.

## Changes

### 1. Update `capacitor.config.ts` -- Add App URL scheme

Add a `server` configuration so Capacitor knows the app's localhost origin, and add the `appUrlScheme` for custom deep links:

```typescript
const config: CapacitorConfig = {
  appId: 'com.wiseresume.app',
  appName: 'Wise Resume',
  webDir: 'dist',
  android: {
    // existing config...
  },
  // Add server config for deep link handling
  server: {
    androidScheme: 'https',  // Use https scheme instead of http for localhost
  },
  // existing plugins...
};
```

Setting `androidScheme: 'https'` ensures the WebView uses `https://localhost` as its origin, which is important for OAuth redirect URL matching and cookie handling.

### 2. Update GitHub Actions to inject Android intent filters

Add a step in `.github/workflows/build-apk.yml` (after `cap sync`) to patch the generated `AndroidManifest.xml` with intent filters so the app can intercept OAuth callback redirects:

- Add an intent filter for `https://localhost/auth/callback` 
- Add an intent filter for `com.wiseresume.app://auth/callback` (custom scheme fallback)

This is done by injecting XML into the `<activity>` block of the generated manifest.

### 3. Harden `AuthCallbackPage` for native OAuth

Update `src/pages/AuthCallbackPage.tsx` to handle both scenarios:
- **Hash fragment tokens**: Extract `access_token` and `refresh_token` from the URL hash and call `setSession()`
- **PKCE code exchange**: Extract `code` from query params and call `exchangeCodeForSession()`
- **Existing session**: Fall back to `getSession()` if tokens are already set

### 4. Update `useDeepLinking` to handle OAuth redirects

Update `src/hooks/useDeepLinking.ts` to specifically detect `/auth/callback` deep links and ensure the hash/query parameters are preserved when navigating, since these contain the OAuth tokens.

### 5. Update `socialAuth.ts` redirect URL for native

Update `src/lib/socialAuth.ts` to use the correct redirect URL based on platform:
- On native (Capacitor): use `https://localhost/auth/callback`
- On web (non-Lovable): use `${window.location.origin}/auth/callback`

This ensures the backend redirect URL matches what is configured in the intent filters.

## Files Modified

| File | Changes |
|---|---|
| `capacitor.config.ts` | Add `androidScheme: 'https'` in server config |
| `.github/workflows/build-apk.yml` | Add step to inject intent filters into AndroidManifest.xml |
| `src/pages/AuthCallbackPage.tsx` | Handle hash tokens, PKCE code exchange, and fallback |
| `src/hooks/useDeepLinking.ts` | Preserve hash/query on `/auth/callback` deep links |
| `src/lib/socialAuth.ts` | Use platform-aware redirect URL for native builds |

## Backend Configuration Required

You will also need to add these redirect URLs to your authentication settings (allowed redirect URLs):
- `https://localhost/auth/callback`
- `com.wiseresume.app://auth/callback`

This ensures the auth system accepts redirects back to the native app.

