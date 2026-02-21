

# Auth Logic and UI Improvements

## Current State Summary

The auth page is a 559-line monolithic component handling login, signup, forgot password, and reset password -- all in a single file with inline state management, validation, and rendering. It works but has several opportunities for improvement across UX, security, code quality, and accessibility.

---

## Issues and Proposed Fixes

### 1. PASSWORD STRENGTH INDICATOR (UX)

**Problem:** Users creating an account see validation errors only after blurring the field. There is no real-time visual feedback showing password strength progress.

**Fix:** Add a live password strength meter below the password field during signup. Show 4 colored bars that fill as requirements are met (length, uppercase, lowercase, number). This reduces friction and failed submissions.

**File:** Create `src/components/auth/PasswordStrengthMeter.tsx` (~40 lines)
**Edit:** `src/pages/AuthPage.tsx` -- render the meter below the password input when `mode === 'signup'`

---

### 2. CONFIRM PASSWORD ON SIGNUP (UX / Security)

**Problem:** Signup does not require password confirmation. Users can typo their password and be locked out after email verification. Only the reset-password flow has a confirm field.

**Fix:** Add the `confirmPassword` field and match-check to the signup form, reusing the existing `confirmPassword` state and `showConfirmPassword` toggle that are already declared but unused in signup mode.

**Edit:** `src/pages/AuthPage.tsx` -- add confirm password `InputFormField` after the password field when `!isLogin`, and add `password !== confirmPassword` check to `validateInputs()`.

---

### 3. COMPONENT EXTRACTION (Code Quality)

**Problem:** AuthPage is 559 lines in a single component with 15+ state variables, 4 form modes, inline validation, and duplicated password toggle markup. This makes it hard to maintain and test.

**Fix:** Extract into focused sub-components:
- `src/components/auth/LoginForm.tsx` -- email + password + forgot link + submit
- `src/components/auth/SignupForm.tsx` -- name + phone + email + password + confirm + submit
- `src/components/auth/ForgotPasswordForm.tsx` -- email + submit
- `src/components/auth/ResetPasswordForm.tsx` -- password + confirm + submit
- `src/components/auth/SocialAuthButtons.tsx` -- Google + Apple buttons (already duplicated in `SignInPromptDialog`)
- `src/components/auth/PasswordInput.tsx` -- reusable password field with show/hide toggle

**Edit:** `src/pages/AuthPage.tsx` becomes ~120 lines: mode state, routing logic, and rendering the correct sub-component.

---

### 4. COOLDOWN PERSISTENCE (Security)

**Problem:** The failed login cooldown (`failedAttempts`, `cooldownUntil`) is stored in React state. Refreshing the page resets the counter, completely bypassing the rate limit.

**Fix:** Store `failedAttempts` and `cooldownUntil` in `sessionStorage`. Read on mount, write on each failed attempt. This survives page refreshes within the same browser tab session.

**Edit:** `src/pages/AuthPage.tsx` -- replace `useState` with `sessionStorage`-backed state for the two cooldown values.

---

### 5. EMAIL ENUMERATION LEAK (Security)

**Problem:** The signup error handler checks for "already registered" and shows a specific message: "Already registered. Please sign in." This tells an attacker whether an email exists in the system.

**Fix:** Show a generic message for both success and "already registered" scenarios: "If this email is not already registered, you'll receive a verification link shortly." This matches the forgot-password pattern where the backend always returns success.

**Edit:** `src/pages/AuthPage.tsx` -- update the signup success/error handling block.

---

### 6. "EXPLORE WITHOUT ACCOUNT" BUTTON VISIBLE ON RESET PASSWORD (UX)

**Problem:** The "Explore without account" ghost button at line 550-553 renders on ALL modes, including the reset-password flow. A user who clicked a password reset link should not be encouraged to leave.

**Fix:** Hide the "Explore without account" button when `mode === 'reset-password'`.

**Edit:** `src/pages/AuthPage.tsx` -- wrap the button in a conditional.

---

### 7. SOCIAL AUTH BUTTONS SHOWN ON FORGOT/RESET MODES (UX)

**Problem:** The social login buttons (Google/Apple) and the "or" divider render even when the user is in login/signup mode. But they also appear when switching modes. Currently this is handled correctly since they're inside the login/signup branch. However, the "Don't have an account?" toggle also appears during these modes -- verified correct. No issue here.

---

### 8. ACCESSIBLE ERROR ANNOUNCEMENTS (A11y)

**Problem:** Validation errors are displayed visually but not announced to screen readers. The `toast.error()` calls are the only feedback, which may not be picked up by all assistive technologies.

**Fix:** Add `aria-live="polite"` to the form error regions. The existing `InputFormField` already has `aria-invalid` -- verify it also has `aria-describedby` linking to the error message (it does via `FormField` patterns). Add a visually-hidden live region that announces "X errors found" on failed submission.

**Edit:** `src/pages/AuthPage.tsx` -- add an `aria-live` region near the submit button.

---

### 9. DARK MODE APPLE BUTTON CONTRAST (UI)

**Problem:** The Apple sign-in button uses `bg-black text-white border-black` which is hardcoded regardless of theme. In dark mode, a black button on a dark background has poor contrast and no visible border.

**Fix:** Use theme-aware styling: `bg-foreground text-background border-border` so the button inverts naturally in both themes.

**Edit:** `src/pages/AuthPage.tsx` -- update the Apple button className.

---

### 10. INPUT CLEAR ON MODE SWITCH (UX)

**Problem:** When switching between login and signup modes, the form state (email, password, name, phone) persists. If a user types a password in signup mode (which has strict validation), switches to login, the strict validation errors may flash briefly. More importantly, the `fullName` and `phoneNumber` values persist invisibly.

**Fix:** Reset `password`, `confirmPassword`, `fullName`, `phoneNumber`, and all `touched` flags when `mode` changes. Keep `email` since it is shared between modes.

**Edit:** `src/pages/AuthPage.tsx` -- add a `useEffect` on `mode` that resets non-email fields.

---

## Implementation Order

1. Confirm password on signup (quick win, prevents lockouts)
2. Cooldown persistence in sessionStorage (security fix)
3. Email enumeration fix (security)
4. Password strength meter (new component)
5. Hide "Explore" on reset mode (trivial)
6. Apple button dark mode fix (trivial)
7. Input clear on mode switch (UX polish)
8. Accessibility live region (a11y)
9. Component extraction (refactor -- largest change, do last)

---

## Technical Details

### Password Strength Meter

```text
src/components/auth/PasswordStrengthMeter.tsx

Props: { password: string }

Renders 4 small horizontal bars:
- Bar 1: green if length >= 8
- Bar 2: green if has uppercase
- Bar 3: green if has lowercase
- Bar 4: green if has number

Below bars: text label ("Weak" / "Fair" / "Good" / "Strong")
Colors: red (0-1), amber (2), green (3-4)
```

### Cooldown Persistence

```text
On mount:
  const stored = sessionStorage.getItem('wr-auth-cooldown');
  if (stored) parse JSON { failedAttempts, cooldownUntil }

On failed attempt:
  sessionStorage.setItem('wr-auth-cooldown', JSON.stringify({ failedAttempts, cooldownUntil }))

On successful login:
  sessionStorage.removeItem('wr-auth-cooldown')
```

### Component Extraction Structure

```text
src/components/auth/
  PasswordInput.tsx        -- reusable password field with toggle
  PasswordStrengthMeter.tsx -- visual strength indicator
  SocialAuthButtons.tsx    -- Google + Apple buttons
  LoginForm.tsx            -- login form
  SignupForm.tsx            -- signup form with confirm password
  ForgotPasswordForm.tsx   -- forgot password form
  ResetPasswordForm.tsx    -- reset password form
```

### Files Created (5)
- `src/components/auth/PasswordInput.tsx`
- `src/components/auth/PasswordStrengthMeter.tsx`
- `src/components/auth/SocialAuthButtons.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`

### Files Modified (1)
- `src/pages/AuthPage.tsx` -- refactored to use sub-components, all fixes applied

