# tailor_history

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.tailor_history.Row` (11 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Per-user tailor-resume run history.

**Schema:** 11 columns per `Tables.tailor_history.Row` in `src/integrations/supabase/types.ts`. Columns: `applied_sections`, `company`, `created_at`, `id`, `job_description`, `job_title`, `resume_id`, `score_after`, `score_before`, `tailor_result`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.tailor_history.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
