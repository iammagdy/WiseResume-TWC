# admin-wisehire

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/admin-wisehire/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #54)

---

## What it does

Consolidated router for 4 admin-only WiseHire management functions. Replaces (4 → 1):

| `body.action` | Was | Purpose | Audit log |
|---|---|---|---|
| `invite` | `admin-wisehire-invite` | Issues a UUID invite + HMAC-signed token, sends branded WiseHire invite email via Resend | `admin_email` / `wisehire_invite` |
| `reset-user` | `admin-wisehire-reset-user` | Test-only reset of a WiseHire test account (clears profile state) | `admin` / `wisehire_test_reset` |
| `revoke-invite` | `admin-wisehire-revoke-invite` | Marks a pending invite as revoked | `admin_email` / `wisehire_invite_revoke` |
| `waitlist` | `admin-wisehire-waitlist` | List entries, delete entry by id, query history by email | (read-only) |

**Auth:** `requireAdminAuth` at the top of `serve`.

## Dispatch

- **Primary:** `body.action`
- **Fallback:** `x-admin-wisehire-op` header (parity safety)

## DB tables / external services

- `wisehire_invites`, `wisehire_waitlist`, `profiles`, `audit_logs`
- Resend (branded invite email — Inter font, WiseHire blue `#1D4ED8`, logo from `emails` storage bucket)
- HMAC-SHA256 signing of invite tokens via Web Crypto API

## Parity deviation

Auth before body-parse → unauthenticated + malformed body returns 401 (was 500). Documented in `EDGE_FUNCTION_AUDIT.md`.
