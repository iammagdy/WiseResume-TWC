# `portfolio_username_rules`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260422000003_portfolio_username_admin.sql`.

**Canonical owner:** Admin Portfolio Usernames panel.

---

Singleton row holding global validation rules for portfolio usernames.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | int PK CHECK (= 1) | Singleton. |
| `min_length` | int default 3 CHECK 1..100 | |
| `max_length` | int default 30 CHECK 1..100 | |
| `allow_hyphens` | bool default true | |
| `updated_at` | timestamptz default now() | |
| `updated_by` | uuid → `auth.users(id)` SET NULL | |
| CHECK | `min_length <= max_length` | |

## Hard rules
- Always exactly one row.
- Per-user exceptions live in `portfolio_user_overrides`.
