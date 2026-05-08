# `portfolio_exclusive_assignments`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260422000003_portfolio_username_admin.sql`, `supabase/functions/admin-portfolio-usernames/`.

**Canonical owner:** Admin Portfolio Usernames panel.

---

Admin-curated, non-purchasable exclusive username assignments (e.g. partner / VIP). Stricter than `portfolio_premium_usernames` (which has a price and a status flow).

## Columns

| Column | Type | Notes |
|---|---|---|
| `username` | text PK | Owns the slug exclusively. |
| `user_id` | uuid → `auth.users(id)` CASCADE | Assignee. |
| `note` | text default `''` | Admin context. |
| `created_at` | timestamptz default now() | |
| `created_by` | uuid → `auth.users(id)` SET NULL | Admin. |

## Hard rules
- Username uniqueness is enforced across all four portfolio-username tables (rules, reserved, exclusive, premium) by `admin-portfolio-usernames`.
