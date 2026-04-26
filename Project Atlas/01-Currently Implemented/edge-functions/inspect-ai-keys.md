# inspect-ai-keys

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/inspect-ai-keys/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin-only endpoint that reports which of the 6 managed AI provider keys are present on the server (3 OpenRouter slots + 3 Groq slots) with a tail-only masked preview. The raw key value is **never** returned. Response shape: `{ success: true, keys: [{ provider, slot, configured, masked, model }] }`. Powers the AI key status display in the Dev Kit UI.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
