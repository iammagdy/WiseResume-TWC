# `portfolio_premium_usernames`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260514000001_portfolio_premium_usernames.sql`.

**Canonical owner:** Premium portfolio username inventory + checkout flow.

---

Catalog of paid-tier portfolio username slots with price + status state machine.

## Columns

| Column | Type | Notes |
|---|---|---|
| `username` | text PK | The slug being sold. |
| `price_cents` | int default 0 CHECK ≥ 0 | |
| `currency` | text default `usd` | |
| `status` | text CHECK default `available` | `available` / `pending` / `assigned`. |
| `assigned_to_user_id` | uuid → `profiles(user_id)` SET NULL | |
| `assigned_at` | timestamptz | |
| `note` | text | |
| `created_at` / `updated_at` | timestamptz | |

## Hard rules
- Status transitions only via admin endpoints — never client-writable.
- Slug uniqueness across all portfolio-username tables.
