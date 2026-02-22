

# Fix Silent Failure for Pwned/Weak Passwords During Signup

## Problem

When Supabase detects a pwned or weak password during signup, there are two possible server responses:

1. **Hard block** (HTTP error): The server returns an `AuthApiError` with `code: "weak_password"`. The current code at lines 228-242 of `AuthPage.tsx` already catches this via string matching on `error.message`.

2. **Soft warning** (success with flag): The server returns a **successful** signup (`error: null`, `data.session` exists) but includes `data.weakPassword: { reasons: ["pwned"], message: "..." }`. The current code completely ignores this and proceeds as if the signup is fully successful -- this is the **silent failure**.

Additionally, the `ResetPasswordPage.tsx` already handles the error case at lines 82-92 but also misses the soft warning scenario (though `updateUser` is less likely to return a soft warning).

## Fix

### File: `src/pages/AuthPage.tsx`

**After** the error check block (line 251) and **before** proceeding with the successful signup flow (line 252), add a check for `data.weakPassword`:

```typescript
// After line 251's return
if (data?.weakPassword) {
  haptics.error();
  toast.error(
    'This password has been found in a data breach. Please choose a different one.',
    { duration: 6000 }
  );
  // Sign out the session that was just created
  await supabase.auth.signOut({ scope: 'local' });
  return;
}
```

This ensures that even when the server allows the signup, the user is warned and the weak session is discarded.

### Also improve the existing error check (lines 232-236)

Make the detection more robust by also checking `(error as any).status === 422` (which Supabase uses for weak passwords):

```typescript
if (
  (error as any).code === 'weak_password' ||
  (error as any).status === 422 ||
  error.message?.toLowerCase().includes('weak') ||
  error.message?.toLowerCase().includes('pwned')
)
```

### Summary of changes

| File | Change |
|------|--------|
| `src/pages/AuthPage.tsx` | Add `data.weakPassword` check after successful signup; improve error detection robustness |

This is a small, focused fix -- two blocks of code in one file.

