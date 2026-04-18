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
   - Adds `get_portfolio_gate_info(p_username)` — lightweight RPC that returns gating metadata (passwordEnabled, accentColor, etc.) without ever returning the hash.
   - Overwrites `get_public_portfolio` with a new overload: `get_public_portfolio(p_username, p_password)`. When the portfolio has a password, the server calls `encode(extensions.digest(p_password, 'sha256'), 'hex')` and compares the result to the stored hash. Returns `{error: 'invalid_password'}` on mismatch rather than the full portfolio data.
   - Existing stored hashes keep working — they are already SHA-256 hex strings.

2. **`src/hooks/usePublicPortfolio.ts`**:
   - `usePortfolioGate` now calls `get_portfolio_gate_info` RPC instead of the old REST query; hash is never returned to the client.
   - Fallback to REST (without hash) if the new RPC isn't deployed yet.
   - `usePublicPortfolio` accepts an optional `password` parameter and forwards it to `get_public_portfolio`.
   - Graceful fallback to old signature if migration not yet applied (error code `42883`).

3. **`src/pages/PublicPortfolioPage.tsx`**:
   - Client-side `sha256hex()` call removed from the password submit handler.
   - `PasswordGate` component switched to `onSubmit` pattern (passes raw password over HTTPS to the hook).

## Migration note
**The SQL migration has not been applied yet.** GitHub Actions `apply-rpc-migration.yml` failed because `SUPABASE_ACCESS_TOKEN` is not set as a GitHub secret.

To complete this feature:
1. Go to `https://supabase.com/dashboard/project/jnsfmkzgxsviuthaqlyy/sql/new`
2. Paste the contents of `supabase/migrations/20260426000000_portfolio_password_server_side.sql`
3. Run it

Until then, the app uses the graceful fallback: the password gate still shows, but password checking falls back to the pre-migration behavior for existing users.

## Relevant files
- `supabase/migrations/20260426000000_portfolio_password_server_side.sql`
- `src/hooks/usePublicPortfolio.ts`
- `src/pages/PublicPortfolioPage.tsx`
- `src/store/settingsStore.ts`
- `src/components/settings/sections/PrivacySection.tsx`
