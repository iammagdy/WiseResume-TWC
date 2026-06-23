# Password Reset Flow Fixes + In-App Change Password + Change-Password Notification — 2026-06-23

**Last verified:** 2026-06-23
**Type:** bug fix + feature + email/UX hardening
**Branch / PR:** `claude/confident-johnson-ruvmnw` → PR #123
**Sources:**
- `appwrite-hubs/email-service/src/main.js` — transactional email function (verification, reset, welcome, **password-changed**)
- `src/pages/AuthResetPasswordPage.tsx` — `/auth/reset-password` page (`account.updateRecovery`)
- `src/pages/AuthPage.tsx` — login / register / forgot-password (unchanged logic, referenced)
- `src/components/settings/sections/AccountSection.tsx` — Settings → "Manage Sign-in & Password"
- `src/components/settings/sections/ChangePasswordDialog.tsx` — **new** in-app change-password form
- `src/lib/appwrite-functions.ts` — `appwriteFunctions.invoke` (ExecutionMethod type fix)
- `scripts/deploy_email_service.cjs` — `FRONTEND_URL` default

---

## Overview

A review of the Reset Password / Change Password flow (triggered by an admin who
could not change their password) found that the happy path was sound, but several
bugs made a **broken or misconfigured reset look identical to a working one**, and
there was **no notification** when a password changed. There was also no true
in-app change-password — Settings only emailed a reset link.

This work fixes the masking bugs, corrects misleading email copy, adds a
"your password was changed" security notice, and adds a real in-app change-password
form. It also fixes one pre-existing TypeScript error in the `invoke` call path the
password features use.

---

## How the flows work (reference)

**Forgot password (logged out) — `AuthPage.tsx`**
1. User enters email → `email-service` Function with `{ action: 'send-password-reset', email }`.
2. Function calls `account.createRecovery(email, redirectUrl)` where
   `redirectUrl = ${FRONTEND_URL}/auth/reset-password`, then sends a branded Resend
   email with `…/auth/reset-password?userId=<id>&secret=<token>`.
3. Reset page calls `account.updateRecovery(userId, secret, password)` →
   password is updated **immediately** (old password stops working at once). The
   user is not auto-logged-in; they sign in again.

**Manage Sign-in & Password (logged in) — `AccountSection.tsx`**
- OAuth accounts (Google/GitHub/Apple) → external provider security page.
- Email/password accounts → **now opens the in-app Change Password dialog**
  (previously: emailed the same reset link).

The "Change Password" link historically sent by Settings was the **same**
`/auth/reset-password?userId=…&secret=…` recovery link as Forgot Password — there
was never a separate "change password" link.

---

## Problems found

1. **Silent-swallow masked real failures as success.** The anti-enumeration `catch`
   in `handleSendPasswordReset` matched `/not found|no user|invalid/i`. An invalid
   redirect-URL host error ("**Invalid** `url` param…"), a rate limit, or a
   Resend/SMTP failure all contain those words → they were logged as a benign
   "unknown email" while the UI still said *"Reset link sent!"* and **no email was
   sent**. A fully broken flow was indistinguishable from success.

2. **Email lied about expiry.** Appwrite recovery tokens are valid for **1 hour**
   (per the SDK), but the branded email said *"24 hours."* A link clicked after an
   hour failed and looked like a broken flow.

3. **No "password changed" notification.** The `email-service` function had no
   path to notify a user after their password changed — a security best-practice gap.

4. **No true in-app change password.** Settings → "Manage Sign-in & Password" only
   emailed a reset link for email/password users; there was no
   current-password + new-password form (`account.updatePassword`).

5. **`FRONTEND_URL` inconsistency.** The function default and `deploy_hubs.cjs` used
   `https://wiseresume.app`; `deploy_email_service.cjs` used
   `https://resume.thewise.cloud`. The link domain depends entirely on this var.

6. **Pre-existing TS error in the invoke path.** `appwrite-functions.ts` passed a
   bare `'POST'` to `createExecution`, whose `method` param is typed `ExecutionMethod`.

---

## Changes applied

### `appwrite-hubs/email-service/src/main.js`
- **Narrowed the benign-error test** in `handleSendPasswordReset` to genuine
  user-not-found (`code === 404` / `user_not_found` / "could not be found").
  Everything else now surfaces via `error()` so misconfigurations appear in the
  function logs. The client still always receives `{ success: true }` (enumeration-safe).
- **Corrected the reset email copy** from "24 hours" to "1 hour" (preheader + security note).
- **Added `passwordChangedEmail()`** + **`handleSendPasswordChanged()`** + the
  `send-password-changed` route. Two entry points:
  - authenticated (in-app change) → recipient derived from the session JWT;
  - logged-out (post-reset) → recipient looked up by `userId` via the admin API key.
  Best-effort and fail-open; always returns success, never reveals account existence.
- **Parameterized the email shell's disclaimer line** (`disclaimer` arg, defaulting
  to the previous "safely ignore" text) so the password-changed email instead says
  *"If you did not make this change, reset immediately and contact support."*

### `src/pages/AuthResetPasswordPage.tsx`
- After a successful `updateRecovery`, fire a best-effort
  `send-password-changed` (by `userId`, since there's no session). Never blocks
  the success UI.

### Settings — real in-app change password
- **New `ChangePasswordDialog.tsx`**: current + new + confirm fields →
  `account.updatePassword(new, current)`. On success fires
  `send-password-changed` (authenticated). Includes a "Forgot your current
  password?" link that falls back to the reset-by-email flow.
- **`AccountSection.tsx`**: email/password accounts now open the dialog;
  OAuth accounts still redirect to their provider. Extracted the reset-email path
  into `sendResetEmail` for the dialog's fallback. Row description for
  email/unknown providers is now "Change your account password".

### `src/lib/appwrite-functions.ts`
- Cast `'POST' as ExecutionMethod` (matching the existing convention in
  `src/hooks/usePublicPortfolio.ts`) — resolves the lone `tsc` error in the
  `appwriteFunctions.invoke` call path used by the password flows.

### `scripts/deploy_email_service.cjs`
- Pinned `FRONTEND_URL` default to the canonical `https://wiseresume.app` so reset
  / verify links match the function default and `deploy_hubs.cjs`.

---

## Owner follow-ups (config, not code)

These are required for the reset flow to work end-to-end and are **outside the repo**:

1. **Register `wiseresume.app` as an Appwrite Web Platform.** `createRecovery()`
   rejects redirect URLs whose host is not in the project's Platform allowlist.
   Before this PR that rejection was silently swallowed; it now logs an error, but
   the host must still be allow-listed for the email to send.
2. **Blank the Appwrite Console "Password Recovery" template to a single space.**
   `createRecovery()` on Appwrite Cloud also sends Appwrite's own recovery email;
   blanking the template suppresses the duplicate so users get only the branded one.

---

## Verification

- `node --check` passes on `email-service/src/main.js` and `deploy_email_service.cjs`.
- `tsc` shows **no errors** in the changed/added TS files
  (`appwrite-functions.ts`, `AccountSection.tsx`, `ChangePasswordDialog.tsx`,
  `AuthResetPasswordPage.tsx`). The repo has unrelated pre-existing `tsc` debt that
  `vite build` (used by Vercel) does not gate on.
- **Vercel preview built and deployed `Ready`** for the final commit.

## Out of scope / unrelated red checks

- **TestSprite Pre-Check — "No tests detected":** pre-existing repo gate, not
  introduced by this work.
- **AI Gateway Hub — "Build failed":** pre-existing Appwrite GitHub-App
  misconfiguration (builds the whole repo instead of `appwrite-hubs/ai-gateway`);
  this PR does not touch `ai-gateway`. Owner fix is a Console/API action
  (disconnect Git or `providerSilentMode`).
- **~589 pre-existing repo-wide `tsc` errors:** unrelated to the password flow;
  recommended as a separate cleanup PR.
