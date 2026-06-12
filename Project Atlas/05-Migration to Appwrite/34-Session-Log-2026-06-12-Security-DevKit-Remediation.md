# Session Log - 2026-06-12 - Security and DevKit Remediation

## Overview

Local `main` implementation session. No deploy, commit, push, branch creation, or environment-variable changes were performed. Work focused on the approved security and DevKit remediation plan after the security audit.

## Current Repo State

- Branch: `main`
- Tracking: `main...origin/main`
- Latest commit before this work: `04573ae8` / `04573ae81efb756463ef9265d5848924f1380a04`
- Working tree: modified code/docs/tests; not committed
- Existing untracked local files still present and untouched:
  - `scripts/_tmp_ai_credits_col.cjs`
  - `scripts/_tmp_tailor_diag.cjs`
  - `scripts/check-hub-drift.cjs`
- `.env.deploy`: ignored and not inspected; owner-accepted local risk remains unchanged.

## What Changed

| Area | Finding addressed | Key changes |
|---|---|---|
| Public fetch proxy SSRF | Redirect SSRF and unbounded response | Added shared SSRF helpers; manual redirect validation; DNS/private-IP checks per hop; response size cap. |
| PDF export SSRF | Chromium `setContent` external/private fetches | Added default-deny Puppeteer request guard before every server/Vercel measurement/render path. |
| WiseHire authorization | BOLA/IDOR and recruiter actions open to signed-in users | Added WiseHire access guard; protected employer/recruiter actions; candidate/role ID reads now require owner/company scope. |
| DevKit auth | Long token TTL; missing `jti`; impersonation secret fallback | DevKit token TTL reduced to 1 hour; tokens now include `jti`; `admin-devkit-data` requires `IMPERSONATION_HMAC_SECRET` for Act As links. |
| Act As revoke | Revoked sessions did not invalidate active tabs | `admin-impersonate` now stores nonce records in `admin_impersonation_sessions`, verifies nonce state, and marks matching sessions revoked. Client now sends `X-Impersonation-Token`. |
| Email verification privacy | Public arbitrary user status leaked email/status | `get-verification-status` now requires current user JWT, enforces self-only lookup, and no longer returns email. |
| Public portfolio password | No persistent brute-force throttling | Added persistent throttling using `portfolio_session_rate_limits`, keyed by username plus hashed client IP; successful unlock clears counter. |
| DevKit functionality drift | AI Radar not surfaced, admin-sentry drift, effective plan stats | Wired `AIRadarPanel`; added `admin-sentry` to diagnostics/deploy hub inventory; list/stats use `effective_plan`; `activeToday` uses `last_active_at`; visitor analytics cap lowered to 5k with existing truncation metadata. |
| AI catalogue tests | Tests expected deleted tools | Updated tests to 16 current tools and ensured removed routes are not reintroduced by tests. |

## Source Hashes

Ran `node scripts/compute-source-hashes.mjs`. Changed hub hashes include:

- `admin-devkit-data`: `058bb13bbac25afcb49c56895e728637aa2e80c8e4b25241559aae43c0615b44`
- `admin-deploy-hubs`: `9b1d554dc3cb712e91ded8e76f7d2b8ec9473188ba90efb032b5bcf70f43d575`
- `admin-impersonate`: `5b9936013283045433c64a23efa3095fcf440171c249bc3c460ba66a49f4eda1`
- `admin-visitor-analytics`: `13d3091b7be14b2faca9b9343fcb372ebec4efd80caaa0bad03fdf9269810361`
- `email-service`: `62db771fb8900d23aa8abf404fccf3d80e941c98433b776b183c605031780999`
- `wisehire-gateway`: `a705814c1177073bb25c1d0fa3ad9f45232767c733df5985679c73442963e150`

## Validation

Passed:

- `npx vitest run src/lib/security/ssrfGuards.test.ts src/lib/security/wisehireGatewayAuth.test.ts src/lib/security/adminDevkitHardening.test.ts src/lib/security/publicPrivacyHardening.test.ts src/lib/devkit/aiToolsCatalogue.test.ts src/lib/devkit/devToolsPanelConfig.test.ts`
- `node --check` for changed hubs:
  - `wisehire-gateway`
  - `admin-devkit-data`
  - `admin-impersonate`
  - `email-service`
  - `admin-deploy-hubs`
  - `admin-visitor-analytics`
- `npx tsc --noEmit`

Still required before production:

- `git diff --check`
- Full targeted regression suite and manual QA after final review.

## Deployment Targets Later

Do not deploy from this session unless separately approved.

Appwrite hubs requiring deploy after merge/approval:

- `wisehire-gateway`
- `admin-devkit-data`
- `admin-impersonate`
- `email-service`
- `admin-deploy-hubs`
- `admin-visitor-analytics`

Vercel redeploy required after merge/approval:

- `server/index.ts` bundle if used
- `api/export/pdf-native.ts`
- `api/public-portfolio.ts`
- DevKit frontend changes

## Manual Schema / Env Prerequisites

- Configure `IMPERSONATION_HMAC_SECRET` for `admin-devkit-data` and `admin-impersonate`.
- Add Appwrite collection `admin_impersonation_sessions` before deploying `admin-impersonate`:
  - document id: nonce
  - attributes: `nonce`, `target_user_id`, `target_email`, `actor_user_id`, `expires_at`, `revoked_at`, `created_at`
  - indexes: `target_user_id`, `expires_at`, `revoked_at`
- Confirm `portfolio_session_rate_limits` exists with `count` and `reset_at`; existing security setup script already defines this collection shape.
- Confirm WiseHire membership schema if company members beyond owners are expected (`wisehire_accounts`: `user_id`, `company_id`, `owner_id`, `role`, `status`/`access_status`).

## Manual QA Checklist

- URL import: valid public URL works; redirects to `localhost`, private IPs, or metadata IPs are blocked.
- PDF export: normal resume export still works; external/private asset attempts are blocked.
- WiseHire: ordinary WiseResume user denied recruiter actions; company owner can generate brief for own candidate; cross-owner candidate denied.
- DevKit: admin login still works with 1-hour token; `admin-sentry` appears in diagnostics/deploy hub inventory.
- Act As: claim works only with `IMPERSONATION_HMAC_SECRET` and session collection; revoke blocks already-open tabs on next verify/sensitive call.
- Email verification: unauthenticated/cross-user status denied; same-user status works without email in response.
- Public portfolio: wrong password throttles; valid password still unlocks and clears failure count.
- AI Radar: visible in AI Control Center and loads the existing analytics action.

## Where We Stopped

1. Implementation is complete locally but **uncommitted** and **undeployed**.
2. Need final validation pass: `git diff --check`, focused tests, full `tsc`, and any broader suites requested by owner.
3. Need owner approval for schema/env actions before deploying Appwrite hubs.
4. Need owner approval before commit/push/deploy.
