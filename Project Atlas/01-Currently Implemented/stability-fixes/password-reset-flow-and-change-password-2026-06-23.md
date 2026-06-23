# Password Reset Flow Fixes + In-App Change Password + Change-Password Notification — 2026-06-23

**Last verified:** 2026-06-23
**Type:** bug fix + feature + email/UX hardening
**Branch / PR:** `claude/confident-johnson-ruvmnw` → PR #123 (review fixes) + PR #125 (root-cause fix) — both **merged to `main`**
**Status:** ✅ merged + email-service function **deployed** (workflow run `28006023582`, success)
**Sources:**
- `appwrite-hubs/email-service/src/main.js` — transactional email function (verification, reset, welcome, **password-changed**); **createRecovery API-key fix**
- `src/pages/AuthResetPasswordPage.tsx` — `/auth/reset-password` page (`account.updateRecovery`)
- `src/pages/AuthPage.tsx` — login / register / forgot-password (unchanged logic, referenced)
- `src/components/settings/sections/AccountSection.tsx` — Settings → "Manage Sign-in & Password"
- `src/components/settings/sections/ChangePasswordDialog.tsx` — **new** in-app change-password form
- `src/lib/appwrite-functions.ts` — `appwriteFunctions.invoke` (ExecutionMethod type fix)
- `scripts/deploy_email_service.cjs` — `FRONTEND_URL` default
- `.github/workflows/deploy-email-service.yml` — `FRONTEND_URL` deploy env (aligned to `wiseresume.app`)

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

0. **★ ROOT CAUSE — branded reset link had an empty `secret` (fixed in PR #125).**
   `handleSendPasswordReset` called `account.createRecovery()` with a **keyless
   public client**. Appwrite only returns the recovery token's `secret` to
   **server-side (API-keyed)** requests — for a public call the secret is **empty**.
   So the branded email link was `…/auth/reset-password?userId=XXX&secret=` (no
   secret), and `AuthResetPasswordPage` rejects a missing secret as
   *"This link is invalid or has already been used."* — **before any password is
   submitted.** This was masked for a while because Appwrite's own "Reset password"
   email *did* carry a working secret; blanking that template (to kill the
   duplicate) removed the only working email and exposed the broken branded link.

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
- (Reference) This script also **re-blanks** the Appwrite `verification` and
  `recovery` email templates on every deploy via `PATCH /projects/.../templates/email/...`
  with the API key, so the duplicate-email suppression is idempotent.

### PR #125 — root-cause fix + deploy alignment

#### `appwrite-hubs/email-service/src/main.js`
- **`createRecovery` now uses the function's `APPWRITE_API_KEY`** so the returned
  token `secret` is populated → the branded reset link carries a working secret.
- **Guards an empty secret**: if no secret comes back (missing/insufficient API
  key), it logs a clear error and does **not** email a broken link.
- Updated the stale comment to the Console's current template name (**"Reset
  password"**, formerly "Recovery").

#### `.github/workflows/deploy-email-service.yml`
- Changed the hardcoded `FRONTEND_URL` from `https://resume.thewise.cloud` to
  **`https://wiseresume.app`** — it was overriding the script default and would have
  pointed reset/verify links at a host that isn't the registered Web Platform.

---

## Owner follow-ups (config, not code) — ✅ COMPLETED 2026-06-23

1. ✅ **Registered `wiseresume.app` as an Appwrite Web Platform.** `createRecovery()`
   rejects redirect URLs whose host is not in the project's Platform allowlist.
2. ✅ **Blanked the Appwrite Console "Reset password" template** (set to a single
   space). Appwrite Cloud otherwise also sends its own recovery email; blanking
   suppresses the duplicate. (Also re-applied programmatically by the deploy script.)
   Note: the Console relabeled the old **"Recovery"** template to **"Reset password"**.

---

## Resolution / deployment

- PR #123 (review fixes) and PR #125 (root-cause fix) both **merged to `main`**.
- The **email-service function was redeployed** via the `Deploy Email Service`
  workflow (`workflow_dispatch` on `main`, run `28006023582`) → **success**. The
  deploy set `FRONTEND_URL=https://wiseresume.app`, re-blanked the auth templates,
  and activated the new code.
- After this, the branded reset email link is
  `https://wiseresume.app/auth/reset-password?userId=…&secret=<non-empty>` and the
  reset page accepts a new password.

## Verification

- `node --check` passes on `email-service/src/main.js` and `deploy_email_service.cjs`.
- `tsc` shows **no errors** in the changed/added TS files
  (`appwrite-functions.ts`, `AccountSection.tsx`, `ChangePasswordDialog.tsx`,
  `AuthResetPasswordPage.tsx`). The repo has unrelated pre-existing `tsc` debt that
  `vite build` (used by Vercel) does not gate on.
- **Vercel preview built and deployed `Ready`** for both PRs' final commits.
- **Deploy workflow run `28006023582` completed `success`.**
- Live functional check (owner): request a reset → confirm a single branded email,
  a non-empty `secret` in the link, the Set-New-Password form accepts a new
  password, and a "password changed" email follows. Function logs
  (email-service → Executions) now name the precise reason on any failure.

## Out of scope / unrelated red checks

- **TestSprite Pre-Check — "No tests detected":** pre-existing repo gate, not
  introduced by this work.
- **AI Gateway Hub — "Build failed":** pre-existing Appwrite GitHub-App
  misconfiguration (builds the whole repo instead of `appwrite-hubs/ai-gateway`);
  this PR does not touch `ai-gateway`. Owner fix is a Console/API action
  (disconnect Git or `providerSilentMode`).
- **~589 pre-existing repo-wide `tsc` errors:** unrelated to the password flow;
  recommended as a separate cleanup PR.
