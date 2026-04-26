# admin-kinde-reconcile

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-kinde-reconcile/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint that backfills Supabase DB records for existing Kinde users. Uses the Kinde Management API (M2M client with `read:users` scope) to enumerate users and create matching profile/auth rows in Supabase. Useful for sync after a Kinde tenant migration or a partial outage. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Required env vars:** `KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, `KINDE_M2M_CLIENT_SECRET` (in addition to standard DevKit vars).

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/01-auth-bridge.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
