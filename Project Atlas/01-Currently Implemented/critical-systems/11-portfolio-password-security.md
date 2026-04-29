# 11 — Portfolio Password Security (Server-Side Enforcement)

## Status
Phase 1 (server-side bcrypt of raw passwords + 8-char minimum) implemented on 2026-04-29 — code changes live, **migration `20260516000000_portfolio_password_raw.sql` pending deployment via the `db-migration.yml` GitHub Actions workflow**. Phase 0 (April 2026) work, described below, remains in place unchanged.

## Phase 1 (Task #10, 2026-04-29) — eliminate client-side SHA-256
Phase 0 verified passwords server-side but kept the editor's client-side `sha256(raw)` step on the WRITE path. Identical user passwords produced identical hashes on the wire and underneath the bcrypt wrapper, defeating bcrypt's per-password salt. Phase 1 removes that hash entirely.

### Migration `supabase/migrations/20260516000000_portfolio_password_raw.sql`
1. **`set_portfolio_password(p_password text, p_enabled boolean)`** — new SECURITY DEFINER RPC that becomes the **sole writer** of `portfolio_extras.passwordHash` and `portfolio_extras.passwordEnabled`. It bcrypts the raw password directly (no SHA-256 wrapping), enforces the 8-character minimum, and uses the `||` JSONB merge operator so unrelated extras keys are preserved. Granted to `authenticated`. Disable path clears the hash; enable-without-new-password path keeps the existing hash but flips the flag (rejects when no hash is set).
2. **`get_public_portfolio` verify path updated** — now attempts `bcrypt(raw)` FIRST (Phase 1 format), then falls back to `bcrypt(sha256(raw))` (Phase 0 backfilled format), then to direct SHA-256 comparison (pre-Phase-0 legacy). All other body lines (rate limiting, sanitisation, return shape) preserved byte-for-byte from migration `20260426000000`.

### `src/pages/PortfolioEditorPage.tsx`
- `sha256hex()` helper deleted.
- New `PORTFOLIO_PASSWORD_MIN_LENGTH = 8` constant.
- `handleSave`: pre-flight validation rejects enabling protection without an existing hash + no new password, and rejects new passwords shorter than 8 chars (toast + early return).
- Inside the try block, an authoritative `SELECT portfolio_extras` runs against the DB before composing the payload — this defeats stale React Query caches that would otherwise overwrite a real `passwordHash` with `null`. (Known residual: a one-round-trip-wide concurrent-tab race remains; Phase 2 will add optimistic concurrency or move the merge server-side.)
- The `portfolioExtras` payload passes the freshly-read `passwordEnabled` / `passwordHash` straight through — `updateProfile` no longer authors them.
- Immediately after `updateProfile`, when `pwdStateChanged` is true (toggle flipped or a new password was entered), the editor calls `set_portfolio_password({ p_password, p_enabled })` and updates a sentinel `passwordHash` state (`'set'` / `''`) so the "password is set" UI hint stays correct without leaking the actual hash.

### `src/pages/PublicPortfolioPage.tsx`
- `PasswordGate` no longer enforces a min length on submit, no longer trims, and no longer carries the `tooShort` helper. Submit is enabled whenever `value.length > 0 && !isChecking`. This (a) keeps legacy short-password portfolios unlockable and (b) preserves whitespace-edge passwords for exact-match comparison server-side.

### `src/components/portfolio/editor/MoreTab.tsx`
- Password input gains `aria-invalid` when `< 8` chars; inline destructive helper appears below the input when too short; baseline helper text now reads "Minimum 8 characters. Save your portfolio to activate the password gate."

## Phase 0 — earlier work retained
Sections below this point describe the original April 2026 verification migration; Phase 1 builds on it without changing those behaviours.

---

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
