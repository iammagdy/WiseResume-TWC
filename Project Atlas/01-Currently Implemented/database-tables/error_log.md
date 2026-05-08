# `error_log`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260420000022_error_log.sql`.

**Canonical owner:** DevKit "Errors" surface + edge-function error reporting helpers.

---

General-purpose error / log sink for edge functions and admin operations. Distinct from `edge_function_logs` (per-invocation latency) and `ops_health_events` (fail-open signals).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `created_at` | timestamptz default now() | |
| `level` | text CHECK default `error` | `debug` / `info` / `warn` / `error` / `fatal`. |
| `message` | text NOT NULL | Already secret-scrubbed (`_shared/scrubSecrets.ts`). |
| `context` | jsonb | Structured context. |
| `source` | text | Function / module name. |
| `user_id` | uuid → `auth.users(id)` SET NULL | Optional. |
| `resolved` | bool default false | Operator-flagged. |

## Hard rules
- Every string must be passed through `_shared/scrubSecrets.ts` first (`replit.md` AI error secret-scrub rule applies broadly to anything stored or surfaced).
