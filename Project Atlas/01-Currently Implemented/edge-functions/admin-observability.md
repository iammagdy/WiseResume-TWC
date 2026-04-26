# admin-observability

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-observability/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint that returns edge function latency and error metrics aggregated by hour. Powers the observability dashboard in the Dev Kit UI — shows per-function request counts, error counts, average latency, and hourly buckets for trend charts. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
