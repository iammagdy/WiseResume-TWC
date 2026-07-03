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

> **2026-06-23 — Appwrite schema realignment (PR #119).** The runtime is Appwrite
> (`main/portfolio_visits`), not Supabase. The live collection had drifted from the
> code contract: it held `user_id, portfolio_id, referrer, country, device_type,
> page, utm_source` (+2) and **zero indexes**, while the visit beacon
> (`api/track-portfolio-view.ts`) writes `username, ref, sections_viewed,
> sections_timing, time_spent_seconds, device, ab_variant` and the dashboard reads
> via `Query.equal('username', …)`. Every write failed silently ("Unknown
> attribute") → **0 rows ever** → Visitors tab stuck at 0. Fix (idempotent
> `scripts/setup_portfolio_visits_schema.cjs`, applied to prod) **added** the
> optional columns `username`, `ref`, `sections_viewed` (array), `sections_timing`,
> `time_spent_seconds` (int 0..86400), `device`, `ab_variant`, `short_link_id`,
> `company_name`, `city` plus a key index `idx_pv_username`. Ordering uses the
> built-in `$createdAt`; the read maps `visited_at` → `$createdAt` fallback. The
> legacy/Supabase columns below remain for historical reference only.

**What it is:** Portfolio view tracking events.

**Schema (legacy Supabase reference):** 9 original columns + 1 added in Task #4 (2026-04-18). Columns: `city`, `country`, `id`, `referrer`, `sections_viewed`, `short_link_id`, `time_spent_seconds`, `username` (legacy text FK, retained as fallback), `visited_at`, `portfolio_id` (nullable uuid FK → `portfolios.id`, backfilled — permanent identifier that survives username renames).

**FK note (2026-04-18):** `username` now has `ON UPDATE CASCADE` so admin renames keep it in sync. `portfolio_id` is the preferred column for all new queries. The legacy `username` column will be dropped in a future migration once all readers have cut over to `portfolio_id`.

**Owner FK pattern:** See `Relationships` block in `src/integrations/supabase/types.ts` and the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
