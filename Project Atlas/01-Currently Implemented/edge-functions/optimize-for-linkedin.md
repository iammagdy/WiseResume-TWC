# optimize-for-linkedin

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/optimize-for-linkedin/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Rewrites resume content for LinkedIn About section.

  **Auth:** JWT (`requireAuth`) + L1 IP rate limit + L2 atomic credit check + payload size guard. → critical-system 09.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
  