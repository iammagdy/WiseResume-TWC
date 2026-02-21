

# Add Passwordless Login with Email Magic Links

## Overview

Add a "Sign in with email link" option to the login form, allowing users to receive a magic link via email and sign in without entering a password. This integrates with the existing authentication system using the built-in `signInWithOtp` method.

## Changes

### 1. Update `AuthMode` Type
**File:** `src/pages/AuthPage.tsx`

Add `'magic-link'` to the `AuthMode` union type:
```typescript
type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'magic-link';
```

### 2. Add Magic Link Handler
**File:** `src/pages/AuthPage.tsx`

Add a new handler function `handleMagicLink` that:
- Validates the email with the existing Zod schema
- Calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
- Wraps in `withNetworkRetry` for resilience
- Logs `logAudit('auth', 'magic_link_requested', { method: 'magic_link' })`
- Shows a toast: "Check your email for the sign-in link!"
- Switches view back to login mode after success

### 3. Create `MagicLinkForm` Component
**File:** `src/components/auth/MagicLinkForm.tsx` (new)

A simple form containing:
- Email input field (reuses `InputFormField`)
- "Send Magic Link" submit button with loading state
- "Back to Sign In" link
- Slow-connection warning (same pattern as other forms)

Props:
```typescript
interface MagicLinkFormProps {
  onSubmit: (email: string) => Promise<void>;
  onBackToLogin: () => void;
  isLoading: boolean;
  isSlowConnection: boolean;
}
```

### 4. Add Magic Link Toggle to Login Form
**File:** `src/components/auth/LoginForm.tsx`

Add a new prop `onMagicLink: () => void` and render a button below the "Forgot password?" link:
```
Sign in with email link (no password needed)
```
Styled as a subtle text button matching the existing "Forgot password?" style.

### 5. Wire Up in AuthPage
**File:** `src/pages/AuthPage.tsx`

- Add magic-link form state (`magicLinkEmail`, `magicLinkTouched`)
- Render `MagicLinkForm` when `mode === 'magic-link'`
- Pass `onMagicLink={() => setMode('magic-link')}` to `LoginForm`
- Update header text for magic-link mode: title "Sign In with Email Link", subtitle "We'll send a link to your inbox"

### 6. Handle Magic Link Callback
**File:** `src/pages/AuthCallbackPage.tsx`

No changes needed -- the existing callback already handles hash-fragment tokens and PKCE code exchange, which covers magic link callbacks.

## Technical Details

- Uses `supabase.auth.signInWithOtp()` which sends a magic link email via the built-in auth system
- `emailRedirectTo` set to `window.location.origin + '/auth/callback'` (same as signup)
- Audit logging: `magic_link_requested` event with `{ method: 'magic_link' }`
- No database changes required
- No new dependencies

## Summary

| Change | File | Type |
|--------|------|------|
| New `MagicLinkForm` component | `src/components/auth/MagicLinkForm.tsx` | Create |
| Add magic-link mode + handler | `src/pages/AuthPage.tsx` | Edit |
| Add "email link" toggle button | `src/components/auth/LoginForm.tsx` | Edit |
| Files changed | 3 (1 new, 2 edited) | -- |

