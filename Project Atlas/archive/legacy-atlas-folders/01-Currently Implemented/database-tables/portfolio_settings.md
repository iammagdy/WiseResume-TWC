# portfolio_settings

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.portfolio_settings.Row` (16 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Portfolio config including `seo_noindex` (added by migration `20260417000001`).

**Schema:** 16 columns per `Tables.portfolio_settings.Row` in `src/integrations/supabase/types.ts`. Columns: `accent_color`, `created_at`, `enabled`, `extras`, `font`, `id`, `layout`, `meta_description`, `meta_title`, `resume_id`, `sections`, `style`, `sync_mode`, `theme`, `updated_at`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.portfolio_settings.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
