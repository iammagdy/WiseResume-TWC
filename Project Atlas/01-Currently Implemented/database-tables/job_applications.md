# job_applications

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.job_applications.Row` (15 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Job application Kanban entries.

**Schema:** 15 columns per `Tables.job_applications.Row` in `src/integrations/supabase/types.ts`. Columns: `applied_at`, `company`, `cover_letter_id`, `created_at`, `deadline`, `id`, `job_id`, `job_title`, `notes`, `remind_at`, `resume_id`, `status`, `updated_at`, `url`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.job_applications.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
