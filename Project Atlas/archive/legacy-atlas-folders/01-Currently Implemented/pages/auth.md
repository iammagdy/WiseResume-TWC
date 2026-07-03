# AuthPage

  **Last verified:** 2026-06-23 (ported "Auth Bold" design from `iammagdy/Auth-Routes` — `AuthBold.dc.html` — PR #128)
  **Type:** reference card
  **Sources:**
  - `src/pages/AuthPage.tsx`
  - `src/components/auth/AuthBold.tsx` (UI component)
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Appwrite-backed sign-in / register / forgot-password entry. Reads `?plan=` query param and saves intent to sessionStorage. UI is delegated to the shared `<AuthBold>` component (signin / signup / forgot modes here).

  **Route(s):**
  - `  /auth`
- `  /sign-in`

  **Where it lives:** `src/pages/AuthPage.tsx`

  **UI component:** `src/components/auth/AuthBold.tsx` — one reusable component that supports five modes (`signin`, `signup`, `forgot`, `reset`, `change`). Ports the "Auth Bold" design (dark/light toggle, animated Scout mascot with eye-tracking + blink + cover-on-password-focus, rotating conic-gradient card border, typewriter hero, animated count-up stats, container-query responsive layout from mobile through desktop). Honors `prefers-reduced-motion`.

  **Backend wiring (unchanged):**
  - Sign-in → `appwriteAccount.createEmailPasswordSession` → `refreshSession` → navigate to `?redirect=` (defaults `/dashboard`).
  - Sign-up → `appwriteAccount.create` → `createEmailPasswordSession` → `upsertProfileIdentity` → `email-service` `send-verification` → navigate `/auth/verify-email`.
  - Forgot → `email-service` `send-password-reset` → switches back to signin on success.
  - `SIGNUP_PLAN_KEY` (`signup_plan_intent`) sessionStorage flow preserved; plan notice renders inside the card via the `notice` prop.

  **Local development note:** Open the app on `http://localhost:5000`, not `http://127.0.0.1:5000`. The Appwrite project currently allows `localhost` as a Web platform origin and rejects `127.0.0.1`. `src/main.tsx` now redirects DEV sessions from `127.0.0.1` to `localhost` before auth calls run.

  **Tests:** `src/components/auth/__tests__/AuthBold.test.tsx` — vitest smoke tests covering each mode's fields, submit label, error pill, done-slot, footer mode-toggle, inline "Forgot?" link, and password-mismatch blocking.

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Reset page: `Project Atlas/01-Currently Implemented/pages/authresetpassword.md`
