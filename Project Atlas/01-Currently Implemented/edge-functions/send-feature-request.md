# send-feature-request

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/send-feature-request/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Records and notifies on a feature-request submission. (Description derived from the function name and `supabase/functions/EDGE_FUNCTION_AUDIT.md`; for full behaviour read `supabase/functions/send-feature-request/index.ts`.)

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  