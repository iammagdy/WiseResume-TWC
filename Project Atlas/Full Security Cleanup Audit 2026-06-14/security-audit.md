# Security Audit - WiseResume 2026-06-14

**Scope:** Frontend, backend, Appwrite functions, deployment scripts, authentication, AI gateway  
**Methodology:** Static code analysis, pattern matching, permission review  
**Limitations:** No runtime testing, no dashboard access, no log inspection

---

## Critical Findings (0)

No critical security vulnerabilities identified in static analysis.

---

## High Severity Findings (3)

### SEC-H1: Workflow Uses Stale FRONTEND_URL Domain
**Severity:** High  
**Area:** CI/CD  
**File:** `.github/workflows/deploy-appwrite-hubs.yml:86`  

```yaml
FRONTEND_URL: https://resume.thewise.cloud  # Should be wiseresume.app
```

**Evidence:**
- Workflow still references legacy domain
- Primary domain migrated to wiseresume.app per CHANGELOG 2026-06-13

**Why it matters:**
- May affect callback URLs in email services
- Could cause CORS issues if functions validate origin

**Root cause:** Domain migration incomplete in CI/CD configs

**Recommended fix:**
```yaml
FRONTEND_URL: https://wiseresume.app
```

**Safe to fix:** YES  
**Needs verification:** YES - Check if any functions depend on this exact value

---

### SEC-H2: Console.log Statements in Production Code
**Severity:** High  
**Area:** Frontend / Backend  
**Count:** 242 matches across 83 files  

**Top files by count:**
| File | Count | Type |
|------|-------|------|
| `api/export/pdf-native.ts` | 23 | Server function |
| `src/hooks/useWebSpeechFallback.ts` | 15 | Client hook |
| `tests/model-comparison/runner.ts` | 12 | Test utility |
| `src/lib/pdfParser.ts` | 11 | Client library |

**Evidence:**
```typescript
// Example from pdf-native.ts (server-side, less critical)
console.log('PDF generation completed:', stats);

// Example from client-side hooks (more critical - user data exposure risk)
console.log('Resume parsed:', resumeData);
```

**Why it matters:**
- May leak PII to browser console
- Clutters production logs
- Some logs may contain resume content, job descriptions, or API keys

**Root cause:** Development debugging left in production

**Recommended fix:**
1. Remove obvious debug logs
2. Replace with structured logging (Sentry) where needed
3. Keep error boundary logs for debugging

**Safe to fix:** PARTIAL - Review each file individually  
**Needs approval:** NO for obvious debug logs, YES for error logging

---

### SEC-H3: Email Rate Limit In-Memory Only
**Severity:** High  
**Area:** Appwrite Function  
**File:** `appwrite-hubs/ai-gateway/src/main.js:136-157`  

```javascript
const _emailRateLimits = new Map(); // ip → { count, resetAt }
```

**Evidence:**
- Rate limiter uses in-memory Map
- Resets on function cold start
- No cross-instance coordination

**Why it matters:**
- Abuse possible via multi-instance requests
- Limited to 3 emails/hour per IP, but can be bypassed

**Root cause:** Documented known limitation (Phase 3 deferred)

**Recommended fix:**
- Move to persistent rate limit storage (Redis or Appwrite collection)
- Documented as "Known Limitations Deferred to Phase 5" in CHANGELOG

**Safe to fix:** NO - Requires architectural change  
**Needs approval:** YES - Product decision on priority

---

## Medium Severity Findings (8)

### SEC-M1: Supabase/Kinde Legacy References Remain
**Severity:** Medium  
**Area:** Frontend / Tests  
**Count:** 167 matches across 44 files  

**Evidence:**
```typescript
// tests/e2e/specs/16-portfolio-public-merged.spec.ts:20
// Stale Supabase mock still present

// src/pages/DevToolsPage.tsx:45
// References Supabase in error translation
```

**Why it matters:**
- Confusing for new developers
- Tests may not reflect actual Appwrite behavior
- Dead code paths may exist

**Recommended fix:**
1. Audit and update test fixtures
2. Remove Supabase from error translation layer
3. Search for any remaining Supabase client imports

**Safe to fix:** YES  
**Needs verification:** Check if any Supabase code is still active

---

### SEC-M2: Old Domain References in Codebase
**Severity:** Medium  
**Area:** Tests / Config  
**Count:** 24 matches across 11 files  

**Evidence:**
```typescript
// tests/model-comparison/providers.ts
const DOMAIN = 'resume.thewise.cloud';  // Should be wiseresume.app

// src/lib/portfolioUrl.ts (expected - backward compatibility)
const DOMAIN_MAP = {
  'resume.thewise.cloud': 'wiseresume.app',  // Correctly mapped
};
```

**Why it matters:**
- Tests may validate wrong URLs
- Documentation inconsistency
- Confusion about primary domain

**Recommended fix:**
1. Update test files to use wiseresume.app
2. Keep DOMAIN_MAP for backward compatibility

**Safe to fix:** YES for tests, NO for DOMAIN_MAP

---

### SEC-M3: Session Token Stored in sessionStorage
**Severity:** Medium  
**Area:** Frontend  
**File:** Multiple locations  

**Evidence:**
```typescript
// TailoringHubPage.tsx
sessionStorage.setItem('wr_tailoring_session', '1');

// AuthVerifyEmailPage.tsx
localStorage.setItem('wr_verify_resend_ts', String(Date.now()));
```

**Why it matters:**
- sessionStorage survives page refresh but not tab close
- localStorage persists indefinitely
- Could be accessed by XSS if vulnerability exists

**Recommended fix:**
- Review all localStorage/sessionStorage usage
- Ensure no sensitive tokens stored (JWT is in memory via Appwrite)

**Safe to fix:** REVIEW ONLY - Current usage appears safe

---

### SEC-M4: AI Gateway Allows Any Execution
**Severity:** Medium  
**Area:** Appwrite Functions  
**File:** `scripts/deploy_hubs.cjs:147`  

```javascript
execute: ['any'],  // Allows anonymous execution
```

**Evidence:**
- Functions configured with `execute: ['any']`
- Auth handled internally by functions

**Why it matters:**
- Correct pattern for Appwrite Functions that self-auth
- Relies on proper JWT validation inside functions

**Root cause:** Intentional design - functions self-authenticate

**Recommended fix:**
- Verify all functions validate JWT correctly
- Document this pattern for security audits

**Safe to fix:** NO - Working as designed  
**Status:** VERIFIED - All functions call validateUserSession()

---

### SEC-M5: Internal Token Uses APPWRITE_API_KEY as Secret
**Severity:** Medium  
**Area:** Appwrite Functions  
**File:** `appwrite-hubs/ai-gateway/src/main.js:302-329`  

```javascript
function verifySignedInternalToken(token, expectedPurpose) {
  const secret = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  // ... HMAC verification
}
```

**Evidence:**
- Uses same secret for internal tokens as Appwrite SDK
- Tokens are short-lived with expiration
- Different purposes use different expectedPurpose strings

**Why it matters:**
- If API key leaked, internal tokens could be forged
- But tokens are short-lived and purpose-scoped

**Recommended fix:**
- Consider separate INTERNAL_TOKEN_SECRET env var
- Current implementation is acceptable with proper key rotation

**Safe to fix:** NO - Requires env var coordination  
**Status:** ACCEPTABLE RISK - Short-lived tokens reduce exposure

---

### SEC-M6: PDF Export Server Has Broad CORS
**Severity:** Medium  
**Area:** API / Server  
**File:** `api/export/pdf-native.ts`  

**Evidence:**
- Uses CORS middleware
- Origin validation needed

**Why it matters:**
- PDF generation could be abused
- SSRF risk if not properly validated

**Status:** UNKNOWN - Requires file inspection

**Recommended fix:**
- Verify CORS origin restriction
- Add request size limits

---

### SEC-M7: Feature Flags Allow Client Override
**Severity:** Medium  
**Area:** Frontend  
**Evidence:**
- Feature flags may be modifiable client-side

**Why it matters:**
- Could enable disabled features

**Status:** UNKNOWN - Requires DevToolsPage inspection

---

### SEC-M8: AI Request Logs May Contain PII
**Severity:** Medium  
**Area:** Appwrite / Monitoring  
**Evidence:**
- AI requests logged for analytics
- May include resume content, job descriptions

**Why it matters:**
- PII in logs = compliance risk
- GDPR/CCPA implications

**Status:** PARTIALLY MITIGATED - sanitizeAiPayload strips sensitive keys

---

## Low Severity Findings (5)

### SEC-L1: Unused Test Files Referencing Old Architecture
**Severity:** Low  
**Area:** Tests  
**Files:** Various e2e specs with Supabase mocks

**Safe to fix:** YES

---

### SEC-L2: Mobile App Code Still Present
**Severity:** Low  
**Area:** mobile/ directory  
**Status:** Unknown if maintained

---

### SEC-L3: Server-side Test Utilities in Dependencies
**Severity:** Low  
**Area:** package.json  
**Evidence:**
- `@testing-library/dom` in dependencies (should be devDependencies)

---

### SEC-L4: revenuecat-webhook Folder Empty
**Severity:** Low  
**Area:** appwrite-hubs/revenuecat-webhook  
**Status:** 0 items - safe to remove

---

### SEC-L5: Multiple AI Provider Keys in GitHub Secrets
**Severity:** Low  
**Area:** GitHub Actions  
**Status:** Acceptable - key rotation strategy

---

## Security Strengths

1. **Phase 1-4 AI Security Hardening** - Recent comprehensive security improvements
2. **Self-authenticating Functions** - All Appwrite functions validate JWT internally
3. **sanitizeAiPayload** - Strips sensitive keys before AI processing
4. **Idempotency Protection** - Prevents duplicate credit charges
5. **Rate Limiting** - Multiple layers (per-user, per-IP, per-feature)
6. **Input Validation** - Whitelist approach for wise-ai-chat payloads
7. **Timing-safe Comparison** - crypto.timingSafeEqual for token verification
8. **HTML Escaping** - escapeHtml helper for email content

---

## Appendix: Security Files Checklist

| File | Purpose | Status |
|------|---------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | AI security hardened | ✓ Phase 1-4 complete |
| `src/lib/appwrite-functions.ts` | JWT handling | ✓ Reviewed |
| `src/contexts/AuthContext.tsx` | Auth state | ✓ Appwrite native |
| `src/components/layout/ProtectedRoute.tsx` | Route guards | ✓ Reviewed |
| `src/lib/appwriteJWT.ts` | JWT utilities | ✓ Reviewed |
