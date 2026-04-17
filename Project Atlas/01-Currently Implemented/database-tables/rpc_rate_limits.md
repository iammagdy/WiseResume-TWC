# rpc_rate_limits

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` — `Tables.rpc_rate_limits.Row` (4 columns)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` (most recent RLS hardening pass)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** IP + user rate-limit timestamps. RLS hardening 2026-04-17 → all client access blocked, only reachable via SECURITY DEFINER RPCs.

**Schema:** 4 columns per `Tables.rpc_rate_limits.Row` in `src/integrations/supabase/types.ts`. Columns: `created_at`, `endpoint`, `id`, `ip_address`.

**Owner FK pattern:** See `Relationships` block in `src/integrations/supabase/types.ts` and the creation migration in `supabase/migrations/`.

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Related:**
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md`
