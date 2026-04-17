# Rate Limiting (Multi-Layer)

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/userRateLimiter.ts`
- `project-governance/ARCHITECTURE.md` §8 (Rate Limiting Multi-Layer + WiseHire AI Rate Limits)
- `project-governance/DECISIONS.md` Decision #6
- `replit.md` (Server-side LinkedIn Importer)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §8.

---

## Two coexisting layers — different purposes

| Layer | What it limits | Where | Failure behavior |
|---|---|---|---|
| **L1 — IP rate limiter** | Per-IP request count | `_shared/rateLimiter.ts` (`checkIpRateLimit`) backed by `rpc_rate_limits` table | **Fails open** when DB unreachable — public endpoints (portfolio, OG image) prefer availability |
| **L2 — AI credit system** | Per-user daily credits | `_shared/creditUtils.ts` + `atomic_attempt_and_deduct_credit` RPC, backed by `ai_usage_logs` | **Fails closed** — cost control wins (Decision #6) |

Both layers are always active for AI endpoints. They are not mutually exclusive.

→ `project-governance/ARCHITECTURE.md` §8 (Rate Limiting Multi-Layer).

## When each is used

- **Public, non-AI endpoints** (`portfolio-meta`, `og-image`, `track-portfolio-view`, `resolve-short-link`, public portfolio AI chat layer 1): L1 only.
- **Authenticated AI endpoints**: L1 (cheap pre-filter) **and** L2 (the binding constraint).
- **WiseHire AI endpoints**: `checkRateLimit` from `_shared/rateLimiter.ts` reads `ai_usage_logs` and **fails closed** — request blocked if DB unreachable.

## WiseHire AI rate limits (live)

| Tier | JD Writer | Brief Generator (daily) | Brief Generator (monthly) |
|---|---|---|---|
| Starter | 10/day (BYOK required) | 5/day (BYOK required) | 30/month |
| Professional | Unlimited | 50/day | None |
| Business / Enterprise | Unlimited | Unlimited | None |

→ `project-governance/ARCHITECTURE.md` §8 (WiseHire AI Rate Limits).

## LinkedIn import quota (separate, in-memory)

The server-side LinkedIn importer (`server/index.ts`, `POST /api/linkedin-profile`) currently throttles **in memory**: 5 req/min per (user, IP) and a per-user monthly cap of 50. Surviving restarts requires moving to a `linkedin_imports` DB table — that work is on the project task list (`Track LinkedIn import usage in the database…`).

→ `replit.md` (Server-side LinkedIn Importer).

## Tables involved

| Table | Role |
|---|---|
| `rpc_rate_limits` | DB-backed IP + user rate-limit timestamps. **All client access blocked by RLS** — only reachable via SECURITY DEFINER RPCs. → `replit.md` Security Audit. |
| `ai_usage_logs` | Source of truth for L2 (and WiseHire AI rate limits) |

## Files that must stay in sync

| File | Role |
|---|---|
| `supabase/functions/_shared/rateLimiter.ts` | L1 IP limiter + WiseHire `checkRateLimit` |
| `supabase/functions/_shared/userRateLimiter.ts` | Per-user fine-grained variants |
| `supabase/functions/_shared/creditUtils.ts` | L2 atomic credit check (the daily-limit gate) |
| `supabase/migrations/20260416000000_add_performance_indexes.sql` | Performance indexes on rate-limit and usage tables |
