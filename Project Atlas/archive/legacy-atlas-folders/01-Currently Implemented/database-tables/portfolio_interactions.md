# `portfolio_interactions`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260421000001_portfolio_interactions.sql`.

**Canonical owner:** Public portfolio engagement tracking.

---

Anonymous "interested" interactions on public portfolios (de-duped by client UUID token to prevent inflation from refresh).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `token` | text NOT NULL UNIQUE | Client-generated UUID — dedupe key. |
| `portfolio_username` | text NOT NULL | Slug, not FK (portfolio rename should not orphan). |
| `interaction_type` | text CHECK default `interested` | Currently single-valued. |
| `referrer_hostname` | text | First-party referrer only. |
| `created_at` | timestamptz default now() | |

## Hard rules
- `token` is the primary dedupe — same client cannot register twice.
- Visitor IP / user-agent intentionally **not** stored (privacy).
