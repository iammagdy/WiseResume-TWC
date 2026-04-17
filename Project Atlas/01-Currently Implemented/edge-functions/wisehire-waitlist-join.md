# wisehire-waitlist-join

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/wisehire-waitlist-join/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Public waitlist signup → writes `wisehire_waitlist`. Bot-guarded.

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
  