# `portfolio_reserved_usernames`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260422000003_portfolio_username_admin.sql`.

**Canonical owner:** Admin Portfolio Usernames panel.

---

Brand / safety / reserved-word list of usernames that no user may claim (e.g. `admin`, `support`, brand names).

## Columns

| Column | Type | Notes |
|---|---|---|
| `username` | text PK | |
| `reason` | text default `''` | Admin justification. |
| `created_at` | timestamptz default now() | |
| `created_by` | uuid → `auth.users(id)` SET NULL | |

## Hard rules
- Checked at username validation time (`admin-portfolio-usernames`) — must short-circuit before slug write.
