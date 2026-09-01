# Canonical Appwrite Functions Specification

**Last Verified:** 2026-08-15
**Status:** Canonical Architecture Specification
**Location:** `Project Atlas/architecture/appwrite-functions.md`

---

## Overview

WiseResume uses Appwrite Cloud Serverless Functions under `appwrite-hubs/` for secure AI calls, portfolio/public APIs, email, admin operations, scheduled work, and business logic.

The 28 deployable functions are registered in `scripts/deploy_hubs.cjs`, the source of truth for deployment targets.

## Deployable Functions

### AI and Resume Processing

| Function | Purpose | Boundary |
|---|---|---|
| `ai-gateway` | Gateway for most AI features, including Tailoring, Cover Letters, chat, and interview prep | Auth, credits, rate limits, idempotency, provider keys |
| `resume-section-ai` | Standalone section improvements | Auth-gated; explicitly not routed through `ai-gateway` |
| `job-import` | Standalone job/resume parsing and URL import | Auth-gated; explicitly not routed through `ai-gateway` |
| `ai-health` | Provider health and availability checks | Server/admin use |
| `inspect-ai-keys` | DevKit provider-key inspection and completion checks | DevKit/admin authentication |

### Portfolio and Public Pages

| Function | Purpose | Boundary |
|---|---|---|
| `get-public-portfolio` | Sanitized public portfolio payload | Public trigger with password/session controls |
| `portfolio-gate` | Lightweight existence/protection gate | Public trigger |
| `verify-portfolio-password` | Password verification and rate limiting | Public trigger |
| `portfolio-settings` | Owner settings and password operations | Authenticated owner |
| `track-visitor-event` | Visitor analytics ingestion | Public trigger with validation |
| `public-share` | Resume share-link creation and validation | Public/auth contract |

### Email and Notifications

| Function | Purpose | Boundary |
|---|---|---|
| `email-service` | Transactional email delivery and public portfolio contact (`send-portfolio-contact-email`) | Action-specific public/session controls; Turnstile & durable `email_rate_limits` for visitor contact |
| `admin-email` | Admin-triggered email operations | DevKit/admin authentication |
| `admin-testmail` | Email configuration test utility | DevKit/admin authentication |

### Admin and DevKit

| Function | Purpose | Boundary |
|---|---|---|
| `admin-devkit-data` | Cross-user data, diagnostics, and admin operations | DevKit/admin authentication |
| `admin-deploy-hubs` | DevKit-triggered targeted hub deployment | DevKit/admin authentication |
| `admin-feature-flags` | Feature-flag administration | DevKit/admin authentication |
| `admin-moderation` | Moderation and report operations | DevKit/admin authentication |
| `admin-impersonate` | Support impersonation flow | Signed/admin authorization |
| `admin-onboarding-funnel` | Onboarding analytics | DevKit/admin authentication |
| `admin-portfolio-usernames` | Username validation and reservation | Auth/function validation |
| `admin-visitor-analytics` | Visitor analytics aggregation | DevKit/admin authentication |
| `admin-sentry` | Sentry bridge/webhook processing | Signed/server boundary |

### Jobs and Business Logic

| Function | Purpose | Boundary |
|---|---|---|
| `coupons` | Coupon validation and redemption | Server/auth contract |
| `wisehire-gateway` | WiseHire gateway operations | Server/auth contract |
| `job-feed-sync` | Scheduled remote-job ingestion and refresh | Scheduled server invocation |
| `get-remote-jobs` | Product remote-jobs feed | Function-level access controls |
| `track-job-action` | Job interaction events | Function-level validation/rate limits |

## Registry Notes

* **Email verification contract (architecture verified 2026-08-15):** `send-verification` derives the target user from the authenticated Appwrite session and makes exactly one official `POST /account/verifications/email` request. It does not call Resend directly. Appwrite owns the verification token and lifecycle and sends through the configured Custom SMTP transport and its Verification template. The function returns no verification secret and reports success only as `delivery: 'appwrite', providerAccepted: true`, which is request acceptance rather than an inbox-delivery claim. The only approved function target for source/configuration deployment is `email-service`.
* **Proven production regression and correction:** the successful run `31880840961` previously synchronized a whitespace-only Appwrite Verification template (`subject=' '`, `message=' '`), even though the live send-verification path depends on Appwrite’s own usable template. The live Console audit confirmed blank subject/body fields and no saved `{{redirect}}` placeholder. PR #194 added a shared repository-managed template contract with placeholder validation and updated both deployment helpers so they synchronize the functional managed template instead of blanking it. Narrow authorized run `31882493172` deployed only `email-service` and synchronized the managed verification and recovery templates. The production inbox lifecycle remains `FIXTURE_BLOCKED`: no approved QA identity/inbox was available, so no claim is made that a real message was received or that Appwrite verification completed end to end.
* **Historical delivery trace (2026-08-11):** the two earlier accepted sends had no matching Resend event. This is retained as dated diagnostic evidence, not a current `APPWRITE_FALLBACK_NOT_DELIVERABLE` condition or owner-action blocker.

* `admin-sentry` uses fixed function ID `6a0760710000ff231048`.
* `appwrite-hubs/email-templates/` exists in source but is not a target in the current `scripts/deploy_hubs.cjs` registry. Do not claim canonical-workflow deployment without separate evidence.
* Functions use the Appwrite `main` database where database access is required.
* Function variables remain server-side. Never document secret values.
* `track-visitor-event` receives no browser-derived GeoJS country. The deployed function may enrich from Appwrite request metadata and still contains a server-side GeoJS fallback; changing that requires a separate targeted review.
* **Public Portfolio Contact Routing (P1-1):** Dedicated action `send-portfolio-contact-email` is routed to `email-service` (`execute: ["any"]`), while generic `send-contact-email` remains routed to `ai-gateway` (`execute: ["users"]`) for feedback, bug reports, crash deduplication, and username requests. The portfolio handler enforces an action override guard in `src/lib/appwrite-functions.ts`, validates Turnstile tokens as an additional abuse-control layer (or session JWTs), traps honeypot inputs, throttles via in-memory and deterministic hourly time-bucket `email_rate_limits` database checks with atomic increment reservation (enforcing `3 portfolio-contact submissions per rate identity per fixed hourly bucket`), resolves the portfolio owner from `profiles`, delivers the email via Resend (`reply_to: visitorEmail`), and creates in-app notifications.

## Deployment

* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`
* **Helper:** `node scripts/deploy_hubs.cjs --only=<function-name>`
* **Rule:** Never use `target=all`; always name the approved target(s).
* **Latest email-verification target:** `email-service` only; PR #194 merged the repository-controlled template synchronization fix, and authorized run `31882493172` created deployment `6a804f862b4138bc1b06` with ready status. The workflow log records successful synchronization of the managed Verification and recovery templates. Source/configuration parity is corrected; inbox receipt and confirmation remain `FIXTURE_BLOCKED` pending an approved safe QA identity/inbox.

## Public-Repository Hardening (2026-07-24, Deployed)

The repository has an explicit 28-function execution-policy map. Recovery workflow `30101982337` completed after the earlier 28-target run stopped on untracked lockfiles: `job-feed-sync` is schedule/API-key only (`execute: []`) with its six-hour schedule preserved, `track-job-action` is `users`, and `get-remote-jobs` remains public. The live verifier reports 28/28 policy matches. See [`../security/public-repository-hardening.md`](../security/public-repository-hardening.md).

## Production-Verified QA Runtime Observability (2026-08-10)

`ai-gateway`, `resume-section-ai`, and `job-import` have a local-only, server-generated runtime-receipt design. It records bounded metadata—request ID, optional runtime execution ID, hub, feature, provider/model, status, latency, credit count, idempotency state, and a classified failure—in a separate server-only `ai_runtime_receipts` collection. It intentionally does not reuse `ai_request_logs`, because that collection participates in gateway rate limiting.

The idempotent provisioner is `scripts/setup_ai_runtime_receipts_schema.cjs`. CI workflow run `31375728081` executed it successfully before deploying only `admin-devkit-data`, `ai-gateway`, `job-import`, and `resume-section-ai`; the script reported server-only schema readiness. The receipts have a 30-day expiry field and a 500-record write-time cap. `admin-devkit-data` exposes only a signed-DevKit, read-only, sanitized evidence feed; it masks internal user references and excludes prompts, provider output, request bodies, raw errors, credentials, and headers. One successful deterministic receipt was production-verified for each of the three receipt-writing hubs.
