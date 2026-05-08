# `ops_health_events`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260507000020_ops_health_events.sql`, `supabase/functions/_shared/opsHealth.ts`, `replit.md`.

**Canonical owner:** `_shared/opsHealth.ts` (writer) + `ops_health_recent_counts(p_window_minutes)` RPC (reader).

---

Operator-side health stream. Every fail-open code path (rate limiter degraded, AI breaker no-op, admin-settings DB error, etc.) writes one row.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | bigserial PK | |
| `ts` | timestamptz default now() | |
| `event` | text NOT NULL CHECK len ≤ 64 | Event slug. |
| `feature` | text CHECK len ≤ 64 | Feature key. |
| `reason` | text CHECK len ≤ 200 | Brief reason. |

## Hard rules (`replit.md`)
- **No `user_id` / IP columns** — operator land, not user land. Never add identifiers to keep this stream PII-free.
- Read per-(event, feature) hourly counts via the `ops_health_recent_counts(p_window_minutes)` RPC, never raw SELECT.
- Every fail-open path must write here — that is the contract.
