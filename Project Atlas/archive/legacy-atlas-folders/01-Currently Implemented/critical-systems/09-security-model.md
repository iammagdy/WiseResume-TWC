# Security Model — Four-Layer Invariant

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `project-governance/ARCHITECTURE.md` §2 (Rule A — Four-Layer Security Invariant) + §8
- `supabase/functions/_shared/authMiddleware.ts`
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `supabase/functions/_shared/requestUtils.ts` (payload size guard)
- `supabase/functions/_shared/adminAuth.ts`
- `supabase/functions/_shared/botGuard.ts`
- `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`
- `supabase/migrations/20260417000001_portfolio_noindex_and_rpc_update.sql`
- `replit.md` (Security Audit 2026-04-14 → 2026-04-17)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §2 (Rule A) and the 2026-04-17 RLS hardening migration.

---

## The four layers (mandatory order)

Every authenticated AI endpoint MUST enforce these in this exact order:

1. **JWT auth** via `requireAuth` (delegates to `supabase.auth.getUser(token)` — accepts any algorithm).
2. **Rate limit** via `checkRateLimit` / `checkUserRateLimit` (fail-closed for AI; fail-open for public non-AI).
3. **Atomic credit check** via `checkAndDeductCredit` → `atomic_attempt_and_deduct_credit` RPC (fail-closed). BYOK users skip **only** this layer.
4. **Payload size guard** via `checkPayloadSize`.

Omitting any layer is a governance violation. → `project-governance/ARCHITECTURE.md` §2 Rule A.

## Public endpoints

For unauthenticated routes (e.g. `wisehire-waitlist-join`, `wisehire-validate-early-access`, `og-image`), step 1 is replaced by `botGuard` from `_shared/botGuard.ts`. Steps 2 and 4 still apply. Step 3 does not (no user, no credits).

## Admin endpoints

`admin-*` and `hard-purge` are wrapped in `requireAdminAuth` from `_shared/adminAuth.ts`. `hard-purge` was previously **unauthenticated** — fixed 2026-04-14 in the security audit. → `replit.md`.

## RLS hardening — migration `20260417000000`

→ `supabase/migrations/20260417000000_security_audit_rls_and_hardening.sql`. Highlights from `replit.md`:

| Table | Hardening |
|---|---|
| `credit_transactions` | Clients: SELECT only. INSERT/UPDATE/DELETE blocked. |
| `subscriptions` | Clients: SELECT only. Lifecycle managed by Stripe via service_role. |
| `ai_credits` | Idempotently removed UPDATE policy for clients. |
| `rpc_rate_limits` | All client access blocked. Only reachable via SECURITY DEFINER RPCs. |
| `avatars` storage bucket | Server-side enforces `image/*` MIME and 5 MB cap. |

## Portfolio SEO privacy — migration `20260417000001`

`seo_noindex BOOLEAN` added to `portfolio_settings`. `get_public_portfolio` RPC returns `seoNoindex`; `usePortfolioSEO.ts` injects `<meta name="robots" content="noindex, nofollow">` when true.

## BYOK key validation

`creditUtils.ts` now verifies a key row actually exists in `user_api_keys` before granting unlimited credits. Setting `ai_provider` preference alone is no longer sufficient. → `replit.md` Security Audit.

## Encryption

- BYOK keys: AES-GCM-256, per-user salt `user-api-keys-salt-v2-{userId}`.
- Source maps: hidden in production builds, uploaded to Sentry, deleted from `dist/`.

## Structured logging

`_shared/logger.ts` provides a JSON-formatted Edge Function logger (DEBUG/INFO/WARN/ERROR) with correlation fields. Adopted in `creditUtils.ts` and `authMiddleware.ts`. All Edge Function logs are captured by the Supabase Dashboard and exportable to external aggregators. → `replit.md`.

## Soft vs hard delete

→ `project-governance/DECISIONS.md` Decision #5.

Default policy is **soft delete** (`profiles.is_deleted`, `messages.is_deleted`, `resumes.deleted_at`). Hard purge is admin-only and gated by `requireAdminAuth`. Queries for active data must filter `is_deleted = false` (e.g. `get_public_portfolio`).

## Offline conflict policy

`useOfflineSync.ts` uses **server-wins** strategy. When local changes are discarded due to server conflict, the user sees an explicit toast. → `replit.md` Security Audit.
