# resumes

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.resumes.Row` (27 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** User resumes. Soft-delete via `deleted_at`.

**Schema:** 29 columns. Original 27 per `Tables.resumes.Row` in `src/integrations/supabase/types.ts`, plus 2 trial columns added in `supabase/migrations/20260418000002_add_trial_resume_columns.sql`. All columns: `awards`, `certifications`, `contact_info`, `created_at`, `customization`, `deleted_at`, `education`, `experience`, `hobbies`, `id`, `is_deleted`, `is_primary`, `is_trial`, `job_match_score`, `job_url`, `parent_resume_id`, `projects`, `publications`, `references`, `skills`, `summary`, `target_company`, `target_job_title`, `template_id`, `title`, `trial_expires_at`, `updated_at`, `user_id`, `volunteering`.

**Trial resume columns:**
- `is_trial BOOLEAN NOT NULL DEFAULT false` — marks a 24-hour free trial resume. Trial resumes don't count toward the free-plan quota of 1.
- `trial_expires_at TIMESTAMPTZ` — set to `now() + 24h` on creation. A `BEFORE UPDATE` DB trigger (`expire_trial_resume_on_first_edit`) sets this to `now()` the instant any content column changes, making the trial single-use. Partial index `idx_resumes_trial_expires WHERE is_trial = true` supports efficient cleanup queries.

**Trial RLS:** `block_writes_to_expired_trials` — USING-only policy that blocks UPDATE on already-expired trial rows. First-edit transition works correctly because USING checks the OLD row.

**Trial lifecycle:** Client hides trials expired > 3 days (`useResumes.ts` grace filter). Daily server sweep (`purge_expired_trial_resumes()`) hard-deletes trials expired > 3 days. → `server/index.ts`, `supabase/migrations/20260426000001_delete_expired_trial_resumes.sql`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.resumes.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
