# Authentication Audit — WiseResume / WiseHire

**Project:** Supabase `jnsfmkzgxsviuthaqlyy` (eu-central-1)
**Auth provider:** Kinde (frontend) → custom `token-exchange` Edge Function → Supabase JWT bridge
**Audit date:** April 20, 2026

---

## How the system actually works

1. The browser signs in via **Kinde** (`@kinde-oss/kinde-auth-react`).
2. `AuthContext` calls `/api/fn/token-exchange` with the Kinde access token.
3. The `token-exchange` Edge Function:
   - Verifies the Kinde JWT against Kinde's JWKS,
   - Computes a deterministic **UUIDv5** from the Kinde `sub` (= the Supabase user id),
   - Creates a "shadow" user in `auth.users` so FK constraints work,
   - Mints a Supabase-compatible **HS256 JWT** signed with `SUPABASE_JWT_SECRET`,
   - Returns it to the client.
4. The client caches that token in **sessionStorage** and attaches it as `Authorization: Bearer …` on every Supabase REST call.
5. Edge Functions for **regular users** call `requireAuth` (`_shared/authMiddleware.ts`), which validates the bridged JWT via `auth.getUser(token)`.
6. Edge Functions for **admins** call `requireAdminAuth` (`_shared/adminAuth.ts`), which verifies a separate HMAC-signed "DevKit" session token against `DEV_KIT_PASSWORD` and an `ADMIN_EMAILS` allowlist.

This is a sound architecture but it has **several real bugs and several configuration weaknesses that ship to production today**. They are listed below, severity-ordered.

---

## 🔴 Critical

### C1. `verify_jwt = false` on **all 90 Edge Functions**, and 9 of them have *no* alternative auth
`supabase/config.toml` disables platform-level JWT verification on every function. That's necessary for this project because users authenticate with Kinde, not Supabase Auth — but it means each function is **only as authenticated as the code inside `serve()` makes it**.

20 functions do not call `requireAuth` or `requireAdminAuth`. 11 are legitimately public endpoints (waitlist join, contact form, validate-invite, OG image generator, etc.). The other **9 should not be world-callable**:

| Function | Risk if called by an attacker |
|---|---|
| `auth-email-hook` | Spoof Supabase Auth email events; could be used to inject malicious mail templates |
| `weekly-digest` | Force-trigger digest emails to every user (spam vector) |
| `send-resume-reminder` | Force-trigger reminder emails (spam vector) |
| `wisehire-invite-reminder` | Same, for HR invites |
| `ask-portfolio` | Costly LLM call without any rate limit (financial DoS) |
| `og-image` | Costly image render (CPU DoS) |
| `track-portfolio-view` | Inflate analytics counters arbitrarily |
| `portfolio-interest` | Inject fake "interest" signals into HR users' inboxes |
| `resolve-short-link` | Enumerate every short-link in the system |

**Fix:**
- `auth-email-hook` must verify the `Webhook-Signature` header against a shared secret. Supabase Auth Hooks send a Standard Webhooks signature — the function currently ignores it.
- The three reminder/digest functions should require a `CRON_SECRET` header (or move to `pg_cron` / Supabase Scheduled Triggers and set an internal-only role).
- The portfolio functions need rate-limiting (per-IP and per-portfolio-id) and the public ones need bot protection. `_shared/botGuard.ts` exists — verify it's wired in.

### C2. Email-collision branch silently changes the user's email
In `token-exchange/index.ts` lines 157–172, if `createUser` reports a duplicate **and** `getUserById(supabaseUserId)` returns no row, the function retries with `${supabaseUserId}@collision.kinde.placeholder`. That means:

- The Kinde user is provisioned in `auth.users` with a **fake email**.
- All future password-reset / email-change / Auth-side mailing for that user goes to a placeholder address (delivery fails).
- The legacy `auth.users` row that held the real email is left orphaned and **still owns** any rows referencing it via `auth.users.id` FK — a future user with the same Kinde sub could re-collide with it.
- If the original collision was caused by an attacker pre-registering with a victim's email, this branch hides the conflict instead of refusing the exchange.

**Fix:** if a deterministic-id collision is detected, **fail closed** — return 409 with a clear error and require an explicit account-merge flow. Never write a placeholder email into `auth.users`.

### C3. Password policy is far below baseline
From the live Auth config:
```
password_min_length:        6
password_required_characters: null
password_hibp_enabled:      false
security_captcha_enabled:   false
```

A user can sign up with `123456`. There is no breached-password check (already noted in `DATABASE_AUDIT.md`) and no CAPTCHA on signup or sign-in, so password spraying is unmitigated.

**Fix:**
- Raise `password_min_length` to at least **12**.
- Set `password_required_characters` to require a mix.
- Enable `password_hibp_enabled`.
- Enable hCaptcha (`security_captcha_provider: "hcaptcha"` is already set; just flip `security_captcha_enabled: true`).

### C4. Sessions never expire
```
sessions_timebox:           0   ← absolute lifetime: never
sessions_inactivity_timeout: 0   ← idle timeout: never
```
A token issued today is valid forever. Combined with `refresh_token_rotation_enabled: true` this isn't infinite-replayable, but a stolen refresh token is good for as long as the attacker keeps using it, with no idle expiry to ever cut them off.

**Fix:** set a sensible absolute timebox (e.g. 30 days) and an inactivity timeout (e.g. 14 days). For an admin/HR app handling resumes + payments, even tighter.

### C5. Wildcard redirect URI in the allowlist
```
uri_allow_list contains:  https://*.lovable.app/auth/callback
```
**Any subdomain of lovable.app** can be the post-login redirect target. If anyone can spin up a `*.lovable.app` subdomain (which is the whole point of a build-and-deploy platform), they can construct a phishing flow that captures the redirected fragment containing the Kinde access token. This is a textbook account-takeover vector.

**Fix:** delete the wildcard. List the exact lovable.app preview hosts you actually use, or remove the lovable.app entries entirely if the project is now hosted on `thewise.cloud`.

---

## 🟠 High

### H1. CORS allowlist is too generous in production
`_shared/cors.ts` line 22: every request whose Origin matches `\.replit\.dev$` is granted `Access-Control-Allow-Origin`. That includes the production-deployed Edge Functions, not just dev. An attacker who can host JS on a `*.replit.dev` subdomain (free with any Replit account) can drive cross-origin POSTs against the production functions with the victim's session cookie / bearer token attached.

**Fix:** gate the Replit-dev allowance behind `Deno.env.get('ENVIRONMENT') !== 'production'`, or remove it entirely and use the `ALLOWED_ORIGIN` env var override that's already supported.

### H2. Admin auth has no MFA and no revocation
`requireAdminAuth` accepts an HMAC-signed token whose payload is just `email:expiresAt`. There is:
- **No second factor** — knowing `DEV_KIT_PASSWORD` and an admin email is enough to mint a valid 8-hour token.
- **No revocation** — if a token leaks, the only remedy is rotating `DEV_KIT_PASSWORD`, which kicks every admin out.
- **No issuance audit** — the token is minted by `verify-dev-kit` but the audit trail (who minted, when, from what IP) is unclear.
- **Token transported in JSON body** in `admin-check-access` (lines 17–23), where it can land in middleware request-body logs. Admin tokens should always be in the `Authorization` header.

**Fix:** require MFA at the issuing step (Kinde's TOTP enrollment is already on — just enforce it for admins), store issued admin sessions in a DB table so they're revocable, and accept the token only via `Authorization: Bearer` for all admin functions.

### H3. `verifySessionToken` panics on malformed input (DoS)
`adminAuth.ts:38`:
```ts
const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(...));
```
If `sigHex.length` is odd or empty, `sigHex.match(/.{2}/g)` returns `null` and the non-null assertion throws an uncaught TypeError. The function is wrapped in try/catch which converts it to `null`, so the impact is limited to a 401 — but the crash inside crypto.subtle is still observable in logs and worth tightening.

**Fix:** validate `sigHex` matches `/^[0-9a-f]+$/i` and has even length before slicing.

### H4. Profile upserts use `ignoreDuplicates: true` — stale email forever
`token-exchange/index.ts:192–195` and `:203–206` both pass `ignoreDuplicates: true` to the `profiles` and `user_preferences` upserts. That means if a user changes their email in Kinde, the `profiles.contact_email` column **never updates**. Anything that reads from `profiles.contact_email` (notifications, invoices, exports) will keep using the old address.

**Fix:** drop `ignoreDuplicates: true` and instead update the row on conflict, or do an explicit update-after-insert.

### H5. Audit-log writes fail silently
`logExchange()` (`token-exchange/index.ts:60`) writes to a `token_exchanges` table; on failure it does nothing but `console.warn`. There is no metric, no alert, and no fallback storage. In a compromise, the attacker's token-exchange traces could be silently dropped if the table is full / locked.

**Fix:** at minimum, page on `logExchange` failure (Sentry / log alert). Better: write to an append-only table with a reasonable retention.

### H6. Token-exchange creates `auth.users` with `email_confirm: true`
Line 144: `email_confirm: true` is set unconditionally. If Kinde returns an unverified-email account (some social providers do), the shadow Supabase user is marked confirmed even though the email isn't actually owned by the user. This combines badly with C2 and the lack of password policy.

**Fix:** only pass `email_confirm: true` when the Kinde token's `email_verified` claim is true. Otherwise leave it false and let Supabase enforce verification before the user can perform email-bound actions.

---

## 🟡 Medium

### M1. Concurrent `exchangeToken` deduplication misses token rotation
`supabaseBridge.ts:202` short-circuits any in-flight `exchangePromise`. If the registered Kinde token rotates between the two callers, the second caller awaits the first's response and gets a Supabase JWT minted from an older Kinde token. Usually fine, but during a token-revocation event (admin force-logout via Kinde) the second caller can briefly succeed with a token that should have failed.

**Fix:** key the dedupe on the kinde token hash, not just on "any in-flight exchange".

### M2. CAPTCHA provider configured but disabled
`security_captcha_provider: "hcaptcha"` is set but `security_captcha_enabled: false`. Looks like a half-finished setup — flip the toggle.

### M3. JWT cached in `sessionStorage`
Standard for SPAs but worth flagging: **any XSS** anywhere in the app gives the attacker the full Supabase JWT. The `Strict-Transport-Security` / CSP posture of `index.html` should be checked separately to make XSS exploitation harder.

### M4. `localStorage.removeItem` runs unconditionally on module load
`supabaseBridge.ts:52` runs `localStorage.removeItem(STORAGE_KEY)` on every module load. This is intentional cleanup of v1 cache, but it executes even when the user isn't authenticated and on every tab open. It's a no-op cost-wise but worth converting to a one-time migration flag once v1 has aged out.

### M5. No `audience` check on Kinde JWT verification
`token-exchange/index.ts:106`:
```ts
await jose.jwtVerify(kindeToken, keySet, { issuer: kindeDomain });
```
The verifier checks `iss` but **not `aud`**. If your Kinde tenant ever issues tokens with a different `aud` claim (e.g. for an unrelated app sharing the same Kinde org), they'd be accepted here.

**Fix:** add `audience: KINDE_CLIENT_ID` to the verify options.

### M6. Refresh-token reuse window is 10s
`security_refresh_token_reuse_interval: 10` allows the same refresh token to be reused within a 10-second window before being rejected. Default is fine for handling network retries, but for an admin app you may want to lower it to 5s or 0s.

---

## 🟢 Informational / hygiene

- **Rate limits** (`rate_limit_email_sent: 25`, `rate_limit_token_refresh: 150`) are per project per hour. They look sane for current scale; revisit if user count grows.
- **Allowlisted domains** (`thewise.cloud`, `resume.thewise.cloud`) match the production setup. Lovable preview entries can be removed once the Lovable migration is fully done.
- **JWT exp = 3600s** with bridge refresh at 50min — correct.
- **`disable_signup: false`** with `external_email_enabled: true` and Google enabled — only those two providers can create accounts. OK.
- **Anonymous users disabled** — good.
- **MFA TOTP enroll/verify enabled** — good, but **never required**. No `mfa_factor_required` policy. Consider requiring MFA for admin emails at minimum.
- The bridge's "account swap detection" (`setCurrentKindeSub` + `isIdentityMismatch`) is unusually thoughtful and looks correct.
- The `requireAuth` middleware delegates to `auth.getUser(token)` which is the only correct way to validate a Supabase JWT; this code is solid.
- The `DegradedAuthProvider` fallback (`AuthContext.tsx:60`) is a good resilience choice — make sure the rest of the app actually checks `authAvailable === false` before showing data-loaded UI.

---

## Recommended action order

1. **This week (security):**
   - C5 — delete the lovable.app wildcard redirect
   - C3 — raise password policy + enable HIBP + enable hCaptcha
   - C2 — refuse the email-collision retry; fail closed instead
   - C1 — add hook signature verification to `auth-email-hook` and a `CRON_SECRET` header to the three reminder/digest functions
   - H1 — gate the `*.replit.dev` CORS branch on non-production environments

2. **Next sprint (auth hardening):**
   - C4 — set sane session timebox + inactivity timeouts
   - H2 — add MFA enforcement + revocable admin sessions
   - H4 — fix the silent stale-email upsert
   - H6 — only `email_confirm: true` when `email_verified` is true on the Kinde claims
   - C1 (continued) — rate-limit + bot-guard the public portfolio endpoints

3. **Backlog (defense-in-depth):**
   - H3, H5 — input validation in `verifySessionToken`, alerting on `logExchange` failure
   - M1–M6

---

## Files referenced

- `supabase/config.toml` (`verify_jwt = false` × 90)
- `supabase/functions/_shared/adminAuth.ts`
- `supabase/functions/_shared/authMiddleware.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/token-exchange/index.ts`
- `supabase/functions/admin-check-access/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/supabaseBridge.ts`
- Live Auth config: `.local/db-analysis/auth-config.json`
