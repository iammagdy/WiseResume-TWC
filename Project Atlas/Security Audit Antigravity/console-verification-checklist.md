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

## FIX-20 — appwrite.json Function ID Verification (WR-2026-020)

**Date verified:** ___________
**Verified by:** ___________

Navigate to: Appwrite Console → Functions → [each function] → Settings → Function ID

Most functions use human-readable slug IDs (e.g. `ai-gateway`). Verify that each slug in `appwrite.json`
matches the actual Function ID shown in the Console. Update `appwrite.json` for any that differ.

Note: `admin-sentry` already has a real 20-char hex ID (`6a0760710000ff231048`).

| appwrite.json functionId | Console Function ID | Match? |
|---|---|---|
| `ai-gateway` | | |
| `admin-deploy-hubs` | | |
| `admin-devkit-data` | | |
| `admin-email` | | |
| `admin-feature-flags` | | |
| `admin-impersonate` | | |
| `admin-moderation` | | |
| `admin-onboarding-funnel` | | |
| `admin-portfolio-usernames` | | |
| `admin-testmail` | | |
| `admin-visitor-analytics` | | |
| `ai-health` | | |
| `coupons` | | |
| `email-service` | | |
| `inspect-ai-keys` | | |
| `job-import` | | |
| `public-share` | | |
| `resume-section-ai` | | |
| `wisehire-gateway` | | |
| `6a0760710000ff231048` (admin-sentry) | 6a0760710000ff231048 | PRE-CONFIRMED |

**Outcome:** PASS / FAIL / PARTIAL — ___________

---

## Post-Console Sign-Off

All checks above must be PASS before the corresponding batch is deployed to production.

- [ ] FIX-01 complete (update job-import to `users` now that FIX-11 is deployed)
- [ ] FIX-02 complete
- [ ] FIX-03 complete
- [ ] FIX-04 complete
- [ ] FIX-16 complete (run setup-security-collections.cjs)
- [ ] FIX-20 complete (verify appwrite.json function IDs)
- [ ] Ready to proceed with Batch 1A / 2 deployment
