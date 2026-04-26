# admin-rotate-totp

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/admin-rotate-totp/index.ts`
- `supabase/functions/_shared/adminAuth.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Two-step TOTP secret rotation for DevKit access, plus first-time bootstrap wizard support. Actions (authenticated): `status`, `request` (generate new secret + QR), `confirm` (verify new code and promote), `cancel`. Actions (unauthenticated, only when `ADMIN_TOTP_SECRET` is unset): `bootstrap_status` — lets the Dev Kit UI detect a fresh install and auto-launch the setup wizard.

**Auth:** Authenticated actions require a valid DevKit session. `bootstrap_status` is unauthenticated but only active when `ADMIN_TOTP_SECRET` is not yet configured.

**Related:**
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
