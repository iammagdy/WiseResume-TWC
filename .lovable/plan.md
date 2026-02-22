

# Create Dedicated `/reset-password` Page

## Problem

The current password reset flow uses a brittle dual mechanism:
1. The forgot-password email links to `/auth?reset=true`
2. AuthPage detects `?reset=true` **and** listens for `PASSWORD_RECOVERY` auth state change
3. Both set a local `mode` state to show the reset form inline within the monolithic AuthPage

This is fragile because:
- The `?reset=true` param and the `PASSWORD_RECOVERY` event can race or conflict
- The reset form shares state with login/signup, making the component harder to maintain
- The `session && mode !== 'reset-password'` guard is a special case that complicates the redirect logic
- If the user refreshes the page after landing on `/auth?reset=true`, the `PASSWORD_RECOVERY` event may not re-fire, leaving them on the login form

## Solution

Create a standalone `/reset-password` page that:
- Handles the `PASSWORD_RECOVERY` callback flow cleanly
- Contains its own form, validation, and submission logic (extracted from AuthPage)
- Is a **public route** (not behind ProtectedRoute) since the user arrives with a recovery token
- Redirects to `/auth` if no recovery session is detected

Then remove all reset-password logic from AuthPage.

## Changes

### 1. Create `src/pages/ResetPasswordPage.tsx`

A new standalone page that:
- Listens for `PASSWORD_RECOVERY` auth state change on mount
- Also checks the URL hash for `type=recovery` tokens (Supabase implicit flow)
- Shows the "Set New Password" form (reuses existing `PasswordInput` and `PasswordStrengthMeter` components)
- On success, navigates to `/dashboard`
- If no recovery session detected within 3 seconds, redirects to `/auth` with a toast

### 2. Update `src/App.tsx` routing

- Add `/reset-password` as a public route (alongside `/auth`, `/privacy`, `/terms`)
- Lazy-load the new page component

### 3. Clean up `src/pages/AuthPage.tsx`

- Remove `'reset-password'` from the `AuthMode` type
- Remove `resetPassword`, `resetConfirm`, `showResetPassword`, `showResetConfirm`, `resetTouched` state
- Remove the `?reset=true` detection useEffect
- Remove the `PASSWORD_RECOVERY` listener
- Remove the `mode !== 'reset-password'` guard from the session redirect
- Remove the `handleUpdatePassword` handler and `getResetPasswordError` helper
- Remove the reset-password form JSX block
- Remove unused imports (`PasswordInput`, `PasswordStrengthMeter`, `Lock`) if no longer needed

### 4. Update forgot-password `redirectTo`

Change `resetPasswordForEmail` redirect from:
```
`${window.location.origin}/auth?reset=true`
```
to:
```
`${window.location.origin}/reset-password`
```

## Technical Details

### ResetPasswordPage structure

```
- Mount: listen for PASSWORD_RECOVERY event
- Mount: check hash for type=recovery token
- If recovery detected: show form
- If not detected after 3s: redirect to /auth with "Invalid or expired reset link" toast
- Form: new password + confirm + strength meter
- Submit: supabase.auth.updateUser({ password }) -> navigate to /dashboard
```

### Files to create/modify

| File | Action |
|------|--------|
| `src/pages/ResetPasswordPage.tsx` | Create -- standalone reset password page |
| `src/App.tsx` | Add `/reset-password` public route |
| `src/pages/AuthPage.tsx` | Remove all reset-password mode logic, state, and UI |

