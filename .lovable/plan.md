

# Fix Auth Issues for Mobile APK and Custom Domain

## Issues Identified

1. **Settings page password reset uses wrong redirect URL** -- `SettingsPage.tsx` line 230 redirects to `/reset-password` which is not a valid route. The app handles password resets at `/auth?reset=true`.

2. **Email signup redirect points to `/dashboard` without token processing** -- When users click the email verification link, the `emailRedirectTo` sends them to `/dashboard` which won't exchange the auth token from the URL. It should go through `/auth/callback` instead.

3. **Deep link custom scheme handling** -- The `com.wiseresume.app://auth/callback` scheme in the APK intent filter needs the deep link handler to correctly parse the path. `new URL('com.wiseresume.app://auth/callback')` produces `pathname: '/callback'` (missing `/auth` prefix), which would fail to route to the callback page.

4. **Redirect URLs not configured in backend** -- The following must be added to the authentication redirect allowlist:
   - `https://localhost/auth/callback`
   - `com.wiseresume.app://auth/callback`
   - `https://wiseresume.magdysaber.com/auth/callback`

## Fixes

### 1. Fix SettingsPage password reset redirect
**File:** `src/pages/SettingsPage.tsx`
- Change `redirectTo: \`\${window.location.origin}/reset-password\`` to `redirectTo: \`\${window.location.origin}/auth?reset=true\``

### 2. Fix email signup redirect
**File:** `src/pages/AuthPage.tsx`
- Change `emailRedirectTo: \`\${window.location.origin}/dashboard\`` to `emailRedirectTo: \`\${window.location.origin}/auth/callback\``
- This ensures the verification token in the URL is properly exchanged for a session before redirecting to dashboard.

### 3. Fix deep link custom scheme parsing
**File:** `src/hooks/useDeepLinking.ts`
- Add a fallback for custom-scheme URLs where `new URL()` may produce an unexpected pathname.
- If the URL starts with `com.wiseresume.app://`, manually extract the path as `/auth/callback` + query/hash rather than relying on URL parser output.

### 4. Configure redirect URLs (manual step)
You will need to add these redirect URLs in the authentication settings:
- `https://wiseresume.magdysaber.com/auth/callback`
- `https://localhost/auth/callback`
- `com.wiseresume.app://auth/callback`

## Files Modified

| File | Change |
|---|---|
| `src/pages/SettingsPage.tsx` | Fix password reset redirect URL |
| `src/pages/AuthPage.tsx` | Fix email verification redirect URL |
| `src/hooks/useDeepLinking.ts` | Handle custom scheme deep links correctly |

## No Database Changes Required

