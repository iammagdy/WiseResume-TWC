# me

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/me/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Single-source-of-truth user fetch — returns plan, credits, preferences, account_type. Backed by `useMe` hook.

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/functions/README.md`
  