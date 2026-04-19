# resignation_letters

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.resignation_letters.Row` (16 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Generated and saved resignation letters.

**Schema:** 16 original columns + 5 added in Task #2/3 (2026-04-18). Full column set: `additions`, `checklist_progress`, `company`, `content` (jsonb — generation output), `created_at`, `id`, `last_working_day`, `notice_period`, `position`, `reason`, `recipient_name`, `template_style`, `title`, `tone`, `updated_at`, `user_id`, `current_role` (quoted reserved word), `reason_category`, `effective_date` (date), `model_used`, `metadata` (jsonb).

**Persistence added (2026-04-18):** `generate-resignation-letter` edge function now inserts a row on every generation and returns `{ id, content }`. `content` is stored as `jsonb`.

**Index:** `(user_id, updated_at DESC)` — `idx_resignation_letters_user_updated`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.resignation_letters.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
