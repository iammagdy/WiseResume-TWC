# 17 — Ops health + error streams

**Last verified:** 2026-05-08
**Type:** critical-system card
**Sources:** `supabase/functions/_shared/opsHealth.ts`, `supabase/functions/_shared/fnLogger.ts`, `supabase/functions/_shared/scrubSecrets.ts`, `ops_health_events`, `edge_function_logs`, `error_log`, `replit.md`.

**Canonical owner:** Three coupled tables + their writers.

---

WiseResume separates operator-facing health signals from user-visible errors and from raw invocation telemetry:

| Stream | Table | Writer | Reader |
|---|---|---|---|
| **Fail-open signals** | `ops_health_events` | `_shared/opsHealth.ts` → `recordOpsHealthEvent(event, feature, reason)` | `ops_health_recent_counts(p_window_minutes)` RPC, DevKit Health tab. |
| **Per-invocation telemetry** | `edge_function_logs` | `_shared/fnLogger.ts` → `logInvocation(name, status, latency, isError)` | DevKit Edge Functions tab + `admin-observability`. |
| **Errors / structured logs** | `error_log` | Direct inserts (after `scrubSecrets`) | DevKit Errors tab. |

## Contract for fail-open paths
Every code path that gracefully degrades — rate limiter softening, AI breaker no-op, admin-settings DB error, missing override row, etc. — **must** call `recordOpsHealthEvent()` so the operator sees it in the health stream (`replit.md`).

`ops_health_events` deliberately has **no `user_id` / IP columns** — it is operator-land, and we will not pollute it with PII. Keep it that way.

## Secret scrubbing contract
Every string that:
- ends up in `error_log.message` or `.context`,
- gets returned in a JSON envelope to the browser,
- or gets written to stderr,

MUST first pass through `_shared/scrubSecrets.ts` (`scrubSecrets` / `scrubAndCap`). Gemini calls authenticate via `x-goog-api-key` header — never via `?key=…` (`replit.md` AI error secret-scrub rule).

## Hard rules
- Read `ops_health_events` only via the `ops_health_recent_counts` RPC, never raw SELECT.
- `fnLogger.logInvocation` is fire-and-forget — instrumentation must never affect the primary response path.
- New error sinks must go through `scrubSecrets.ts` — no exceptions.
