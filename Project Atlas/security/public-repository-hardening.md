# Public Repository Security Hardening

**Last verified:** 2026-07-24
**Status:** `TESTED_LOCAL`, not deployed
**Scope:** public repository controls, Vercel public APIs, and Appwrite Function execution boundaries.

## Implemented controls

- `job-feed-sync` now has an empty Appwrite Client-SDK execute list; only its native six-hour schedule (`0 */6 * * *`) and API-key Server-SDK trigger remain valid.
- The canonical 28-function policy in `scripts/appwrite-function-policy.cjs`, `appwrite.json`, deployment code, tests, and read-only live verifier agree. Unknown functions fail closed.
- Public portfolio CSS colors use a complete allowlist grammar on read and write. Login redirects accept only a safe internal path.
- URL import requires an Appwrite JWT, has durable per-user 6/minute and 30/hour limits, returns `Retry-After`, pins the connection to a validated DNS address, revalidates redirects, and blocks local/private/reserved/multicast/documentation/IPv4-mapped IPv6 targets.
- Portfolio password counters use Appwrite's `x-appwrite-client-ip` only, use the shared `unknown` bucket when absent, and fail closed on read/write infrastructure errors.
- Temporary `api/admin-diagnostics.ts` is removed. Public errors are stable and generic.
- Active Actions use official immutable SHAs; hub builds require a committed lockfile and use `npm ci --omit=dev --ignore-scripts`; deployments require explicit known targets and reject `all`.
- Added `SECURITY.md`, security ownership, and conservative Dependabot configuration. Repository license is unchanged.

## Appwrite execute-policy matrix

Old live policy was `any` for all rows. `users` means an authenticated Appwrite Client-SDK user; `[]` means no Client-SDK execution. Schedules and API-key Server-SDK calls are not controlled by this list.

| Function | Real caller | Intended execute | Handler boundary |
|---|---|---:|---|
| resume-section-ai | authenticated editor | users | Appwrite JWT |
| job-import | authenticated upload flow | users | JWT before fetch/write |
| ai-gateway | authenticated AI flows | users | JWT / approved internal token |
| coupons | public validation, authenticated redemption | any | action-specific JWT |
| wisehire-gateway | signed-in WiseHire UI | users | JWT and role checks |
| public-share | public portfolio/share flows | any | session/password/rate controls |
| ai-health | signed-in diagnostics | users | JWT |
| admin-devkit-data | DevKit | users | admin label/signed token |
| admin-email | DevKit | users | signed DevKit token |
| admin-testmail | DevKit | users | signed DevKit token |
| admin-feature-flags | DevKit | users | signed DevKit token |
| admin-moderation | DevKit | users | signed DevKit token |
| admin-portfolio-usernames | DevKit | users | signed DevKit token |
| admin-visitor-analytics | DevKit | users | signed DevKit token |
| admin-onboarding-funnel | DevKit | users | signed DevKit token |
| admin-impersonate | DevKit | users | signed/intent-bound token |
| inspect-ai-keys | DevKit | users | signed DevKit token |
| admin-deploy-hubs | DevKit | users | signed DevKit token |
| admin-sentry | Sentry webhook and DevKit | any* | HMAC webhook or signed DevKit token |
| email-service | public auth mail and signed actions | any | action-specific session/OTP/HMAC |
| portfolio-gate | public portfolio gate/warmup | any | bounded read-only input |
| get-public-portfolio | public portfolio/warmup | any | session/password/throttle |
| verify-portfolio-password | public gate | any | fail-closed throttle |
| portfolio-settings | portfolio editor | users | JWT, server-derived owner |
| track-visitor-event | browser analytics | any | allowlist, bot guard, throttle |
| job-feed-sync | schedule/API-key trigger | [] | platform-authorized only |
| get-remote-jobs | public feed | any | read-only, optional JWT enrichment |
| track-job-action | signed-in job actions | users | JWT before writes |

`admin-sentry` is the only transport exception: an external Sentry webhook cannot present an Appwrite Client-SDK user session. It accepts no unrelated action until a constant-time HMAC signature check passes; DevKit actions require the existing signed token. The observed webhook contract has no signed timestamp/nonce, so expiry/replay enforcement is not supported by that transport; accepted webhook handling is currently idempotent receipt/logging only. Treat this as a residual integration risk and reassess if Sentry adds a timestamped signature format.

## Current external-control status

Read-only repository inspection found Secret Scanning, non-provider scanning, validity checks, push protection, Dependabot alerts/security updates, automated fixes, and Private Vulnerability Reporting disabled. The owner must enable each in GitHub: **Repository → Settings → Security → Code security and analysis**, then enable Secret scanning, Push protection, Dependabot alerts, Dependabot security updates/automated fixes, and Private vulnerability reporting where plan eligibility permits. Owner reports the Security Log had no suspicious activity.

## Deployment plan (not executed)

After review, dispatch **Deploy Appwrite Hubs** once per explicit changed target—never `all`: `job-feed-sync,admin-sentry,email-service,get-public-portfolio,verify-portfolio-password,portfolio-gate,public-share,track-visitor-event`. Deploy Vercel separately for `api/*` and frontend changes. Verify live policy with `node scripts/verify-function-execute-policy.cjs --enforce`; assert anonymous `job-feed-sync` is 401/403, schedule is `0 */6 * * *`, one controlled API-key sync creates one run record, public jobs still read, portfolio password lockout/recovery works, URL import requires a JWT, and public failures reveal no internals. Roll back each target to its prior ready deployment; stop immediately on any policy or public-flow regression.
