# Appwrite Console Verification Checklist

**Purpose:** Manual verification record for FIX-01 through FIX-04 from the Security Remediation Plan.
Record findings here — never add comments to `appwrite.json` (JSON does not support comments).

---

## FIX-01 — Appwrite Execute Permissions (WR-2026-001)

**Date verified:** ___________
**Verified by:** ___________

Navigate to: Appwrite Console → Functions → each function → Settings → Execute Access

### Permission Rules
- Admin functions → must be `users` or `team:<id>` — **never `any`**
- Public functions with internal auth → `any` acceptable only if internal auth is confirmed
- `job-import` → currently `any` (temporary); change to `users` after FIX-11 deploys
- `ai-health` → `any` intentional (public health probe, WR-2026-014 low risk)

### Results Table

| Function | Current Setting | Required Setting | Action Taken | Date |
|---|---|---|---|---|
| admin-devkit-data | | users | | |
| admin-impersonate | | users | | |
| admin-deploy-hubs | | users | | |
| admin-email | | users | | |
| admin-testmail | | users | | |
| admin-visitor-analytics | | users | | |
| admin-feature-flags | | users | | |
| admin-moderation | | users | | |
| admin-onboarding-funnel | | users | | |
| admin-portfolio-usernames | | users | | |
| ai-gateway | | any (internal auth confirmed) | | |
| public-share | | any (internal auth confirmed) | | |
| resume-section-ai | | any (internal auth confirmed) | | |
| coupons | | any (internal auth confirmed) | | |
| wisehire-gateway | | any (internal auth confirmed) | | |
| job-import | | any (TEMP → users after FIX-11) | | |
| ai-health | | any (intentional, WR-2026-014) | | |
| (functions 18-20) | | | | |

**Outcome:** PASS / FAIL / PARTIAL — ___________

---

## FIX-02 — IMPERSONATION_HMAC_SECRET (WR-2026-003)

**Date verified:** ___________
**Verified by:** ___________

### GitHub Actions Secrets
- [ ] `IMPERSONATION_HMAC_SECRET` exists in GitHub → Settings → Secrets and Variables → Actions
- [ ] Value is distinct from `APPWRITE_API_KEY` (do not record values here)

### Appwrite Console — admin-devkit-data Hub
Navigate to: Appwrite Console → Functions → Admin DevKit Data Hub → Settings → Environment Variables
- [ ] `IMPERSONATION_HMAC_SECRET` env var is set
- [ ] Value matches the GitHub secret

### Appwrite Console — admin-impersonate Hub
Navigate to: Appwrite Console → Functions → Admin Impersonate Hub → Settings → Environment Variables
- [ ] `IMPERSONATION_HMAC_SECRET` env var is set
- [ ] Value matches the GitHub secret

### Post-Configuration
- [ ] Both hubs redeployed after env var was set

**Outcome:** PASS / FAIL — ___________

---

## FIX-03 — chat_sessions.question_count Schema Attribute (WR-2026-008)

**Date verified:** ___________
**Verified by:** ___________

Navigate to: Appwrite Console → Databases → main → Collections → chat_sessions → Attributes

- [ ] `chat_sessions` collection exists
- [ ] `question_count` attribute exists (type: Integer, default: 0, required: false)

**If attribute missing:** Add Integer attribute named `question_count`, default `0`, not required.
**If collection missing:** Flag for FIX-16 (setup script creation). Manually create collection with server-only permissions.

**Action taken:** ___________

**Outcome:** PASS / FAIL / CREATED — ___________

---

## FIX-04 — Collection Permissions Audit (schema-permissions-audit)

**Date verified:** ___________
**Verified by:** ___________

Navigate to: Appwrite Console → Databases → main → Collections → [each] → Permissions tab

| Collection | Expected Read | Expected Write | Actual Read | Actual Write | Action Needed |
|---|---|---|---|---|---|
| `ai_request_logs` | None (server-only) | None (server-only) | | | |
| `idempotency_cache` | None (server-only) | None (server-only) | | | |
| `app_settings` | None (server-only) | None (server-only) | | | |
| `ai_credits` | User reads own doc | None (server-only) | | | |
| `ai_routing_config` | users (read OK) | None (server-only) | | | |
| `chat_sessions` | None (server-only) | None (server-only) | | | |
| `resumes` | User reads own doc | User writes own doc | | | |
| `tailor_history` | User reads own doc | None (server-only) | | | |

**Collections missing setup scripts** (flag for FIX-16):
- [ ] `ai_credits` — no setup script found
- [ ] `chat_sessions` — no setup script found
- [ ] `ai_routing_config` — no setup script found

**Outcome:** PASS / FAIL / PARTIAL — ___________

---

## FIX-16 — New Security Collections (WR-2026-018)

**Date verified:** ___________
**Verified by:** ___________

Run `APPWRITE_API_KEY=<key> APPWRITE_PROJECT_ID=<id> node scripts/setup-security-collections.cjs` once after deploying Batch 2.

| Collection | Purpose | Status |
|---|---|---|
| `admin_audit_log` | Impersonation event log (FIX-08) | Created / Pre-existing |
| `email_rate_limits` | Persistent email rate limit counters (FIX-10) | Created / Pre-existing |
| `portfolio_session_rate_limits` | Per-IP portfolio session caps (FIX-09) | Created / Pre-existing |
| `portfolio_daily_usage` | Per-portfolio daily question caps (FIX-09) | Created / Pre-existing |
| `credit_locks` | Credit check-and-deduct mutex (FIX-12) | Created / Pre-existing |

**Outcome:** PASS / FAIL — ___________

---

## FIX-20 — appwrite.json Function ID Verification (WR-2026-020) — MANUAL / UNRESOLVED

**Status:** ⚠️ MANUAL ONLY — Console access required
**Date verified:** ___________
**Verified by:** ___________

**Problem:** Most functions in `appwrite.json` use human-readable slug IDs (e.g., `ai-gateway`), but the actual
Function IDs in Appwrite Console may differ. Mismatches cause deployment failures or duplicate function creation.

**Cannot be automated:** Function IDs can only be retrieved from the Appwrite Console UI or API with project access.
They cannot be predicted or generated without Console access.

**Action required:**
1. Log in to Appwrite Console → project `69fd362b001eb325a192` → Functions
2. For each function in the table below, click Settings → copy the Function ID
3. Update `appwrite.json` — replace the slug with the real Function ID

| # | appwrite.json current | Console Function ID | Status |
|---|----------------------|---------------------|--------|
| 1 | `ai-gateway` | | ⬜ |
| 2 | `admin-deploy-hubs` | | ⬜ |
| 3 | `admin-devkit-data` | | ⬜ |
| 4 | `admin-email` | | ⬜ |
| 5 | `admin-feature-flags` | | ⬜ |
| 6 | `admin-impersonate` | | ⬜ |
| 7 | `admin-moderation` | | ⬜ |
| 8 | `admin-onboarding-funnel` | | ⬜ |
| 9 | `admin-portfolio-usernames` | | ⬜ |
| 10 | `admin-testmail` | | ⬜ |
| 11 | `admin-visitor-analytics` | | ⬜ |
| 12 | `ai-health` | | ⬜ |
| 13 | `coupons` | | ⬜ |
| 14 | `email-service` | | ⬜ |
| 15 | `inspect-ai-keys` | | ⬜ |
| 16 | `job-import` | | ⬜ |
| 17 | `public-share` | | ⬜ |
| 18 | `resume-section-ai` | | ⬜ |
| 19 | `wisehire-gateway` | | ⬜ |
| 20 | `6a0760710000ff231048` (admin-sentry) | `6a0760710000ff231048` | ✅ PRE-CONFIRMED |

**Blocking:** YES — Deployment will fail if IDs don't match. Complete before merging to main.

**Outcome:** ⬜ UNRESOLVED / ⬜ IN PROGRESS / ✅ COMPLETE — ___________

---

## FIX-05 — Turnstile Environment Variables (WR-2026-002)

**Date verified:** ___________
**Verified by:** ___________

Navigate to: Appwrite Console → Functions → AI Gateway Hub → Settings → Environment Variables

- [ ] `TURNSTILE_SECRET_KEY` is set (Cloudflare Turnstile secret key)

Navigate to: GitHub → Settings → Secrets and Variables → Actions

- [ ] `TURNSTILE_SECRET_KEY` secret exists
- [ ] `VITE_TURNSTILE_SITE_KEY` repository variable exists (public site key for frontend)

Navigate to: Vercel/Cloudflare Pages → Project Settings → Environment Variables

- [ ] `VITE_TURNSTILE_SITE_KEY` is set for Production environment

**Outcome:** PASS / FAIL — ___________

---

## FIX-14 — Purpose-Specific HMAC Secrets (WR-2026-023)

**Date verified:** ___________
**Verified by:** ___________

These secrets must be set in BOTH GitHub Actions secrets AND Appwrite Console function env vars.
They must be cryptographically random (32+ bytes) and distinct from each other and from `APPWRITE_API_KEY`.

### GitHub Actions Secrets
- [ ] `PUBLIC_SHARE_TOKEN_SECRET` — for signing/verifying cross-function portfolio chat tokens
- [ ] `GATEWAY_SMOKE_SECRET` — for smoke test token validation
- [ ] `ADMIN_TEST_HMAC_SECRET` — for admin test nonce validation

### Appwrite Console Function Environment Variables

**AI Gateway Hub:**
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `PUBLIC_SHARE_TOKEN_SECRET`
- [ ] `GATEWAY_SMOKE_SECRET`
- [ ] `ADMIN_TEST_HMAC_SECRET`

**Public Share Hub:**
- [ ] `PUBLIC_SHARE_TOKEN_SECRET` (same value as in ai-gateway)

**Outcome:** PASS / FAIL — ___________

---

## Post-Console Sign-Off

All checks above must be PASS before the corresponding batch is deployed to production.

- [ ] FIX-01 complete (update job-import to `users` now that FIX-11 is deployed)
- [ ] FIX-02 complete
- [ ] FIX-03 complete
- [ ] FIX-04 complete
- [ ] FIX-05 complete (Turnstile keys configured)
- [ ] FIX-14 complete (HMAC secrets configured)
- [ ] FIX-16 complete (run setup-security-collections.cjs)
- [ ] FIX-20 complete (verify appwrite.json function IDs — MANUAL ONLY)
- [ ] Ready to proceed with deployment
