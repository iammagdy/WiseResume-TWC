

# Add Login Attempt and Success Events to Audit Logs

## Overview

Add `logAudit` calls to all sign-in flows in `src/pages/AuthPage.tsx` to track login attempts (including failures) and successes.

## What Changes

### File: `src/pages/AuthPage.tsx`

1. **Import** `logAudit` from `@/lib/auditLogger`

2. **Email/password login attempt** (line 135, after `setIsLoading(true)`):
   - `logAudit('auth', 'login_attempted', { method: 'email' })`

3. **Email/password login failure** (line 141-151, inside the `if (error)` branch):
   - `logAudit('auth', 'login_failed', { method: 'email', reason: error.message })`

4. **Email/password login success** (line 154, after `clearCooldown()`):
   - `logAudit('auth', 'login_succeeded', { method: 'email' })`

5. **Signup success** (line 202-208, after account creation):
   - `logAudit('auth', 'signup_succeeded', { method: 'email', confirmed: !!data.session })`

6. **Google sign-in attempt** (line 261, inside `handleGoogleSignIn`):
   - `logAudit('auth', 'login_attempted', { method: 'google' })`

7. **Apple sign-in attempt** (line 267, inside `handleAppleSignIn`):
   - `logAudit('auth', 'login_attempted', { method: 'apple' })`

8. **Password reset request** (line 233, after successful reset email):
   - `logAudit('auth', 'password_reset_requested', { email: forgotEmail })`

9. **Password update success** (line 254, after successful password update):
   - `logAudit('auth', 'password_updated', {})`

## Summary

| Event | When | Metadata |
|-------|------|----------|
| `login_attempted` | User submits email login or initiates social sign-in | `{ method }` |
| `login_failed` | Email login returns an error | `{ method, reason }` |
| `login_succeeded` | Email login succeeds | `{ method }` |
| `signup_succeeded` | Account created | `{ method, confirmed }` |
| `password_reset_requested` | Reset email sent | `{ email }` |
| `password_updated` | New password set | -- |

One file changed, one import added, 8 `logAudit` calls inserted. No new dependencies or database changes.
