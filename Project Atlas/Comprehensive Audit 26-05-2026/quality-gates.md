# Quality Gates and Production Standard

## Production-Ready Bar

WiseResume should not be considered production-ready for real users until:

- Latest `main` commit is deployed to Vercel production and verified.
- Appwrite functions are deployed from the same release and smoke-tested.
- Auth signup, verification, login, refresh, logout, and password reset pass in production.
- Resume create/upload/edit/save/export pass in production.
- Core AI flows pass in production with server-side auth/credits/rate limits.
- RevenueCat subscription events pass with test webhook replay.
- Sentry captures a test frontend error and backend errors are observable.
- Appwrite schema/permissions are documented and reviewed.
- Rollback and incident runbooks exist.

## Current Gate Results

| Gate | Evidence | Status | Notes |
|---|---|---|---|
| Git state understood | `git status -sb`, `git log --oneline -n 10` | PASS | Branch is `main`; untracked Playwright/report artifacts existed before audit. |
| TypeScript | `npx tsc --noEmit` | PASS | Exit code 0. |
| Lint | `npm run lint` | FAIL | 2064 problems: 1395 errors, 669 warnings. |
| Targeted auth tests | `npx vitest run ...ProtectedRoute... Auth-D3... authEmailCallbackParams...` | PASS | 3 files, 15 tests passed. |
| Full unit test suite | Not run | UNKNOWN | Could be long; not required to create audit. |
| Build | Not run | UNKNOWN | `npm run build` includes `prebuild` asset-copy script. Verify via Vercel logs/clean CI. |
| E2E tests | Not run | UNKNOWN | Playwright can modify reports/artifacts; production credentials not provided. |
| Production smoke | Not run | UNKNOWN | Requires production URL/account/log access. |
| Dependency audit | Not run | UNKNOWN | `npm audit fix` forbidden; read-only audit can be added later. |
| Security scan | Not run | UNKNOWN | No secret scanner/SAST command run. |

## SLO / SLI Suggestions

| Area | Suggested SLI | Initial Target |
|---|---|---|
| Availability | Successful page loads for `/`, `/auth`, `/dashboard` | 99.5% monthly |
| Auth | Signup + login success rate | > 98% excluding invalid credentials |
| Email | Verification/reset email accepted and delivered | > 98% accepted; monitor bounces/spam |
| AI | Successful AI requests by feature | > 95% for core features |
| AI latency | p95 AI response latency | < 30s for tailor/parse; < 10s for chat |
| Frontend errors | Sentry error-free sessions | > 99% |
| Backend errors | Appwrite function 5xx rate | < 1% |
| Deploys | Failed production deploy rate | < 5% |
| Webhooks | RevenueCat webhook processing success | > 99% |
| PDF export | Successful export rate | > 97%, p95 < 45s |

## Monitoring Expectations

- **Uptime:** External checks for `/`, `/auth`, `/api/export/pdf-native` health-equivalent, and Appwrite function smoke endpoint.
- **Frontend errors:** Sentry issue alerts for new high-volume errors and auth/dashboard errors.
- **Backend errors:** Appwrite function executions monitored by function ID, status, latency, and response code.
- **AI providers:** Per-provider failure rate, timeout rate, 429 rate, token usage, and fallback count.
- **Email:** Resend delivery, bounce, complaint, and webhook failure metrics.
- **Payments:** RevenueCat webhook failure alert and subscription sync drift checks.
- **Database:** Appwrite collection operation errors and permission-denied spikes.

## Incident Readiness

| Area | Status | Requirement |
|---|---|---|
| Rollback | UNKNOWN | Document Vercel rollback and Appwrite function rollback. |
| On-call owner | UNKNOWN | Assign launch owner and escalation path. |
| Runbooks | UNKNOWN | Auth outage, email outage, AI outage, payment webhook failure, Appwrite permissions issue. |
| Status comms | UNKNOWN | User-facing incident messaging and maintenance mode owner. |
| Backups | UNKNOWN | Appwrite database backup and restore process. |
| Restore drill | UNKNOWN | Run at least one restore drill before launch if data is business-critical. |

## Test Coverage Expectations

### Required Before Launch

- Auth unit tests for `AuthContext`, `ProtectedRoute`, verify/reset callback parsing.
- Appwrite function contract tests for `email-service`, `ai-gateway`, `resume-section-ai`, `coupons`, `revenuecat-webhook`.
- E2E tests for signup/verify/login/refresh/logout/password reset.
- E2E tests for resume upload/create/edit/save/export.
- E2E tests for core AI flows with test fixtures and mocked provider fallback where possible.
- Webhook replay test for RevenueCat.
- Production smoke after deploy.

### Current Evidence

- Targeted auth tests pass.
- Typecheck passes.
- Lint fails.
- Full test/build/e2e/production smoke remain unknown.

## Quality Gate Verdict

**NOT READY**

The current branch has meaningful improvements, but it does not meet a production release bar because lint fails, build/live deploy status is unverified, AI security/credit gates fail by inspection, and payment webhook processing has a definite runtime defect.
