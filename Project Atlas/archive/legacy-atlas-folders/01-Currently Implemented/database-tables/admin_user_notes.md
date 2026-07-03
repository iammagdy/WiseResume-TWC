# admin_user_notes

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` (table definition, lines beginning at `admin_user_notes:`)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Free-form notes that admins attach to a user from the Dev Kit user-detail view.

**Key columns** (→ `src/integrations/supabase/types.ts` `admin_user_notes:`):
- `id` (uuid, pk)
- `user_id` (uuid, the user the note is about)
- `note_text` (text, required)
- `created_at`, `updated_at` (timestamps)

**Relationships:** None declared in the generated types. Foreign keys are enforced at the database level — see the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Written by:** `supabase/functions/admin-save-note/`

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
