# `ai_key_migration_audit`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260507000010_user_api_keys_key_version_and_audit.sql`.

**Canonical owner:** API-key encryption rotation runbook (`docs/ops/api-key-encryption-rotation.md`).

---

Audit trail for the BYOK API-key encryption-version rotation campaign. One row per attempt to migrate a `user_api_keys` row from key-version 1 → 2 (or to record why migration was skipped/failed).

## Columns

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL | Owner of the API key. |
| `provider` | text NOT NULL | `openrouter` / `groq` / `deepseek`. |
| `action` | text CHECK | One of: `migrated`, `skipped_v2`, `decrypt_failed`, `reencrypt_failed`, `update_failed`. |
| `from_version` / `to_version` | smallint | Key-version transition. |
| `details` | jsonb | Error context, never the key material. |
| `created_at` | timestamptz default now() | |

## Hard rules
- BYOK is **fully removed** from runtime (`replit.md`), but the audit table is retained for the rotation history.
- Never log raw key material into `details`.
