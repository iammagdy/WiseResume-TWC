# 18 — Admin impersonation

**Last verified:** 2026-05-08
**Type:** critical-system card
**Sources:** `supabase/functions/admin-impersonate/index.ts`, `supabase/migrations/20260521000001_impersonation_revocations.sql`, `src/lib/impersonationStore.ts`, `src/contexts/AuthContext.tsx`, `src/pages/ActAsPage.tsx`, DevKit users panel.

**Canonical owner:** `admin-impersonate` edge fn (issuer + revoker) + `impersonation_revocations` (kill list) + `impersonationStore` (frontend session holder).

**Related table card:** [`impersonation_revocations`](../database-tables/impersonation_revocations.md).

---

## Token shape
The impersonation token is a **standard Supabase-shaped JWT** (HS256, signed with the project JWT secret) with `sub = target_user_id`, `email = targetEmail`, `role = 'authenticated'`, plus an `is_impersonation: true` claim. The acting admin's identity is **not** embedded in the token — it lives in the audit log instead. The token has the same TTL as a normal session and is consumed by PostgREST and edge functions transparently.

## Flow
1. Admin clicks "Act as user" in DevKit → calls `admin-impersonate` (start action) → server signs the JWT and writes one row into `public.audit_logs` with `category = 'admin_impersonation'`, `action = 'impersonation_start'`, and `metadata` carrying `performed_by` (admin email), `target_user_id`, `target_email`, `started_at`, `expires_at`. **If the audit insert fails, the token is not returned and impersonation is blocked** (fail-closed).
2. Frontend stores the token in `impersonationStore` (in-memory + sessionStorage). `AuthContext` subscribes and re-derives `user` to reflect the impersonated identity.
3. Every PostgREST call from `safeClient.ts` and every edge-fn call from `edgeFunctions.ts` checks `getImpersonationToken()` first and uses it instead of the user's own token.
4. The `/actas/...` route surface (page card `actas.md`) lets the admin claim a specific session deep-link.
5. Admin clicks "Stop" → frontend calls `admin-impersonate` (exit action) → row written to `audit_logs` with `action = 'impersonation_exit'` → `impersonationStore.clear()` → AuthContext re-derives back to the real admin identity.

## Revocation
- Revocation is an **admin-driven** kill-switch — the admin (typically a security responder) calls `admin-impersonate` (revoke action), which inserts into `public.impersonation_revocations` (PK `target_user_id`) and writes an `audit_logs` row with `action = 'impersonation_revoke'`.
- `admin-impersonate` checks `impersonation_revocations` before issuing or honoring any token. Once revoked, all live impersonation tokens for that target stop working until the row is explicitly cleared.

## Hard rules
- **Audit is fail-closed**: if `audit_logs` insert fails on start, the token is never minted. Do not relax this.
- **Audit table is `public.audit_logs`** with `category = 'admin_impersonation'` and one of `action ∈ {impersonation_start, impersonation_exit, impersonation_revoke}`.
- The `/actas` page is the **only** way to claim a deep-linked impersonation session — never bypass.
- `impersonationStore` is the **only** approved reader for impersonation state — never read sessionStorage directly.
- The token does not encode the admin identity; reconstructing "who acted as whom" must always read `audit_logs`.
- Never mix impersonation with admin-write actions on shared resources without a written ADR.
