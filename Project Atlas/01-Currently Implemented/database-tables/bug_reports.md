# bug_reports

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.bug_reports.Row` (17 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** In-app bug report submissions.

**Schema:** 17 columns per `Tables.bug_reports.Row` in `src/integrations/supabase/types.ts`. Columns: `active_feature`, `additional_context`, `app_version`, `component_stack`, `created_at`, `error_category`, `error_message`, `error_stack`, `id`, `recent_errors`, `route`, `screen`, `session_id`, `status`, `user_agent`, `user_email`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.bug_reports.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
