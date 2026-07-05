# Phase 3 — Appwrite / Backend / Deployment Audit Report

**Date:** 2026-07-05
**Status:** Complete
**Auditor:** AI Agent
**Repository:** `iammagdy/WiseResume-TWC`

---

## 1. Appwrite Hub Inventory

### 1.1 Hub Directory vs Deploy Script

| Source | Count | Details |
|--------|-------|---------|
| `appwrite-hubs/` directories | 26 | All hubs present on disk |
| `deploy_hubs.cjs` HUBS array | 26 | All hubs registered |
| `sourceHashes.generated.json` | 25 hashes + 1 null | `email-templates` intentionally null |
| `appwrite-functions.md` (Atlas) | 9 documented | Stale — only lists 9 of 26 hubs |

### 1.2 Hub Coverage Gaps

| Hub | In Dir | In deploy_hubs | In appwrite-functions.md | In sourceHashes |
|-----|--------|----------------|-------------------------|-----------------|
| resume-section-ai | ✓ | ✓ | ✗ | ✓ |
| job-import | ✓ | ✓ | ✗ | ✓ |
| coupons | ✓ | ✓ | ✗ | ✓ |
| wisehire-gateway | ✓ | ✓ | ✗ | ✓ |
| public-share | ✓ | ✓ | ✗ | ✓ |
| ai-health | ✓ | ✓ | ✗ | ✓ |
| admin-testmail | ✓ | ✓ | ✗ | ✓ |
| admin-sentry | ✓ | ✓ | ✗ | ✓ |
| email-service | ✓ | ✓ | ✗ | ✓ |
| portfolio-gate | ✓ | ✓ | ✗ | ✓ |
| get-public-portfolio | ✓ | ✓ | ✗ | ✓ |
| verify-portfolio-password | ✓ | ✓ | ✗ | ✓ |
| portfolio-settings | ✓ | ✓ | ✗ | ✓ |
| track-visitor-event | ✓ | ✓ | ✗ | ✓ |
| inspect-ai-keys | ✓ | ✓ | ✗ | ✓ |
| admin-deploy-hubs | ✓ | ✓ | ✗ | ✓ |
| admin-feature-flags | ✓ | ✓ | ✗ | ✓ |
| admin-impersonate | ✓ | ✓ | ✗ | ✓ |
| admin-onboarding-funnel | ✓ | ✓ | ✗ | ✓ |
| admin-portfolio-usernames | ✓ | ✓ | ✗ | ✓ |

**Finding D-01**: `Project Atlas/architecture/appwrite-functions.md` only lists 9 of 26 deployed hubs. This documentation is **stale** — the canonical deployment inventory is in `scripts/deploy_hubs.cjs`.

**Severity**: MEDIUM — documentation gap. Does not affect production.

### 1.3 Hub Directory Consistency

All 26 hub directories have corresponding entries in `deploy_hubs.cjs`. No orphan hubs or missing directories.

**Verdict**: PASS

---

## 2. Deployment Workflow

### 2.1 Trigger Model

| Aspect | Status | Notes |
|--------|--------|-------|
| Trigger type | `workflow_dispatch` (manual only) | ✓ No automatic deployment on push |
| `target=all` | Default option | ✓ Intentional default but targeted deploy supported via `--only` |
| Targeted deploy | Supported | `--only=hub1,hub2` via script arg |
| Concurrency | Grouped by ref, cancel-in-progress | ✓ Prevents overlapping deploys |

**Finding D-02**: The workflow description default is `target=all` (line 9 of deploy-appwrite-hubs.yml). This could allow accidental full deployment if user doesn't change the input. The Atlas RULES.md instructs against `target=all`.

**Severity**: LOW — workflow is manual so user must intentionally trigger.

### 2.2 Source Hash Verification

| Check | Status | Notes |
|-------|--------|-------|
| Hashes computed before deploy | ✓ `node scripts/compute-source-hashes.mjs` | ✓ |
| `git diff --exit-code` on hash file | ✓ Fails deploy if hash not committed | ✓ Ensures deployed code matches committed hash |
| Local sourceHashes file | ✓ Present with 25 entries | ✓ |
| `email-templates` hash | null | Not a code hub — expected |

**Verdict**: PASS — hash verification is correct.

### 2.3 Schema Setup Scripts

| Aspect | Status | Notes |
|--------|--------|-------|
| Total schema scripts | 29 | All idempotent per design |
| Run on `target=all` | ✓ | Steps are conditional on `target` input |
| Run on targeted deploy | ✓ Some | Only for certain targets (e.g., `inspect-ai-keys` triggers `app_settings`, `email-service` triggers `password_reset_otps`) |
| Idempotency | ✓ Confirmed by script patterns | All use "create if not exists" patterns |

**Verdict**: PASS

### 2.4 Env Variable Mapping

| Hub | Key Env Vars | Notes |
|-----|-------------|-------|
| ai-gateway | OPENROUTER_KEY_1/2/3, GROQ_KEY_1/2/3, DEEPSEEK_KEY, NVIDIA_KEY_1/2/3, TURNSTILE_SECRET_KEY, PUBLIC_SHARE_TOKEN_SECRET, ADMIN_TEST_HMAC_SECRET, GATEWAY_SMOKE_SECRET, DEVKIT_PASSWORD | ✓ |
| admin-devkit-data | APPWRITE_API_KEY, DEVKIT_PASSWORD, IMPERSONATION_HMAC_SECRET, ADMIN_EMAIL | ✓ |
| email-service | RESEND_API_KEY, PASSWORD_RESET_OTP_SECRET, DEVKIT_PASSWORD, FRONTEND_URL | ✓ |
| resume-section-ai | OPENROUTER_KEY_1/2/3, GROQ_KEY_1/2/3, DEEPSEEK_KEY, APPWRITE_API_KEY | ✓ |
| job-import | GROQ_KEY_1, OPENROUTER_KEY_1, DEEPSEEK_KEY, JINA_READER_API_KEY, JINA_API_KEY | ✓ |

**Finding D-03**: `DEVKIT_PASSWORD` is still passed to all admin hubs as a required environment variable, even though password-based auth is deprecated in favor of signed tokens.

**Severity**: LOW — documented in Phase 2 security audit (DA-04).

**Verdict**: PASS — all required vars mapped per hub.

---

## 3. Execute Permissions

| Hub | Execute Permission | Notes |
|-----|-------------------|-------|
| All hubs | `['any']` | Line 188: `execute: ['any']` in `desiredFunctionSettings` |
| `verify-portfolio-password` | public | Required — unauthenticated visitors must call this |
| `get-public-portfolio` | public | Required — unauthenticated visitors |
| `track-visitor-event` | public | Required — unauthenticated visitors |
| `portfolio-gate` | public | Required — unauthenticated visitors |
| Admin hubs | `['any']` but require signed tokens | Auth enforced at function level, not execute permission |

**Finding D-04**: All hubs use `execute: ['any']` — including admin hubs. Auth is enforced server-side via bearer token verification. This is acceptable as long as token verification in each hub is robust. The security audit (Phase 2) identified `email-service` has a raw `DEVKIT_PASSWORD` bearer fallback (DA-01) which undermines this.

**Severity**: HIGH — execute permission is open on all hubs; only function-level auth protects them. If any hub has weak auth (DA-01), it's exposed.

---

## 4. Server-Only Collections

| Collection | Client Read/Write | Server-Only? | Notes |
|-----------|------------------|--------------|-------|
| `password_reset_otps` | `permissions: []` | ✓ | Properly server-only |
| `admin_audit_logs` | N/A | ✓ | Server writes only |
| `admin_impersonation_sessions` | N/A | ✓ | Server writes only |
| `credit_locks` | N/A | ✓ | Server writes only |
| `idempotency_cache` | N/A | ✓ | Server writes only |
| `ai_request_logs` | N/A | ✓ | Server writes only |
| `app_settings` | N/A | ✓ | Server writes only |
| `portfolio_settings` | N/A | ✓ | Server-only (verified in Phase 2) |

**Verdict**: PASS — server-only collections properly protected.

---

## 5. Drift Detection

### 5.1 `check-hub-drift.cjs` Logic

| Aspect | Status | Notes |
|--------|--------|-------|
| Compares local SHA-256 hash prefix (16 chars) vs deployed | ✓ | Uses first 16 hex chars |
| Reads deployed hashes from `app_settings.fn_deployed_hashes` | ✓ | Written by deploy script |
| Reports NEEDS_REDEPLOY / IN_SYNC / NO LOCAL SOURCE | ✓ | Clear output |
| Exits with error on missing API key | ✓ | Safe fallback |

**Finding D-05**: The drift script only compares the first 16 hex characters of the SHA-256 hash. While collision probability with 16 hex chars (64 bits) is negligible for this use case, a full hash comparison would be more robust.

**Severity**: LOW — 16 hex chars provides adequate collision resistance (1 in 2^64).

**Verdict**: PASS — trustworthy.

---

## 6. Appwrite Architecture Issues

### 6.1 Missing `ai-gateway` Hub for `resume-section-ai` Routing

**Finding D-06**: The `resume-section-ai` Appwrite function is a standalone hub NOT routed through `ai-gateway` (as documented in Phase 2 security audit). It has its own (weaker) credit and rate limiting implementation.

**Severity**: P1 — documented in Phase 2 (BR-01).

### 6.2 Cold Start Schedule for Public Portfolio Functions

**Finding D-07**: `get-public-portfolio` and `portfolio-gate` have CRON schedules (`*/5 * * * *`) to keep them warm and avoid cold-start delays for visitors.

**Verdict**: GOOD — intentional performance optimization.

### 6.3 Appwrite Git Deployment Disabled

**Finding D-08**: `DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS = true` in deploy_hubs.cjs (line 32). Git auto-deployment from Appwrite Console is disabled for all managed hubs.

**Verdict**: GOOD — prevents accidental auto-deploys from Appwrite Console.

---

## 7. Live Appwrite Access

Live Appwrite API access is available if `APPWRITE_API_KEY` is configured in the local environment. Without it, production drift and function health cannot be directly verified.

**Status**: `UNVERIFIED` — cannot connect to Appwrite API without credentials. Marking as UNKNOWN pending owner verification.

---

## 8. Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| D-01 | `appwrite-functions.md` lists only 9 of 26 hubs | MEDIUM | Documentation gap |
| D-02 | `target=all` is default in workflow (risks accidental full deploy) | LOW | Manual trigger mitigates |
| D-03 | `DEVKIT_PASSWORD` still passed to all admin hubs in deploy scripts | LOW | Migration not complete |
| D-04 | All hubs use `execute: ['any']` — auth is function-level only | HIGH | Undermined by DA-01 (raw password fallback) |
| D-05 | Drift check uses 16-char hash prefix instead of full hash | LOW | Acceptable collision resistance |
| D-06 | `resume-section-ai` not routed through ai-gateway | P1 | Weaker security boundary |
| D-07 | CRON warmup for public portfolio functions | GOOD | Intentional |
| D-08 | Appwrite Git deployment disabled | GOOD | Prevents accidental deploys |
| D-09 | 29 idempotent schema setup scripts | GOOD | Well-maintained |
| D-10 | 26 hubs matched across appwrite-hubs/ and deploy_hubs.cjs | GOOD | No orphans or missing entries |

### Critical Issues
None identified in deployment architecture.

### High
- **D-04**: All hubs open (`execute: ['any']`); function-level auth is the only barrier. The `email-service` raw password fallback (DA-01) makes this exploitable for that hub.

### Recommendations
1. Update `Project Atlas/architecture/appwrite-functions.md` to list all 26 hubs
2. Complete `DEVKIT_PASSWORD` deprecation (remove from deploy scripts and all admin hubs)
3. Consider making `target=all` require explicit user confirmation in workflow

---

*End of Phase 3 Appwrite/Backend/Deployment Audit Report*
