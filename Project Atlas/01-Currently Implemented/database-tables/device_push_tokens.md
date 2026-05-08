# `device_push_tokens`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260601000000_mobile_device_tokens_and_versions.sql`, `supabase/functions/register-push-token/`, `supabase/functions/send-push/`.

**Canonical owner:** Mobile push notifications subsystem (critical-system 13).

---

Per-device push notification tokens for iOS/Android/Web push. Written by `register-push-token`; consumed by `send-push` and `weekly-digest`.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `profiles(user_id)` CASCADE | |
| `token` | text NOT NULL | Expo / FCM / APNs / Web push token. |
| `platform` | text CHECK | `ios` / `android` / `web`. |
| `app_version` | text | Set on register. |
| `device_id` | text | Stable per-device identifier. |
| `locale` | text | For localized notifications. |
| `notification_prefs` | jsonb default `{interview, application, resume, account, broadcast → true}` | Per-channel opt-in. |
| `last_seen_at` | timestamptz default now() | Touched on every register. |
| `revoked_at` | timestamptz | Set on logout / token rotation. |
| `created_at` / `updated_at` | timestamptz | |
| UNIQUE | (`user_id`, `token`) | |

## Hard rules
- Replit `replit.md` Gotcha: requires both `register-push-token` edge fn and this table to be live.
- `send-push` must filter on `revoked_at IS NULL` and the matching `notification_prefs` channel.
