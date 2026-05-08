# `admin_sessions`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260507000000_admin_sessions.sql`, `supabase/functions/_shared/adminAuth.ts`, `supabase/functions/verify-dev-kit/`.

**Canonical owner:** DevKit auth path.

---

DevKit (admin panel) session store. Issued by `verify-dev-kit` after password + TOTP login; consumed on every protected admin edge function via `_shared/adminAuth.ts` (HMAC-SHA-256 token of `email:sessionId:expiresAt`).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Session ID (embedded in HMAC token). |
| `email` | text NOT NULL | Admin email that logged in. |
| `issued_at` | timestamptz default now() | |
| `expires_at` | timestamptz NOT NULL | Hard expiry. |
| `revoked_at` | timestamptz | Set by force-logout. |
| `last_used_at` | timestamptz | Touched on each admin call. |
| `ip` | inet | First-seen IP. |
| `user_agent` | text | First-seen UA. |

## Hard rules
- Token transport is **`Authorization: Bearer <token>` only** (audit finding M6 / AUTH-5 — body transport removed). → `_shared/adminAuth.ts`.
- All `admin-*` edge functions and the `app.all('/api/fn/admin-*')` Express bridge routes resolve sessions through this table.
