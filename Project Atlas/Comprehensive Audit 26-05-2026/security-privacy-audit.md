# Security and Privacy Audit

## Summary

The app has several good security patterns: Appwrite session validation, protected routes, signed DevKit tokens, error boundaries, CSP/security headers, and Sentry replay masking. The release is not security-ready because Appwrite functions are broadly executable and the main AI hubs do not visibly authenticate requests or enforce credits/rate limits server-side. Appwrite schema/permissions are also not reproducibly captured in the repo.

## Security Checks

| Area | What Was Checked | Evidence | Status | Risk/Impact | Recommendation |
|---|---|---|---|---|---|
| Auth session source of truth | Appwrite session validation | `AuthContext` calls `account.get()` on load | PASS | Reduces stale-cache auth flash. | Production refresh smoke. |
| Protected route gating | Auth + email verification | `ProtectedRoute.tsx` | PASS | Blocks unverified/unauthed users. | Add e2e tests. |
| Token storage | Auth cache and DevKit tokens | `sessionStorage wr_auth_user`, DevKit localStorage token | PASS with caveat | Auth cache not trusted; DevKit token in localStorage can be stolen by XSS. | Prefer memory/session storage and strong CSP. |
| Admin auth | HMAC/password bearer token | Admin hub files | PASS with caveat | Signed tokens exist; raw password bearer accepted in many hubs. | Remove raw password bearer acceptance after migration. |
| Impersonation | Admin claim flow | `impersonationStore`, `admin-impersonate` | UNKNOWN | Token is base64 payload, not visibly signed; trust appears frontend-local after claim. | Require signed impersonation token and server-side validation for privileged reads/actions. |
| Function execute permissions | Deployment script | `ensureFunction(... ['any'])` | FAIL | Any caller can execute if function does not self-auth. | Restrict function execute permissions or enforce auth in every function. |
| AI function auth | Gateway/session validation | `ai-gateway`, `resume-section-ai` searched for JWT/auth | FAIL | AI cost/data abuse possible. | Validate Appwrite JWT, plan, credits, and rate limits server-side. |
| Credit enforcement | Server-side deduction | `useAICredits` says server enforces; gateway does not show it | FAIL | Billing and cost controls can be bypassed. | Atomic credit transaction in AI gateway. |
| Rate limiting | Client and backend | `src/lib/rateLimiter.ts`, gateway backoff | FAIL | Client-only user rate limit is bypassable; gateway backoff is per-provider key health, not user abuse protection. | Add per-user/IP server-side limits. |
| CORS | Express CORS | `server/index.ts` | PASS for Express | Allows known domains, localhost, Replit. | Confirm active production path and Appwrite CORS origins. |
| CSRF | Cookie/session usage | Appwrite SDK/browser sessions | UNKNOWN | Appwrite handles sessions; repo cannot verify cookie settings. | Verify Appwrite session cookie SameSite/Secure behavior. |
| XSS | Markdown/HTML use | `react-markdown`, limited `innerHTML` usage found | UNKNOWN | `react-markdown` is generally safe by default; PDF/QR code paths use innerHTML for generated markup. | Review all user-controlled markdown/html paths. |
| Secrets exposure | Client envs and workflows | `VITE_*`, workflows, no obvious real secrets in inspected output | PASS with caveat | Public Appwrite project IDs are expected; server keys not found in client usage. | Run secret scan and verify Vercel env scopes. |
| PII logging | Sentry and console | `monitoring.ts` `sendDefaultPii: true`, global console errors | FAIL | Resume/user data could be captured in error context. | Define redaction policy; set Sentry PII intentionally. |
| AI prompt privacy | Resume/job data sent to providers | `aiTailor`, `aiAnalysis`, gateway prompts | UNKNOWN | Resume data is sensitive and sent to third-party AI providers. | Publish policy, provider retention controls, and opt-in disclosure. |
| Webhook verification | legacy payment provider | `timingSafeEqual` auth header check | PASS for auth; FAIL runtime | Verification pattern exists, but handler body bug blocks processing. | Fix runtime and verify replay. |
| Public share password | Password verification | `public-share` compares string equality | UNKNOWN/FAIL | If stored password is plaintext, confidentiality risk. | Store salted hashes and compare server-side. |
| Dependency risk | package inventory | Large dependency set; no audit run | UNKNOWN | Supply-chain risk unknown. | Run `npm audit`/dependency review in CI, no auto-fix. |

## Privacy / PII Findings

- Resumes, cover letters, job descriptions, portfolio data, interview data, and WiseHire candidate data are sensitive PII.
- AI flows send resume/job content to external AI providers.
- Sentry is initialized with `sendDefaultPii: true`.
- Sentry Replay masks all text and blocks media, which is good, but event extras and console breadcrumbs still need review.
- AI gateway logs provider/model and feature, but no explicit no-raw-prompt logging policy was found.
- Appwrite live permissions are not in repo, so data isolation cannot be proven.

## Access Control Findings

### PASS

- `ProtectedRoute` blocks unauthenticated users.
- Email verification gate exists.
- Admin hubs generally require DevKit bearer token.
- Coupons `redeem` and `get-subscription` require current Appwrite user.
- WiseHire gateway blocks most actions without an Appwrite user.

### FAIL

- AI hubs are callable through functions configured with `any` execute and no visible backend auth/credit enforcement.
- legacy payment provider webhook cannot reliably update paid access because of runtime bug.
- Public share password handling needs proof of hashing; inspected function performs direct string compare.

### UNKNOWN

- Appwrite collection-level permissions.
- Appwrite storage bucket permissions.
- Appwrite auth provider/session cookie settings.
- Vercel environment variable exposure.
- Sentry project redaction/alerts.
- Resend domain/DKIM/DMARC/bounce handling.

## Security Launch Blockers

1. Enforce auth, credit checks, and rate limits server-side in AI hubs.
2. Fix and verify legacy payment provider webhook.
3. Export/review Appwrite schema and permissions.
4. Verify production secrets/env vars are not exposed to client bundles.
5. Define PII/AI prompt logging and retention policy.
