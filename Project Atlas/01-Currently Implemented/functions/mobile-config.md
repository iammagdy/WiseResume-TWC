# mobile-config

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/mobile-config/index.ts`

---

## What it does

Anonymous read-only endpoint used by the Expo app on cold-start to discover whether the installed build is supported, force-update required, or has an optional banner message.

**Method:** GET (and OPTIONS preflight)
**Auth:** none (rate-limited by Supabase gateway)
**Query:** `?platform=ios|android&version=<semver>`

## Logic

1. Validates `platform` (400 otherwise).
2. Reads the most recent `mobile_app_versions` row for that platform.
3. Compares the caller's `version` against `min_supported_version` (lt → `update_required: true`) and `latest_version` (lt → `update_available: true`) using a tuple semver compare.
4. Returns `{ platform, version, latest_version, min_supported_version, update_required, update_available, release_notes, is_force_update, banner_message, banner_severity, updated_at }`.

## DB table

- `mobile_app_versions` — columns: `platform, min_supported_version, latest_version, release_notes, is_force_update, banner_message, banner_severity, updated_at`. Each platform's most recent row by `updated_at` wins.

## Defaults

If no row exists for the platform: `latest_version = "1.0.0"`, `min_supported_version = "1.0.0"` (treats every install as supported).
