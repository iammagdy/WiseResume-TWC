# resume_skills

**Last verified:** 2026-05-08
**Type:** reference card
**Appwrite status:** ⚠️ NOT created in Appwrite `main` database (verified 2026-05-08 via live API). This collection existed in Supabase only. Must be created in Appwrite Console before any Phase 5 migration code targets it. See `Project Atlas/05-Migration to Appwrite/07-Collection-Verification-2026-05-08.md`.
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.resume_skills.Row` (7 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Per-resume skill tags.

**Schema:** 7 columns per `Tables.resume_skills.Row` in `src/integrations/supabase/types.ts`. Columns: `category`, `created_at`, `id`, `level`, `name`, `resume_id`, `updated_at`.

**Owner FK pattern:** See `Relationships` block in `src/integrations/supabase/types.ts` and the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
