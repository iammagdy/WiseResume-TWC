# Backend Audit

## Direct Answer: Is the Backend Working?

**UNKNOWN overall, with specific FAIL items.**

The repository contains Appwrite hub functions, a minimal Express server, and one Vercel serverless PDF export function. TypeScript passes locally, and the function source is present. Repo evidence alone cannot prove live Appwrite function health, environment variables, database permissions, or production logs. The RevenueCat webhook has a clear runtime bug and the AI hubs have a security/credit enforcement blocker.

## Backend Components

| Component | What Was Checked | Evidence | Status | Impact | Recommendation |
|---|---|---|---|---|---|
| Appwrite client | Frontend SDK setup | `src/lib/appwrite.ts` | PASS | Uses Appwrite account/db/functions/storage. | Verify production Appwrite origins and project ID. |
| Function invoker | Routing and JWT packing | `src/lib/appwrite-functions.ts` | PASS | Routes AI to `ai-gateway`, coupons to `coupons`, WiseHire to `wisehire-gateway`. | Ensure backend actually validates packed JWTs. |
| Appwrite hubs | Hub inventory | 21 `appwrite-hubs/*/src/main.js` files | PASS | Backend source exists. | Verify live deployments/executions in Appwrite. |
| Function permissions | Deployment script | `scripts/deploy_hubs.cjs` ensures execute includes `any` | FAIL | Any-callable functions must self-auth; AI hubs do not visibly self-auth. | Restrict execute perms or add mandatory auth in each hub. |
| API health | Express route | `server/index.ts` exposes `GET /api/health` | PASS | Useful if Express server is deployed. | Clarify whether Express server is active in production under Vercel. |
| Vercel PDF export | Serverless function | `api/export/pdf-native.ts`, `vercel.json` | PASS | Production same-origin PDF export path exists. | Run production PDF export smoke. |
| Supabase functions | Requested scope | No `supabase/` directory found | UNKNOWN | Cannot audit absent Supabase functions from repo. | Confirm Supabase is decommissioned or provide dashboard access. |
| Database migrations | Reproducible DB state | No Appwrite migration/permission manifest found | FAIL | Live schema cannot be rebuilt from repo. | Add Appwrite schema/permissions as code. |
| Drizzle schema | Legacy PostgreSQL schema | `server/schema.ts`, `drizzle.config.ts` | UNKNOWN | Comments/docs show legacy Supabase/Postgres references. | Decide if Drizzle/Postgres is active or remove/archive. |
| RevenueCat webhook | Subscription events | `appwrite-hubs/revenuecat-webhook/src/main.js` | FAIL | `rawBody` is undefined; webhook likely fails. | Fix handler body parsing and replay test events. |
| Coupon backend | Coupon validate/redeem/subscription | `appwrite-hubs/coupons/src/main.js` | PASS | Requires user for redeem/get-subscription; validate is public. | Add abuse rate limit for validate. |
| WiseHire gateway | Recruiter actions | `appwrite-hubs/wisehire-gateway/src/main.js` | UNKNOWN | Requires user except waitlist; HR authorization not clearly enforced inside gateway. | Enforce account_type/plan server-side. |
| Public share | Password gate | `appwrite-hubs/public-share/src/main.js` | UNKNOWN | Checks active/expiry and direct password equality. | Hash share passwords; verify anonymous read restrictions. |
| Email service | Verification/reset/welcome | `appwrite-hubs/email-service/src/main.js` | PASS for source | Has Resend/Appwrite verification flows. | Verify function env vars and Resend logs. |
| Observability schema | Setup script | `scripts/setup_observability_schema.cjs` exists | UNKNOWN | Not inspected deeply; live collections not verified. | Run read-only diagnostics via DevKit or Appwrite dashboard. |

## APIs

### Express Server

- **What to verify:** Whether `server/index.ts` is deployed anywhere in production.
- **Evidence:** It states Appwrite-native minimal server with `/api/health` and `/api/export/pdf-native`.
- **Status:** UNKNOWN.
- **Risk/impact:** Operations may think `/api/health` is production-critical while Vercel/Appwrite are the real runtime.
- **Recommendation:** Document active production topology: Vercel frontend + Vercel PDF function + Appwrite functions.

### Vercel API

- **What to verify:** `/api/export/pdf-native` works under Vercel with Chromium bundle.
- **Evidence:** `vercel.json` includes `includeFiles` for `@sparticuz/chromium`; `api/export/pdf-native.ts` sets `maxDuration: 60` and body limit.
- **Status:** PASS for code; UNKNOWN live.
- **Risk/impact:** Export failures are user-facing and monetization-sensitive.
- **Recommendation:** Add a production PDF export smoke test and monitor 4xx/5xx/timeout rates.

## Database / RLS / Authorization

The active database appears to be Appwrite `main`, not Supabase PostgreSQL.

- **Evidence:** `src/lib/appwrite-collections.ts` lists 96 live Appwrite collections and one bucket.
- **Status:** FAIL for reproducibility.
- **Why:** There is no complete Appwrite schema/permission export in the repo, and many client components directly call `databases.createDocument`, `updateDocument`, and `deleteDocument`.
- **Risk/impact:** A wrong live permission can leak or corrupt user data; a new environment cannot be recreated reliably.
- **Recommendation:** Add an audited Appwrite schema manifest covering collections, attributes, indexes, document permissions, function execute permissions, buckets, and storage permissions.

## External Integrations

| Integration | Evidence | Status | Risk | Recommendation |
|---|---|---|---|---|
| Appwrite | Client and hubs use Appwrite endpoint/project | UNKNOWN live | Auth/db/function behavior depends on dashboard config. | Verify origins, env vars, function variables, collections, permissions. |
| Kinde | Legacy mentions only | UNKNOWN | Requested Kinde scope may be obsolete. | Confirm no active Kinde provider remains. |
| Supabase | Legacy mentions only; no `supabase/` tree | UNKNOWN | Old docs can mislead ops. | Archive or clearly label legacy Supabase docs. |
| Resend | `email-service`, `admin-email` | UNKNOWN live | Email failures block signup/reset. | Verify domain, key scope, bounce/spam logs. |
| AI providers | `ai-gateway`, `resume-section-ai`, `wisehire-gateway` | UNKNOWN live | Provider keys/limits can break core product. | Verify key health and failover with smoke tests. |
| RevenueCat | `revenuecat-webhook`, `revenuecat.ts` | FAIL | Webhook likely fails; paid access broken. | Fix webhook and verify dashboard events. |
| Sentry | `monitoring.ts`, `ErrorBoundary`, dependencies | UNKNOWN live | No error visibility if DSN/alerts absent. | Send test event and verify alert routing. |
| Vercel | `vercel.json`, workflows comments | UNKNOWN live | Deployment branch/env may differ from repo assumption. | Verify Vercel dashboard project settings. |

## Backend Launch Blockers

1. AI gateway and section AI need server-side auth/credits/rate limiting.
2. RevenueCat webhook must be fixed and replay-tested.
3. Appwrite schema/permissions must be exported and reviewed.
4. Production Appwrite function variables and execution logs must be verified.
