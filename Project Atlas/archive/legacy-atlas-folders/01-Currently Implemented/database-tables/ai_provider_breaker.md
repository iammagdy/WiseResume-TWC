# `ai_provider_breaker`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260424000000_ai_provider_breaker.sql`, `supabase/functions/_shared/aiClient.ts`.

**Canonical owner:** AI client circuit-breaker layer (currently no-op stub — see Gotcha in `replit.md`).

---

Per-provider circuit-breaker state for the flat-pool AI client. Schema retains the half-open / single-probe lock design even though `recordBreakerEvent` is currently a no-op (`replit.md` Gotcha).

## Columns

| Column | Type | Notes |
|---|---|---|
| `provider` | text PK | `openrouter` / `groq` / `deepseek`. |
| `failure_count` | int default 0 | Failures in current window. |
| `window_started_at` | timestamptz default now() | |
| `opened_until` | timestamptz | When breaker re-closes. |
| `probe_in_flight_until` | timestamptz | Single-probe deadlock guard. |
| `last_success_at` / `last_failure_at` | timestamptz | |
| `updated_at` | timestamptz default now() | |

## Hard rules
- The breaker is currently a no-op (`replit.md` → "AI Circuit Breaker No-Op"). Schema preserved so reactivation is a code-only change.
- If reactivated, exactly one caller across all instances may probe at a time — guarded by `probe_in_flight_until`.
