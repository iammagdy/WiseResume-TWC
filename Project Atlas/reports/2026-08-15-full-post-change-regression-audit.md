# WiseResume Full Post-Change Regression Audit

**Audit date:** 2026-08-15  
**Repository:** `iammagdy/WiseResume-TWC`  
**Production:** [https://wiseresume.app](https://wiseresume.app)  
**Scope:** PRs #183–#194, post-hotfix production regression audit, expanded 111-route completion pass, authorized exact-four-function Appwrite deployment, live DevKit verification, public-share verification, route smoke QA, final ai_runtime_receipts contract reconciliation, and email-verification template safety audit
**Author:** Manus AI

> **VERDICT: PASS_WITH_WARNINGS**
>
> The repository changes pass focused tests, TypeScript validation, diff checks, and the production build. The expanded desktop browser pass gives every source-discovered route a precise evidence-backed classification. The authorized workflow `31880840961` then deployed exactly the four approved Appwrite functions, all of which reached ready/In Sync state with source/deployed hash parity. The public-share fix reached terminal not-found behavior on both English and Arabic invalid-token routes, and `/devkit` reached a live terminal state with all 24 panels marked `LIVE`. Several aggregate sources, safe email configuration health, detailed analytics body content, mobile/full dark-theme coverage, and some dynamic/protected routes remain bounded or unverified. Therefore this audit remains `PASS_WITH_WARNINGS`, not `VERIFIED_READY`.

## 1. Executive summary

PRs #183–#194 are present on main and repository validation is green. Production browser verification confirms that the PR #185 CommonJS crash is not reproduced on the current frontend. The expanded route pass also verified the remaining representative static and Arabic routes, including `/tailor`, `/ar/enterprise`, `/ar/enterprises`, and `/ar/p/magdy`. The `/share/:token` and `/ar/share/:token` path exposed a real blank-page regression, which PR #188 fixed with `ShareSkeleton`; post-deployment invalid-token checks reached explicit `Resume Not Found` states after the transient skeleton. The email-verification audit then proved a separate repository-controlled blank Appwrite Verification-template regression; PR #194 corrected it and narrow run `31882493172` applied the fix to `email-service`, while the final inbox lifecycle remained fixture-blocked.

The authorized targeted Appwrite deployment completed successfully in run `31880840961` after the three earlier pre-deployment failures. Runs **31871663976** and **31875957559** stopped at the repository/model-shape security assertion; after PR #189 corrected the response shape, run **31879539590** passed the `$permissions` gate and stopped at `request_id: required false (expected true)`. PR #191 reconciled the six stale required flags to the live all-optional application schema while preserving the rest of the contract and server-only security checks. The approved workflow performed documented repository-controlled setup/configuration mutations, including idempotent security-collection setup, selected variable/template synchronization, and deployment-hash updates. No manual Console mutation, permission broadening, unauthorized data mutation, `target=all`, unrelated function deployment, or secret-value disclosure occurred.

## Post-deployment addendum (2026-08-15)

### Exact Appwrite deployment scope and parity

Authorized workflow run `31880840961` completed successfully from main `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b` with exact target input `ai-gateway,admin-devkit-data,admin-onboarding-funnel,email-service`. No `target=all` was used, and no other function was deployed.

| Function | Deployment ID | Source/deployed SHA-256 | Readiness/parity |
|---|---|---|---|
| `ai-gateway` | `6a80467d45db108d5cab` | `158da0749573c9c2d7e173c256ee0d77f64c783536fcf920693ed1bb0715fafe` | enabled, ready, In Sync |
| `admin-devkit-data` | `6a804687cfea6415139d` | `6d23504f47c53d72354ca2bb2a46e6bb695b2df0e5442d99d708b7f9075e8804` | enabled, ready, In Sync |
| `admin-onboarding-funnel` | `6a8046923ac36d1cc638` | `efe2a22802e679c8d87e3089c8d284c26563b8c573f9b31b7db8440a0c57553c` | enabled, ready, In Sync |
| `email-service` | `6a80469d1ee51e0246e0` | `744f82a1bd0f4dc9679a9cd30dc56b6195def4f0449f857df6e1bcf510a0548a` | enabled, ready, In Sync |

### Email-verification safety audit and narrow correction

The read-only architecture audit established that `appwrite-hubs/email-service/src/main.js` uses the authenticated Appwrite user JWT and exactly one official `POST /account/verifications/email`; it does not call Resend directly. Appwrite owns the verification token and lifecycle and sends through Custom SMTP and its Verification template.

The live Appwrite Console audit found the pre-fix Verification template with blank subject/body fields and no saved `{{redirect}}` placeholder. Repository inspection proved that the deployment helper was intentionally setting whitespace values for the Verification subject/message. This is classified as `PRODUCT_REGRESSION / DEPLOYMENT CONFIG BUG`, not as an acceptable branded-email mechanism.

PR #194 (`fix/email-verification-template-sync`) added the shared CommonJS template-contract helper, repository-managed functional Verification/recovery templates, redirect-placeholder validation before PATCH, and focused regression tests. It updated both the approved hub deploy helper and standalone email-service helper so neither can blank the required Verification template. Narrow authorized run `31882493172` targeted **only** `email-service`, created deployment `6a804f862b4138bc1b06`, reached ready status, synchronized the managed Verification and recovery templates, synchronized non-secret email-service variables, and updated `fn_deployed_hashes`. No other function was deployed. The Appwrite Console remained on a spinner after deployment; the workflow log is the available successful PATCH evidence.

The requested signup/resend/inbox receipt/link/confirmation/Appwrite-verified/onboarding sequence is **FIXTURE_BLOCKED** because no approved safe QA identity/inbox was available. No real-user credential, token, link, send, reset, or production-data mutation was used. The Email panel’s non-destructive configuration check remained nonterminal with no console output and no send/reset action; this is classified as `TEST/AUTOMATION ISSUE or EXPECTED LIMITATION`, not a proven backend/product failure. The narrow deployment is healthy, but email verification must not be described as end-to-end production-verified until a safe fixture is supplied.

### Live DevKit and route verification

The production `/devkit` left session/loading verification and reached a terminal live state with all 24 panels marked `LIVE`. App Overview and Onboarding reached terminal states. Data Integrity and Users showed explicit unavailable/error states instead of fake zeroes. AI Health separated provider reachability from completion/key/model health; mixed success plus rate-limited slots displayed `Degraded / Mixed`; traffic reported a truthful actual 50-record sample with 44 attributed and 6 Unknown/Unattributed. Observability displayed a truthful empty state. English and Arabic invalid-token public-share routes showed `ShareSkeleton` transiently, then `Resume Not Found`, with no blank root or fatal console error. A read-only 22-route HTTP smoke check returned the expected application shell and no fatal markers for every tested route.

### Bounded warnings

The final evidence does not claim exact aggregate Data Integrity/Users values because those sources were unavailable during capture. Detailed App Analytics body content was empty in the captured state. The Email panel’s non-destructive configuration check did not reach a terminal result; no send or reset operation was invoked, so email-service health beyond deployment readiness is `UNVERIFIED`. Unknown-route server 404 semantics, full mobile/full dark-theme coverage, and certain dynamic/protected fixture paths remain unverified. These are bounded verification warnings, not deployment blockers; unrelated pre-existing Function drift was intentionally untouched.

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

The final repository baseline is main commit `a2c636622a8efb88d2d88d36bf18488007fafee2`, with PRs #183–#194 merged. PR #188 merged the public-share loading fix with merge commit `888ac4cdb13aea3728eb966db521918b1bf57db5`; PR #189 merged the Appwrite permissions-shape preflight fix with merge commit `fd88f91c13003764eac45955dbff8d92586b77bd`; PR #191 reconciled the complete live runtime-receipts contract; PR #194 merged the functional Appwrite verification-template synchronization fix. The change review covered the login error-classification fix, DevKit Phase 1 truthful metrics and terminal states, the browser/CommonJS module-boundary hotfix, source-hash manifest reconciliation, the superseded six-attribute required hypothesis, the final `$permissions` model-shape correction, and the all-optional live contract fix.

## 4. Deployment blocker and production state

The approved workflow `.github/workflows/deploy-appwrite-hubs.yml` was not bypassed. Runs `31871663976`, `31875957559`, and `31879539590` failed before deployment during the repository-controlled preflight sequence; authorized run `31880840961` passed the corrected contract gates and deployed the exact four targets while applying its documented idempotent setup/configuration mutations. PR #191 requires all existing application attributes to remain optional, while retaining exact types, sizes, defaults, indexes, server-only `$permissions=[]`, and `documentSecurity === false`. The safe diagnostic reports only permitted shape/value fields and no sensitive receipt contents, user IDs, credentials, or permission strings. Vercel production was observed as READY; no manual Vercel deployment was performed.

After deployment, `/devkit` reached a live terminal state with all 24 panels marked `LIVE`; App Overview and Onboarding reached terminal states. `/devkit2` Command Home rendered successfully, while its other hubs explicitly identify themselves as Step 2 placeholders.

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
| `/share/:token` | Public | `https://wiseresume.app/share/__audit_missing__` | Persistent blank loading state reproduced for missing/slow share lookup; PR #188 merged the `ShareSkeleton` fix into main. This route remains classified by the observed pre-fix production regression; no separate post-merge production verification is claimed. | N/A | EN | Light desktop | No fatal error observed | Expected missing-share lookup behavior; blank UI was the product bug | **PRODUCT_BUG** |
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

The confirmed product regression is the public-share blank loading state, fixed and merged through PR #188. The historical PR #185 `module is not defined` crash was not reproduced after the module-boundary hotfix. PR #189 corrected the Appwrite `$permissions` response-shape assertion. PR #191 corrected the stale six-required-attribute hypothesis after run `31879539590` showed the live `request_id` field is optional; the complete application contract is now represented as all-optional in the repository. The login workstream’s historical autofill/password-manager explanation remains **UNCONFIRMED**; the confirmed login root cause was error masking.

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
| Approved Appwrite workflow `31879539590` | STOPPED at stale six-required-attribute comparison; no deployment |

## 14. Atlas and Git closeout

PR #188 ([review link](https://github.com/iammagdy/WiseResume-TWC/pull/188)) merged into `main` with merge commit `888ac4cdb13aea3728eb966db521918b1bf57db5`; its final reviewed head was `9e13bb649b9f90965895adbdfce61f3648b774bf` and implementation commit `49a2a9d33698f2dd143f747553fbe4005288898a`. PR #189 ([review link](https://github.com/iammagdy/WiseResume-TWC/pull/189)) merged into `main` with merge commit `fd88f91c13003764eac45955dbff8d92586b77bd`; its reviewed head was `7ef73c275181a594cb2856cfee4433cb5ce7c073`. PR #191 ([review link](https://github.com/iammagdy/WiseResume-TWC/pull/191)) merged the all-optional runtime-receipts contract correction; final main is `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`. Applicable checks passed; TestSprite remains the known non-applicable `No tests detected` warning. No Appwrite or manual Vercel deployment was performed.

## 15. Remaining risks and exact next action

The highest remaining risk is unverified production behavior behind the failed Appwrite deployment sequence. The permissions model-shape blocker is corrected and merged in PR #189, and the stale six-required-attribute hypothesis is corrected and merged in PR #191; however, the four functions remain undeployed because no workflow was rerun. After the final read-only preflight passes, use the exact authorized four-target workflow, then re-test `/share/:token` and `/ar/share/:token` to verify the merged skeleton fix in production, repeat the legacy `/devkit` panel verification, and reconcile function hashes. Separately schedule real mobile viewport testing, full dark-theme review, and safe fixture acquisition for the dynamic routes. Do not call the application fully verified while those boundaries remain.

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
