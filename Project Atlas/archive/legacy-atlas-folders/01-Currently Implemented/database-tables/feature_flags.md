# `feature_flags`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260509000000_feature_flags.sql`, `supabase/functions/_shared/featureFlags.ts`.

**Canonical owner:** `_shared/featureFlags.ts` → `isFeatureEnabled()` + DevKit Feature Flags tab (`admin-feature-flags`).

---

Server-side feature-flag store. Combines kill-switch + per-user override + per-plan + percentage rollout in one row.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL UNIQUE | Flag key. |
| `description` | text default `''` | Operator-facing. |
| `enabled_globally` | bool default false | Master toggle. |
| `enabled_plans` | text[] default `{}` | e.g. `{pro, premium}`. |
| `enabled_user_ids` | uuid[] default `{}` | Per-user allow-list. |
| `percentage_rollout` | int 0–100 default 0 | Hash-bucketed by `userId`. |
| `kill_switch_function` | text NULL | If set, the named edge fn must 503 — flag returns FALSE regardless. |
| `updated_by` / `updated_at` | text / timestamptz | Audit. |
| `created_at` | timestamptz default now() | |

## Resolution precedence (highest → lowest)
1. `kill_switch_function` set → FALSE (caller 503).
2. `userId` ∈ `enabled_user_ids` → TRUE.
3. plan ∈ `enabled_plans` → TRUE.
4. `enabled_globally` → TRUE.
5. hash(`userId`) % 100 < `percentage_rollout` → TRUE.
6. else FALSE.

## Hard rules
- Edits only through DevKit (`admin-feature-flags`), never raw SQL in production.
- Kill-switch is the ops-pager — every fail-open path that depends on a flag should be aware of it.
