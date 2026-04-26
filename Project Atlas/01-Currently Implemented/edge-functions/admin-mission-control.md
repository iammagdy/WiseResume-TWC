# admin-mission-control

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-mission-control/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit health-dashboard endpoint. Checks the presence of all required environment variables (Supabase URL/keys, DevKit password, Kinde domain, AI keys, GitHub token, etc.) and reports their status without revealing values. Powers the "Mission Control" panel in the Dev Kit UI. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
