# Phase 4 — AI Provider Resilience (Circuit Breaker + Refund Fix + BYOK Errors)

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `.local/tasks/phase-4-ai-resilience.md`
- `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `supabase/functions/_shared/dbClient.ts`
- `supabase/functions/ai-health/index.ts`
- `server/schema.ts` (new `ai_provider_breaker` table)
- `src/hooks/useAIAction.ts`, `src/hooks/useAIEnhance.ts`
- `project-governance/CHANGELOG.md` entry dated 2026-04-18 — Phase 4

**Canonical owner:** `.local/tasks/phase-4-ai-resilience.md` (task brief) + `_shared/aiClient.ts` (live truth) + `../critical-systems/02-ai-routing-chain.md` (chain deep-dive).

---

**What it is:** Adds a Postgres-backed circuit breaker so the 8-step AI provider fallback chain stops walking through a known-broken provider on every single request, fixes the off-by-day bug in `atomic_refund_credit` when a deduction crosses midnight UTC, and turns silent BYOK fallbacks into structured, classified errors the UI can act on.

**Where it lives:** Schema (`ai_provider_breaker`), shared edge-function helpers, and the two AI-action React hooks.

**Key facts:**
- New table: `ai_provider_breaker (provider text primary key, failure_count int, window_started_at timestamptz, opened_until timestamptz)` plus an upsert helper RPC. Layered onto Phase 1's schema work. → `server/schema.ts`
- Breaker logic in `aiClient.ts`: each provider step checks `opened_until > now()` first and skips the step entirely while the breaker is open. After a call, failures are atomically incremented (or reset on success). Threshold and cool-down are env-configurable; defaults: **5 failures in 60s opens for 60s**, then a single probe request on next call. → `supabase/functions/_shared/aiClient.ts`
- Refund row targeting: the deduction RPC's returned `usage_date` is captured in `creditUtils.ts` and passed explicitly to `atomic_refund_credit`, so refunds always hit the same row even when the deduction and refund cross midnight. → `supabase/functions/_shared/creditUtils.ts`
- BYOK errors are classified into `invalid_key`, `quota_exceeded`, `upstream_5xx` and returned as a typed error to the caller; `useAIAction` and `useAIEnhance` surface the reason in the toast instead of a generic "AI failed" message. → `supabase/functions/_shared/aiClient.ts`, `src/hooks/useAIAction.ts`, `src/hooks/useAIEnhance.ts`
- Admin observability: read-only `ai-breaker-status` edge function exposes the current breaker state per provider (one row per provider with `failure_count`, `window_started_at`, `opened_until`, `last_success_at`, `last_failure_at`, derived `is_open`). Gated by `requireAdminAuth`. → `supabase/functions/ai-breaker-status/index.ts`, `supabase/functions/_shared/adminAuth.ts`

**Out of scope on this card:** adding new AI providers, changing per-feature credit costs, or any frontend AI component beyond the two hooks above.

**Related cards:** `../critical-systems/02-ai-routing-chain.md` (full 8-step chain), `../critical-systems/03-credits-and-byok.md` (atomic deduction + BYOK), `./phase-1-db-integrity-and-indexes.md` (schema baseline this layers onto).

---

## Addendum — Task #49 (2026-04-19): refundCredit() coverage across all 24 AI edge functions

**What it adds:** Every failure path that occurs after `checkAndDeductCredit()` in all 24 WiseResume AI edge functions now calls `refundCredit()`. Phase 4 introduced the `atomic_refund_credit` RPC and the `creditUtils.ts` helper; this addendum ensures every edge function actually calls it on every failure type — not just AI call exceptions, but also empty/null response content, unparseable AI JSON, tool-call argument parse failures, fetch network errors, non-OK HTTP status codes, and missing response payloads.

**Functions patched:**
- 1 credit: `analyze-resume`, `career-assessment`, `career-path-advisor`, `one-page-optimizer`, `recruiter-simulation`, `generate-resignation-letter`, `explain-gap`, `fill-gap`, `tailor-section`, `company-briefing`, `optimize-for-linkedin`, `parse-linkedin`, `generate-question-bank`, `suggest-template`, `detect-and-humanize`, `enhance-section`, `generate-headshot`, `parse-job-url`, `parse-job-text`, `elevenlabs-scribe-token`, `parse-resume`
- 2 credits: `generate-cover-letter`, `tailor-resume` (Stage 2 only)
- Multi-path: `generate-portfolio-bio` (7 separate `callAI` paths across 5 `creditCheck` scopes)

**Structural hoisting required for correct `creditCheck` scoping:**
- `detect-and-humanize`: `creditCheck` hoisted above detect/humanize `if`-blocks so both branches share one reference.
- `parse-job-text`: `creditCheck` hoisted above the inner AI `try` block.
- `elevenlabs-scribe-token`: `creditCheck` hoisted out of the `!hasByokKey` block so optional-BYOK path can also refund.
- `parse-resume`: `_refundUserId` hoisted before the outer `try`; inner catch refunds on 429 rate-limit and on service-unavailable fallback (503/500/0/401/403/404) even when `localParseResume` returns a partial result; outer catch refund guarded by `if (creditCheck && _refundUserId)`.
- `generate-headshot`: `response.json()` wrapped in `try/catch` with refund; refund added before `!imagePart?.inlineData` 500 return.
- `parse-linkedin`: refund added before `throw new Error("No structured data returned from AI")`.
- `enhance-section`: refund added before `throw new Error('No content in AI response')`.

**Invariant:** `refundCredit()` is a no-op for BYOK users and unlimited (premium) users — they are never charged, so the call is always safe to add unconditionally.
