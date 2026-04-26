# admin-moderation

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-moderation/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Admin Dev Kit endpoint for content moderation actions — reviewing and acting on flagged user content or bug reports. Wrapped in `requireAdminAuth`.

**Auth:** `requireAdminAuth` (admin-only DevKit session token).

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
