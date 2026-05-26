# Prioritized Improvement Plan

## P0: Must Fix Before Launch

| Item | Severity | Owner Role | Why It Matters | How to Verify Resolved | Related Evidence |
|---|---|---|---|---|---|
| Add server-side auth to `ai-gateway` and `resume-section-ai` | Critical | Backend / Security | Prevents unauthenticated direct AI function abuse. | Direct unauthenticated execution returns 401; valid session succeeds. | `appwrite-functions.ts`, `ai-gateway`, `resume-section-ai`, `deploy_hubs.cjs`. |
| Add server-side AI credit deduction and per-user/IP rate limits | Critical | Backend / Platform | Protects cost, quotas, and billing fairness. | Free user hits limit and receives 402/429; usage row updates atomically. | `useAICredits.ts`, `rateLimiter.ts`, AI hubs. |
| Fix RevenueCat webhook body parsing | Critical | Backend / Payments | Paid users may not receive access; subscription downgrades may fail. | RevenueCat test event updates Appwrite subscription; invalid auth returns 401. | `appwrite-hubs/revenuecat-webhook/src/main.js`. |
| Export and review Appwrite schema/permissions | High | DevOps / Security | Current DB permissions cannot be audited/rebuilt from repo. | Versioned manifest exists and matches live Appwrite project. | `appwrite-collections.ts`, direct client DB writes. |
| Verify latest Vercel production deploy | High | DevOps | Users need the latest auth/email fixes live. | Vercel dashboard shows commit `7523be92` or newer deployed to production; smoke passes. | `vercel.json`, Git log. |
| Run production auth/email smoke | High | QA / DevOps | Signup/signin/verify were recently changed and are critical. | New account can signup, receive one email, verify, refresh dashboard, reset password. | `AuthPage`, `AuthVerifyEmailPage`, `email-service`. |
| Resolve launch-blocking lint gate | High | Frontend / QA | A failing lint gate hides real regressions and weakens CI. | `npm run lint` exits 0 or documented baseline gate is adopted. | `npm run lint` output: 1395 errors, 669 warnings. |

## P1: Should Fix Soon

| Item | Severity | Owner Role | Why It Matters | How to Verify Resolved | Related Evidence |
|---|---|---|---|---|---|
| Add Appwrite function contract tests | High | Backend / QA | Prevents silent runtime regressions in hubs. | CI runs contract tests for email, AI, coupons, RevenueCat, WiseHire. | `appwrite-hubs/*/src/main.js`. |
| Add Vercel rollback runbook | High | DevOps | Needed for launch incident response. | Runbook includes dashboard rollback and Appwrite function rollback. | `deployment-vercel-audit.md`. |
| Verify Sentry production ingestion and privacy | High | DevOps / Security | Errors must be visible without leaking PII. | Test event appears; PII scrubbing rules reviewed. | `monitoring.ts`. |
| Harden public share passwords | High | Backend / Security | Direct string comparison suggests plaintext or weak password handling. | Stored value is salted hash; tests verify anonymous access behavior. | `public-share/src/main.js`. |
| Enforce WiseHire authorization server-side | Medium | Backend / Product | Frontend guard alone is not enough for HR-only data. | Direct gateway calls by job-seeker return 403 for HR-only actions. | `WiseHireGuard`, `wisehire-gateway`. |
| Remove/archive obsolete Hostinger workflow paths | Medium | DevOps | Avoids accidental manual deploys to old infrastructure. | Workflows are archived, renamed, or documented as legacy. | `.github/workflows/deploy-frontend.yml`. |
| Add production smoke suite | High | QA | Converts deployment assumptions into evidence. | Smoke runs after Vercel production deploy and reports pass/fail. | Required follow-ups. |

## P2: Improvement / Hardening

| Item | Severity | Owner Role | Why It Matters | How to Verify Resolved | Related Evidence |
|---|---|---|---|---|---|
| Add HSTS and stronger CSP headers | Medium | Security / Frontend | Improves browser security posture. | Security headers verified on production URL. | `vercel.json`, `vite.config.ts`. |
| Add bundle budget to Vercel/CI | Medium | Frontend / DevOps | Prevents performance regressions. | CI fails when entry or total JS budget exceeded. | GitHub workflow has inactive bundle check. |
| Add mobile browser smoke | Medium | QA | Upload/OCR/editor/export are mobile-sensitive. | iOS Safari and Android Chrome smoke reports. | Vite OCR/CSP comments. |
| Add AI provider telemetry dashboards | Medium | DevOps / AI | Helps answer "is the bot working?" in production. | Dashboard shows success, latency, provider, model, fallback, error class. | AI gateway no-op Datadog. |
| Clean legacy Supabase/Kinde documentation | Low | Docs / DevOps | Reduces operator confusion. | Active architecture docs clearly say Appwrite/Vercel. | Old Project Atlas docs and comments. |
| Run dependency review/audit | Medium | Security | Supply-chain risk is unknown. | CI dependency review and manual triage completed. | `package.json`, lockfiles. |
