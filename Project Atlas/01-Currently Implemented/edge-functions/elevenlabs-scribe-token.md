# elevenlabs-scribe-token

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/elevenlabs-scribe-token/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Issues short-lived ElevenLabs Scribe tokens for the Interview Coach voice path. (Description derived from the function name and `supabase/functions/EDGE_FUNCTION_AUDIT.md`; for full behaviour read `supabase/functions/elevenlabs-scribe-token/index.ts`.)

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  