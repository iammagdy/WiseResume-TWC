# Public Repository Security Hardening

**Last verified:** 2026-08-13
**Status:** `PUBLIC_REPOSITORY_HARDENING_PRODUCTION_BROWSER_VERIFIED_WITH_RESIDUAL_WARNINGS`
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

## Deployment and verification (2026-07-24)

The initial 28-target workflow `30100163770` stopped at the first untracked hub lockfile after 25 ready deployments; no rollback was required. Corrective PR #158 (`78656e7f`, merged as `0d030df4`) tracked the three missing locks and made the guard test Git-aware and CRLF-safe. The exact recovery workflow `30101982337` then deployed only `job-feed-sync` (`6a637988c75fbc22829a`), `get-remote-jobs` (`6a63799d79e6a27a64f3`), and `track-job-action` (`6a6379ae192857be7a6e`), all `ready`.

The live verifier reported 28/28 policy matches. Anonymous execution of `job-feed-sync` and `track-job-action` was denied with 401; anonymous `get-remote-jobs` completed as designed. One approved internal `job-feed-sync` execution completed with the six-hour schedule preserved. At deployment time, full authenticated browser QA had not yet been performed; the subsequent focused two-owner verification is recorded below.

## Authenticated two-owner browser verification (2026-08-09; reconciled 2026-08-13)

Two distinct authenticated QA identities were verified through the normal `/profile` UI. Account identifiers, tokens, cookies, headers, and job identifiers were runtime-only and are not recorded.

- User A saved one disposable job fixture; it stayed saved after a full reload.
- User B was verified as a distinct identity. After User A removed their own fixture and reloaded, User B still displayed saved state for the same public job.
- User A's authorized removal persisted after a full reload.
- A normal authenticated non-admin user was denied access to `/devkit`.

The supported mutation paths derive their owner from the active JWT-backed Appwrite account. They accept no client-selected owner or action-document ID, derive `action_key` from that owner and the public job item, and apply owner-only document permissions. The browser fallback uses the active authenticated user and the same derived key. A supported cross-user mutation is therefore not constructible through the product/API contract; this is implementation-level prevention, not a fabricated negative mutation test.

**Verdict:** account isolation and authorized saved-job cleanup are verified. This focused evidence does not close tracker deletion, broader Saved Jobs rendering, populated Jobs UI, LinkedIn, or other QA outside the ownership boundary. Residual warnings remain: GitHub security controls require owner enablement, `admin-sentry` lacks transport-level replay expiry, and historical credential cleanup remains separately pending under `Project Atlas/security/credential-history-cleanup-plan-2026-07-24.md` with no authorized history rewrite.
