# `analytics_sweep_lock`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260425000000_analytics_retention.sql`, `supabase/functions/purge-old-visitor-events/`.

**Canonical owner:** Analytics retention cron.

---

Singleton lock row guaranteeing only one analytics sweep (visitor-events purge) runs at a time across all instances.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | int PK CHECK (= 1) | Singleton enforcement. |
| `holder` | text NOT NULL | Process / cron name holding the lock. |
| `acquired_at` | timestamptz default now() | |
| `expires_at` | timestamptz NOT NULL | Auto-release deadline. |

## Hard rules
- Always exactly one row (`id = 1`).
- Holders must release explicitly or wait for `expires_at` deadline.
