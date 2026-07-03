# hard-purge

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/hard-purge/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/adminAuth.ts`
- `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Admin-only hard-deletion of soft-deleted user content. Now wrapped in `requireAdminAuth` (fixed 2026-04-14).

  **Auth:** `requireAdminAuth` (admin-only).

  **Related:**
  - `Project Atlas/01-Currently Implemented/functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
  