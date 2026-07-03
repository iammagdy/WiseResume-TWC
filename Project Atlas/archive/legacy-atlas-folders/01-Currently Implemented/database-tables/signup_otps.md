# `signup_otps`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260309024947_8d3a8fb3-4b5b-4a94-8be2-5aa048b7ceb4.sql`.

**Canonical owner:** Legacy email/password signup OTP flow (pre-Kinde-only auth).

---

One-time codes for the legacy email/password signup OTP flow. **Largely superseded** by Kinde-based email verification (`email_verification_tokens`) but the table is retained for any non-Kinde branch.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `email` | text NOT NULL | |
| `otp_code` | text NOT NULL | |
| `action_link` | text NOT NULL | Magic-link target. |
| `created_at` | timestamptz default now() | |
| `expires_at` | timestamptz default now() + 10m | |
| `used` | bool default false | |

## Hard rules
- Treat as legacy — new signup flows use Kinde + `email_verification_tokens`.
- Single-use: must atomically flip `used` on consume.
