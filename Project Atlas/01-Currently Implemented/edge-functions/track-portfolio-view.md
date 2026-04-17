# track-portfolio-view

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/track-portfolio-view/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Logs a public portfolio view event. IP rate-limited.

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  