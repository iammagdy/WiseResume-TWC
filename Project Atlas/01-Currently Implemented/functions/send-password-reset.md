# send-password-reset

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/send-password-reset/index.ts`

---

## What it does

Sends a branded password-reset email for users authenticated through the Kinde-Supabase bridge. Always returns `{ success: true }` to prevent email enumeration.

**Method:** POST
**Auth:** Public (no JWT required)
**Body:** `{ email: string }`

## Flow

1. Look up the user's `kinde_sub` via `token_exchanges` joined with `profiles` (by email).
2. Obtain a Kinde Management API M2M token via `client_credentials` against `${KINDE_DOMAIN}/oauth2/token`.
3. Call `POST /api/v1/users/{kinde_sub}/password_reset` — Kinde returns the tokenized reset URL **but does NOT send its own email** for this API.
4. Render the branded `recovery.tsx` React Email template with the Kinde reset link injected.
5. Send via Resend (`from: WiseResume <noreply@thewise.cloud>`).
6. Always reply 200 `{ success: true }`.

## Required env vars

- `SUPABASE_URL` / `EXT_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `KINDE_DOMAIN` — e.g. `https://thewisecloud.kinde.com`
- `KINDE_M2M_CLIENT_ID` — M2M app with `manage:users` scope
- `KINDE_M2M_CLIENT_SECRET`
- `RESEND_API_KEY`
- `SITE_URL` (optional, defaults to `https://resume.thewise.cloud`)

## DB tables

- `token_exchanges` (read), `profiles` (read)
