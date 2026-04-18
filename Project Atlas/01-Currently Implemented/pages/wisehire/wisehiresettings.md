# WiseHireSettingsPage

  **Last verified:** 2026-04-26
  **Type:** reference card
  **Sources:**
  - `src/pages/wisehire/WiseHireSettingsPage.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §3
- `specs/001-wisehire-hr-platform/spec.md`


  **Canonical owner:** `project-governance/PRODUCT.md` §3 (WiseHire) + `specs/001-wisehire-hr-platform/spec.md`

  ---

  **What it is:** WiseHire account, branding, and AI key (BYOK) settings. Includes a live connected-provider summary card (`AIKeySection`) that reflects BYOK key state in real time using the shared `['ai-keys']` React Query cache key (staleTime 30 s). The summary updates immediately when keys are saved or removed via `AISettingsSheet` — no page reload or sheet close required. → `src/pages/wisehire/WiseHireSettingsPage.tsx`, Task #19 + #20.

  **Route(s):**
  - `  /wisehire/settings`

  **Where it lives:** `src/pages/wisehire/WiseHireSettingsPage.tsx`

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Critical system: `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
