# ai-breaker-status

**Last verified:** 2026-04-18
**Type:** reference card
**Sources:**
- `supabase/functions/ai-breaker-status/index.ts`
- `supabase/functions/_shared/adminAuth.ts`
- `supabase/functions/_shared/dbClient.ts`
- `Project Atlas/01-Currently Implemented/stability-fixes/phase-4-ai-provider-resilience.md`

**Canonical owner:** `.local/tasks/phase-4-ai-resilience.md` (task brief) + `supabase/functions/ai-breaker-status/index.ts` (live truth).

---

**What it does:** Read-only debug endpoint that exposes the current state of the Postgres-backed AI provider circuit breaker (`ai_provider_breaker` table) added in Phase 4 of the stability initiative. One row per provider: `failure_count`, `window_started_at`, `opened_until`, `last_success_at`, `last_failure_at`, plus a derived `is_open` boolean. Lets admins see which providers the breaker is currently skipping. → `supabase/functions/ai-breaker-status/index.ts`

**Auth:** `requireAdminAuth` — DevKit session token passed in the JSON body as `password`, matching the convention used by every other admin-* function. → `supabase/functions/_shared/adminAuth.ts`

**Method:** POST only. GET is rejected with 405 because `requireAdminAuth` has no header-based intake path. → `supabase/functions/ai-breaker-status/index.ts:49-54`

**Related:**
- `Project Atlas/01-Currently Implemented/stability-fixes/phase-4-ai-provider-resilience.md`
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
