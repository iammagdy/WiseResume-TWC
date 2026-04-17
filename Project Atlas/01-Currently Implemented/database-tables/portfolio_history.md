# portfolio_history

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` (table definition, lines beginning at `portfolio_history:`)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Append-only snapshots of a user's portfolio JSON, used for revert / version history of `portfolio_settings`.

**Key columns** (→ `src/integrations/supabase/types.ts` `portfolio_history:`):
- `id` (uuid, pk)
- `user_id` (uuid, FK → `profiles.user_id`)
- `portfolio_data` (jsonb — full snapshot)
- `created_at` (timestamp)

**Relationships:** `user_id → profiles.user_id` (declared FK in the generated types).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Written by:** Portfolio-editor save flow in `src/pages/PortfolioEditorPage.tsx` and any edge functions that mutate `portfolio_settings`.

**Related:**
- `database-tables/portfolio_settings.md`
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
