# Safe Fix Batch Plan - WiseResume 2026-06-14

**Status:** Second-pass verified  
**Classification:** Evidence-based only  
**Risk Level:** Low to None for SAFE NOW items

---

## Evidence Summary

| Item | Evidence | Classification |
|------|----------|----------------|
| FRONTEND_URL | Used by email-service for redirect URLs, has fallback | SAFE NOW |
| @testing-library/dom | 35 imports in __tests__, 0 in src/ | SAFE NOW |
| revenuecat-webhook | Empty folder (0 items), workflow ref removed | SAFE NOW |
| DEVKIT_PASSWORD | Still used as fallback in email-service | **NOT SAFE** |

---

## 1. SAFE NOW

### 1.1 Update FRONTEND_URL in Workflow

**File:** `.github/workflows/deploy-appwrite-hubs.yml:86`  
**Change:** Single line edit  
**Risk:** None (function has fallback)  
**Rollback:** Revert single line

```yaml
# BEFORE:
FRONTEND_URL: https://resume.thewise.cloud

# AFTER:
FRONTEND_URL: https://wiseresume.app
```

**Evidence:**
- Function has fallback: `const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://wiseresume.app')`
- Used for email redirect URLs in `email-service/src/main.js`
- Current incorrect value causes email links to use legacy domain

**Validation:**
```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Tests
npm run test
```

**Deploy Impact:**
- Vercel deploy: **NO** (workflow only)
- Appwrite deploy: **NO** (env var only, next deploy picks it up)

---

### 1.2 Move @testing-library/dom to devDependencies

**File:** `package.json`  
**Change:** Move one dependency line  
**Risk:** None (only used by tests)  
**Rollback:** `git checkout package.json package-lock.json`

**Commands:**
```bash
npm uninstall @testing-library/dom
npm install -D @testing-library/dom
```

**Evidence:**
- 35 imports in `**/__tests__/**` files only
- 0 imports in `src/` (non-test files)
- No runtime code depends on it

**Files using it (all tests):**
- `src/components/**/__tests__/*.test.tsx` (12 files)
- `src/hooks/__tests__/*.test.tsx` (5 files)
- `src/pages/__tests__/*.test.tsx` (15 files)
- `src/test/*.tsx` (3 files)

**Validation:**
```bash
# Verify no source imports
grep -r "@testing-library/dom" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__"
# Should return empty

# Install and verify
npm ci
npm run test
```

**Deploy Impact:**
- Vercel deploy: **NO** (devDependency)
- Appwrite deploy: **NO** (devDependency)

---

### 1.3 Remove Empty revenuecat-webhook Folder

**Path:** `appwrite-hubs/revenuecat-webhook/`  
**Change:** Delete directory  
**Risk:** None (empty, references removed)  
**Rollback:** `git checkout appwrite-hubs/revenuecat-webhook/`

**Evidence:**
- Folder contains only empty `node_modules/` (0 items)
- Workflow step removed per CHANGELOG 2026-05-29
- No code references found (only in docs/audit files)
- RevenueCat payment provider removed from codebase

**Validation:**
```bash
# Verify empty
ls -la appwrite-hubs/revenuecat-webhook/
# Should show only empty node_modules

# After removal
grep -r "revenuecat-webhook" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" .
# Should return only docs/audit references
```

**Deploy Impact:**
- Vercel deploy: **NO**
- Appwrite deploy: **NO** (folder not deployed)

---

## 2. NEEDS EVIDENCE FIRST

### 2.1 DEVKIT_PASSWORD Removal

**Status:** NOT SAFE  
**Reason:** Still used as legacy fallback

**Evidence of active usage:**
```javascript
// appwrite-hubs/email-service/src/main.js:144-147
async function hasDevKitAuth(req, body) {
  const devkitPassword = process.env.DEVKIT_PASSWORD || '';
  const token = bearerToken(req, body);
  if (!token) return false;
  if (devkitPassword && (token === devkitPassword || verifySignedDevKitToken(token))) return true;
  // ...
}
```

**Required evidence before removal:**
1. Confirm no admin users rely on password fallback
2. Verify all admin functions work with JWT-only auth
3. Check Appwrite console for DEVKIT_PASSWORD env var usage
4. Audit admin activity logs for password-based access

**Current state:**
- Primary auth: JWT/Appwrite session (new method)
- Fallback auth: DEVKIT_PASSWORD (legacy method)
- Safe to keep as fallback until evidence proves unused

**Action:** Gather evidence first, do not remove yet.

---

### 2.2 Console.log Cleanup

**Status:** NEEDS EVIDENCE  
**Count:** 242 matches across 83 files

**Safe to remove (verify each):**
- Debug logs in server functions (`api/export/pdf-native.ts`)
- Test-only logging
- Development helpers

**Keep (verify usage):**
- Error boundary logging
- DevKit panel logs (admin-only)
- Critical error reporting

**Required before removal:**
1. Categorize each console.log by purpose
2. Identify which are debug vs error reporting
3. Verify no production debugging depends on them

---

### 2.3 Drizzle/PostgreSQL Dependencies

**Status:** NEEDS EVIDENCE  
**Packages:** `drizzle-orm`, `drizzle-kit`, `pg`

**Evidence needed:**
1. Check if local server still uses PostgreSQL
2. Verify all production data is in Appwrite
3. Confirm no migration scripts need these

**Files to check:**
- `server/index.ts`
- `server/schema.ts`
- Migration scripts

---

## 3. NEEDS PRODUCT/ARCHITECTURE DECISION

### 3.1 Credit Race Condition

**File:** `appwrite-hubs/ai-gateway/src/main.js`  
**Issue:** Non-atomic credit deduction  
**Status:** Known limitation, Phase 5 deferred

**Decision needed:**
- Accept current mitigation (idempotency + rate limiting)
- Or implement persistent lock mechanism

**Do not fix without:**
- Architecture review
- Load testing plan
- Rollback strategy

---

### 3.2 Plan Cache in localStorage

**File:** `src/lib/planCache.ts`  
**Issue:** Unencrypted plan data in localStorage  
**Status:** By design for UX

**Decision needed:**
- Accept risk (data re-validated server-side)
- Or move to sessionStorage
- Or encrypt (complexity vs benefit)

**Do not change without:**
- UX impact assessment
- Product owner approval

---

### 3.3 Persistent Rate Limiting

**File:** `appwrite-hubs/ai-gateway/src/main.js`  
**Issue:** Email rate limit in-memory only  
**Status:** Phase 5 deferred per CHANGELOG

**Decision needed:**
- Accept cold-start reset risk
- Or implement persistent storage

**Do not fix without:**
- Performance impact analysis
- Storage solution decision (Redis/Appwrite)

---

### 3.4 Mobile App Code

**Path:** `mobile/`  
**Status:** Legacy, out of scope per RULES.md

**Decision needed:**
- Keep for future development
- Archive to separate branch
- Remove entirely

**Do not touch without:**
- Product roadmap confirmation
- Mobile strategy decision

---

### 3.5 Logging Policy

**Issue:** 242 console.log statements  
**Status:** No defined policy

**Decision needed:**
- What to log in production
- When to use console vs Sentry
- Debug vs error logging distinction

**Do not bulk-remove without:**
- Logging policy defined
- Error tracking verification

---

## 4. DO NOT TOUCH

### 4.1 AI Gateway Core Logic

**Reason:** Recently hardened (Phase 1-4, June 2025)
**Files:**
- `appwrite-hubs/ai-gateway/src/main.js`
- Credit handling
- JWT validation
- Rate limiting

**Exception:** Only with explicit security task approval

---

### 4.2 Auth/Permission Patterns

**Reason:** Working correctly, high breakage risk
**Files:**
- `src/contexts/AuthContext.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/lib/appwriteJWT.ts`
- Appwrite function permission patterns

**Exception:** Only with explicit auth refactor task

---

### 4.3 Appwrite Collection Permissions

**Reason:** Verified correct, sensitive to changes
**Status:** Server-only where required, user-scoped where appropriate

**Exception:** Only with database schema change approval

---

### 4.4 PDF Text Preprocessor Encoding Fixes

**Reason:** Intentional mojibake recovery
**File:** `src/lib/pdf/textPreprocessor.ts:52-68`

```typescript
// These are CORRECT - do not modify
.replace(/â€™/g, "'")      // Smart quote
.replace(/â€"/g, "—")     // Em dash
.replace(/Ã©/g, 'é')       // French characters
```

---

## Validation Commands

### Pre-Change
```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Tests
npm run test
```

### Post-Change
```bash
# TypeScript
npx tsc --noEmit

# Build
npm run build

# Tests
npm run test

# Verify specific changes
grep "FRONTEND_URL" .github/workflows/deploy-appwrite-hubs.yml
grep "@testing-library/dom" package.json
ls appwrite-hubs/revenuecat-webhook/  # Should fail (dir removed)
```

---

## Rollback Procedures

| Change | Rollback Command |
|--------|------------------|
| FRONTEND_URL | `git checkout .github/workflows/deploy-appwrite-hubs.yml` |
| @testing-library/dom | `git checkout package.json package-lock.json && npm ci` |
| revenuecat-webhook | `git checkout appwrite-hubs/revenuecat-webhook/` |

---

## Deployment Impact Summary

| Change | Vercel Deploy | Appwrite Deploy | Trigger |
|--------|---------------|-------------------|---------|
| FRONTEND_URL | No | No (env var) | Next workflow run |
| @testing-library/dom | No | No | N/A (devDep) |
| revenuecat-webhook | No | No | N/A |

**None of these changes trigger automatic deployment.**

---

## Approved Safe Batch

The following changes are approved for immediate implementation:

1. ✅ **FRONTEND_URL workflow fix** - Single line, verified safe
2. ✅ **@testing-library/dom to devDeps** - Test-only dependency
3. ✅ **Remove empty revenuecat-webhook** - No references

**Total estimated time:** 10 minutes  
**Risk level:** None  
**Rollback time:** < 1 minute per change

---

*Verified: 2026-06-14*  
*Next review required before implementing Phase 2+*
