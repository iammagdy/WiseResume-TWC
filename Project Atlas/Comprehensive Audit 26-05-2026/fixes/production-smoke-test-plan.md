# Production Smoke Test Plan

Date: 2026-05-26
Status values: `PASS`, `FAIL`, `UNKNOWN`

Use this after a production deployment or rollback. Record the deployment URL, commit SHA, test account, tester, and timestamp before starting.

## Test Metadata

- Deployment URL:
- Production domain:
- Commit SHA:
- Tester:
- Test account email:
- Started at:
- Completed at:

## Critical User Flows

### Signup

- Status:
- Steps: create a new account from `/auth`.
- Expected: account is created, no duplicate verification emails are sent, user sees the verification state.
- Evidence:
- Appwrite logs checked:
- Resend logs checked:
- Notes:

### Email Verification

- Status:
- Steps: open the verification email and explicitly click the in-app verify button.
- Expected: verification succeeds once, link scanners do not consume the token prematurely, user can continue.
- Evidence:
- Appwrite logs checked:
- Resend logs checked:
- Notes:

### Login

- Status:
- Steps: log in with the verified test user.
- Expected: session refreshes, dashboard loads, no redirect loop.
- Evidence:
- Appwrite logs checked:
- Sentry checked:
- Notes:

### Dashboard Refresh

- Status:
- Steps: refresh the dashboard and reopen the tab.
- Expected: dashboard remains visible after session validation; no auth screen flash/loop.
- Evidence:
- Browser console checked:
- Sentry checked:
- Notes:

### Logout

- Status:
- Steps: log out from the app.
- Expected: Appwrite session is deleted and protected routes redirect to auth.
- Evidence:
- Appwrite sessions checked:
- Notes:

### Password Reset

- Status:
- Steps: request reset email, open reset page, submit a new password.
- Expected: reset email arrives, password update succeeds, new login works.
- Evidence:
- Resend logs checked:
- Appwrite logs checked:
- Notes:

## Resume Lifecycle

### Resume Create/Edit/Autosave

- Status:
- Steps: create a resume, edit core sections, refresh.
- Expected: data persists and no autosave errors appear.
- Evidence:
- Appwrite document checked:
- Browser console checked:
- Notes:

### PDF Export

- Status:
- Steps: export a resume to PDF.
- Expected: PDF downloads/opens correctly; Vercel function completes without Chromium errors.
- Evidence:
- Vercel function logs checked:
- Notes:

## AI And Credits

### Authenticated AI Action

- Status:
- Steps: run one provider-backed AI action from the app.
- Expected: action succeeds for a signed-in user and `ai_credits` increments by the expected cost.
- Evidence:
- Appwrite `ai-gateway` or `resume-section-ai` logs checked:
- Appwrite `ai_credits` document checked:
- Notes:

### Unauthenticated AI Rejection

- Status:
- Steps: invoke AI function without a valid JWT using a direct Appwrite function execution or expired session.
- Expected: 401 response before any provider call.
- Evidence:
- Appwrite logs checked:
- Provider logs checked:
- Notes:

### Credit Exhaustion

- Status:
- Steps: use a low-limit test user or set `daily_usage` to the limit, then attempt a provider-backed AI action.
- Expected: 402-style credit response before any provider call.
- Evidence:
- Appwrite `ai_credits` checked:
- Appwrite function logs checked:
- Notes:

### Server Rate Limit

- Status:
- Steps: rapidly repeat one AI action more than the configured per-minute limit.
- Expected: 429 response with retry guidance.
- Evidence:
- Appwrite function logs checked:
- Notes:

## Billing And Webhooks

### RevenueCat Grant Event

- Status:
- Steps: replay or send a signed `INITIAL_PURCHASE`/`RENEWAL` webhook for a test user.
- Expected: `subscriptions.plan`, `effective_plan`, and `status` reflect active paid access.
- Evidence:
- RevenueCat webhook delivery checked:
- Appwrite `subscriptions` checked:
- Notes:

### RevenueCat Revoke Event

- Status:
- Steps: replay or send a signed `EXPIRATION`/`CANCELLATION` webhook for a test user.
- Expected: subscription reverts to `plan=free`, `effective_plan=free`, `status=cancelled`.
- Evidence:
- RevenueCat webhook delivery checked:
- Appwrite `subscriptions` checked:
- Notes:

### RevenueCat Invalid Auth

- Status:
- Steps: send webhook with incorrect authorization header.
- Expected: 401 and no subscription document changes.
- Evidence:
- Appwrite logs checked:
- Notes:

## Observability

### Sentry

- Status:
- Steps: inspect latest production errors after smoke.
- Expected: no new P0/P1 issues in auth, AI, PDF export, or billing.
- Evidence:
- Notes:

### Appwrite Logs

- Status:
- Steps: inspect logs for `ai-gateway`, `resume-section-ai`, `revenuecat-webhook`, and `email-service`.
- Expected: no PII in logs; no provider calls after unauthorized/credit-blocked AI requests.
- Evidence:
- Notes:

### Vercel Logs

- Status:
- Steps: inspect production runtime logs and deployment build logs.
- Expected: no build errors, no PDF runtime errors, no 5xx spike.
- Evidence:
- Notes:

### Resend Logs

- Status:
- Steps: inspect verification/reset delivery logs.
- Expected: delivered emails, no duplicate verification sends, no unexpected bounces.
- Evidence:
- Notes:

