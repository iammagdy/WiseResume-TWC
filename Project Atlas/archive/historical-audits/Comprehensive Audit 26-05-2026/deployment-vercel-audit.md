# Vercel Deployment Audit

## Deployment Assumption

The user stated that Vercel is now the active production frontend deployment platform and deploys automatically from the connected GitHub repository. Repository evidence supports a Vercel-ready frontend configuration, but the actual Vercel dashboard connection, production branch, environment variables, and latest deployment status cannot be proven from the repo alone.

## Vercel Configuration

| Item | Evidence | Status | Notes/Impact | Recommendation |
|---|---|---|---|---|
| Vercel config file | `vercel.json` | PASS | Present at repo root. | Verify dashboard does not override important settings. |
| SPA fallback | `rewrites: /((?!api/).*) -> /index.html` | PASS | React Router deep links should work. | Test protected and public deep links. |
| API function config | `api/export/pdf-native.ts`, `vercel.json` | PASS | PDF export gets 60s duration and Chromium include files. | Test large multi-page export in production. |
| Static asset caching | `Cache-Control: public, max-age=31536000, immutable` for `/assets/*` | PASS | Good for hashed Vite assets. | Confirm old assets remain available during deploy transitions. |
| Security headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` | PASS with caveat | Basic headers present; HSTS missing. | Add HSTS once domain/subdomain policy is confirmed. |
| Build command | `package.json` `build` script | UNKNOWN live | Vercel likely uses `npm run build`, but dashboard not verified. | Verify Vercel build command and Node version. |
| Output directory | Vite default `dist` | UNKNOWN live | Vercel usually detects Vite; repo does not explicitly set output. | Verify Vercel output directory is `dist`. |
| Install command | Not specified | UNKNOWN | Vercel likely uses npm install/ci. | Verify package manager and lockfile behavior. |
| Production branch | User says GitHub push; repo on `main` | UNKNOWN | Vercel dashboard needed. | Confirm production branch is `main`. |
| Preview deployments | Vercel default behavior likely | UNKNOWN | Repo cannot prove. | Verify preview URL policy and env parity. |
| Rollback process | No Vercel runbook found | UNKNOWN | Incident response gap. | Document Vercel rollback steps. |
| Deployment logs | Not accessible from repo | UNKNOWN | Cannot prove latest commit deployed. | Review Vercel deployment for commit `7523be92`. |

## GitHub Workflows

| Workflow | Evidence | Status | Risk | Recommendation |
|---|---|---|---|---|
| `.github/workflows/deploy-frontend.yml` | Manual-only; comments say Vercel handles frontend deployment | FAIL | Still contains Hostinger FTP deployment and old env assumptions. | Archive, rename, or add stronger deprecation banner. |
| `.github/workflows/deploy-landing.yml` | Manual Hostinger landing FTP deploy | UNKNOWN | Could still affect `thewise.cloud` root if manually run. | Clarify ownership/domain topology. |
| `.github/workflows/deploy-appwrite-hubs.yml` | Manual Appwrite hub deploy | PASS | Manual-only is appropriate for backend functions. | Ensure secrets are current and approvals are required. |

## Required Vercel Environment Variables

From repo evidence:

- `VITE_APPWRITE_ENDPOINT`
- `VITE_APPWRITE_PROJECT_ID`
- `VITE_SENTRY_DSN`
- `removed web payment API key`
- Optional `VITE_API_URL` if not using same-origin Vercel PDF endpoint
- Sentry upload variables if source maps are uploaded: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, optional `VITE_SENTRY_RELEASE`

**Status:** UNKNOWN because Vercel dashboard env values were not inspected.

## Production URL and CORS

- Repository hardcodes/falls back to `https://resume.thewise.cloud` in several places, including `email-service`, PDF branding, and e2e scripts.
- `server/index.ts` CORS allows `https://resume.thewise.cloud` and `https://thewise.cloud`, but this Express server may not be active in Vercel production.
- Appwrite origins must be verified in Appwrite Console; repo cannot prove them.

**Status:** UNKNOWN.

## Source Maps and Sentry Release

- `vite.config.ts` disables sourcemaps unless `SENTRY_AUTH_TOKEN` is present.
- Sentry Vite plugin deletes uploaded `.js.map` files after upload.
- `scripts/check-no-sourcemaps.mjs` runs during build.

**Status:** PASS for code intent; UNKNOWN for Vercel production artifacts.

## Cache / Header Risks

- Assets are immutable; this is correct only if Vite hashing is stable and old assets remain available during rollout.
- HTML cache policy is not explicitly set in `vercel.json`. Vercel normally handles dynamic HTML, but explicit no-cache for `index.html` may reduce stale-shell risk.
- CSP is injected as a meta tag, not a Vercel HTTP header. Meta CSP does not enforce all directives as strongly as headers.

## Deployment Readiness Result

**UNKNOWN / NOT READY**

The repo is Vercel-compatible, but production readiness requires dashboard evidence:

1. Latest commit deployed to production.
2. Production branch is `main`.
3. Build command/output/env vars are correct.
4. `/`, `/auth`, `/dashboard`, `/auth/verify-email`, `/api/export/pdf-native` smoke tests pass.
5. Rollback process is documented.
6. Old Hostinger workflows are clearly deprecated or removed from operational use.
