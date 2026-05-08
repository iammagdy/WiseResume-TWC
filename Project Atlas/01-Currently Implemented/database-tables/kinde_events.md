# `kinde_events`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260513000001_moderation_and_integrations.sql`, `supabase/functions/kinde-webhook/`.

**Canonical owner:** `kinde-webhook` edge fn.

---

Audit log of every Kinde webhook delivered to the `kinde-webhook` edge function. Used both for replay/debug and for monitoring user-provisioning health.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `event_type` | text NOT NULL | Kinde event slug (e.g. `user.created`, `user.updated`). |
| `kinde_user_id` | text | `kp_xxx` ID. |
| `email` | text | |
| `payload` | jsonb | Raw signed body (already verified). |
| `provisioning_ok` | bool | Whether downstream `provisionUser()` succeeded. |
| `created_at` | timestamptz default now() | |

## Hard rules
- Signature must be HMAC-verified before insert (`_shared/webhookAuth.ts`).
- `kinde_user_id` is the raw `kp_xxx`; never use it as `user.id` (`replit.md` rule).
