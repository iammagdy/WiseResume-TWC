# WiseResume Full Post-Change Regression Audit

**Audit date:** 2026-08-15  
**Repository:** `iammagdy/WiseResume-TWC`  
**Production:** [https://wiseresume.app](https://wiseresume.app)  
**Scope:** PRs #183–#187, post-hotfix production regression audit, expanded 111-route completion pass  
**Author:** Manus AI

> **VERDICT: PASS_WITH_WARNINGS**
>
> The repository changes pass focused tests, TypeScript validation, diff checks, and the production build. The expanded desktop browser pass gives every source-discovered route a precise evidence-backed classification. One genuine product regression was found on the public share loading path and fixed locally on a scoped branch with a focused test. The fix is not merged or deployed, the legacy `/devkit` route cannot reach a functional terminal state because the authorized Appwrite deployment failed twice at the repository-controlled schema preflight, several dynamic/protected routes lack safe fixtures or access, and real mobile viewport coverage was unavailable. Therefore this audit is not `VERIFIED_READY`.

## 1. Executive summary

PRs #183–#187 are present on main and repository validation is green. Production browser verification confirms that the PR #185 CommonJS crash is not reproduced on the current frontend. The expanded route pass also verified the remaining representative static and Arabic routes, including `/tailor`, `/ar/enterprise`, `/ar/enterprises`, and `/ar/p/magdy`. The `/share/:token` and `/ar/share/:token` path exposed a real blank-page regression: `SharePage` returned `null` during the `usePublicResume` loading/retry window. The scoped fix renders `ShareSkeleton` instead and has a focused regression test; it remains pending PR review and normal deployment.

The authorized targeted Appwrite deployment was not completed. Runs **31871663976** and **31875957559** both stopped at `Ensure AI runtime receipts schema` with `permissionsIsArray=false, permissionCount=unknown, documentSecurity=false`; no function was deployed. No Appwrite Console state, production schema, permission, secret, environment variable, account, or production data was changed.

## 2. Required totals

- **TOTAL PASS: 46**
- **TOTAL PASS_WITH_WARNING: 14**
- **TOTAL PRODUCT_BUG: 1**
- **TOTAL FIXTURE_BLOCKED: 26**
- **TOTAL ACCESS_BLOCKED: 18**
- **TOTAL ENVIRONMENT_ISSUE: 0**
- **TOTAL ROUTES DISCOVERED: 111**
- **TOTAL EXPECTED_REDIRECT: 5**
- **TOTAL EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR: 1**
- **TOTAL EXPECTED_EMPTY_STATE: 0**
- **TOTAL FATAL CONSOLE ERRORS: 0**
- **TOTAL UNEXPECTED NETWORK FAILURES: 0**

The required headline totals intentionally exclude the three additional allowed terminal classifications (`EXPECTED_REDIRECT`, `EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR`, and `EXPECTED_EMPTY_STATE`) so the matrix remains auditable; the additional counts are reported immediately below them and every one of the 111 routes is represented exactly once.

## 3. Repository and change baseline

The audit began from main commit `9c6a990ed3b916d831b82bbbfe0b55b878472ebe`, with PRs #183, #184, #185, #186, and #187 merged. The current closeout branch is `audit/full-regression-public-share-fix`. The change review covered the login error-classification fix, DevKit Phase 1 truthful metrics and terminal states, the browser/CommonJS module-boundary hotfix, source-hash manifest reconciliation, and the six-attribute `ai_runtime_receipts` contract reconciliation.

## 4. Deployment blocker and production state

The approved workflow `.github/workflows/deploy-appwrite-hubs.yml` was not bypassed. Run `31871663976` and the second authorized attempt `31875957559` both failed at the same schema assertion before any function deployment. The safe diagnostic reported only the permitted shape/value fields and no sensitive receipt contents, user IDs, credentials, or permission strings. The four intended targets remain **NOT_DEPLOYED / not independently hash-verified**: `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and `email-service`. Vercel production was observed as READY; no manual Vercel deployment was performed.

Because `/devkit` depends on the still-undelivered backend functions, the legacy admin route is classified as `EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR`, not as an unexplained frontend failure. The `/devkit2` Command Home rendered successfully, while its other hubs explicitly identify themselves as Step 2 placeholders.

## 5. Complete 111-route matrix

| Route | Auth type | Actual tested URL | Desktop evidence | Mobile | EN/AR | Light/dark | Console | Network | Final classification |
|---|---|---|---|---|---|---|---|---|---|
| `*` | Fallback | `https://wiseresume.app/__audit_missing__` | Stable 404 fallback rendered. | N/A | N/A | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/` | Public | `https://wiseresume.app/` | Landing rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/achievements` | Protected job-seeker | `https://wiseresume.app/achievements` | Authenticated achievements view rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ai-studio` | Protected job-seeker | `https://wiseresume.app/ai-studio` | Authenticated AI Studio shell rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ai-studio/:tool` | Protected job-seeker | `https://wiseresume.app/ai-studio/humanizer; /company-briefing; /ab-compare` | Three safe tool slugs rendered; arbitrary tool slugs were not exhaustively enumerated. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/analytics` | Protected job-seeker | `https://wiseresume.app/analytics` | Terminal empty/zero-data analytics state rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/application/:id` | Protected job-seeker | `—` | No safe existing application ID was available; no ID was invented. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/applications` | Protected job-seeker | `https://wiseresume.app/applications` | Authenticated applications page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar` | Public | `https://wiseresume.app/ar` | Arabic landing rendered with RTL-oriented layout. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/auth` | Authentication | `https://wiseresume.app/ar/auth` | Authenticated session redirected to /dashboard; logged-out form submission was not attempted. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **EXPECTED_REDIRECT** |
| `/ar/auth/callback` | Authentication | `—` | OAuth callback token/state fixture unavailable. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/auth/reset-password` | Authentication | `—` | Logged-out reset-token fixture unavailable; no credential or token mutation attempted. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/auth/verify-email` | Authentication | `—` | Logged-out verification-token fixture unavailable. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/enterprise` | Public | `https://wiseresume.app/ar/enterprise` | Arabic enterprise request-demo page rendered after initial lazy load. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/enterprises` | Public | `https://wiseresume.app/ar/enterprises` | Arabic WiseHire companies landing rendered with Arabic content and RTL layout. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/examples` | Public | `https://wiseresume.app/ar/examples` | Route rendered with explicit review-pending content. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/ar/guides` | Public | `https://wiseresume.app/ar/guides` | Route rendered with explicit review-pending content. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/ar/guides/:slug` | Protected job-seeker | `—` | No safe guide slug was extracted and used for a detail-page fixture. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/interview/report/:token` | Public | `—` | No safe interview report token fixture was available. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/l/:linkId` | Public | `—` | No safe short-link ID fixture was available. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/p/:username` | Public | `https://wiseresume.app/ar/p/magdy` | Safe Arabic public portfolio fixture rendered. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/pricing` | Public | `https://wiseresume.app/ar/pricing` | Pricing layout rendered, but plan text remained English; classified as a localization content gap, not a route failure. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/ar/privacy-policy` | Public | `https://wiseresume.app/ar/privacy-policy` | Arabic legal page rendered. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/share/:token` | Public | `—` | No safe Arabic share token fixture was available; the same SharePage component and local fix apply, but this variant was not independently exercised. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/share/brief/:shareToken` | Public | `—` | No safe brief-share token fixture was available. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/share/scorecard/:shareToken` | Public | `—` | No safe scorecard-share token fixture was available. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/ar/terms-of-service` | Public | `https://wiseresume.app/ar/terms-of-service` | Arabic terms page rendered. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/ar/waitlist` | Public | `https://wiseresume.app/ar/waitlist` | Arabic route rendered with English fallback content in parts of the page. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/ar/whats-new` | Public | `https://wiseresume.app/ar/whats-new` | Arabic route rendered with English fallback content in parts of the page. | ENVIRONMENT_ISSUE | AR/RTL | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/auth` | Authentication | `https://wiseresume.app/auth` | Authenticated session redirected to /dashboard; logged-out form submission was not retested. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/auth/callback` | Authentication | `—` | OAuth callback token/state fixture unavailable. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/auth/reset-password` | Authentication | `https://wiseresume.app/auth/reset-password` | Reset-password route reached its terminal state without a fatal error. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/auth/verify-email` | Authentication | `https://wiseresume.app/auth/verify-email` | Authenticated session redirected away from the verification route. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **EXPECTED_REDIRECT** |
| `/career` | Protected job-seeker | `https://wiseresume.app/career` | Shell rendered but content remained backend-dependent skeleton/partial state. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/cover-letter` | Protected job-seeker | `https://wiseresume.app/cover-letter` | Redirected to /cover-letter/new by the declared route guard. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **EXPECTED_REDIRECT** |
| `/cover-letter/edit/:id` | Protected job-seeker | `—` | No existing cover-letter ID fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/cover-letter/new` | Protected job-seeker | `https://wiseresume.app/cover-letter/new` | New cover-letter form rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/cover-letters` | Protected job-seeker | `https://wiseresume.app/cover-letters` | Truthful empty cover-letter state rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/dashboard` | Protected job-seeker | `https://wiseresume.app/dashboard` | Authenticated dashboard rendered with safe existing records. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/devkit` | Admin protected | `https://wiseresume.app/devkit` | Legacy admin session verification remained indefinite; targeted backend functions were not deployed because workflow preflight failed. | ENVIRONMENT_ISSUE | EN | Light desktop | No fatal error observed | Expected backend deployment blocker; no unexpected browser failure | **EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR** |
| `/devkit2` | Admin protected | `https://wiseresume.app/devkit2` | Command Home rendered live values; non-home hubs explicitly remain Step 2 placeholders. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/editor` | Protected job-seeker | `https://wiseresume.app/dashboard → safe resume fixture → editor` | Editor was opened through the intended dashboard fixture flow; direct URL alone redirected to dashboard. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/enterprise` | Public | `https://wiseresume.app/enterprise` | Enterprise request-demo page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/enterprises` | Public | `https://wiseresume.app/enterprises` | WiseHire companies landing rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/examples` | Public | `https://wiseresume.app/examples` | Examples index rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/guides` | Public | `https://wiseresume.app/guides` | Guide index rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/guides/:slug` | Protected job-seeker | `—` | No safe guide detail slug was extracted and used. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/help` | Protected job-seeker | `https://wiseresume.app/help` | Help page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/interview` | Protected job-seeker | `https://wiseresume.app/interview` | Interview workspace rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/interview/report/:token` | Public | `—` | No safe interview report token fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/invite/:code` | Public | `—` | No safe invite-code fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/job/:id` | Protected job-seeker | `—` | No safe job ID fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/jobs` | Protected job-seeker | `https://wiseresume.app/jobs` | Terminal not-yet-synced/empty state rendered truthfully. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/l/:linkId` | Public | `—` | No safe short-link ID fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/notifications` | Protected job-seeker | `https://wiseresume.app/notifications` | Notification feed rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/onboarding` | Protected job-seeker | `https://wiseresume.app/onboarding` | Already-onboarded authenticated user redirected to dashboard. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **EXPECTED_REDIRECT** |
| `/p/:username` | Public | `https://wiseresume.app/p/magdy` | Safe public portfolio fixture rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/portfolio` | Protected job-seeker | `https://wiseresume.app/portfolio` | Portfolio Studio rendered read-only. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/preview` | Protected job-seeker | `https://wiseresume.app/preview` | Direct URL redirected to dashboard; preview-specific direct render was not verified. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/preview/:id` | Protected job-seeker | `—` | No safe existing resume ID fixture was extracted for a preview deep link. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/pricing` | Public | `https://wiseresume.app/pricing` | Pricing cards and FAQ rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/privacy-policy` | Public | `https://wiseresume.app/privacy-policy` | Legal page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/profile` | Protected job-seeker | `https://wiseresume.app/profile` | Authenticated profile page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/qr-batch` | Protected job-seeker | `https://wiseresume.app/qr-batch` | QR batch route rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/qr-code` | Protected job-seeker | `https://wiseresume.app/qr-code` | QR code route rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/qr-scan` | Protected job-seeker | `https://wiseresume.app/qr-scan` | QR scan route rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/referral` | Protected job-seeker | `https://wiseresume.app/referral` | Referral page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/resignation-letter/edit/:id` | Protected job-seeker | `—` | No existing resignation-letter ID fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/resignation-letter/new` | Protected job-seeker | `https://wiseresume.app/resignation-letter/new` | New resignation-letter form rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/resignation-letters` | Protected job-seeker | `https://wiseresume.app/resignation-letters` | Resignation-letter list rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/resume/:id` | Protected job-seeker | `—` | No safe Appwrite resume document ID was extracted from the DOM. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/screenshots-gallery` | Protected job-seeker | `https://wiseresume.app/screenshots-gallery` | Protected audit utility requires unavailable access/fixture. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/search` | Protected job-seeker | `https://wiseresume.app/search` | Search route rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/settings` | Protected job-seeker | `https://wiseresume.app/settings` | Settings workspace rendered read-only. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/share/:token` | Public | `https://wiseresume.app/share/__audit_missing__` | Persistent blank loading state reproduced for missing/slow share lookup; fixed locally with ShareSkeleton but not merged/deployed. | N/A | EN | Light desktop | No fatal error observed | Expected missing-share lookup behavior; blank UI was the product bug | **PRODUCT_BUG** |
| `/share/brief/:shareToken` | Public | `—` | No safe brief-share token fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/share/scorecard/:shareToken` | Public | `—` | No safe scorecard-share token fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/sign-in` | Authentication | `https://wiseresume.app/sign-in` | Authenticated session redirected normally; invalid-credential and logged-out form UI were not retested in this regression audit. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS_WITH_WARNING** |
| `/store-screenshots` | Protected job-seeker | `https://wiseresume.app/store-screenshots` | Protected screenshot utility requires unavailable access/fixture. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/subscription` | Protected job-seeker | `https://wiseresume.app/subscription` | Active Premium state rendered; payment actions were not invoked. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/tailor` | Protected job-seeker | `https://wiseresume.app/tailor` | Tailoring form shell rendered with resume-selection step. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/tailor/:resumeId` | Protected job-seeker | `—` | No safe resume ID fixture was used for the deep tailoring route. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/tailor/result/:resumeId` | Protected job-seeker | `—` | No safe tailored-result resume ID fixture was used. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/tailoring` | Protected job-seeker | `https://wiseresume.app/tailoring` | Redirected to /tailoring-hub by the declared route guard. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **EXPECTED_REDIRECT** |
| `/tailoring-hub` | Protected job-seeker | `https://wiseresume.app/tailoring-hub` | Tailoring hub rendered saved jobs/results. | N/A | EN | Light desktop; dark toggle diagnostic | No fatal error observed | No unexpected failure observed | **PASS** |
| `/tailoring-hub/result/:resumeId` | Protected job-seeker | `—` | No safe tailored-result resume ID fixture was used. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/templates` | Protected job-seeker | `https://wiseresume.app/templates` | Templates page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/terms-of-service` | Public | `https://wiseresume.app/terms-of-service` | Legal page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/upload` | Protected job-seeker | `https://wiseresume.app/upload` | Authenticated upload workspace rendered without upload submission. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/waitlist` | Public | `https://wiseresume.app/waitlist` | Waitlist route rendered without submission. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/whats-new` | Public | `https://wiseresume.app/whats-new` | What’s New route rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/wisehire/analytics` | Protected WiseHire | `https://wiseresume.app/wisehire/analytics` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/briefs` | Protected WiseHire | `https://wiseresume.app/wisehire/briefs` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/briefs/:briefId` | Protected WiseHire | `—` | WiseHire protected area unavailable; no account/detail fixture. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/bulk-screen` | Protected WiseHire | `https://wiseresume.app/wisehire/bulk-screen` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/clients` | Protected WiseHire | `https://wiseresume.app/wisehire/clients` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/dashboard` | Protected WiseHire | `https://wiseresume.app/wisehire/dashboard` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/jd-writer` | Protected WiseHire | `https://wiseresume.app/wisehire/jd-writer` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/mask-cvs` | Protected WiseHire | `https://wiseresume.app/wisehire/mask-cvs` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/onboarding` | Protected WiseHire | `https://wiseresume.app/wisehire/onboarding` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/pipeline` | Protected WiseHire | `https://wiseresume.app/wisehire/pipeline` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/privacy-policy` | Public WiseHire | `https://wiseresume.app/wisehire/privacy-policy` | WiseHire privacy page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/wisehire/roles` | Protected WiseHire | `https://wiseresume.app/wisehire/roles` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/scorecard-templates` | Protected WiseHire | `https://wiseresume.app/wisehire/scorecard-templates` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/scorecards/:candidateId` | Protected WiseHire | `—` | WiseHire protected area unavailable; no account/candidate fixture. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/settings` | Protected WiseHire | `https://wiseresume.app/wisehire/settings` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/signup` | Public WiseHire | `https://wiseresume.app/wisehire/signup` | Public WiseHire signup route rendered without submission. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |
| `/wisehire/signup-early-access/:code` | Protected WiseHire | `—` | No safe early-access code fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **FIXTURE_BLOCKED** |
| `/wisehire/subscription` | Protected WiseHire | `https://wiseresume.app/wisehire/subscription` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/talent-pool` | Protected WiseHire | `https://wiseresume.app/wisehire/talent-pool` | No authorized WiseHire account fixture was available. | N/A | EN | Light desktop not applicable | Not run | Not run | **ACCESS_BLOCKED** |
| `/wisehire/terms-of-service` | Public WiseHire | `https://wiseresume.app/wisehire/terms-of-service` | WiseHire terms page rendered. | N/A | EN | Light desktop | No fatal error observed | No unexpected failure observed | **PASS** |

## 6. Proven regression and scoped fix

The proven regression is the public share loading blank page on `/share/:token` and the same component path under `/ar/share/:token`. The root cause is `src/pages/SharePage.tsx` returning `null` while `usePublicResume` is loading. Because that hook inherits the app-wide `retry: 2` policy, a slow or missing lookup can leave the user with a blank page through the retry window before the not-found state is reached.

The scoped branch changes only the loading branch to render `<ShareSkeleton />` and adds `src/pages/__tests__/SharePage.test.tsx`, which proves the loading state is non-empty. Validation on the branch passes. This is a local fix and is **not yet merged, deployed, or production-reverified**; the production route therefore remains classified `PRODUCT_BUG` in this audit’s historical-observed matrix.

## 7. Browser and runtime findings

The accumulated desktop browser evidence contains no fatal console error for `ReferenceError: module is not defined`, generic `ReferenceError`, `TypeError`, `ChunkLoadError`, failed dynamic import, unhandled promise rejection, or React render failure. **TOTAL FATAL CONSOLE ERRORS: 0.** No unexpected browser network 4xx/5xx was observed on navigated routes. Missing-share lookup requests are expected negative-data behavior; the defect was the blank loading UI, not an unexpected transport failure. **TOTAL UNEXPECTED NETWORK FAILURES: 0.**

Authenticated job-seeker routes rendered with safe existing records and explicit empty states where appropriate. `/jobs` reached a truthful not-yet-synced/empty state, `/analytics` reached an explicit empty/zero state, `/cover-letters` reached an empty state, and `/subscription` showed active Premium without invoking payment actions. Authenticated `/ar/auth` redirected to dashboard; no credentials, tokens, logout, password reset, or account mutation was submitted during this audit.

## 8. Authentication, editor, and deep-link coverage

The existing authenticated session verified dashboard re-entry and representative protected navigation. `/editor` was opened through the intended dashboard resume fixture, while direct `/editor` and `/preview` URLs redirect to dashboard; the dynamic `/resume/:id`, `/preview/:id`, and tailoring result paths remain `FIXTURE_BLOCKED` because no safe Appwrite document ID was extracted for direct deep-link testing. OAuth callback, share token, interview report, short-link, invite, guide-detail, application-detail, job-detail, and letter-edit routes similarly remain fixture-blocked where no safe token/ID was available.

## 9. Arabic and RTL coverage

The Arabic landing, companies landing, enterprise request-demo page, public portfolio fixture, legal pages, examples, guides, pricing, What’s New, and waitlist routes were exercised. `/ar/pricing` is a **content gap/expected localization warning**: the pricing layout and route behavior were correct, but plan copy remained English. `/ar/examples`, `/ar/guides`, `/ar/whats-new`, and `/ar/waitlist` rendered with explicit English/review-pending fallback content in parts of the page. No Arabic route crash was observed.

## 10. Mobile and theme coverage

The sandbox browser ignored `window.resizeTo(390,844)` and retained a desktop viewport of approximately 1422×1222. Therefore genuine 360/390px mobile verification could not be performed and is recorded as `ENVIRONMENT_ISSUE` for the affected route observations; no mobile pass is inferred. A dark-mode toggle diagnostic on `/tailoring-hub` set the document class to `dark` and found no horizontal overflow, but computed body background remained white, so full dark-theme correctness is not claimed and the potential CSS-variable inconsistency remains a warning for follow-up.

## 11. WiseHire coverage

Public WiseHire routes (`/wisehire/signup`, `/wisehire/privacy-policy`, `/wisehire/terms-of-service`, plus the companies and enterprise landings) rendered. The 17 protected WiseHire declarations are individually classified `ACCESS_BLOCKED` because no authorized WiseHire account fixture was available. No signup, waitlist, demo request, email, or other state-changing form was submitted.

## 12. Regression classification and root causes

The confirmed product regression is the public-share blank loading state, fixed locally on the scoped branch. The historical PR #185 `module is not defined` crash was not reproduced after the module-boundary hotfix. PR #187 addresses the deterministic six-attribute schema contract mismatch, but the live server-only permission-shape failure remains an operational blocker whose origin is not proven. The login workstream’s historical autofill/password-manager explanation remains **UNCONFIRMED**; the confirmed login root cause was error masking.

## 13. Validation

| Command/check | Result |
|---|---|
| `npx vitest run src/pages/__tests__/SharePage.test.tsx` | PASS — 1 focused regression test |
| `npx vitest run src/lib/devkit/phase1Semantics.test.ts src/lib/security/aiRuntimeReceiptsSchema.test.ts` | PASS — 2 files, 18 tests |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| `npm run build` | PASS; only existing Vite large-chunk warnings |
| Approved Appwrite workflow `31871663976` | STOPPED at schema preflight; no deployment |
| Approved Appwrite workflow `31875957559` | STOPPED at same schema preflight; no deployment |

## 14. Atlas and Git closeout

This branch contains the public-share fix, focused test, updated `Project Atlas/CURRENT_STATE.md`, `Project Atlas/WHERE_WE_STOPPED.md`, `Project Atlas/CHANGELOG.md`, and this complete report. The next closeout step is to commit and push these files, open a PR to `main`, and leave merge/deployment decisions to the repository owner. No production mutation is authorized by this audit.

## 15. Remaining risks and exact next action

The highest remaining risk is unverified production behavior behind the failed Appwrite schema preflight. The owner must correct the live collection security shape through the separately authorized Appwrite process before any future targeted deployment attempt; this audit does not mutate it. After a normal PR merge and approved deployment, re-test `/share/:token` and `/ar/share/:token` to verify the local skeleton fix in production, then repeat the legacy `/devkit` panel verification and function hash reconciliation. Separately schedule real mobile viewport testing, full dark-theme review, and safe fixture acquisition for the dynamic routes. Do not call the application fully verified while those boundaries remain.

## References

[1]: ../CURRENT_STATE.md "Project Atlas canonical production snapshot"  
[2]: ../WHERE_WE_STOPPED.md "Project Atlas active handover"  
[3]: ../../src/App.tsx "Top-level route shell"  
[4]: ../../src/AppInterior.tsx "Current route table"  
[5]: ../../../wiseresume-route-inventory.txt "Saved source-derived route inventory"  
[6]: ../../../wiseresume-browser-qa.txt "First-pass production browser evidence"  
[7]: ../../../wiseresume-browser-qa-v2.txt "Expanded production browser evidence"  
[8]: ../../../wiseresume-public-share-fix-validation.txt "Scoped public-share fix validation"  
[9]: ../../../wiseresume-deployment-failure-31875957559.txt "Second deployment failure evidence"  
[10]: ../../src/pages/SharePage.tsx "Scoped public-share loading fix"  
[11]: ../../src/hooks/useResumeShares.ts "Public share data hook"  
[12]: ../../.github/workflows/deploy-appwrite-hubs.yml "Approved targeted deployment workflow"  
