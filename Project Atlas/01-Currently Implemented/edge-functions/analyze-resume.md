# analyze-resume

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/analyze-resume/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Returns AI-driven analysis of a resume (gaps, strengths, ATS suggestions). (Description derived from the function name and `supabase/functions/EDGE_FUNCTION_AUDIT.md`; for full behaviour read `supabase/functions/analyze-resume/index.ts`.)

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  