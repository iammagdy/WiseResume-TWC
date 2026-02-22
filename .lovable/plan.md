

# Fix Pwned/Weak Password Silent Failure on Signup

## Problem

During E2E testing, signing up with a breached password (e.g., "TestPass123!") resulted in a 422 response from Supabase with `{"code":"weak_password"}`, but the UI showed **no error feedback** at all. The form just sat there unchanged. This is because the Supabase client's error object for `weak_password` responses may have a different structure that the current generic `toast.error(error.message)` doesn't display clearly.

## What's Already Done (from original auth plan)

All items from the original auth plan have been implemented:
- Email-not-confirmed detection and VerifyEmailScreen (done)
- Post-signup "Check Your Email" screen (done)
- Terms/Privacy consent on signup (done)
- Forgot-password validation fix (done)
- Redirect param preservation across mode changes (done)
- localStorage cooldown, social auth loading fix, auth loading skeleton, "Explore without account" removal (done)

## Remaining Fix

### Detect `weak_password` error and show a user-friendly message

In `AuthPage.tsx` `handleSignupSubmit`, add explicit detection for the `weak_password` error code before the generic error handler:

```
if (error) {
  haptics.error();

  // Handle pwned/weak password explicitly
  if (
    error.message?.toLowerCase().includes('weak') ||
    error.message?.toLowerCase().includes('pwned') ||
    (error as any).code === 'weak_password'
  ) {
    toast.error(
      'This password has been found in a data breach. Please choose a stronger, unique password.',
      { duration: 6000 }
    );
    return;
  }

  // Existing anti-enumeration for "already registered"
  if (error.message.includes('already registered')) {
    toast.success("If this email is not already registered, you'll receive a verification link shortly.");
  } else {
    toast.error(error.message || 'Signup failed. Please try again.');
  }
  return;
}
```

This covers three detection paths (message text, error code) to be resilient against Supabase SDK variations, and shows a clear, actionable message instead of the raw error.

### Add fallback for empty error messages

The final `else` branch also adds `|| 'Signup failed. Please try again.'` as a fallback in case `error.message` is empty or undefined (which may be why the original toast never appeared).

## File to modify

| File | Change |
|------|--------|
| `src/pages/AuthPage.tsx` | Add `weak_password`/pwned detection in `handleSignupSubmit` error handler (around line 250), add fallback message for empty errors |

