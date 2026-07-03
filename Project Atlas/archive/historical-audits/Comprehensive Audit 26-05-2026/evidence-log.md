# Evidence Log

## Commands Run

| Command | Safety | Result Summary |
|---|---|---|
| `git status -sb` | Read-only | On `main`; untracked `.playwright-mcp/` and two e2e JSON reports present. |
| `git branch --show-current; git log --oneline -n 10` | Read-only | Current branch `main`; latest commit `7523be92 fix(auth): validate Appwrite sessions on load and harden email verification`. |
| `npx tsc --noEmit` | Read-only/no emit | PASS, exit code 0. |
| `npm run lint` | Read-only/no autofix | FAIL, 2064 problems: 1395 errors, 669 warnings. |
| `npx vitest run src/components/layout/__tests__/ProtectedRoute.test.tsx src/hooks/__tests__/Auth-D3.test.tsx src/lib/__tests__/authEmailCallbackParams.test.ts` | Read-only tests | PASS, 3 files and 15 tests passed. |

## Files Inspected

### Root / Config

- `package.json`
- `vite.config.ts`
- `vercel.json`
- `vitest.config.ts` discovered
- `playwright.config.ts` discovered
- `eslint.config.js` discovered
- `drizzle.config.ts`

### GitHub Workflows

- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-landing.yml`
- `.github/workflows/deploy-appwrite-hubs.yml`

### Frontend Routing / Auth

- `src/App.tsx`
- `src/AppInterior.tsx`
- `src/AppLanding.tsx` discovered
- `src/contexts/AuthContext.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/components/layout/JobSeekerRoute.tsx`
- `src/components/wisehire/WiseHireGuard.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/AuthVerifyEmailPage.tsx`
- `src/pages/AuthResetPasswordPage.tsx`
- `src/pages/AuthCallbackPage.tsx`
- `src/lib/authEmailCallbackParams.ts` via tests

### Frontend Operations / Monitoring

- `src/main.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/lib/monitoring.ts`
- `src/lib/appwrite.ts`
- `src/lib/appwrite-functions.ts`
- `src/lib/appwrite-bridge.ts`
- `src/lib/appwrite-collections.ts`
- `src/lib/billing.ts` discovered through env search

### AI / Bot

- `src/lib/agenticChat.ts`
- `src/lib/aiTailor.ts`
- `src/lib/aiAnalysis.ts`
- `src/hooks/useAICredits.ts`
- `src/lib/rateLimiter.ts`
- `appwrite-hubs/ai-gateway/src/main.js`
- `appwrite-hubs/resume-section-ai/src/main.js`
- AI call sites found with `appwriteFunctions.invoke` search.

### Backend / Functions

- `scripts/deploy_hubs.cjs`
- `appwrite-hubs/email-service/src/main.js`
- `appwrite-hubs/coupons/src/main.js`
- `appwrite-hubs/wisehire-gateway/src/main.js`
- `appwrite-hubs/public-share/src/main.js`
- `appwrite-hubs/legacy-payment-webhook/src/main.js`
- Admin hub auth references found with search across `appwrite-hubs`.

### Server / API

- `server/index.ts`
- `server/db.ts`
- `server/schema.ts`
- `api/export/pdf-native.ts`

## Searches Performed

- Repository file glob for `package.json`, configs, workflows, `vercel.json`, `supabase/**/*`, Appwrite hubs, pages, components, libs, hooks.
- Route search for React Router route declarations.
- `appwriteFunctions.invoke` search for frontend/backend integration points.
- AI feature name search for `agentic-chat`, `wise-ai-chat`, `analyze-resume`, `tailor-resume`, `parse-resume`, `parse-job`, `score-resume`, `resume-section-ai`, `generate-cover-letter`.
- Env var search for `import.meta.env.*` and `process.env.*`.
- Auth/security search for JWT, authorization, DevKit, webhook, rate limit, secrets, localStorage/sessionStorage.
- Appwrite direct database operation search.
- XSS/HTML/markdown search for `dangerouslySetInnerHTML`, `innerHTML`, `ReactMarkdown`, and sanitization.

## Important Evidence Snippets

- `src/lib/appwrite.ts` sets default Appwrite endpoint `https://fra.cloud.appwrite.io/v1` and project `69fd362b001eb325a192`.
- `src/lib/appwrite-functions.ts` routes AI features to `ai-gateway` and packs headers into `__headers`.
- `scripts/deploy_hubs.cjs` updates function execute permissions to include `any`.
- `appwrite-hubs/ai-gateway/src/main.js` builds AI provider candidates and fallbacks but searched terms did not show Appwrite JWT validation or credit enforcement.
- `appwrite-hubs/resume-section-ai/src/main.js` searched terms did not show Appwrite JWT validation or credit enforcement.
- `appwrite-hubs/legacy-payment-webhook/src/main.js` references `rawBody` without defining it.
- `vercel.json` has SPA rewrite and `/api/export/pdf-native.ts` function config.
- `.github/workflows/deploy-frontend.yml` comments say Vercel handles frontend deployment now, but FTP deployment steps remain.
- `src/contexts/AuthContext.tsx` validates Appwrite session with `account.get()` on load.
- `src/components/layout/ProtectedRoute.tsx` waits for `sessionValidated` and gates unverified email users.
- `src/lib/monitoring.ts` initializes Sentry with `sendDefaultPii: true` and Replay text masking.

## Not Inspected / Why

- **Vercel dashboard:** Not available through repo read-only audit.
- **Appwrite dashboard:** Not accessed; repo evidence cannot prove live env vars/permissions/logs.
- **Resend dashboard:** Not accessed; delivery/domain/API key status unknown.
- **legacy payment provider dashboard:** Not accessed; webhook event delivery unknown.
- **Sentry dashboard:** Not accessed; DSN/alerts/event ingestion unknown.
- **Production live app:** No browser production smoke was run because production test account/log access was not provided.
- **Full build:** Not run because `npm run build` triggers `prebuild` asset-copy script; use Vercel logs or clean CI for verification.
- **Full e2e suite:** Not run because Playwright commonly writes reports/artifacts and production credentials were not provided.
- **Dependency audit:** Not run; recommended as follow-up without auto-fix.
