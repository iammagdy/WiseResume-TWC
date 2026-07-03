# discount_codes

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` (table definition, lines beginning at `discount_codes:`)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** Catalogue of admin-issued promo / discount codes. Each row is a single redeemable code.

**Key columns** (→ `src/integrations/supabase/types.ts` `discount_codes:`):
- `id` (uuid, pk)
- `code` (text, the human-typed code)
- `discount_type`, `discount_value`
- `target_plan`, `plan_override`, `plan_days` (what the code grants)
- `max_uses`, `uses_count` (quota)
- `is_active`, `expires_at`
- `created_at`

**Relationships:** None declared in the generated types. Redemptions live in `coupon_redemptions` (FK → `discount_codes.id`).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Written by:**
- `supabase/functions/admin-manage-coupons/` (CRUD)
- `supabase/functions/validate-coupon/` (read + counter bumps)
- `supabase/functions/redeem-coupon/` (redemption — increments `uses_count`)

**Related:**
- `database-tables/coupon_redemptions.md`
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/03-credits-and-byok.md`
