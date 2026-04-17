# redeem-coupon

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `supabase/functions/redeem-coupon/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Redeems a coupon code; calls `upsert_ai_credits_limit` RPC.

  **Auth:** See `index.ts`.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  