# admin-feature-flags

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-feature-flags/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint for managing feature flags stored in the database. Actions: `list` (all flags by name), `upsert` (create or update), `delete` (by name). All mutations are audit-logged to `audit_logs`. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
