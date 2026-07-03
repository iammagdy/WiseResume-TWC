# `email_verification_tokens`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260515000001_email_verification.sql`, `supabase/functions/verify-email/`, `server/schema.ts`.

**Canonical owner:** Email/password verification flow (`replit.md` Gotcha — new sign-ups require verification before access).

---

One-time tokens for email-verification links sent to new email/password sign-ups. Consumed by the `verify-email` edge function, which sets `profiles.email_verified = true`.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `profiles(user_id)` CASCADE | |
| `token` | text NOT NULL UNIQUE | URL-safe random; one-shot. |
| `expires_at` | timestamptz NOT NULL | Hard expiry. |
| `used_at` | timestamptz | Set when consumed. |
| `created_at` | timestamptz default now() | |

## Hard rules
- Single-use: `verify-email` must check `used_at IS NULL AND expires_at > now()` and atomically set `used_at`.
- Tokens are URL-safe random; never log them.
