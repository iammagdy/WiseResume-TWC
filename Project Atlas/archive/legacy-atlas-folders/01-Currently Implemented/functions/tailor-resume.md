# tailor-resume

  **Last verified:** 2026-05-06
  **Type:** reference card
  **Sources:**
  - `supabase/functions/tailor-resume/index.ts`
  - `supabase/functions/_shared/keywordScoring.ts` (stem, tokenize, countKeywordInTokens, resumeToText)
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Tailors a resume to a job description. 2 credits.

  **Auth:** JWT (`requireAuth`) + L1 IP rate limit + L2 atomic credit check + payload size guard. → critical-system 09.

  **Related:**
  - `Project Atlas/01-Currently Implemented/functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
  