# Credits + BYOK

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `supabase/functions/_shared/creditUtils.ts`
- `supabase/functions/_shared/planLimits.ts`
- `src/lib/planConfig.ts`
- `src/hooks/useMe.ts`
- `project-governance/ARCHITECTURE.md` §8 (Credit System + BYOK)
- `replit.md` (Subscription & Credits System + Security Audit)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §8.

---

## Daily AI credit limits

Plan-authoritative. The `ai_credits.daily_limit` column is **not** read for enforcement — limits are derived at runtime from the user's active subscription plan. → `replit.md` (Subscription & Credits System).

| Plan | Daily limit | Sentinel |
|---|---|---|
| `free` | 5 | — |
| `pro` | 100 | — |
| `premium` | unlimited | stored as `-1`, displayed as ∞ |

Both `src/lib/planConfig.ts` (`PLAN_CREDIT_LIMITS`) and `supabase/functions/_shared/planLimits.ts` must stay in sync. → `replit.md` (Known Rules & Constraints).

## Atomic deduction — fail closed

Credits are deducted **before** the AI call via the `atomic_attempt_and_deduct_credit` RPC to prevent race conditions. If the DB call fails, the request is **blocked**, not allowed through. → `project-governance/DECISIONS.md` Decision #6 (Fail-Closed Rate Limiting).

Cost per call:
- Standard endpoints: 1 credit
- `generate-cover-letter`, `tailor-resume`: 2 credits
- `score-resume`: **0 credits** (no AI call — Rule B)

## BYOK — Bring Your Own Key

Supported providers (9): OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama.

- Keys live in `user_api_keys`, encrypted **AES-GCM-256** with per-user salt `user-api-keys-salt-v2-{userId}`. → `project-governance/ARCHITECTURE.md` §8.
- **BYOK bypasses platform credit deduction** (Steps 1–4 of the routing chain).
- **Key existence is verified before bypass.** Setting the `ai_provider` preference alone is no longer enough — `creditUtils.ts` checks for an actual row in `user_api_keys`. → `replit.md` (Security Audit, 2026-04-14 → 2026-04-17).

## Canonical hooks / sources of truth

- `useMe` (`src/hooks/useMe.ts`) — queryKey `['me', user?.id]` — single source of truth for plan, credits, preferences. Backed by the `me` Edge Function.
- `creditUtils.ts` derives the daily limit from plan **on every request** to prevent downgrade/trial-expiry escalation.

## Database tables involved

| Table | Role |
|---|---|
| `ai_credits` | `daily_usage`, `usage_date` per user (limit derived, not stored-and-trusted) |
| `ai_usage_logs` | Audit trail of every AI call (also used by rate limiter) |
| `credit_transactions` | History of credit additions/deductions; explicit RLS block policies on INSERT/UPDATE/DELETE for clients (only SELECT) |
| `user_api_keys` | Encrypted BYOK keys |
| `subscriptions` | Plan tier, trial dates; SELECT-only for clients (lifecycle managed by Stripe via service_role) |

→ `project-governance/ARCHITECTURE.md` §5; `replit.md` (Security Audit RLS hardening).

## Coupons & trials

- `redeem-coupon` Edge Function — user-facing redemption; calls `upsert_ai_credits_limit` RPC after success.
- `validate-coupon` — preview without redeeming.
- `admin-grant-trial` / `admin-revoke-trial` / `admin-set-credits` — admin overrides via Dev Kit.

→ `project-governance/ARCHITECTURE.md` §7 (Coupons & Billing + Admin & Dev Kit).
