# Audit Checklist Results

| Area | Check | Method/Evidence | Status | Notes/Impact | Recommendation |
|---|---|---|---|---|---|
| Product | Landing route exists | `src/App.tsx`, `src/AppLanding.tsx`, `src/AppInterior.tsx` | PASS | `/` and `/enterprises` load the landing bundle. | Confirm in Vercel production with browser smoke. |
| Product | Sign up flow exists | `src/pages/AuthPage.tsx` creates Appwrite account/session and sends verification | PASS | Code path exists. Live delivery not proven in this audit. | Run production signup smoke with new test account. |
| Product | Email verification hardened | `src/pages/AuthVerifyEmailPage.tsx`, `appwrite-hubs/email-service/src/main.js` | PASS | Manual confirm avoids link scanner auto-consumption. | Verify with Outlook/Gmail production inbox logs. |
| Product | Sign in and session persistence | `src/contexts/AuthContext.tsx`, `src/components/layout/ProtectedRoute.tsx` | PASS | Route guards wait for live Appwrite `account.get()`. | Production smoke across refresh/tab close. |
| Product | Logout | `AuthContext.signOut()` calls `deleteSession('current')` and clears caches | PASS | Code path clears app caches and redirects. | Add e2e logout regression. |
| Product | Password reset | `AuthPage`, `AuthResetPasswordPage`, `email-service` | PASS | Code path exists through branded email service and Appwrite recovery. | Verify Resend delivery and Appwrite recovery token handling. |
| Product | Onboarding | `AppInterior.tsx`, `DashboardPage`, `OnboardingPage` | UNKNOWN | Routes and redirects exist, but live post-signup state was not exercised. | Run production onboarding smoke. |
| Product | Resume upload/create/editor/save | `UploadPage`, `CreateResumeDialog`, `EditorPage`, `useResumes` paths discovered | UNKNOWN | Code exists; no live storage/database write performed. | Run e2e resume upload/create/edit/save. |
| Product | Resume analysis/tailoring | `src/lib/aiAnalysis.ts`, `src/lib/aiTailor.ts`, `ai-gateway` | FAIL | Backend auth/credit enforcement is not visible in AI gateway. | Add server-side auth/credit/rate checks before launch. |
| Product | Cover letter generation | `src/lib/aiTailor.ts` invokes `generate-cover-letter` | UNKNOWN | Code exists through AI gateway, but live provider response not verified. | Smoke test with production account after AI security fix. |
| Product | Portfolio/public portfolio | `PublicPortfolioPage`, `public-share`, `usePublicPortfolio` | UNKNOWN | Public routes exist; password verification uses plaintext compare in `public-share`. Live permissions not verified. | Verify privacy/password behavior and Appwrite permissions. |
| Product | Subscription/credits | `useAICredits`, `coupons`, `legacy-payment-webhook` | FAIL | legacy payment provider webhook has `rawBody` bug; AI gateway lacks visible credit enforcement. | Fix webhook and server-side credit enforcement. |
| Product | WiseHire gating | `WiseHireGuard`, `wisehire-gateway` | UNKNOWN | Guard exists, but comments still reference Kinde/Supabase and live account-type permissions were not verified. | Production test HR and job-seeker accounts. |
| Product | Admin/devkit gating | `DevKitSessionContext`, admin hubs verify HMAC/password | PASS | Admin hubs generally check signed DevKit token. | Remove raw password acceptance and verify audit logging. |
| AI | Bot working | `agenticChat.ts`, `ai-gateway` | UNKNOWN | UI/backend path exists, but no live AI call was made. Security gate fails. | Do not mark working until production AI smoke passes after auth fix. |
| AI | Provider fallback | `ai-gateway` candidate pool and timeout logic | PASS | Static route/fallback logic exists. | Verify env vars and provider logs. |
| AI | AI observability | `ai-gateway` Datadog removed/no-op; Sentry client exists | FAIL | LLM input/output observability is effectively disabled in inspected gateway. | Add safe redacted AI telemetry. |
| Backend | Health endpoint | `server/index.ts` has `/api/health` | PASS | Express server health exists, but production frontend uses Vercel/Appwrite mostly. | Decide whether server is part of production runbook. |
| Backend | Appwrite functions | 21 `appwrite-hubs/*/src/main.js` files found | PASS | Hubs exist and deploy script covers 20 listed hubs. | Verify live executions/logs. |
| Backend | Supabase functions | `supabase/` not found | UNKNOWN | Requested Supabase scope is not represented in repo. | Confirm no Supabase remains in production. |
| Backend | Migrations/schema | No Appwrite migration folder found; Drizzle schema appears legacy | FAIL | Schema/permissions are not reproducible from repo. | Export/provision Appwrite schema and permissions as code. |
| Backend | Webhooks | legacy payment provider webhook inspected | FAIL | `rawBody` undefined. | Fix and replay legacy payment provider test event. |
| Frontend | Typecheck | `npx tsc --noEmit` | PASS | Completed with exit code 0. | Keep as required CI gate. |
| Frontend | Lint | `npm run lint` | FAIL | 2064 problems. | Clean or scope lint gate before launch. |
| Frontend | Error boundary | `src/components/ErrorBoundary.tsx` | PASS | Captures errors, handles chunk failures, Sentry shim. | Verify production Sentry DSN and alerting. |
| Frontend | Build readiness | `npm run build` inspected but not run | UNKNOWN | Build script runs `prebuild` asset copy, so audit avoided it as potentially mutating. | Run build in clean CI/preview environment. |
| Deployment | Vercel SPA config | `vercel.json` | PASS | Rewrites, headers, PDF function config present. | Verify dashboard project settings match repo. |
| Deployment | Auto deploy from GitHub | Workflow comments state Vercel handles deployment | UNKNOWN | Repo cannot prove Vercel Git integration/production branch. | Need Vercel dashboard/deploy logs. |
| Deployment | Old Hostinger workflow risk | `.github/workflows/deploy-frontend.yml`, `deploy-landing.yml` | FAIL | Manual FTP deployment remains in repo. | Archive or clearly mark obsolete workflows/runbooks. |
| Security | Secrets in client | `VITE_*` env usage inspected | PASS | No direct `VITE_DEV_KIT_PASSWORD` use found in `src`; Appwrite public IDs are exposed by design. | Verify Vercel env vars exclude server secrets. |
| Security | Admin protection | Admin hubs check DevKit token | PASS | HMAC token verification present in admin hubs. | Remove acceptance of raw password bearer where possible. |
| Security | Function execute permissions | `deploy_hubs.cjs` sets execute `['any']` | FAIL | Requires every function to self-auth. AI functions do not visibly self-auth. | Restrict execute permissions or enforce auth in every hub. |
| Security | PII logging | `monitoring.ts`, `main.tsx`, `ai-gateway` | FAIL | Sentry `sendDefaultPii: true`; AI gateway logs feature/provider, not full prompts, but no explicit redaction for provider-bound resume prompts. | Define PII logging/prompt-retention policy. |
| Ops | Monitoring | Sentry code exists | UNKNOWN | DSN/dashboard/alerts were not verified. | Need Sentry project access and test event. |
| Ops | Rollback | Vercel assumed, workflows old | UNKNOWN | Repo does not document Vercel rollback procedure. | Add rollback runbook. |
