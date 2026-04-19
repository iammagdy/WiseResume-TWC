# admin-wisehire-revoke-invite

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `supabase/functions/admin-wisehire-revoke-invite/index.ts`
- `supabase/functions/_shared/adminAuth.ts`
- `supabase/config.toml` (JWT verification flag)

**Canonical owner:** `supabase/functions/admin-wisehire-revoke-invite/index.ts`

---

**What it does:** Admin-only. Revokes all pending (unused, non-expired) WiseHire invites for a given recipient email address. Sets `is_revoked = true` on every matching row in `wisehire_invites`, then writes an entry to `audit_logs` recording who performed the revocation and how many tokens were revoked.

**Auth:** `requireAdminAuth` — DevKit password must be supplied in the request body as `password`.

**Request body:**
```json
{ "password": "...", "recipient_email": "user@example.com", "waitlist_id": "optional-uuid" }
```

**Response:**
```json
{ "success": true, "revoked": 2 }
```
Returns `revoked: 0` if no active invites were found for that email (not an error).

**Key behaviour:**
- Only revokes rows where `is_revoked = false` AND `used_at IS NULL` — already-used or already-revoked invites are untouched.
- `waitlist_id` is accepted in the body but only used for audit log context; it does not filter which invites are revoked.
- Writes to `audit_logs` with `action = 'admin_revoke_invite'` and `metadata = { recipient_email, revoked_count }`.

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/admin-wisehire-invite.md`
- `Project Atlas/01-Currently Implemented/edge-functions/wisehire-invite-reminder.md`
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
