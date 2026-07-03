# wisehire_invites

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — *not present in current snapshot; defined in migrations*
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `project-governance/CONSTITUTION.md` §7.4 (account-type isolation) + §7.5 (candidate data privacy)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** HMAC-signed invite tokens (72-hour expiry).

**Schema:** Defined by `supabase/migrations/`. Not in the current generated types snapshot — see follow-up "Regenerate the database type definitions".

**Owner FK pattern:** `owner_id` → `profiles.id` (NOT `auth.users.id`). Per `project-governance/CONSTITUTION.md` §7.4 + the 2026-04-15 fix batch in `CHANGELOG.md`, every WiseHire edge function MUST pre-query `SELECT id FROM profiles WHERE user_id = $userId` before reading or writing this table.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/05-wisehire-phase-1.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
