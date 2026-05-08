# verify-email

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/verify-email/index.ts`

---

## What it does

Custom email-verification flow for the Kinde-to-Supabase bridge. Token-based, branded via React Email + Resend.

**Method:** POST
**Body:** `{ action, ...payload }`

## Actions

| `action` | Auth | Body | Purpose |
|---|---|---|---|
| `send` | `Bearer SUPABASE_SERVICE_ROLE_KEY` | `{ user_id, email, first_name? }` | Generates a token, inserts into `email_verification_tokens`, sends branded `signup.tsx` verification email. Called fire-and-forget by `kinde-webhook` after provisioning. |
| `resend` | User Supabase JWT | `{}` | Re-sends verification for the currently authenticated user. Called by `AuthVerifyEmailPage` resend button. |
| `confirm` | Public (no auth) | `{ token }` | Validates the token, marks `profiles.email_verified = true`, sends branded `welcome.tsx`. Called by `AuthVerifyEmailPage` on mount when `?token=...` is present. |

## Token lifecycle

- Generated as `crypto.randomUUID()` (36 chars)
- TTL: `TOKEN_TTL_HOURS = 24`
- `upsertToken()` invalidates all existing unused tokens for the user (sets `expires_at = now()`) before inserting the new one — only one token is ever active per user.

## Required env vars

- `SUPABASE_URL` / `EXT_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `SITE_URL` — **REQUIRED** (function returns 503 if unset, so misconfigured environments fail loudly instead of silently redirecting to the wrong host).

## DB tables

- `email_verification_tokens` (read/write/expire)
- `profiles` (email_verified flag)

## Resend audiences

On successful confirm, `addContact()` adds the user to the `marketing` Resend audience via `_shared/resendAudiences.ts`.

## Email constants

`RESEND_FROM = "WiseResume <noreply@thewise.cloud>"`, `SITE_NAME = "WiseResume"`, `SITE_URL = "https://resume.thewise.cloud"`.
