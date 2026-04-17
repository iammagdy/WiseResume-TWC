# ai_credits

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.ai_credits.Row` (7 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Per-user daily credit ledger. Limit derived from plan, not stored-and-trusted.

**Schema:** 7 columns per `Tables.ai_credits.Row` in `src/integrations/supabase/types.ts`. Columns: `daily_limit`, `daily_usage`, `id`, `total_usage`, `updated_at`, `usage_date`, `user_id`.

**Owner FK pattern:** `user_id` → `auth.users.id` (per `Tables.ai_credits.Row` in `types.ts`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
