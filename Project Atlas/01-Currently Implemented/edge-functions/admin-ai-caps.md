# admin-ai-caps

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-ai-caps/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint that reads and writes the per-plan AI daily credit caps (`daily_cap_free`, `daily_cap_trial`, `daily_cap_pro`, `global_daily_limit`) stored in `app_settings`. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
