# AuthResetPasswordPage

  **Last verified:** 2026-06-23 (ported "Auth Bold" design — PR #128)
  **Type:** reference card
  **Sources:**
  - `src/pages/AuthResetPasswordPage.tsx`
  - `src/components/auth/AuthBold.tsx` (UI component, `mode="reset"`)
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Branded password-reset confirmation page opened from an Appwrite recovery email link. Verifies the `userId` + `secret` from the callback URL, lets the user choose a new password (with inline confirm + mismatch detection), calls `appwriteAccount.updateRecovery`, then fires the best-effort `email-service` `send-password-changed` notification. UI is rendered by `<AuthBold mode="reset">`.

  **Route(s):**
  - `  /auth/reset-password`

  **Where it lives:** `src/pages/AuthResetPasswordPage.tsx`

  **States rendered via `<AuthBold>`:**
  - **Invalid / used link** — `doneSlot` shows an `AlertTriangle` and a "Back to sign in" button.
  - **Form** — two password fields (`mode="reset"` automatically labels them "New password" / "Confirm new password"). Inline mismatch warning. Submit calls `updateRecovery`.
  - **Done** — `doneSlot` shows a `ShieldCheck` confirmation and a "Sign in" button that navigates back to `/auth?mode=login`.

  **Tests:** Covered indirectly by `src/components/auth/__tests__/AuthBold.test.tsx` (reset mode renders, done slot, error pill).

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Sign-in page: `Project Atlas/01-Currently Implemented/pages/auth.md`
