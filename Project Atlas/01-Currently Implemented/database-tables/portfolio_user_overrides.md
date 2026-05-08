# `portfolio_user_overrides`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260422000003_portfolio_username_admin.sql`.

**Canonical owner:** Admin Portfolio Usernames panel.

---

Per-user override of `portfolio_username_rules`. Any column left NULL inherits the global rule.

## Columns

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid PK → `auth.users(id)` CASCADE | |
| `min_length` | int CHECK 1..100 | NULL = inherit. |
| `max_length` | int CHECK 1..100 | NULL = inherit. |
| `allow_hyphens` | bool | NULL = inherit. |
| `note` | text default `''` | Admin context. |
| `updated_at` | timestamptz default now() | |
| `updated_by` | uuid → `auth.users(id)` SET NULL | |

## Hard rules
- Resolution: per-user override wins over singleton when non-NULL.
