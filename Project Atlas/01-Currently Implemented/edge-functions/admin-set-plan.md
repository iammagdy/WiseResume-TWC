# admin-set-plan

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/admin-set-plan/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/adminAuth.ts`
- `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Admin Dev Kit endpoint (`set-plan`). Wrapped in `requireAdminAuth`.

  **Auth:** `requireAdminAuth` (admin-only).

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
  