# kinde-webhook

**Last verified:** 2026-04-26
**Type:** reference card
**Sources:**
- `supabase/functions/kinde-webhook/index.ts`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

---

**What it does:** Receives and processes Kinde user lifecycle webhook events (e.g. user created, user updated). Verifies every incoming request via HMAC-SHA256 signature using `KINDE_WEBHOOK_SECRET`. On verified events, writes or updates the corresponding Supabase user record. Returns 401 for any request that fails signature verification.

**Auth:** HMAC-SHA256 webhook signature verification (`KINDE_WEBHOOK_SECRET`). No JWT auth — this is a server-to-server webhook endpoint.

**Required env vars:** `KINDE_WEBHOOK_SECRET`, `SUPABASE_URL` / `EXT_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

**Related:**
- `Project Atlas/01-Currently Implemented/critical-systems/01-auth-bridge.md`
- `Project Atlas/01-Currently Implemented/edge-functions/README.md`
