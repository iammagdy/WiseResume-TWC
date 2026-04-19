# portfolio_visits

**Last verified:** 2026-04-19
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.portfolio_visits.Row` (9 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Portfolio view tracking events.

**Schema:** 9 original columns + 1 added in Task #4 (2026-04-18). Columns: `city`, `country`, `id`, `referrer`, `sections_viewed`, `short_link_id`, `time_spent_seconds`, `username` (legacy text FK, retained as fallback), `visited_at`, `portfolio_id` (nullable uuid FK → `portfolios.id`, backfilled — permanent identifier that survives username renames).

**FK note (2026-04-18):** `username` now has `ON UPDATE CASCADE` so admin renames keep it in sync. `portfolio_id` is the preferred column for all new queries. The legacy `username` column will be dropped in a future migration once all readers have cut over to `portfolio_id`.

**Owner FK pattern:** See `Relationships` block in `src/integrations/supabase/types.ts` and the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
