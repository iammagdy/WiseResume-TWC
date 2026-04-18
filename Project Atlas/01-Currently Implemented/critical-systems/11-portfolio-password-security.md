# 11 — Portfolio Password Security (Server-Side Enforcement)

## Status
Partially deployed — code changes live, database migration pending (see note below).

## What changed

### Removed: "Local-Only Mode" toggle (misleading privacy claim)
The `localOnlyMode` flag existed in `settingsStore.ts` and surfaced in Settings → Privacy, but had zero consumers outside the UI. Users enabling it believed the app was offline-only while Supabase writes continued as normal.

**Action taken:** Removed the toggle entirely.
- `src/store/settingsStore.ts` — `localOnlyMode` state, getter, and setter removed; `privacyStatus` derivation simplified.
- `src/components/settings/sections/PrivacySection.tsx` — the toggle and its supporting copy removed.

### Portfolio password enforcement moved server-side
Previously, `get_public_portfolio` returned the portfolio data plus the stored `passwordHash`. The browser then computed `sha256(typedPassword)` and compared it locally — meaning anyone calling the RPC directly via `curl` could skip the gate entirely.

**Action taken:**

1. **New SQL migration** (`supabase/migrations/20260426000000_portfolio_password_server_side.sql`):
   - **Drops** the old `get_public_portfolio(text)` function to prevent bypass via the old single-arg signature.
   - **Backfills** existing plain SHA-256 password hashes to bcrypt (`extensions.crypt(sha256_hex, gen_salt('bf', 10))`). Hashes starting with `$2` (already bcrypt) are skipped.
   - Adds `get_portfolio_gate_info(p_username)` — lightweight RPC that returns gating metadata (passwordEnabled, accentColor, etc.) without ever returning the hash.
   - Adds `get_public_portfolio(p_username, p_password)`. Password verification uses bcrypt for backfilled hashes (`extensions.crypt(sha256(password), stored) == stored`) and falls back to direct SHA-256 comparison for new passwords set by the editor (pending editor update). Returns `{error: 'invalid_password'}` on mismatch.
   - Existing protected portfolios keep working after the migration — owners don't need to re-set passwords.

2. **`src/hooks/usePublicPortfolio.ts`**:
   - `usePortfolioGate` now calls `get_portfolio_gate_info` RPC instead of the old REST query; hash is never returned to the client.
   - Fallback to REST (without hash) if the new RPC isn't deployed yet.
   - `usePublicPortfolio` accepts an optional `password` parameter and forwards it to `get_public_portfolio`.
   - Graceful fallback to old signature if migration not yet applied (error code `42883`).

3. **`src/pages/PublicPortfolioPage.tsx`**:
   - Client-side `sha256hex()` call removed from the password submit handler.
   - `PasswordGate` component switched to `onSubmit` pattern (passes raw password over HTTPS to the hook).

## Migration status
**Applied successfully on 2026-04-18.** Verified via Supabase management API:
- `get_portfolio_gate_info(p_username text)` — deployed ✅
- `get_public_portfolio(p_username text, p_password text DEFAULT NULL)` — deployed ✅
- Old `get_public_portfolio(text)` (single-arg, bypassable) — dropped ✅

`SUPABASE_ACCESS_TOKEN` is now set in Replit (shared env var) and GitHub Actions secrets for future migrations.

## Relevant files
- `supabase/migrations/20260426000000_portfolio_password_server_side.sql`
- `src/hooks/usePublicPortfolio.ts`
- `src/pages/PublicPortfolioPage.tsx`
- `src/store/settingsStore.ts`
- `src/components/settings/sections/PrivacySection.tsx`
