# Product Flow Audit

## Landing Page to Sign Up

- **Expected behavior:** Visitor lands on `/`, clicks sign up, reaches `/auth`, creates an account.
- **Files/routes/functions involved:** `src/App.tsx`, `src/AppLanding.tsx`, `src/AppInterior.tsx`, `src/pages/Index.tsx`, `src/pages/AuthPage.tsx`.
- **Manual test steps:** Open production URL, click primary CTA, confirm `/auth` loads, create a fresh account.
- **Automatic test:** Playwright smoke: landing CTA -> auth form visible -> signup form validation.
- **Evidence found:** `/` and `/enterprises` route through `AppLanding`; `/auth` route exists in `AppInterior`.
- **Status:** PASS for route/code existence; UNKNOWN for live production behavior.
- **Risks:** Vercel deployment or env mismatch can break live auth despite route correctness.
- **Recommendation:** Add production smoke test after each Vercel production deployment.

## Sign Up

- **Expected behavior:** Appwrite account is created, session is created, verification email is sent, user lands on verify-email page.
- **Files/routes/functions involved:** `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `appwrite-hubs/email-service/src/main.js`.
- **Manual test steps:** Use a new mailbox alias, submit signup, verify one email is received.
- **Automatic test:** Existing `tests/e2e/specs/24-auth-email-production.spec.ts` can be adapted with production test credentials.
- **Evidence found:** `AuthPage.handleRegister()` calls `account.create`, `createEmailPasswordSession`, `refreshSession`, then `email-service` with `send-verification`.
- **Status:** PASS for implementation; UNKNOWN for live email delivery.
- **Risks:** Appwrite rate limits, Resend domain/API key issues, Vercel not on latest commit.
- **Recommendation:** Verify with Appwrite executions and Resend delivery logs.

## Email Verification

- **Expected behavior:** Verification link opens `/auth/verify-email?userId=...&secret=...`; user clicks "Verify my email"; Appwrite verification completes; dashboard loads.
- **Files/routes/functions involved:** `src/pages/AuthVerifyEmailPage.tsx`, `src/lib/authEmailCallbackParams.ts`, `appwrite-hubs/email-service/src/main.js`.
- **Manual test steps:** Click real email link in Outlook and Gmail; confirm page does not auto-verify before click; click button; confirm dashboard.
- **Automatic test:** Unit tests for callback parsing plus Playwright production mailbox test.
- **Evidence found:** Page is intentionally manual-confirm mode to avoid Safe Links token consumption; targeted tests passed.
- **Status:** PASS for code; UNKNOWN for live email provider behavior.
- **Risks:** Token scanner behavior, Appwrite verification token TTL/rate limits, stale production frontend.
- **Recommendation:** Run fresh alias smoke after Vercel deploy and verify single email in Resend logs.

## Sign In

- **Expected behavior:** User signs in with email/password and lands on intended route or `/dashboard`.
- **Files/routes/functions involved:** `src/pages/AuthPage.tsx`, `src/contexts/AuthContext.tsx`, `src/components/layout/ProtectedRoute.tsx`.
- **Manual test steps:** Sign out, sign in, refresh dashboard, close/reopen browser.
- **Automatic test:** `src/components/layout/__tests__/ProtectedRoute.test.tsx`, `src/hooks/__tests__/Auth-D3.test.tsx`.
- **Evidence found:** `AuthContext` always calls `account.get()` on load; targeted auth tests passed.
- **Status:** PASS for local code/tests; UNKNOWN for live production.
- **Risks:** Appwrite origin/session cookie config not visible from repo.
- **Recommendation:** Verify Appwrite platform origins and production sign-in with real browser.

## Auth Callback

- **Expected behavior:** Any Appwrite callback path moves user to dashboard once Appwrite state is available.
- **Files/routes/functions involved:** `src/pages/AuthCallbackPage.tsx`, `/auth/callback`.
- **Manual test steps:** Trigger OAuth/recovery flows if enabled and confirm callback.
- **Automatic test:** Router test for `/auth/callback`.
- **Evidence found:** Callback page redirects to `/dashboard`.
- **Status:** UNKNOWN.
- **Risks:** If OAuth providers are configured, callback may need provider-specific handling not present in this file.
- **Recommendation:** Verify enabled Appwrite auth providers and callback URLs in dashboard.

## Session Persistence

- **Expected behavior:** Refreshing protected pages does not flash private content then redirect incorrectly.
- **Files/routes/functions involved:** `src/contexts/AuthContext.tsx`, `src/components/layout/ProtectedRoute.tsx`.
- **Manual test steps:** Login, refresh `/dashboard`, `/editor`, `/tailor`; test after email verification.
- **Automatic test:** Existing targeted auth tests.
- **Evidence found:** Route guard waits for `sessionValidated`; no longer trusts `sessionStorage` for auth state.
- **Status:** PASS locally.
- **Risks:** Production cookie/origin mismatch can still fail.
- **Recommendation:** Add Playwright test covering refresh on protected route.

## Logout

- **Expected behavior:** Session is deleted, caches are cleared, user returns to public route.
- **Files/routes/functions involved:** `AuthContext.signOut()`.
- **Manual test steps:** Login, logout, attempt `/dashboard`.
- **Automatic test:** Component/unit test for `signOut` side effects.
- **Evidence found:** Deletes current Appwrite session and clears query/editor caches.
- **Status:** PASS for code.
- **Risks:** `window.location.replace('/')` prevents in-app confirmation of failure.
- **Recommendation:** Add logout e2e regression.

## Password Reset / Account Recovery

- **Expected behavior:** User requests reset email, opens `/auth/reset-password`, sets new password.
- **Files/routes/functions involved:** `src/pages/AuthPage.tsx`, `src/pages/AuthResetPasswordPage.tsx`, `email-service`.
- **Manual test steps:** Request reset for existing user; open link; set password; login.
- **Automatic test:** Unit test URL parser; e2e with test mailbox.
- **Evidence found:** Reset route parses `userId`/`secret`, enforces 8-char min, calls `account.updateRecovery`.
- **Status:** PASS for code; UNKNOWN for live email/recovery token.
- **Risks:** Email provider or Appwrite recovery template mismatch.
- **Recommendation:** Verify with Resend logs and Appwrite auth logs.

## Onboarding

- **Expected behavior:** New user completes profile/onboarding, then dashboard becomes stable.
- **Files/routes/functions involved:** `/onboarding`, `src/pages/OnboardingPage.tsx`, `DashboardPage`.
- **Manual test steps:** Fresh signup, verify email, complete onboarding, refresh dashboard.
- **Automatic test:** Playwright new-user onboarding.
- **Evidence found:** Routes exist; dashboard has onboarding redirect flags in local/session storage.
- **Status:** UNKNOWN.
- **Risks:** Local/session storage flags may create inconsistent state across devices.
- **Recommendation:** Use server profile state as the source of truth where possible and test cross-device.

## Dashboard Loading After Login

- **Expected behavior:** Dashboard loads once auth is confirmed and does not flash then redirect.
- **Files/routes/functions involved:** `ProtectedRoute`, `DashboardPage`, `JobSeekerRoute`.
- **Manual test steps:** Login, hard refresh, focus/blur tab, test unverified and verified accounts.
- **Automatic test:** ProtectedRoute tests plus Playwright refresh scenario.
- **Evidence found:** Targeted tests passed; `ProtectedRoute` waits for session validation.
- **Status:** PASS locally; UNKNOWN live.
- **Risks:** Account-type query timeout can still produce redirects if Appwrite permissions fail.
- **Recommendation:** Add production dashboard smoke test.

## Resume Upload / Creation / Editor / Save

- **Expected behavior:** User uploads or creates resume, edits content, saves to Appwrite, refreshes with data intact.
- **Files/routes/functions involved:** `/upload`, `/editor`, `CreateResumeDialog`, `useResumes`, `resumeStore`, Appwrite `resumes` collection.
- **Manual test steps:** Upload PDF/DOCX/image, create blank resume, edit section, refresh, export.
- **Automatic test:** Playwright upload/create/edit/save flow using fixture files.
- **Evidence found:** Routes and Appwrite document write paths exist.
- **Status:** UNKNOWN.
- **Risks:** Appwrite collection permissions are not codified in repo; file parsing depends on client and AI gateway.
- **Recommendation:** Export Appwrite permissions/schema and run live e2e.

## Resume Analysis / Scoring / Tailoring

- **Expected behavior:** User submits resume + job, AI returns structured analysis/tailor output, credits update, UI handles failures.
- **Files/routes/functions involved:** `src/lib/aiAnalysis.ts`, `src/lib/aiTailor.ts`, `appwrite-hubs/ai-gateway/src/main.js`, `resume-section-ai`.
- **Manual test steps:** Run analyze, tailor, smart-fit, section enhance with a verified account.
- **Automatic test:** Contract tests for AI gateway envelopes and UI error states.
- **Evidence found:** AI paths route through `ai-gateway` and `resume-section-ai`; gateway has provider fallbacks.
- **Status:** FAIL for production security; UNKNOWN for live quality.
- **Risks:** Missing visible server auth/credit enforcement allows abuse and cost exposure.
- **Recommendation:** Add server-side authentication, user rate limiting, and credit deduction before launch.

## Cover Letter Generation

- **Expected behavior:** User enters job/resume context and receives a cover letter.
- **Files/routes/functions involved:** `src/lib/aiTailor.ts`, `/cover-letter/new`, `ai-gateway`.
- **Manual test steps:** Generate, save, edit, export cover letter.
- **Automatic test:** Mocked contract test and live smoke after security fix.
- **Evidence found:** `generateCoverLetter()` invokes `generate-cover-letter`.
- **Status:** UNKNOWN.
- **Risks:** Same AI gateway auth/credit issue; malformed AI responses.
- **Recommendation:** Verify after AI gateway hardening.

## Portfolio / Public Portfolio

- **Expected behavior:** User publishes portfolio; public route works; protected shares require password.
- **Files/routes/functions involved:** `/portfolio`, `/p/:username`, `/share/:token`, `public-share`.
- **Manual test steps:** Publish, unpublish, password-protect share, test anonymous access.
- **Automatic test:** Existing public portfolio tests plus password gate tests.
- **Evidence found:** Routes and public-share function exist.
- **Status:** UNKNOWN.
- **Risks:** `public-share` compares password string directly; Appwrite permissions not verified.
- **Recommendation:** Review share password hashing/verification and live anonymous access.

## Subscription / Plan / Credits

- **Expected behavior:** User sees plan, redeems coupon or pays, RevenueCat updates subscription, credits enforced server-side.
- **Files/routes/functions involved:** `useAICredits`, `coupons`, `revenuecat-webhook`.
- **Manual test steps:** Validate coupon, redeem coupon, trigger RevenueCat test event, run AI until limit.
- **Automatic test:** Webhook unit test with sample payload; credit enforcement integration test.
- **Evidence found:** Coupons require Appwrite user for redemption; RevenueCat webhook has undefined `rawBody`; AI gateway lacks credit enforcement evidence.
- **Status:** FAIL.
- **Risks:** Paid users may not be upgraded; free users may abuse AI; billing trust risk.
- **Recommendation:** Fix webhook and enforce credits in backend.

## WiseHire Access Gating

- **Expected behavior:** HR accounts access `/wisehire/*`; job seekers are redirected.
- **Files/routes/functions involved:** `WiseHireGuard`, `JobSeekerRoute`, `wisehire-gateway`.
- **Manual test steps:** Use HR and job-seeker accounts; test trial expiry and subscription page.
- **Automatic test:** Router and gateway action tests.
- **Evidence found:** Guard exists; gateway requires user except waitlist access.
- **Status:** UNKNOWN.
- **Risks:** Comments still reference Kinde/Supabase; live account-type permissions not verified.
- **Recommendation:** Test with two production accounts and validate Appwrite permissions.

## Admin / DevKit Access

- **Expected behavior:** Only DevKit-authenticated operators can access admin actions.
- **Files/routes/functions involved:** `/devkit`, `DevKitSessionContext`, admin Appwrite hubs.
- **Manual test steps:** Try admin actions without token, expired token, valid token.
- **Automatic test:** Function-level auth tests for all admin hubs.
- **Evidence found:** Admin hubs verify raw or HMAC DevKit bearer token.
- **Status:** PASS for basic guard pattern.
- **Risks:** Raw password bearer acceptance and localStorage token storage increase blast radius.
- **Recommendation:** Prefer signed token only, shorter TTL, and audit all admin actions.
