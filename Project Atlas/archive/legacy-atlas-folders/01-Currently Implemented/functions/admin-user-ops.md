# admin-user-ops

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/admin-user-ops/index.ts`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` (Task #51)

---

## What it does

Consolidated router for 7 admin user-lifecycle functions. Replaces (7 → 1):

| `body.action` | Was | Purpose |
|---|---|---|
| `suspend` | `admin-suspend-user` | RPC `admin_suspend_user(target_user_id, suspend, reason)` |
| `grant-trial` | `admin-grant-trial` | Grant a temporary trial plan (free → pro/premium for N days) |
| `revoke-trial` | `admin-revoke-trial` | Revoke an active trial |
| `set-credits` | `admin-set-credits` | Override `ai_credits.daily_limit` for a user |
| `set-plan` | `admin-set-plan` | Force `subscriptions.plan_name` to free/pro/premium |
| `revoke-sessions` | `admin-revoke-sessions` | Force re-auth by bumping a session epoch |
| `update-profile` | `admin-update-profile` | Patch profile fields (name, email, etc.) |

**Auth:** `requireAdminAuth` runs ONCE at the top of `serve`.

**Explicitly NOT merged here:** `admin-delete-user` is kept isolated for blast-radius / audit clarity.

## Dispatch

- **Primary:** `body.action` (string)
- **Fallback:** `x-admin-user-op` header — only consulted when body is unparseable, used so `revoke-sessions` can preserve its original 400 envelope on malformed bodies.

## DB tables / RPCs / external services

- `profiles`, `subscriptions`, `ai_credits`, `audit_logs`
- RPC: `admin_suspend_user`
- Resend audiences (`addContact` / `removeContact`) for plan-change reconciliation

## Parity deviation

Auth before body-parse → unauthenticated + malformed body returns 401 (was 500 in 6/7 originals). CI captures this.
