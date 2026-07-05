# Phase 2 — Security & Abuse Audit Report

**Date:** 2026-07-05
**Status:** Complete
**Auditor:** AI Agent
**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `wiseresume.app`

---

## Scope

- AI / credits abuse
- Public portfolio security
- Admin / DevKit auth
- Upload / export security
- CORS / secrets / logs

---

## 1. AI / Credits Abuse

### 1.1 `ai-gateway` (appwrite-hubs/ai-gateway/src/main.js)

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| AG-01 | Credit deduction race (mitigated by per-user credit lock + optimistic locking) | ai-gateway:1152-1190 | P1 | Acceptable — credit lock serializes writes; extreme race window only if lock TTL expires |
| AG-02 | Admin test nonce bypasses all credit/rate checks (intentional, HMAC-guarded) | ai-gateway:3407-3595 | False positive | Properly guarded via `verifyAdminTestNonce` with HMAC-SHA256 |
| AG-03 | Portfolio auth token replay (bounded by daily caps + session limit) | ai-gateway:821-828 | P1 | Acceptable — `PORTFOLIO_MAX_QUESTIONS=10` per session; daily cap 50-200 |
| AG-04 | In-memory server rate limit resets on cold start | ai-gateway:145-151,1192-1208 | P2 | Persistent rate limit via `ai_request_logs` mitigates cross-instance bypass |
| AG-05 | Error messages leak internal details to client via catch-all | ai-gateway:3892 | **P1** | `err.message` returned verbatim on 500 — should return sanitized generic message |
| AG-06 | Provider keys NEVER logged (good) | ai-gateway:3071-3087 | False positive | Properly implemented |
| AG-07 | `score-resume` has zero cost (intentional) | ai-gateway:39 | False positive | Intentionally free feature |
| AG-08 | Missing idempotency collection degrades silently (allows duplicate charges) | ai-gateway:935-943 | **P1** | Should fail-closed or emit ops alert when collection missing |

### 1.2 `resume-section-ai` (appwrite-hubs/resume-section-ai/src/main.js)

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| RSA-01 | **No credit lock** — race condition allows free AI calls via concurrent requests | resume-section-ai:293-303 | **P1** | Unlike ai-gateway, no `acquireCreditLock`. Two concurrent requests can each write `daily_usage=4` instead of 5 |
| RSA-02 | No persistent rate limit (in-memory only, resets on cold start) | resume-section-ai:305-321 | P2 | Should add persistent DB-backed rate limit |
| RSA-03 | No concurrency guard per user | resume-section-ai (entire) | P2 | ai-gateway limits to `MAX_CONCURRENT_JOBS_PER_USER=2` |
| RSA-04 | Smoke test short-circuits before auth check | resume-section-ai:757-762 | P2 | Returns provider availability booleans (not keys) — low risk but inconsistent with ai-gateway |
| RSA-05 | Catch-all error returns raw `err.message` to client | resume-section-ai:957 | P2 | Should sanitize |
| RSA-06 | `daily_limit` stored in document (staleness risk on plan upgrade) | resume-section-ai:266,272-273 | P2 | ai-gateway derives limit from config at read time |
| RSA-07 | Provider error details leak in error messages | resume-section-ai:341-361,957 | P2 | Should sanitize |

### 1.3 Architecture: `resume-section-ai` not routed through `ai-gateway`

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| BR-01 | `resume-section-ai` is NOT in `AI_HUB_FUNCTIONS` — routes directly to standalone hub with weaker security posture | appwrite-bridge.ts:5-23 | **P1** | Standalone hub lacks credit lock, persistent rate limit, concurrency guard |
| BR-02 | `job-import` (parse-job) shares same credit race condition as resume-section-ai | job-import/src/main.js:86 | **P1** | Ported from resume-section-ai pattern |

### 1.4 Frontend Credit Display (Expected)

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| FE-01 | Client-side credit check is purely optimistic (server is authoritative) | useAICredits.ts:141-180 | False positive | Correct design |
| FE-02 | Frontend credit limits are display-only mirrors | planConfig.ts:19-27 | False positive | Correct design |

---

## 2. Public Portfolio Security

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| PP-01 | **Owner contact email leaked** — `contactEmail` returned in public portfolio API response and rendered in DOM `data-*` attributes | usePublicPortfolio.ts:52, PublicHero.tsx:87, StickyHeader.tsx:37-55 | **HIGH** | Split into `data-eu`/`data-ed` attributes which is CSS obfuscation only — no protection against scraping |
| PP-02 | Turnstile captcha bypasses silently when `VITE_TURNSTILE_SITE_KEY` is unset | PortfolioContactForm.tsx:31-49 | MEDIUM | Should fail-closed if captcha key missing |
| PP-03 | Internal Appwrite `$id` exposed in public API response | api/public-portfolio.ts:190,258 | LOW | Strip from public output |
| PP-04 | Contact form lacks client-side rate limiting throttle | PortfolioContactForm.tsx:120-191 | LOW | Server-side rate limit exists but no client cooldown |
| PP-05 | `user_id` NOT returned (good) | api/public-portfolio.ts:191-193 | False positive | Intentionally removed |
| PP-06 | `password_hash` never sent to browser | PortfolioEditorPage.tsx:962-969 | False positive | Server-only |
| PP-07 | `portfolio_settings` never read by client | usePublicPortfolio.ts:128,178 | False positive | All server-side |
| PP-08 | Password protection uses two-phase gate + bcrypt + timing-safe compare | PublicPortfolioPage.tsx:146-161, api/public-portfolio.ts:162-185 | False positive | Properly secured |
| PP-09 | Password attempt rate limited (8/15min per IP) | api/public-portfolio.ts:18-19,70-83 | False positive | Server-enforced |
| PP-10 | Visit tracking uses IP rate limiting + field allowlists | api/track-portfolio-view.ts:34-47 | False positive | Properly implemented |

---

## 3. Admin / DevKit Auth

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| DA-01 | **CRITICAL: Raw `DEVKIT_PASSWORD` bearer fallback in `email-service`** — `token === devkitPassword` accepted as valid auth | email-service/src/main.js:157-164 | **CRITICAL** | Regression test misses this because it checks for `timingSafeStringEqual` but code uses `===` directly |
| DA-02 | **CRITICAL: Internal error messages leaked to admin client** — `err.message` returned verbatim on runtime errors | admin-devkit-data/src/main.js:3101-3102 | **CRITICAL** | Should sanitize |
| DA-03 | `IMPERSONATION_HMAC_SECRET` silently falls back to empty string (inconsistent with admin-impersonate which throws) | admin-devkit-data/src/main.js:38-39 | HIGH | Should throw on missing env var |
| DA-04 | `DEVKIT_PASSWORD` still accepted as HMAC signing key across ALL admin hubs (10 hubs) | All admin hub main.js files | HIGH | Raw password used alongside APPWRITE_API_KEY in HMAC signing |
| DA-05 | No server-side DevKit session revocation (1-hour tokens cannot be invalidated) | admin-devkit-data/src/main.js:303-305 | HIGH | Token has `jti` but no blocklist/revocation mechanism |
| DA-06 | Client-side only route protection (stale admin label check) | AdminRoute.tsx:1-26, useIsAdmin.ts:7-10 | MEDIUM | Server-side enforcement at function level exists but frontend guard is fragile |
| DA-07 | DevKit session token exposed via module-level `getDevKitToken()` export | DevKitSessionContext.tsx:9-13, devKitAuth.ts:11-14 | MEDIUM | Any code on page can call `getDevKitToken()` to obtain 1-hour bearer token |
| DA-08 | Inactivity lock is entirely client-side | DevKitSessionContext.tsx:187-205 | MEDIUM | No server-side enforcement of session inactivity |
| DA-09 | Audit log errors silently swallowed (empty catch) | admin-devkit-data/src/main.js:246 | MEDIUM | Audit failures invisible to ops |
| DA-10 | Read operations (user lists, function logs, error data) not audited | admin-devkit-data/src/main.js (multiple handlers) | MEDIUM | Sensitive reads should be auditable |
| DA-11 | Deferred lock cleanup leaves 100ms window where token persists | DevKitSessionContext.tsx:227-234 | LOW | Minor timing window |
| DA-12 | `DEVKIT_PASSWORD` still required in CI/CD deploy scripts | .github/workflows/*.yml, scripts/deploy_hubs.cjs | LOW | Should be deprecated |

---

## 4. Upload / Export / CORS

| # | Finding | File:Line | Severity | Status |
|---|---------|-----------|----------|--------|
| UE-01 | PDF export server cannot verify HTML corresponds to authenticated user's resume — trusts client-provided HTML | api/export/pdf-native.ts:663-690 | MEDIUM | Requires JWT but doesn't verify resume ownership of rendered content |
| UE-02 | Download from `ResumeDetailPage.tsx` omits `?id=` parameter on nav to preview — relies on Zustand store only | ResumeDetailPage.tsx:140-146 | MEDIUM | Store could be stale; should pass resume ID in URL |
| UE-03 | Seven `.well-known/*` endpoints served with `Access-Control-Allow-Origin: *` — includes stale Kinde references | public/_headers:38-68 | MEDIUM | Public files but stale Kinde OIDC config |
| UE-04 | `resume-section-ai` Appwrite Function responds with `Access-Control-Allow-Origin: *` + accepts Authorization header | resume-section-ai/src/main.js:746-751 | MEDIUM | Any website can send preflight requests |
| UE-05 | Duplicate `isPuppeteerUrlAllowed` function with different logic than canonical `ssrfGuards.ts` version | api/export/pdf-native.ts:638-656 vs ssrfGuards.ts:72-75 | LOW | Divergence risk |
| UE-06 | HEIC/HEIF images in accept string but not in file type detection — upload silently rejected | detectFileType.ts:19 vs 38 | LOW | Minor inconsistency |
| UE-07 | 15+ `console.log` in production PDF export function (timing, buffer sizes, paths) | api/export/pdf-native.ts:727-907 | LOW | Verbose but not PII |
| UE-08 | `console.warn` in `usePortfolioTracking` runs in production with correlation IDs and usernames | usePortfolioTracking.ts:multiple | LOW | Should guard or remove |
| UE-09 | `console.log` in PortfolioContactForm without debug guard — logs email length | PortfolioContactForm.tsx:126 | LOW | Should guard or remove |
| UE-10 | File type validation thorough (MIME + extension) | detectFileType.ts:31-51 | False positive | Good |
| UE-11 | SSRF guards robust with dual-layer protection | ssrfGuards.ts:4-76 | False positive | Good |
| UE-12 | CORS on Express server properly restricted with explicit allowlist | server/index.ts:77-110 | False positive | Good |
| UE-13 | Error messages sanitized for end users | Multiple files | False positive | Good |
| UE-14 | No secrets in sourceHashes.generated.json | sourceHashes.generated.json | False positive | Clean |

---

## 5. Summary by Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| **CRITICAL** | 2 | `DEVKIT_PASSWORD` bearer fallback in email-service (DA-01); Internal error messages leaked to admin client (DA-02) |
| **HIGH** | 1 | Owner `contactEmail` exposed in public portfolio (PP-01) |
| **P1 (Important)** | 7 | Credit race in resume-section-ai (RSA-01); Error sanitization in ai-gateway (AG-05); Missing idempotency collection (AG-08); resume-section-ai not routed through ai-gateway (BR-01); job-import credit race (BR-02) |
| **P2 (Improvement)** | 12 | Persistent rate limits, concurrency guards, smoke test auth, daily_limit staleness, portfolio token replay, etc. |
| **MEDIUM** | 5 | Export ownership verification (UE-01), missing ?id (UE-02), wildcard .well-known CORS (UE-03), resume-section-ai CORS (UE-04), console.log leak (UE-09) |
| **LOW** | 6 | Code duplication, HEIC detection, verbose production logs, etc. |
| **False Positive** | 15 | Properly implemented security patterns |

---

## 6. Recommended Remediation Priority

### Immediate (Critical / High)
1. **DA-01**: Remove `DEVKIT_PASSWORD` raw comparison in `email-service` hasDevKitAuth — replace with signed-token-only verification
2. **DA-02**: Sanitize catch-all error message in `admin-devkit-data` — return generic message, log full error server-side
3. **PP-01**: Remove `contactEmail` from public portfolio API response and clean up frontend consumers (PublicHero, StickyHeader)

### P1 Fixes
4. **RSA-01**: Add credit lock (acquireCreditLock/releaseCreditLock) to `resume-section-ai` matching ai-gateway pattern
5. **BR-01/BR-02**: Apply same fix to `job-import`
6. **AG-05**: Sanitize error messages in ai-gateway catch-all
7. **AG-08**: Make idempotency-collection-missing fail-closed

### MEDIUM
8. **UE-01/UE-02**: Add resume ownership verification in PDF export; add `?id=` param in download navigation
9. **UE-03**: Remove stale Kinde references from .well-known
10. **DA-06/DA-07/DA-08**: Improve DevKit session security (server-side revocation, reduce TTL, remove global token export)

---

*End of Phase 2 Security & Abuse Audit Report*
