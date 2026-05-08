# `mobile_app_versions`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260601000000_mobile_device_tokens_and_versions.sql`, `supabase/functions/mobile-config/`.

**Canonical owner:** Mobile config edge fn + Expo client version-gate.

---

Per-platform mobile app version policy: minimum supported version (force-update threshold), latest version, optional banner.

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `platform` | text CHECK | `ios` / `android`. |
| `min_supported_version` | text NOT NULL | Below this → force update. |
| `latest_version` | text NOT NULL | |
| `release_notes` | text | |
| `is_force_update` | bool default false | Override: force regardless of min. |
| `banner_message` | text | In-app banner content. |
| `banner_severity` | text CHECK | `info` / `warning` / `critical`. |
| `released_at` | timestamptz default now() | |
| `created_at` / `updated_at` | timestamptz | |

## Hard rules
- `mobile-config` returns the **latest** row per platform — historical rows are kept for audit.
- Edits via DevKit Mobile tab only; never client-writable.
