# Public Repository Security Hardening

**Last verified:** 2026-08-14
**Status:** `PASS_WITH_WARNINGS` — local remediation complete; production deployment and edge verification remain pending
**Scope:** public repository controls, Vercel public APIs, and Appwrite Function execution boundaries.

## Public-repository P2 remediation closeout (2026-08-14)

### Audit reconciliation

The remediation rechecked the original public-repository audit baseline at `main` commit `71b2864a5bb09b4082729db59950e2dc778abba3`. No P0 or P1 issue was discovered during remediation. The audit contains **seven P2 findings**, not six: React Router dependency exposure; AI quota read-check-write races; non-cryptographic password-reset OTP generation; replayable internal admin HMAC requests; PDF export resource abuse; trusted-proxy/IP identity assumptions; and security-test/CI reliability. All seven have local code and test remediations. No finding is classified as unresolved in code; production deployment and one Vercel edge-behavior check are `OWNER_ACTION_REQUIRED`.

### Implemented remediation

| Finding | Root cause | Local remediation and evidence | Status |
|---|---|---|---|
| P2-01 React Router | The application remained on the vulnerable React Router 6.x dependency line. | Upgraded `react-router` and `react-router-dom` to `7.18.2`; existing declarative routing and redirect sanitization remain covered by the security suite. | `TESTED_LOCAL` |
| P2-02 AI quota concurrency | Session and owner daily counters used a read-check-write sequence, allowing concurrent admissions to observe stale counts. | AI Gateway now uses Appwrite atomic increment/decrement operations with server-side caps, reserves idempotency before provider admission, and releases reservations on failed requests. Concurrency regression tests cover session and owner limits. | `TESTED_LOCAL` |
| P2-03 OTP randomness | Password-reset OTPs used `Math.random()`, which is not a cryptographic generator. | `email-service` now uses `crypto.randomInt(100000, 1000000)` while preserving six-digit range, expiry, cooldown, HMAC-at-rest, and attempt controls. | `TESTED_LOCAL` |
| P2-04 Internal HMAC replay | Internal reset signatures bound target and timestamp but had no one-time request identifier or durable consumption record. | Signed payloads now include a nonce; the receiver validates format, freshness, target/actor binding, and atomically consumes a nonce in `admin_reset_request_nonces` with expiry metadata. | `TESTED_LOCAL` |
| P2-05 PDF resource abuse | The production Vercel PDF route lacked durable per-user rate limiting, cross-instance concurrency controls, and complete pre-Chromium bounds. | `api/export/pdf-native.ts` now applies durable rate and lease controls, HTML/segment/custom-break/height/output bounds, fail-fast validation, lease cleanup, and a hard 45-second render timeout while preserving authentication and SSRF controls. | `TESTED_LOCAL` |
| P2-06 Trusted proxy identity | Anonymous rate-limit identity was derived from proxy headers without an explicit platform-trusted source contract. | Vercel routes now use the shared `getTrustedVercelClientIp` helper backed by `@vercel/functions` `ipAddress()`. Live edge overwrite behavior remains an external verification item. | `IMPLEMENTED_UNVERIFIED` / `OWNER_ACTION_REQUIRED` |
| P2-07 Security test reliability | Hub tests could not reliably resolve runtime dependencies from a fresh root checkout, and PR validation did not run the full security suite for security-sensitive changes. | Added the required root `axios` dependency, repaired stale contract assertions, added focused regression tests, and added the secret-free path-filtered `.github/workflows/security-validation.yml` gate. | `TESTED_LOCAL` |

### Appwrite schema and deployment boundary

The repository-controlled setup script adds idempotent server-side collections for `chat_sessions`, `admin_reset_request_nonces`, `pdf_export_rate_limits`, and `pdf_export_active_leases`, including the required attributes and expiry indexes. These schema changes have **not** been applied to production from this session. The official targeted Appwrite workflow now runs `scripts/setup-security-collections.cjs` **before** deploying any affected hub and deploys exactly `ai-gateway`, `email-service`, and `admin-devkit-data` when selected. The prohibited `target=all` form was not used. Before this final correction, the branch was two commits ahead of `origin/main`; this workflow and Atlas correction is the third branch commit.

The frontend/API code has also not been deployed from this session. After review and merge, the normal Vercel integration is required for the Vercel route and trusted-IP helper changes. No production verification is claimed.

### Validation and residual risk

Local validation completed successfully: `git diff --check`; `npx tsc --noEmit`; `npm run build`; `npx vitest run src/lib/security` with 24 files and 126 tests passing; the complete repository suite with 189 files passed and 1 skipped, 1,088 tests passed, 8 skipped, and 1 todo; `node --check` for all three changed hubs; the Appwrite SDK schema API contract check; and `npm audit --omit=dev` with zero vulnerabilities. The security workflow contains no secrets and runs only on the listed security-sensitive paths. The final remediation commit was pushed to `security/public-audit-p2-remediation`; no merge or deployment occurred.

The remaining external checks are precise and bounded. The owner must confirm after Vercel deployment that a request-supplied `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip` value cannot alter the identity returned by the trusted-IP helper; a production integration test should compare a normal request with the same request carrying spoofed values and confirm the authoritative identity is unchanged. The owner must also enable GitHub Secret Scanning and Push Protection, as already noted in this document’s external-control section. No secret value, token, OTP, signature, reset URL, or credential was exposed.

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
