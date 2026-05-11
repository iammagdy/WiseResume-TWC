# admin-impersonate

**Last verified:** 2026-05-11 (Task #1 — DEVKIT_PASSWORD variable set; Act As unblocked)
**Previously verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-impersonate/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint that generates a short-lived (30-minute TTL) impersonation token for a given user. Signs a JWT using the Supabase service role, allowing the admin to act as that user for debugging purposes. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
