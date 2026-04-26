# admin-wisehire-reset-user

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-wisehire-reset-user/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Full test-user reset for a WiseHire HR account. Orchestrates: (1) look up user profile and Kinde sub, (2) delete from Kinde via Management API (if M2M creds configured), (3) revoke and un-use all `wisehire_invites` for the user's email, (4) delete the Supabase auth user (cascades to all associated data), (5) write an `admin_audit_logs` entry with action `wisehire_test_reset`. Intended for QA and demo account cleanup only. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Required env vars:** `KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, `KINDE_M2M_CLIENT_SECRET` (optional — omit to skip Kinde deletion).

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
