# admin-owner-ops

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-owner-ops/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Owner-only operational actions via the Supabase Management API. Actions: `trigger_backup` (POST to create a PITR backup snapshot), `get_backup_status` (GET backup list). Only usable when `SUPABASE_PROJECT_REF` and a management API token are configured. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token). Management API calls additionally require `SUPABASE_ACCESS_TOKEN`.

**Related:**
- `Project Atlas/01-Currently Implemented/functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
