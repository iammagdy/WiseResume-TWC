

# Authentication Flow Audit -- Issues and Improvements

## What's Already Good

The auth system has solid foundations: brute-force cooldown (5 attempts / 30s lockdown), network retry logic, offline detection, slow-connection indicators, session-expired handling, anti-enumeration on signup ("if this email is not already registered..."), password strength enforcement, haptic feedback, and comprehensive audit logging. These are above-average for most apps.

## Issues Found

### CRITICAL: No "Email Not Confirmed" Handling on Login

When a user signs up and hasn't verified their email, then tries to log in, Supabase returns `"Email not confirmed"`. The login handler treats this as a generic credential error showing "Invalid credentials" -- which is confusing and will make users think their password is wrong. Production apps like Notion and Linear show a specific message: "Please verify your email first" with a "Resend verification email" button.

**Fix:** Detect the `"Email not confirmed"` error message and show a dedicated UI state with a resend-verification button that calls `supabase.auth.resend({ type: 'signup', email })`.

### CRITICAL: No Terms of Service / Privacy Policy Consent on Signup

The signup form collects name, phone, email, and password but never asks users to agree to Terms of Service or Privacy Policy. This is a legal requirement for production apps. The app already has `/terms` and `/privacy` pages but they're not linked from signup.

**Fix:** Add a checkbox or implicit consent text below the signup button: "By creating an account, you agree to our Terms of Service and Privacy Policy" with links to `/terms` and `/privacy`.

### HIGH: Forgot-Password Validation Bug (Line 232)

```ts
const err = !forgotEmail ? 'Email is required' : undefined;
try { emailSchema.parse(forgotEmail); } catch { if (!err) { setIsLoading(false); return; } }
```

This logic is broken: if the email is non-empty but invalid, `err` is `undefined`, so the `if (!err)` branch runs `setIsLoading(false)` and returns -- but `setIsLoading` was never set to `true` at that point (it's set on line 234, after this check). The function silently exits without any error message shown to the user.

**Fix:** Restructure to validate first, show toast on invalid email, then proceed.

### HIGH: Login Redirect Reads `window.location.search` Instead of `searchParams`

On successful login (line 162), the redirect param is read from `window.location.search` directly. But earlier (line 119), the `?mode=` param handling calls `window.history.replaceState({}, '', window.location.pathname)` which strips ALL query params -- including `?redirect=`. So if a user lands on `/auth?redirect=/editor&mode=signup`, switches to login, and signs in, the redirect is lost.

**Fix:** Read the redirect from `searchParams` at component mount and store it in a `useRef`, so it survives query param cleanup.

### HIGH: No "Resend Verification Email" Flow

After signup, users see "you'll receive a verification link" and are sent back to the login form. If the email doesn't arrive (spam filter, typo in address), there's no way to request a new one. Production apps always provide a resend option.

**Fix:** After signup success (when no session is returned), show a dedicated "Check Your Email" screen with a "Resend" button and a "Didn't receive it?" helper text, using `supabase.auth.resend({ type: 'signup', email })`.

### MEDIUM: Cooldown Uses `sessionStorage` (Easily Bypassed)

The brute-force cooldown stores attempt counts in `sessionStorage`. Opening a new tab or incognito window resets it. While server-side rate limiting from Supabase is the real protection, the client-side cooldown should at least use `localStorage` with an expiry timestamp to be slightly harder to bypass.

**Fix:** Switch from `sessionStorage` to `localStorage`.

### MEDIUM: Social Auth Loading State Not Cleared on Error

For Google/Apple sign-in (lines 293-305), `setSocialLoading(null)` runs after a 2-second `setTimeout` regardless of success/failure. If the OAuth popup is closed or fails quickly, the buttons remain disabled for the full 2 seconds unnecessarily.

**Fix:** Clear `socialLoading` immediately in the `catch` block, only keep the timeout for the success path (where the page redirects).

### MEDIUM: No Loading Skeleton on Auth Page Initial Load

When a logged-in user navigates to `/auth`, there's a flash of the login form before the redirect to `/dashboard` fires (line 124). This creates a jarring experience.

**Fix:** Show a loading skeleton or spinner while `loading` is true from `useAuth()`, before rendering the form.

### LOW: Password Reset Redirect URL Doesn't Use `/auth/callback`

The forgot-password handler redirects to `/auth?reset=true` (line 237), which works but bypasses the standard callback handler. The `PASSWORD_RECOVERY` event listener on `onAuthStateChange` (line 106) is a duplicate mechanism. This is not broken but adds unnecessary complexity.

### LOW: "Explore Without Account" Button on Auth Page

Line 424-429 shows an "Explore without account" button that navigates to `/`. Since guest mode has been removed and all routes require auth, this button sends users to the landing page which has no useful functionality without an account. It's misleading.

**Fix:** Remove the "Explore without account" button, or change it to "View landing page" with clear expectations.

## Implementation Plan

### Step 1: Add "Email Not Confirmed" Handling + Resend Verification

- In `handleLoginSubmit`, detect `error.message` containing "Email not confirmed"
- Show a dedicated UI state (`email-not-confirmed` mode) with the user's email and a "Resend Verification" button
- The resend button calls `supabase.auth.resend({ type: 'signup', email })`
- Include a cooldown on the resend button (60 seconds) to prevent spam

### Step 2: Add Post-Signup "Check Your Email" Screen

- After successful signup with no session returned, instead of toasting and switching to login, switch to a new `verify-email` mode
- Show the email address, a "Resend" button, and "Wrong email? Go back" link
- Store the signup email in state so the resend button works

### Step 3: Add Terms/Privacy Consent to Signup

- Add consent text below the signup button in `SignupForm.tsx`: "By creating an account, you agree to our [Terms of Service](/terms) and [Privacy Policy](/privacy)"
- Use `Link` components for the legal pages
- No checkbox needed (implicit consent is the industry standard for consumer apps)

### Step 4: Fix Forgot-Password Validation Bug

- Restructure the validation in `handlePasswordReset` to properly validate email before proceeding
- Show a toast error for invalid email format

### Step 5: Preserve Redirect Param Across Mode Changes

- Read `redirect` from `searchParams` on mount and store in a `useRef`
- Use this ref in all post-auth navigations (login, signup, social auth)

### Step 6: Minor Fixes

- Switch cooldown from `sessionStorage` to `localStorage`
- Clear `socialLoading` immediately on error
- Add auth loading check before rendering the form
- Remove "Explore without account" button

### Files to modify:

| File | Change |
|------|--------|
| `src/pages/AuthPage.tsx` | Email-not-confirmed handling, verify-email mode, redirect preservation, forgot-password fix, loading state, remove explore button |
| `src/components/auth/SignupForm.tsx` | Add Terms/Privacy consent text |
| `src/components/auth/VerifyEmailScreen.tsx` | **NEW** -- post-signup verification screen with resend |
| `src/components/auth/EmailNotConfirmedBanner.tsx` | **NEW** -- banner shown on login when email not verified |

