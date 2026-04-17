# user_preferences

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.user_preferences.Row` (9 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** User preferences including `ai_provider` (BYOK preference).

**Schema:** 9 columns per `Tables.user_preferences.Row` in `src/integrations/supabase/types.ts`. Columns: `ai_provider`, `biometric_enabled`, `biometric_timeout`, `default_template`, `id`, `onboarding_flags`, `pdf_defaults`, `updated_at`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.user_preferences.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
