# `impersonation_revocations`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/migrations/20260521000001_impersonation_revocations.sql`, `supabase/functions/admin-impersonate/`.

**Canonical owner:** Admin impersonation flow (Pages: `actas.md`, `devkit`).

---

Per-target revocation list for admin impersonation. When a user (or admin) revokes an active impersonation grant, a row is inserted; subsequent impersonation tokens for that user are rejected until the row is cleared.

## Columns

| Column | Type | Notes |
|---|---|---|
| `target_user_id` | uuid PK | The user being impersonated. |
| `revoked_at` | timestamptz default now() | |
| `revoked_by` | text | Admin email or `self`. |

## Hard rules
- Checked by `admin-impersonate` before issuing or honoring an impersonation token.
- Inserts are **admin-driven only** (via `admin-impersonate` revoke action) — never written by the impersonated user themselves.
- Single row per target — re-revocation is an UPSERT.
- Every insert is paired with an `audit_logs` row (`category = 'admin_impersonation'`, `action = 'impersonation_revoke'`).
