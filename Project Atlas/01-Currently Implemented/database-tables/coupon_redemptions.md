# coupon_redemptions

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/integrations/supabase/types.ts` (table definition, lines beginning at `coupon_redemptions:`)
- `supabase/migrations/` (creation + RLS migrations)
- `project-governance/ARCHITECTURE.md` §5 (Database Tables)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §5 (governance is supreme; if this card disagrees, governance wins).

---

**What it is:** One row per discount-code redemption — links a user to the `discount_codes` row they used.

**Key columns** (→ `src/integrations/supabase/types.ts` `coupon_redemptions:`):
- `id` (uuid, pk)
- `coupon_id` (uuid, FK → `discount_codes.id`)
- `user_id` (uuid, the redeemer)
- `redeemed_at` (timestamp)

**Relationships:** `coupon_id → discount_codes.id` (declared FK in the generated types).

**RLS:** Enabled. Most recent platform-wide hardening pass: `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql` — see `Project Atlas/01-Currently Implemented/critical-systems/09-security-model.md` for the policy summary.

**Written by:**
- `supabase/functions/redeem-coupon/`
- `supabase/functions/admin-manage-coupons/` (admin-side issuance / cleanup)

**Related:**
- `database-tables/discount_codes.md`
- Tables index: `Project Atlas/01-Currently Implemented/database-tables/README.md`
- Critical system: `Project Atlas/01-Currently Implemented/critical-systems/03-credits-and-byok.md`
