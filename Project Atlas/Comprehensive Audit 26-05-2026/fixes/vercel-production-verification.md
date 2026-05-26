# Vercel Production Verification And Rollback Runbook

Date: 2026-05-26
Scope: production verification for the WiseResume Vercel frontend and Vercel PDF API route. This runbook does not deploy anything by itself.

## Repo-Evidenced Configuration

- Framework/build: Vite React SPA.
- Build command: `npm run build`.
- Build script: `tsc --noEmit && vite build && node scripts/check-no-sourcemaps.mjs`.
- Prebuild script: `node scripts/copy-pdf-ocr-assets.mjs`.
- Expected output directory: `dist`.
- Vercel API route: `api/export/pdf-native.ts`.
- Vercel serverless max duration for PDF export: 60 seconds.
- SPA rewrite: every non-`/api/*` route rewrites to `/index.html`.
- Static asset cache: `/assets/*` is cached for one year with immutable cache headers.
- Security headers configured: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

## Required Vercel Environment Variables

Frontend-exposed values must be intentionally public because Vite embeds all `VITE_*` variables into the client bundle:

- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_REVENUECAT_WEB_API_KEY`
- `VITE_SENTRY_DSN`
- `VITE_API_URL` only if production should call a separate API origin for native PDF generation

Server-only values must not use the `VITE_` prefix:

- Any Appwrite API key
- Any AI provider API key
- Any Resend API key
- Any RevenueCat webhook secret
- Any DevKit/admin password or token

## Pre-Deployment Verification

Before promoting a commit to production:

- Confirm the production branch is the intended branch, currently expected to be `main`.
- Confirm the Vercel project build command is `npm run build`.
- Confirm the Vercel output directory is `dist`.
- Confirm the latest Git commit in Vercel matches the reviewed commit SHA.
- Confirm no server secret is present with a `VITE_` prefix.
- Confirm `api/export/pdf-native.ts` is included in the Vercel deployment and the `@sparticuz/chromium` includeFiles setting is active.
- Confirm source maps are not emitted for production bundles; the build script runs `scripts/check-no-sourcemaps.mjs`.

## Production Smoke Paths

Run these checks against the production domain after deployment:

- Load `/` and confirm the landing page renders without console errors.
- Load `/auth` and confirm signup/login UI renders.
- Sign up with a real test inbox and confirm verification email delivery.
- Verify email and confirm the app reaches the dashboard without a dashboard flash/redirect loop.
- Refresh the dashboard and confirm the session persists.
- Log out and confirm protected routes redirect to auth.
- Start password reset and confirm the reset email arrives.
- Create or edit a resume and confirm autosave.
- Export PDF and confirm the Vercel function returns a usable PDF.
- Run one provider-backed AI action and confirm it succeeds for an authenticated user.
- Exhaust or simulate low AI credits and confirm the UI receives a 402-style credit-limit response.
- Confirm unauthenticated direct AI function calls are rejected before provider calls.

## Logs To Check

Vercel:
- Build logs show `tsc --noEmit`, Vite build, and no-source-map check passed.
- Runtime logs for `api/export/pdf-native.ts` show no Chromium startup errors and no PII.
- No 5xx spike during signup, auth callback, dashboard refresh, or PDF export.

Appwrite:
- `ai-gateway` logs show feature/action/user ID only, not prompts, resumes, job descriptions, or AI responses.
- `resume-section-ai` logs show action/section/user ID only.
- `revenuecat-webhook` logs show event type and user ID only.
- Failed unauthenticated AI executions return 401 before any provider log line.
- Credit exhaustion returns 402 before any provider log line.

Sentry:
- No new release-blocking errors in auth, dashboard route guards, AI calls, PDF export, or RevenueCat webhook handling.

Resend:
- Verification/reset emails are delivered and not duplicated.
- Bounce/spam complaint metrics remain within acceptable thresholds for test traffic.

## Rollback Procedure

If production validation fails:

- Stop further promotion and record the failing deployment URL, commit SHA, and first failing smoke step.
- In Vercel, promote the last known-good production deployment.
- Confirm the production domain points back to the previous deployment.
- Re-run only the failed smoke path first, then the full critical smoke set.
- If Appwrite function deployment was also changed separately, roll back the affected Appwrite function deployment from Appwrite Console or redeploy the previous function package from the known-good commit.
- Do not rotate secrets during rollback unless the failure involved leaked or compromised credentials.

## Known Remaining Constraints

- Appwrite AI credit updates are best-effort document updates, not SQL transactions.
- Warm-instance rate limiting is not globally shared across all Appwrite instances.
- This runbook requires manual confirmation in Vercel and Appwrite consoles because live settings are not exported into the repo.

