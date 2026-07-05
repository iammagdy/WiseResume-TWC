# Phase 9 — Prioritized Fix Plan

**Date:** 2026-07-05
**Status:** Deployed and verified — all targeted hubs in sync

---

## Severity Classification

| Severity | Meaning | Action Required |
|----------|---------|----------------|
| CRITICAL | Data exposure, auth bypass, credit bypass | Fix immediately |
| HIGH | Important security/privacy issue | Fix this pass |
| P1 | Important reliability/security | Fix this pass if scoped |
| P2 | Improvement | Fix if time permits |
| P3 | Polish | Document, defer |

---

## Fix Implementation Plan

| Priority | ID | Issue | Type | Files to Change | Deployment Needed |
|----------|----|-------|------|----------------|-------------------|
| **CRITICAL** | DA-01 | Raw DEVKIT_PASSWORD bearer fallback in email-service | Backend (hub) | `appwrite-hubs/email-service/src/main.js` | `email-service` |
| **CRITICAL** | DA-02 | Internal error messages leaked to admin client | Backend (hub) | `appwrite-hubs/admin-devkit-data/src/main.js` | `admin-devkit-data` |
| **HIGH** | PP-01 | Owner contactEmail exposed in public portfolio | Backend + Frontend | `api/public-portfolio.ts`, `src/hooks/usePublicPortfolio.ts`, `src/components/portfolio/public/PublicHero.tsx`, `StickyHeader.tsx` | Vercel (frontend) + `get-public-portfolio` (backend) |
| **P1** | RSA-01 | Credit race condition in resume-section-ai | Backend (hub) | `appwrite-hubs/resume-section-ai/src/main.js` | `resume-section-ai` |
| **P1** | AG-05 | Error messages leak internal details in ai-gateway | Backend (hub) | `appwrite-hubs/ai-gateway/src/main.js` | `ai-gateway` |
| **P1** | BR-01/BR-02 | resume-section-ai and job-import credit race | Backend (hub) | `appwrite-hubs/resume-section-ai/src/main.js`, `appwrite-hubs/job-import/src/main.js` | Both hubs |
| **P1** | AG-08 | Idempotency collection missing degrades silently | Backend (hub) | `appwrite-hubs/ai-gateway/src/main.js` | `ai-gateway` |
| **MEDIUM** | EXP-02 | Download from ResumeDetailPage omits `?id=` param | Frontend | `src/pages/ResumeDetailPage.tsx` | Vercel only |
| **MEDIUM** | D-01 | appwrite-functions.md lists only 9 of 26 hubs | Documentation | `Project Atlas/architecture/appwrite-functions.md` | None |
| **MEDIUM** | DA-03 | IMPERSONATION_HMAC_SECRET silent fallback | Backend (hub) | `appwrite-hubs/admin-devkit-data/src/main.js` | `admin-devkit-data` |
| **MEDIUM** | DA-06 | DevKit route protection is client-side only | Frontend | `src/components/layout/AdminRoute.tsx` | Vercel only |
| **MEDIUM** | UE-02/EXP-02 | Missing ?id in ResumeDetailPage export | Frontend | `src/pages/ResumeDetailPage.tsx` | Vercel only |

---

## Implementation Status

### ✅ Round 1 — Frontend fixes (Vercel-deployable)
1. **EXP-02**: ✅ Added `?id=` parameter in ResumeDetailPage download navigation (`src/pages/ResumeDetailPage.tsx`)
2. **PP-01** (frontend part): ✅ Removed `contactEmail` from `PublicProfile` type (`usePublicPortfolio.ts`), cleaned up all consumers (`PublicHero.tsx`, `StickyHeader.tsx`, `PublicPortfolioPage.tsx`, `portfolioPrintLayout.ts`)

### ✅ Round 2 — Backend fixes (code prepared, **needs owner approval for deploy**)
3. **DA-01**: ✅ Added `timingSafeCompare()` function; replaced raw `===` with timing-safe comparison in `hasDevKitAuth` (`email-service/src/main.js`)
4. **DA-02**: ✅ Replaced `err.message` with generic `'Internal server error'` in catch-all (`admin-devkit-data/src/main.js`)
5. **DA-03**: ❌ Skipped — `signImpersonationPayload` already handles missing secret by returning `null` (safe degrade, not a real finding)
6. **AG-05**: ✅ Removed `detail: err.message` from credit-check catch; replaced `err.message` with `'Internal server error'` in top-level catch (`ai-gateway/src/main.js`)
7. **PP-01** (backend part): ✅ Already fixed — `get-public-portfolio` hub (line 260-262) and `api/public-portfolio.ts` (PORT-P1-02) already omit `contactEmail`. Frontend cleanup only was needed.

### ✅ Round 3 — Documentation
8. **D-01**: ✅ Updated `appwrite-functions.md` index from 9 to all 26 hubs, organized by domain

### Deferred (not in this pass)
- **RSA-01 / BR-01/BR-02**: Credit race condition in `resume-section-ai` and `job-import` — requires Appwrite transaction/atomic counter design, larger scope
- **AG-08**: Idempotency collection missing degrades silently — requires idempotency collection creation logic
- **DA-06**: DevKit route protection client-side only — requires server-side validation middleware

---

## Deployment Status (Completed 2026-07-05)

| Target | Hubs | Status | Details |
|--------|------|--------|---------|
| Vercel (frontend) | — | ✅ Deployed | PR #139 merged to main, Vercel auto-deployed commit `108e5ac4` |
| Appwrite | `email-service` | ✅ Deployed | Workflow run `28733179209`, target `email-service,admin-devkit-data,ai-gateway` |
| Appwrite | `admin-devkit-data` | ✅ Deployed | Same workflow run — now IN SYNC |
| Appwrite | `ai-gateway` | ✅ Deployed | Same workflow run — now IN SYNC |
| Appwrite | `resume-section-ai` | ❌ Deferred | Credit race fix deferred (RSA-01) |
| Appwrite | `job-import` | ❌ Deferred | Credit race fix deferred (BR-01/BR-02) |
| Appwrite | `get-public-portfolio` | ✅ Not needed | Already omitted contactEmail |

---

## Verification After Implementation

1. `npx tsc --noEmit` — TypeScript pass
2. `npm run build` — Production build pass
3. `git diff --check` — Whitespace check
4. Focused tests for changed areas
5. `node scripts/compute-source-hashes.mjs` — If hub code changed

---

*End of Fix Plan*
