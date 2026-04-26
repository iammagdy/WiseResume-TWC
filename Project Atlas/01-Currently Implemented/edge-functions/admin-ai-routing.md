# admin-ai-routing

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-ai-routing/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint that reads and writes the AI routing configuration for each supported feature (`tailor-resume`, `enhance-section`, `analyze-resume`, `generate-cover-letter`, `agentic-chat`, `wise-ai-chat`). Valid providers: `auto`, `openrouter`, `groq`. Note: `score-resume` is explicitly excluded — it is deterministic and never calls an LLM. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
