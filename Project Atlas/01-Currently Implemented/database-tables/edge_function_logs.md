# `edge_function_logs`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260512000001_edge_function_logs.sql`, `supabase/functions/_shared/fnLogger.ts`.

**Canonical owner:** `_shared/fnLogger.ts` → `logInvocation()`.

---

Per-invocation latency + status code log for every Supabase edge function. Fire-and-forget insert; instrumentation must never affect the primary response path.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `function_name` | text NOT NULL | Edge fn slug. |
| `status_code` | int default 200 | |
| `latency_ms` | int default 0 | |
| `error` | bool default false | |
| `created_at` | timestamptz default now() | |

## Hard rules
- Inserts are fire-and-forget — `fnLogger` swallows all errors.
- DevKit "Edge Functions" tab + `admin-observability` read aggregate counts from this table.
- Retention/sweeping is cron-driven (see `analytics_sweep_lock` family).
