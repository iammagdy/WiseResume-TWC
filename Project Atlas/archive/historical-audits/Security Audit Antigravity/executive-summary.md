# Executive Summary — WiseResume-TWC Security Audit

**Date:** 2026-06-09  
**Audited commit:** `main` @ `96beb3ec`

---

## Overview

WiseResume uses Appwrite (Functions + Databases + Auth) as its backend and Vercel for the React frontend. The core AI surface is a single large Appwrite Function (`ai-gateway`) that routes 21 AI features. Auth is Appwrite JWT + label-based admin gating. An internal HMAC scheme (signed with `APPWRITE_API_KEY`) is used for inter-function token passing.

The overall security posture is **reasonable for an early-stage product** with two developers, but has **several gaps that require attention before scaling**. The most critical unknowns involve Appwrite platform-level execute permissions, which cannot be determined from code alone.

---

## Severity Matrix

| ID | Title | Severity | Status |
|---|---|---|---|
| WR-2026-001 | Appwrite platform execute permissions unknown for all 20 functions | P0 | UNKNOWN |
| WR-2026-002 | Unauthenticated email send path — no auth, in-memory IP rate limit only | P0 | CONFIRMED |
| WR-2026-003 | IMPERSONATION_HMAC_SECRET falls back to APPWRITE_API_KEY | P0 | CONFIRMED |
| WR-2026-004 | Portfolio passwords stored as unsalted SHA-256 | P1 | CONFIRMED |
| WR-2026-005 | Credit deduction race condition — no atomic increment | P1 | CONFIRMED |
| WR-2026-006 | DevKit "Remember me" stores admin session token in localStorage | P1 | CONFIRMED |
| WR-2026-007 | In-memory rate limits not global across Appwrite instances | P1 | CONFIRMED |
| WR-2026-008 | Portfolio chat question limit degrades to client-only if schema missing | P1 | UNKNOWN |
| WR-2026-009 | No audit trail for admin impersonation | P1 | CONFIRMED |
| WR-2026-010 | Admin test nonce HMAC secret = APPWRITE_API_KEY | P2 | CONFIRMED |
| WR-2026-011 | ask-portfolio charges portfolio owner's credits per visitor question | P2 | CONFIRMED |
| WR-2026-012 | Sentry sendDefaultPii: true — resume/job content may reach Sentry | P2 | CONFIRMED |
| WR-2026-013 | Source hash truncated to 16 hex chars (64-bit space) | P2 | CONFIRMED |
| WR-2026-014 | ai-health endpoint fully public with no rate limiting | P2 | CONFIRMED |
| WR-2026-015 | resume-section-ai has no idempotency cache | P2 | CONFIRMED |
| WR-2026-016 | x-forwarded-for IP spoofing for email rate limit | P2 | CONFIRMED |
| WR-2026-017 | job-import hub fetches URLs server-side with no authentication | P2 | CONFIRMED |
| WR-2026-018 | Portfolio chat session creation has no rate limit | P2 | CONFIRMED |
| WR-2026-019 | CSP script-src unsafe-inline | P3 | CONFIRMED |
| WR-2026-020 | .env.example contains stale Supabase/Kinde env var names | P3 | CONFIRMED |
| WR-2026-021 | appwrite.json function $id fields empty (no stable ID binding) | P3 | CONFIRMED |
| WR-2026-022 | .well-known/openid-configuration references decommissioned Kinde | P3 | CONFIRMED |
| WR-2026-023 | public-share signToken uses APPWRITE_API_KEY (shared secret) | P3 | CONFIRMED |

---

## Top 5 Recommended Actions (Priority Order)

### 1. Verify and set Appwrite execute permissions (WR-2026-001) — P0 UNKNOWN
This is the most critical unknown. If admin functions (`admin-devkit-data`, `admin-impersonate`, `admin-deploy-hubs`, `admin-email`) have no platform-level permission gate, a single leaked `APPWRITE_API_KEY` allows full account takeover of any user.

**Manual step:** In the Appwrite Console → Functions → each admin function → Settings → Execute Access — confirm it is set to `users` or a specific role, NOT `any`.

### 2. Add Appwrite-level auth to the email send path OR add a CAPTCHA (WR-2026-002) — P0 CONFIRMED
The `send-email` and `send-contact-email` features bypass all session validation. Rate limit is per-instance in-memory. An attacker rotating `x-forwarded-for` headers can send unlimited emails to `contact@thewise.cloud`. Fix: require Appwrite user session for this path, or add a CAPTCHA/signed challenge before submission.

### 3. Configure IMPERSONATION_HMAC_SECRET as a separate secret (WR-2026-003) — P0 CONFIRMED
Currently the impersonation token is signed with `APPWRITE_API_KEY` if `IMPERSONATION_HMAC_SECRET` is not set. One leaked key → forged impersonation URLs → full user account takeover. Fix: provision a separate 32-byte random secret for `IMPERSONATION_HMAC_SECRET` in the Appwrite Console.

### 4. Replace unsalted SHA-256 with bcrypt/argon2 for portfolio passwords (WR-2026-004) — P1 CONFIRMED
`api/public-portfolio.ts` stores portfolio share passwords as unsalted SHA-256. A database dump enables offline rainbow-table attacks. Fix: replace with `bcrypt` (cost factor ≥ 12) or `argon2id`.

### 5. Mitigate credit race condition (WR-2026-005) — P1 CONFIRMED
`recordAiUsage()` uses optimistic re-read but not atomic increment. Under concurrent load, users can exceed daily limits. Fix requires either a lock document, atomic-increment emulation via a retry loop, or an Appwrite Function queue.

---

## What Is Working Well

- **No hardcoded secrets** found in any hub source file
- **No `console.log(process.env...)`** in any production hub code
- **No legacy live API calls** to decommissioned providers (Supabase, Kinde, RevenueCat)
- **HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy** all correctly set in Vercel headers
- **GHA deploy workflow** is `workflow_dispatch`-only with source hash manifest check
- **HMAC token verification** uses `timingSafeEqual` in all three hubs
- **HTML escaping** in the email builder (`escapeHtml()`) prevents XSS in contact emails
- **Persistent rate limit** (`checkPersistentRateLimit`) is Appwrite DB-based and cross-instance
- **SSRF protection** in job-import blocks private IP ranges
- **No `dangerouslySetInnerHTML`** in any frontend component
- **Prompt injection mitigation** present in `buildMessages()` system prompt

---

## Risk Trend

The codebase shows **good security hygiene awareness** (timing-safe comparisons, HTML escaping, SSRF blocklist, no env var logging). The main risks are structural: single-secret HMAC reuse, missing Appwrite platform-level gates, and in-memory rate limits that don't survive scaling. These are all fixable without architectural overhaul.
