

## Fix: Google Sign-In 404 on APK

### Problem

The "Continue with Google" button uses `lovable.auth.signInWithOAuth()` which relies on the Lovable auth-bridge infrastructure. This bridge only works on `*.lovable.app` and `*.lovableproject.com` domains. When running as an APK, the WebView uses a different origin (e.g., `localhost` or `capacitor://`), so the auth-bridge returns a 404.

### Solution

Create an environment-aware Google sign-in helper that:
- On Lovable domains (web preview, published app): uses the existing `lovable.auth.signInWithOAuth()` flow (works perfectly)
- On non-Lovable domains (APK, custom domains): falls back to the direct Supabase `signInWithOAuth()` with `skipBrowserRedirect: true`, then manually redirects the user to the Google OAuth URL

### Changes

| File | Change |
|------|--------|
| `src/lib/socialAuth.ts` | New file -- shared helper `signInWithGoogle()` and `signInWithApple()` that detect the environment and choose the correct auth flow |
| `src/pages/AuthPage.tsx` | Replace inline `handleGoogleSignIn` / `handleAppleSignIn` with calls to the shared helper |
| `src/components/auth/SignInPromptDialog.tsx` | Replace inline `handleGoogle` with a call to the shared helper |

### Technical Details

**`src/lib/socialAuth.ts`** (new file):

```text
1. Detect environment:
   - isLovableDomain = hostname includes "lovable.app" or "lovableproject.com"

2. signInWithGoogle():
   - If isLovableDomain: use lovable.auth.signInWithOAuth("google", { redirect_uri })
   - Else (APK): use supabase.auth.signInWithOAuth({
       provider: "google",
       options: {
         redirectTo: window.location.origin + "/auth/callback",
         skipBrowserRedirect: true
       }
     })
     Then validate the returned URL host is "accounts.google.com"
     and manually redirect via window.location.href = data.url

3. signInWithApple(): same pattern but for Apple provider
```

**`src/pages/AuthPage.tsx`**:
- Import `signInWithGoogle` / `signInWithApple` from the new helper
- Simplify `handleGoogleSignIn` and `handleAppleSignIn` to just call the helper and handle errors

**`src/components/auth/SignInPromptDialog.tsx`**:
- Import `signInWithGoogle` from the new helper
- Replace the inline Google OAuth call

This approach keeps the Lovable auth-bridge working perfectly on web while providing a direct Supabase OAuth fallback for APK environments, eliminating the 404 error.

