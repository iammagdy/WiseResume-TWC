# Canonical Appwrite Functions Specification

**Last Verified:** 2026-07-23
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
| `email-service` | Transactional email delivery | Action-specific public/session controls |
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

* `admin-sentry` uses fixed function ID `6a0760710000ff231048`.
* `appwrite-hubs/email-templates/` exists in source but is not a target in the current `scripts/deploy_hubs.cjs` registry. Do not claim canonical-workflow deployment without separate evidence.
* Functions use the Appwrite `main` database where database access is required.
* Function variables remain server-side. Never document secret values.
* `track-visitor-event` receives no browser-derived GeoJS country. The deployed function may enrich from Appwrite request metadata and still contains a server-side GeoJS fallback; changing that requires a separate targeted review.

## Deployment

* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`
* **Helper:** `node scripts/deploy_hubs.cjs --only=<function-name>`
* **Rule:** Never use `target=all`; always name the approved target(s).
* **Latest verified target:** `ai-gateway` only, workflow run `30042810382`, deployment `6a627b81bff27daaf366`, status `ready`.

## Public-Repository Hardening (2026-07-24, Deployed)

The repository has an explicit 28-function execution-policy map. Recovery workflow `30101982337` completed after the earlier 28-target run stopped on untracked lockfiles: `job-feed-sync` is schedule/API-key only (`execute: []`) with its six-hour schedule preserved, `track-job-action` is `users`, and `get-remote-jobs` remains public. The live verifier reports 28/28 policy matches. See [`../security/public-repository-hardening.md`](../security/public-repository-hardening.md).

## Local QA Runtime Observability (2026-08-10, Not Deployed)

`ai-gateway`, `resume-section-ai`, and `job-import` have a local-only, server-generated runtime-receipt design. It records bounded metadata—request ID, optional runtime execution ID, hub, feature, provider/model, status, latency, credit count, idempotency state, and a classified failure—in a separate server-only `ai_runtime_receipts` collection. It intentionally does not reuse `ai_request_logs`, because that collection participates in gateway rate limiting.

The required idempotent provisioner is `scripts/setup_ai_runtime_receipts_schema.cjs`; it has not been run against any Appwrite environment. The receipts have a 30-day expiry field and a 500-record write-time cap. `admin-devkit-data` exposes only a signed-DevKit, read-only, sanitized evidence feed; it masks internal user references and excludes prompts, provider output, request bodies, raw errors, credentials, and headers.
