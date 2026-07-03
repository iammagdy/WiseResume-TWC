# recruiter-simulation

  **Last verified:** 2026-05-04 (Task #41/44)
  **Status:** ⚠️ RETIRED — undeployed from Supabase 2026-05-04 (Task #44). Slot freed.
  **Type:** reference card (historical)
  **Sources:**
  - `supabase/functions/recruiter-simulation/index.ts` (retirement stub — 410 Gone)
  - Original implementation: git history pre-Task-#41

  ---

  **What it did:** AI mock-recruiter persona simulation for resume feedback.

  **Retired in favour of:** `editor-ai` with `x-editor-ai-action: recruiter-sim` header.
  All frontend calls transparently rewritten by `rewriteEditorAiInvoke` in
  `src/integrations/supabase/edgeFunctions.ts`.

  **Rollback:**
  ```
  supabase functions deploy recruiter-simulation
  ```
  (from a pre-Task-#41 commit), then flip `USE_MERGED_EDITOR_AI=false` in `edgeFunctions.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/functions/README.md`
  - `EDGE_FUNCTION_AUDIT.md` — Editor AI Phase 3 section
