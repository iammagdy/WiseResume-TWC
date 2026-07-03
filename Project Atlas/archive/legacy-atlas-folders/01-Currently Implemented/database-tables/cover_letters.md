# cover_letters

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.cover_letters.Row` (11 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Generated and saved cover letters.

**Schema:** 11 original columns + 6 added in Task #2/3 (2026-04-18). Full column set: `company`, `content` (jsonb — generation output), `created_at`, `id`, `job_title`, `resume_id`, `template_style`, `title`, `tone`, `updated_at`, `user_id`, `job_application_id` (nullable FK → `job_applications.id`), `position`, `job_description`, `model_used`, `metadata` (jsonb), `effective_date` (date).

**Persistence added (2026-04-18):** `generate-cover-letter` edge function now inserts a row on every generation and returns `{ id, content }`. The frontend captures the `id` and navigates to the saved letter. `content` is stored as `jsonb`.

**Index:** `(user_id, updated_at DESC)` — `idx_cover_letters_user_updated`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.cover_letters.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
