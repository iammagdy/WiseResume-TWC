# send-push

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/send-push/index.ts`

---

## What it does

Server-to-server fan-out endpoint for push notifications. Used by other edge functions, cron jobs, webhooks, and admin tools.

**Method:** POST only (405 otherwise)
**Auth:** Shared secret `EDGE_INTERNAL_TOKEN` in the `x-internal-token` header (NOT a user JWT). Returns 403 on mismatch. `verify_jwt = false` in `supabase/config.toml`.
**Body:** `{ user_ids: string[], title: string, body: string, data?: object, category?: 'interview'|'application'|'resume'|'account'|'broadcast' }`

## Flow

1. Validates internal token + payload shape (400 if `user_ids` empty/missing).
2. Selects unrevoked tokens from `device_push_tokens` for the given user_ids.
3. Filters tokens by per-category opt-in: `device_push_tokens.notification_prefs[category] !== false`. Default category is `broadcast`.
4. Sends a batched POST to Expo's push endpoint: `https://exp.host/--/api/v2/push/send`.

## DB tables

- `device_push_tokens` — columns read: `token, notification_prefs`. Filtered: `revoked_at IS NULL` AND `user_id IN (…)`.

## External services

- Expo Push API (no Expo credentials required for projectless tokens; signed delivery handled upstream by Expo).
