# resume_educations

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.resume_educations.Row` (12 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Per-resume education entries.

**Schema:** 12 columns per `Tables.resume_educations.Row` in `src/integrations/supabase/types.ts`. Columns: `created_at`, `degree`, `description`, `end_date`, `field_of_study`, `id`, `is_current`, `location`, `resume_id`, `school`, `start_date`, `updated_at`.

**Owner FK pattern:** See `Relationships` block in `src/integrations/supabase/types.ts` and the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
