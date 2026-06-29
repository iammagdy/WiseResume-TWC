# user_preferences

**Last verified:** 2026-06-29
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.user_preferences.Row` (9 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** User preferences including `ai_provider` (BYOK preference) and interface `language`.

**Schema:** Existing preference columns plus optional Appwrite `language` (`en` or `ar`). Run `npm run schema:i18n` with Appwrite admin credentials to create the attribute idempotently. Missing values default to English in application code.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.user_preferences.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
