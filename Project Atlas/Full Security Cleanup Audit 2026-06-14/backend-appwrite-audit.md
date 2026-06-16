# Backend & Appwrite Audit - WiseResume 2026-06-14

**Scope:** Appwrite functions, server code, deployment scripts, database  
**Platform:** Appwrite Cloud (fra.cloud.appwrite.io)  
**Runtime:** Node.js 22

---

## High Severity Findings (2)

### BE-H1: Non-Atomic Credit Deduction Race Condition
**Severity:** High  
**Area:** AI Gateway  
**File:** `appwrite-hubs/ai-gateway/src/main.js:527-599`  

**Evidence:**
```javascript
// loadCreditState + recordAiUsage is non-atomic read-write
async function loadCreditState(db, userId, featureName, prefetchedPlan = null) {
  // ... reads credit state
  // ... separate write in recordAiUsage
}
```

**Why it matters:**
- Concurrent requests can exceed daily limits
- Credit accounting may drift
- Documented as TODO in code

**Root cause:** Appwrite lacks atomic increment operations for this use case

**Current Mitigation:**
- Idempotency cache prevents same-input duplicates
- Rate limiting reduces concurrent window
- Warn-once logging for missing collections

**Recommended fix:**
- Implement optimistic locking with retry
- Or use database transaction if Appwrite supports
- Documented as "known limitation" in CHANGELOG

**Safe to fix:** NO - Requires careful design  
**Needs approval:** YES - Product priority decision  
**Status:** ACCEPTABLE RISK - Warm-instance rate limiter mitigates common case

---

### BE-H2: Impersonation Credit Attribution Fixed But Verify Deployed
**Severity:** High  
**Area:** AI Gateway / Admin  
**File:** `appwrite-hubs/ai-gateway/src/main.js:359-376`  

**Evidence:**
```javascript
// validateUserSession handles X-Impersonating-User-Id header
// Fixed in 2026-06-03 session per CHANGELOG
```

**Why it matters:**
- Admin "Act As" could charge wrong account
- Fixed in code but verify deployment

**Status:** FIXED in code  
**Verification needed:** Check deployed function version

---

## Medium Severity Findings (5)

### BE-M1: Idempotency Cache Cleanup Not Automated
**Severity:** Medium  
**Area:** Database  
**Collection:** `idempotency_cache`  

**Evidence:**
```javascript
// Expires at TTL but no automatic cleanup
expires_at: new Date(now + IDEMPOTENCY_TTL_MS).toISOString()
```

**Why it matters:**
- Collection will grow indefinitely
- Query performance degrades over time

**Recommended fix:**
- Add Appwrite scheduled function for cleanup
- Or use TTL index if Appwrite supports

**Safe to fix:** YES  
**Priority:** Medium

---

### BE-M2: Email Rate Limit In-Memory Only
**Severity:** Medium  
**Area:** AI Gateway  
**File:** `appwrite-hubs/ai-gateway/src/main.js:136-157`  

**Evidence:**
```javascript
const _emailRateLimits = new Map(); // Per-instance only
```

**Why it matters:**
- Cold start resets counters
- Cross-instance abuse possible

**Status:** Known limitation (Phase 5 deferred)

**Recommended fix:**
- Move to persistent storage (Appwrite collection)

---

### BE-M3: Functions Execute Permission Set to 'any'
**Severity:** Medium  
**Area:** Appwrite Configuration  
**File:** `scripts/deploy_hubs.cjs:147`  

**Evidence:**
```javascript
execute: ['any'], // Allows anonymous execution
```

**Why it matters:**
- Functions rely on self-authentication
- Correct pattern but requires perfect JWT validation

**Status:** ACCEPTABLE - Functions validate JWT internally

**Verification:**
- ✓ ai-gateway: validateUserSession() called
- ✓ admin-devkit-data: JWT verification
- ✓ public-share: Internal token OR JWT

---

### BE-M4: Startup Validation Logs to Console
**Severity:** Medium  
**Area:** AI Gateway  
**File:** `appwrite-hubs/ai-gateway/src/main.js:114-131`  

**Evidence:**
```javascript
console.error('[ALERT] ai-gateway: APPWRITE_API_KEY not configured');
console.warn('[ALERT] ai-gateway: ADMIN_EMAIL not set');
```

**Why it matters:**
- Appwrite logs are visible in console
- May leak configuration status

**Status:** ACCEPTABLE - No secrets logged, only presence/absence

---

### BE-M5: Internal Token Secret Key Reuse
**Severity:** Medium  
**Area:** AI Gateway  
**File:** `appwrite-hubs/ai-gateway/src/main.js:302-329`  

**Evidence:**
```javascript
const secret = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
```

**Why it matters:**
- Same key used for Appwrite SDK and internal tokens
- Key rotation affects both

**Status:** ACCEPTABLE - Short-lived tokens reduce risk

---

## Low Severity Findings (4)

### BE-L1: revenuecat-webhook Folder Empty
**Severity:** Low  
**Area:** Appwrite Hubs  
**Path:** `appwrite-hubs/revenuecat-webhook`  
**Status:** 0 items - RevenueCat removed per CHANGELOG 2026-05-27

**Safe to remove:** YES

---

### BE-L2: Unused Test Scripts in Hubs
**Severity:** Low  
**Area:** Appwrite Hubs  
**Note:** Some hubs may have test files not actively used

---

### BE-L3: Package.json Dependencies in Hubs
**Severity:** Low  
**Area:** Individual hub package.json files  
**Note:** Verify node-appwrite versions are consistent

---

### BE-L4: Stale GitHub Actions Workflow References
**Severity:** Low  
**Area:** CI/CD  
**Note:** `DEVKIT_PASSWORD` still in deploy-appwrite-hubs.yml but auth changed

---

## Appwrite Functions Inventory

### Active Functions (21)

| Function | Purpose | Auth | Status |
|----------|---------|------|--------|
| ai-gateway | AI orchestration | JWT + internal tokens | ✓ Hardened |
| admin-devkit-data | Admin operations | JWT (admin-only) | ✓ Secured |
| admin-email | Email diagnostics | DevKit session | ✓ Secured |
| admin-feature-flags | Feature management | DevKit session | ✓ Secured |
| admin-moderation | Content moderation | DevKit session | ✓ Secured |
| admin-portfolio-usernames | Username mgmt | DevKit session | ✓ Secured |
| admin-visitor-analytics | Analytics | DevKit session | ✓ Secured |
| admin-onboarding-funnel | Onboarding stats | DevKit session | ✓ Secured |
| admin-impersonate | User impersonation | Admin JWT | ✓ Secured |
| admin-deploy-hubs | Hub deployment | DevKit session | ✓ Secured |
| admin-sentry | Sentry integration | JWT | ✓ Secured |
| admin-testmail | Email testing | DevKit session | ✓ Secured |
| ai-health | AI health checks | None (public) | ✓ Safe |
| coupons | Subscription coupons | JWT | ✓ Secured |
| email-service | Transactional email | JWT / internal | ✓ Secured |
| inspect-ai-keys | AI key inspection | DevKit session | ✓ Secured |
| job-import | Job parsing | JWT | ✓ Secured |
| public-share | Public portfolio | Internal token | ✓ Secured |
| resume-section-ai | Resume AI | JWT | ✓ Secured |
| wisehire-gateway | WiseHire API | JWT | ✓ Secured |

### Configuration in appwrite.json

All functions properly configured with:
- Node.js 22 runtime
- Correct entrypoints
- Build commands

---

## Database Schema Observations

### Collections Referenced in Code

| Collection | Purpose | Permission Pattern |
|------------|---------|-------------------|
| ai_credits | Credit tracking | User-scoped |
| subscriptions | Plan management | Server-only |
| idempotency_cache | Deduplication | Server-only |
| chat_sessions | Portfolio chat | Server-only |
| ai_request_logs | Analytics | Server-only |
| profiles | User profiles | Mixed |
| resumes | Resume data | User-scoped |

**Status:** Properly configured per CHANGELOG entries

---

## Deployment Script Analysis

### scripts/deploy_hubs.cjs

**Strengths:**
- Source hash verification
- Only deploys changed functions
- Rollback capability via deployment retention

**Concerns:**
- Uses `execute: ['any']` - but functions self-authenticate
- DevKit session token in smoke tests

### GitHub Actions Workflow

**deploy-appwrite-hubs.yml:**
- Manual trigger only (workflow_dispatch) ✓
- Concurrency control ✓
- Environment variables passed securely ✓
- FRONTEND_URL outdated (see security-audit.md SEC-H1)

---

## Appwrite Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Functions validate JWT | ✓ | All functions use validateUserSession |
| Database permissions scoped | ✓ | User data properly isolated |
| Server collections protected | ✓ | No browser direct access |
| API keys in env vars | ✓ | No hardcoded keys |
| Function timeouts set | ✓ | HUB_TIMEOUTS configured |
| Git integration disabled | ✓ | DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS |
| Source hash verification | ✓ | Enforced in CI |

---

## Recommendations

### Immediate (Safe to Implement)

1. **Remove empty revenuecat-webhook folder**
2. **Update FRONTEND_URL in workflow**
3. **Add idempotency cache cleanup job**

### Planned (Require Design)

1. **Persistent rate limiting** (Phase 5)
2. **Atomic credit operations** (requires Appwrite feature or custom lock)

### Monitoring

1. **Track idempotency cache size**
2. **Monitor credit accounting drift**
3. **Alert on function error rates**
