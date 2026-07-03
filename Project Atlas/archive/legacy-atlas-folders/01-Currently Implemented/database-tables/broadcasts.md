# `broadcasts`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260510000000_broadcasts.sql`.

**Canonical owner:** DevKit broadcasts UI + `admin-broadcast` edge fn.

---

System-wide announcement banners shown in the app shell (and pushed to mobile via `device_push_tokens.notification_prefs.broadcast`).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text NOT NULL | |
| `body` | text NOT NULL | |
| `severity` | text CHECK default `info` | `info` / `warning` / `critical`. |
| `active` | bool default true | Soft-disable without delete. |
| `created_by` | text NOT NULL | Admin email. |
| `created_at` | timestamptz default now() | |
| `expires_at` | timestamptz NULL | Auto-hide; NULL = sticky. |

## Hard rules
- Only `active = true AND (expires_at IS NULL OR expires_at > now())` rows are surfaced to users.
- Mobile push for `severity = 'critical'` respects the `broadcast` notification pref.
