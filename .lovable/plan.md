
# Add Password Reset Completion Flow

## Problem
The "Forgot password?" link sends a reset email, but when the user clicks the link and returns to `/auth?reset=true`, the page just shows the normal login form. There is no way to actually set a new password.

The password show/hide icon already exists on the auth page.

## What Will Change

### AuthPage.tsx -- Add a "Set New Password" mode

1. **Detect the reset callback**: On mount, check if the URL contains `?reset=true` or if the auth event is `PASSWORD_RECOVERY`. If so, switch to a new `reset-password` mode.

2. **New UI for setting a password**: When in `reset-password` mode, show:
   - A heading: "Set New Password"
   - A new password field (with show/hide eye icon)
   - A confirm password field (with show/hide eye icon)
   - A "Update Password" button

3. **Submit handler**: Call `supabase.auth.updateUser({ password: newPassword })` to save the new password. On success, show a toast and redirect to `/dashboard`.

4. **Validation**: Ensure both password fields match and meet the 6-character minimum.

## Technical Details

### File: `src/pages/AuthPage.tsx`

- Add `'reset-password'` to the `AuthMode` type
- Add state for `confirmPassword` and `showConfirmPassword`
- Add a `useEffect` that listens for `PASSWORD_RECOVERY` event from `onAuthStateChange` and also checks for `?reset=true` in the URL search params -- if detected, set mode to `reset-password`
- Add a `handleUpdatePassword` function that validates passwords match, then calls `supabase.auth.updateUser({ password })`
- Add a new form section rendered when `mode === 'reset-password'` with two password fields and a submit button, both with the eye show/hide toggle
- Clean up the URL params after detecting the reset (using `window.history.replaceState`)

No new files needed. No database changes required.
