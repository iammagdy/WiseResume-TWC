# WiseHireSignupPage

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `src/pages/wisehire/WiseHireSignupPage.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §3
- `specs/001-wisehire-hr-platform/spec.md`


  **Canonical owner:** `project-governance/PRODUCT.md` §3 (WiseHire) + `specs/001-wisehire-hr-platform/spec.md`

  ---

  **What it is:** WiseHire invite-only sign-up. Validates HMAC-signed invite token via `wisehire-validate-invite`.

  **Route(s):**
  - `  /wisehire/signup`

  **Where it lives:** `src/pages/wisehire/WiseHireSignupPage.tsx`

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Critical system: `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
