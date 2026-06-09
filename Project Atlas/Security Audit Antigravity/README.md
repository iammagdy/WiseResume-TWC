# Security Audit — WiseResume-TWC

**Audit Date:** 2026-06-09  
**Auditor:** Claude (Senior Security Engineer review mode)  
**Branch audited:** `main` @ `96beb3ec`  
**Scope:** Full production codebase — Appwrite Functions, Frontend (React/Vite/Vercel), API routes, deployment pipeline  

---

## What This Audit Is

A static-analysis + code-review security audit covering all 10 designated areas. No penetration testing, no live traffic analysis. Findings are derived entirely from reading source code, configuration files, and deployment scripts.

Items that require Appwrite Console, Vercel Dashboard, or production runtime access are explicitly marked **STATUS: UNKNOWN** with exact manual verification steps.

**No product code was modified during this audit.**

---

## Files in This Directory

| File | Contents |
|---|---|
| `README.md` | This index |
| `executive-summary.md` | Top findings, severity matrix, recommended priority order |
| `findings.md` | Complete finding registry (all P0–P3 findings with evidence) |
| `evidence-log.md` | Command outputs, grep results, code excerpts used as evidence |
| `appwrite-functions-audit.md` | Per-function audit: execute permissions, auth checks, error handling |
| `ai-gateway-abuse-audit.md` | Unauthenticated paths, credit bypass, prompt injection, rate limits |
| `credits-and-rate-limit-audit.md` | Race conditions, idempotency, per-plan limits, ask-portfolio credit drain |
| `public-portfolio-security-audit.md` | Password hashing, session limits, share tokens, CORS |
| `admin-impersonation-audit.md` | HMAC fallback, token lifecycle, audit trail gap, DevKit localStorage |
| `upload-export-security-audit.md` | parse-job/job-import SSRF, PDF export, file validation |
| `schema-permissions-audit.md` | Per-collection permissions, UNKNOWN collections |
| `deployment-secrets-audit.md` | GHA workflow, source hash, env var fallbacks, legacy cleanup |
| `prioritized-fix-plan.md` | Ordered fix checklist with effort estimates |

---

## Severity Scale

| Level | Meaning |
|---|---|
| **P0 Critical** | Exploitable now; direct data/cost/security impact |
| **P1 High** | Serious risk; fix before next user-facing release |
| **P2 Medium** | Fix before scale; not immediately exploitable |
| **P3 Low** | Hygiene; fix in next maintenance window |
| **UNKNOWN** | Cannot confirm without Appwrite/Vercel/GitHub Console access |

---

## Finding ID Format

`WR-2026-NNN` — e.g. `WR-2026-001`

---

## Audit Scope — 10 Areas

1. Appwrite Functions Security (execute permissions, auth, error handling)
2. AI Gateway Abuse (unauthenticated paths, credit bypass, prompt injection)
3. Credits / Billing / Quota (race conditions, idempotency, limits)
4. Public Portfolio / Share / Chat (passwords, sessions, CORS)
5. Impersonation / Admin Security (HMAC secrets, token lifecycle, audit trail)
6. File Upload / Export / SSRF (job-import URL fetch, PDF export)
7. CORS / Headers / Web Security (CSP, HSTS, rate limits)
8. Appwrite Schema / Permissions (collection-level access control)
9. Secrets / Deployment / Environment (GHA, env var fallbacks)
10. Legacy / Hygiene (stale auth providers, dead code, schema noise)

---

## Summary Count

| Severity | Count |
|---|---|
| P0 Critical | 3 (all UNKNOWN pending manual verification) |
| P1 High | 6 |
| P2 Medium | 8 |
| P3 Low | 6 |
| **Total** | **23** |
