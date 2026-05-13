# smart-fit-rewrite

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/smart-fit-rewrite/index.ts`
- `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/modelRouter.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/authMiddleware.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 + §8 (Edge Functions + AI System)

---

**What it does:** AI-powered rewrite of resume section text for one-page fit optimisation. Takes a section's text and a list of "protected tokens" (terms that must not be shortened or paraphrased), and returns a condensed version that preserves meaning and all protected phrases. Uses the `one-page-optimizer` model routing slot. Full four-layer security invariant (JWT auth → rate limit → credit check → payload size guard).

**Auth:** `requireAuth` (user JWT).

**Credit cost:** deducts 1 credit; refunded on failure via `refundCredit`.

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
- `Project Atlas/01-Currently Implemented/functions/one-page-optimizer.md`
- `Project Atlas/01-Currently Implemented/functions/README.md`
