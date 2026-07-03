# Project Atlas Master Changelog

## 2026-07-04 - DevKit Admin Password Reset Deployment & Live Verification

- **Targeted Appwrite Deployment**: Official `Deploy Appwrite Hubs` workflow run `28688040101` completed successfully for target `admin-devkit-data,email-service` on commit `ea713958`. No `target=all`, Appwrite Console deployment, or `admin-impersonate` deployment was used.
- **Environment Configuration**: Confirmed `EMAIL_SERVICE_INTERNAL_HMAC_SECRET` is configured on both `admin-devkit-data` and `email-service`.
- **Deployed Hash Verification**: `node scripts/check-hub-drift.cjs` confirmed `IN SYNC` for both `admin-devkit-data` and `email-service` against production Appwrite database.
- **Live Function & Cross-Function HMAC Verification**:
  - `UserDetailDrawer` -> `admin-devkit-data` -> `email-service` internal HMAC call delivered password reset code via Resend and returned HTTP 200.
  - Direct browser caller attempts to `email-service` `send-admin-password-reset-otp` failed closed with HTTP 401 deprecated notice.
- **Audit Log Verification**: Verified document creation in `admin_audit_logs` collection (`action: admin-password-reset-code-sent`, matching `user_id`).
- **Sensitive Scan**: Confirmed zero exposure of OTP, challenge tokens, email bodies, Resend payloads, HMAC secrets, or bearer tokens in execution logs or responses.

---

## 2026-07-04 - DevKit Admin Password Reset Cross-Function Authentication Architecture Fix

- **Architecture Redesign**: Resolved the DevKit admin password-reset HTTP 401 blocker by establishing `admin-devkit-data` as the single DevKit admin authority and using server-to-server internal HMAC signing (`EMAIL_SERVICE_INTERNAL_HMAC_SECRET`) to `email-service`.
- **Frontend Alignment** (`UserDetailDrawer.tsx`): Updated `handleSendPasswordResetCode` to invoke `admin-devkit-data` (action `send-admin-password-reset-otp`) with existing DevKit admin headers instead of calling `email-service` directly with browser tokens.
- **Admin DevKit Authority** (`admin-devkit-data/src/main.js`): Added `send-admin-password-reset-otp` handler that validates DevKit admin auth, resolves the target user's authoritative email server-side via Appwrite Users API, signs the internal request using `EMAIL_SERVICE_INTERNAL_HMAC_SECRET`, and executes `email-service`. Fails closed with a configuration error if `EMAIL_SERVICE_INTERNAL_HMAC_SECRET` is missing.
- **Internal Service Delivery** (`email-service/src/main.js`): Added `internal-send-admin-password-reset-otp` handler protected strictly by timing-safe HMAC signature verification (`EMAIL_SERVICE_INTERNAL_HMAC_SECRET`, no API key fallbacks), bypassing browser DevKit token validation and delegating directly to `handleSendPasswordResetOtp`. Direct browser calls to `send-admin-password-reset-otp` on `email-service` are deprecated and fail closed (HTTP 401).
- **Security & Safety**: Confirmed send-code-only behavior (zero OTP, challenge token, email body, Resend payload, bearer secret, or internal signing secret exposed in UI or logs). Audit entries are created only after successful email delivery; failed audit writes return a safe warning.
- **Validation**: TypeScript (`npx tsc --noEmit`), `node --check`, and 17 focused Vitest security tests passed (`adminPasswordResetInternalAuth.test.ts`, `adminOperationsContracts.test.ts`, `adminDevkitHardening.test.ts`). Source hashes were recomputed for `admin-devkit-data` and `email-service`.
- **Deployment & Prerequisites**: Implementation completed locally. Deployment NOT performed. Before deployment, `EMAIL_SERVICE_INTERNAL_HMAC_SECRET` must be configured on both `admin-devkit-data` and `email-service` Appwrite Functions. Recommended manual Appwrite Hubs deploy target after owner approval: `admin-devkit-data,email-service` (`admin-impersonate` was not changed and should not be included).

---

## 2026-07-04 - DevKit Admin Operations Deployment & Live Verification

- **Targeted Appwrite Deployment**: Official `Deploy Appwrite Hubs` workflow run `28687088873` completed successfully for `admin-devkit-data,admin-impersonate,email-service` on commit `c4bc9fea`. No `target=all`, Appwrite Console deployment, or unrelated hub deployment was used.
- **Schema & Hash Verification**: Live inspection confirmed the server-only `admin_impersonation_sessions` schema, required indexes, and matching deployed-hash prefixes for all three hubs.
- **Act As Verification**: Live issuance created a stored session, verification succeeded, revocation succeeded, and the revoked token was rejected afterward.
- **Admin Reset Blocker**: `email-service` still rejects the valid DevKit token with HTTP 401 before reset-code generation. No reset code was sent and no success audit was written. Three narrow authentication fixes were tested and deployed; further changes are paused pending an explicit authentication-boundary design decision.
- **Exposure Check**: Inspected execution output contained no OTP value, challenge token, email body, bearer secret, or Resend payload.
- **Frontend Verification**: Vercel reported the production deployment for commit `c4bc9fea` successful. Collision controls remain covered by the deployed source contract and focused tests; authenticated browser verification was unavailable because the browser session was signed out.

---

## 2026-07-04 - DevKit Admin Users Operational Safety

- **Function Drift Detection** (`DeployHubsPanel`, `hashDrift`): normalized SHA-256 comparisons so complete deployed hashes and legacy 16-character prefixes both report `In Sync` when they match; hash labels now distinguish full values from prefixes.
- **Collision Controls** (`AdminUsersPanel`, `UserDetailDrawer`, `admin-devkit-data`): removed identity actions from normal list rows, restricted the drawer action to confirmed collision identities, renamed it to suspension-only language, and added a server-side collision guard. No data transfer or merge behavior was added.
- **Act As Storage** (`setup_impersonation_sessions_schema.cjs`, `deploy-appwrite-hubs.yml`, impersonation hubs): added idempotent server-only session schema provisioning for targeted workflow runs, safe remediation errors, required query indexes, and corrected audit writes to `admin_audit_logs`.
- **Admin Password Reset Codes** (`email-service`, `UserDetailDrawer`): added an authenticated send-code-only action that resolves the selected Appwrite Auth user, reuses the existing OTP flow, audits only after successful delivery, and returns a safe warning when delivery succeeds but auditing fails.
- **Validation**: TypeScript and 13 focused Vitest tests passed; changed Appwrite/setup scripts passed Node syntax checks. Source hashes were regenerated for `admin-devkit-data`, `admin-impersonate`, and `email-service`.
- **Deployment**: Not deployed. Recommended manual Appwrite Hubs target: `admin-devkit-data,admin-impersonate,email-service`.

---

## 2026-07-03 - Public Readiness, Secret Hygiene & Proprietary Licensing

- **Public Repository Presentation (PR #136)**: Rewrote root `README.md` to serve as a comprehensive public homepage with hero section, badges, product overview, feature summary, architecture overview, tech stack matrix, local dev quickstart, security model, deployment model, Project Atlas links, project status, and license notice. Updated GitHub repository description, homepage, and topics.
- **Secret Hygiene & Data Sanitization (PR #137)**: Updated `.gitignore` to explicitly ignore local environment secret files (`.env.*`, `.env.vercel`, `.env.vercel.*`). Sanitized personal email references (`magdy.saber@outlook.com`) across developer scripts (`scripts/`), unit tests, template sample data (`src/lib/templateData.ts`), and Project Atlas documentation.
- **Proprietary All-Rights-Reserved License (PR #138)**: Created root `LICENSE` file establishing a proprietary, all-rights-reserved license for portfolio review purposes. Updated `README.md` license section pointing to `LICENSE`.
- **Public-Readiness Secret Audit**: Confirmed local `.env.vercel*` secret files were moved outside the repository folder by the owner. Executed fallback git commit history (`git log -p -G ...`) and source regex scan (`git grep`), verifying zero active secrets in git commit history. Output reports created in `..\secret-scan-reports\` (outside git tree).
- **Strict Guardrails Followed**: Zero application code changed, zero Appwrite functions changed, zero backend schemas or auth logic changed, zero workflow changes, zero manual Vercel or Appwrite deployments performed. Repository visibility remains private.

---

## 2026-07-03 - Project Atlas Governance & Structure Cleanup

- **Docs-Only Governance Cleanup**: Performed comprehensive audit and restructuring of `Project Atlas/` folder layout based strictly on Atlas routing governance files (`ATLAS_ROUTING_RULES.md`, `SOURCE_OF_TRUTH_MAP.md`, `RULES.md`).
- **Archived Stale/Legacy Specs**: Moved 11 stale Supabase and legacy/historical files (`ai/features-design.md`, `ops-auth-refresh-token-reuse-interval.md`, `ops-api-key-encryption-rotation.md`, `db-unused-index-analysis.md`, `API_CONFIGURATION.md`, `backend.md`, `technical-context.md`, `interview-feature-issues.md`, `openrouter2-deployment.md`, `e2e-wiseresume-report.md`, `SECURITY_FIXES_SUMMARY.md`) to `archive/legacy-docs/` or `archive/historical-audits/` via `git mv`.
- **Organized Archive Root Files**: Moved 20 loose `.md` audit/legacy files directly under `archive/` root into `archive/historical-audits/` and `archive/legacy-docs/` via `git mv` and prepended `[!CAUTION]` historical disclaimers to all 31 moved files.
- **Relocated Misplaced Feature Plans**: Moved `features/interview-feature-fix-plan.md` to `features/plans/interview-feature-fix-plan.md` via `git mv`.
- **Created Missing Living Specs**: Created canonical living specs for `ai/ai-gateway.md` (server-side Appwrite AI function proxy & authorization boundary) and `qa/PLAYWRIGHT_E2E_SUITE.md` (Playwright & Vitest test suite spec).
- **Fixed Links & Source Map**: Fixed broken link in `features/tailoring-hub.md` and updated `SOURCE_OF_TRUTH_MAP.md` to reflect all subdirectories and living specs.
- **Strict Guardrails Followed**: Docs-only pass. Zero application code modified (`src/`, `api/`, `server/`, `appwrite-hubs/`), zero config files touched, zero executable test code touched, zero machine reports touched, zero deployments.

---

## 2026-07-03 - Final Atlas Hygiene Polish (Phase 2D)

- **Archived Historical LINK_ISSUES.md**: Moved historical link audit matrix `Project Atlas/LINK_ISSUES.md` to `Project Atlas/archive/historical-audits/LINK_ISSUES.md` via `git mv`.
- **Source-of-Truth Inventory Completed**: Updated `Project Atlas/SOURCE_OF_TRUTH_MAP.md` to include explicit mappings for `ai/ai-gateway.md`, `security/`, `general/CONTRIBUTING.md`, `_templates/`, and archived `LINK_ISSUES.md`.
- **Control Files Preserved**: Re-confirmed `MASTER_HANDOVER_2026.md` and `DECISIONS.md` remain in `Project Atlas/` root as core control/history files.
- **Validation**: Docs-only, zero application code changed, zero scripts/workflows touched, zero package/config changes, zero deployments.

---

## 2026-07-03 - Routing Rules, Handover State, and Skills System Scaffold (Phase 2B)

- **Master Document Routing Rules**: Created `Project Atlas/ATLAS_ROUTING_RULES.md` establishing explicit document placement matrices, root hygiene rules, and file type definitions for AI agents.
- **Active Operational Handover State**: Created `Project Atlas/WHERE_WE_STOPPED.md` capturing verified system snapshot, latest commits, active focus, next tasks, blocked items, and do-not-reopen constraints.
- **AI Agent Skills System**: Created `Project Atlas/skills/` directory containing 12 modular skill playbooks (`README.md`, `SKILLS_INDEX.md`, `agent-bootstrap.md`, `new-code-quality.md`, `feature-implementation.md`, `ui-visual-implementation.md`, `appwrite-safe-change.md`, `ai-gateway-safe-change.md`, `qa-validation.md`, `security-review.md`, `documentation-closeout.md`, `skillkit-optional-setup.md`).
- **Folder README Scaffolds**: Created README files for `assets/`, `prompts/`, `operations/`, `decisions/`, and `temp/` defining contents, boundaries, and cleanup rules.
- **Navigation Pointers Updated**: Updated `README.md`, `MASTER_HANDBOOK.md`, `RULES.md`, and `SOURCE_OF_TRUTH_MAP.md` to integrate `ATLAS_ROUTING_RULES.md`, `WHERE_WE_STOPPED.md`, and `skills/`.
- **Validation**: Zero application code changed, zero scripts or workflows touched, zero package/config changes, zero deployments, zero file moves.

---

## 2026-07-03 - QA & Test Suite Classification and Routing Rules

- **Classification Pass**: Audited root `tests/` (`EXECUTABLE_TEST_CODE`) and `reports/` (`GENERATED_TEST_OUTPUT`).
- **QA Specs Created**: Created `Project Atlas/qa/test-suite-map.md` mapping executable test directories and `Project Atlas/qa/test-output-locations.md` governing machine-generated test outputs.
- **Routing Governance Enforced**: Updated `Project Atlas/RULES.md` and `Project Atlas/SOURCE_OF_TRUTH_MAP.md` explicitly requiring executable test code to remain in root `tests/`, machine outputs in root `reports/`, and human QA documentation in `Project Atlas/qa/`.
- **Validation**: Zero application code changed, zero test runner configs touched, zero deployments, zero file deletions.

---

## 2026-07-03 - Documentation Cleanup and Consolidation

- **Consolidated Documentation into Project Atlas**: Consolidated all scattered repository documentation and historical reports into `Project Atlas/` as the single documentation source of truth.
- **Master Changelog Integration**: Merged all historical session changelog entries (2026-06-20 through 2026-07-02) into `Project Atlas/CHANGELOG.md`.
- **Archive Governance**: Created `Project Atlas/archive/README.md` explicitly marking the archive as historical-only, non-canonical, and prohibited for AI agent decision-making unless explicitly requested by the owner.
- **Legacy Folder Archival**: Organized legacy pre-normalization folders (`00-Full-App-Reference`, `01-Currently Implemented`, `02-Planned`, `03-Ideas`, `03-Implemented`, `04-For You`, `05-Migration to Appwrite`, `claude-design-extraction`) into `Project Atlas/archive/legacy-atlas-folders/` and point-in-time audit folders into `Project Atlas/archive/historical-audits/`.
- **Validation & Integrity**: Verified zero application code changes, zero script/workflow changes, zero package/config changes, zero deployments, and zero permanent file deletions.

---

## 2026-07-03 - Living Docs Normalization Merged

- Merged `docs/atlas-living-docs-normalization` into `main`.
- Finalized Project Atlas living architecture, deployment, and feature documentation.
- Confirmed current docs now describe Appwrite-native architecture, Vercel frontend hosting, Appwrite Auth, and Appwrite `ai-gateway`.

---

## 2026-07-03 - Living Docs Normalization

- **Normalized Living Specs**: Created 9 living feature specs under `Project Atlas/features/` (`dashboard.md`, `portfolio.md`, `resume-editor.md`, `tailoring-hub.md`, `upload-import.md`, `preview-export.md`, `cover-letters.md`, `notifications.md`, `devkit-admin.md`).
- **Normalized Architecture Specs**: Created 5 living architecture specs under `Project Atlas/architecture/` (`overview.md`, `appwrite-architecture.md`, `frontend-architecture.md`, `data-model.md`, `auth-and-permissions.md`, `integrations.md`).
- **Separated Current Truth from Legacy**: Rewrote `overview.md` and `backend.md` to reflect current Appwrite-native architecture (`wiseresume.app`, Appwrite Databases/Storage/Functions, Vercel).
- **Categorized Reports**: Structured `Project Atlas/reports/` into clean subfolders (`ui-ux/`, `performance/`, `devkit/`, `landing/`, `historical-audits/`).
- **Updated Current Deployment Spec**: Created `Project Atlas/deployment/current-deployment.md` for Vercel/Appwrite and archived `legacy-hostinger-deployment-guide.md` to `Project Atlas/archive/`.
- **Master Handbook Alignment**: Updated `Project Atlas/MASTER_HANDBOOK.md` and `Project Atlas/SOURCE_OF_TRUTH_MAP.md` to link directly to all normalized living specs.

---

## 2026-07-03 - Documentation consolidation foundation started

- **Core Atlas Foundation (Batch 1)**: Initiated the phased documentation consolidation to establish `Project Atlas/` as the single, clean, reliable documentation source of truth for WiseResume.
- **Master Handbook & Living Entry Point**: Created `Project Atlas/MASTER_HANDBOOK.md` as the living AI-agent operating manual and primary navigation entry point, while preserving `Project Atlas/MASTER_HANDOVER_2026.md` as the chronological session history log.
- **Verified Current State**: Created `Project Atlas/CURRENT_STATE.md` documenting the verified production stack (`wiseresume.app`, Appwrite-native backend, Appwrite Auth, Vercel frontend hosting, Appwrite `ai-gateway`, disabled billing).
- **Architectural Decision Records**: Created `Project Atlas/DECISIONS.md` logging key architectural ADRs (Appwrite-native choice, AI gateway routing, billing state, documentation consolidation strategy).
- **Master Inventory & Source Map**: Updated `Project Atlas/SOURCE_OF_TRUTH_MAP.md` mapping the workspace documentation files into clean Atlas subdirectories (`architecture/`, `features/`, `product/`, `ai/`, `design-system/`, `deployment/`, `qa/`, `security/`, `reports/`, `general/`, `archive/`).
- **Root Pointer Policy**: Updated root `README.md` to be a concise public pointer linking directly to `Project Atlas/MASTER_HANDBOOK.md`. Appwrite Function READMEs (`appwrite-hubs/**/README.md`) remain code-adjacent developer pointers.

---

## 2026-07-03 - Portfolio Notifications, Email Branding, and Bell Popover UX

- **Database Collection Security**: Enabled `documentSecurity: true` on `notifications`, `portfolio_visits`, and `portfolio_history` collections. This ensures document-level read permissions (e.g. `read("user:<ownerUserId>")`) set during document creation are enforced by Appwrite, resolving the issue where notifications and visitor history did not appear in the owner's UI.
- **Idempotent Setup Script**: Codified the collection security settings in `scripts/setup_portfolio_security.cjs` to make the configuration reproducible.
- **Branded Email Template**: Implemented a branded HTML email layout for `portfolio_contact` submissions in `appwrite-hubs/ai-gateway/src/main.js` with WiseResume colors (#9E1B22), visitor details, and a call-to-action button to check in-app notifications.
- **Bell Popover UX**: Implemented a YouTube-style Popover dropdown for the top-bar Bell icon in `src/components/layout/AppWorkspaceTopBar.tsx` for desktop users, featuring the 5 latest notifications with specialized type icons, unread badge, and a footer link to `/notifications`. Mobile Bell retains direct navigation behavior for safety.
- **Acceptance Status**: `VERIFIED_READY` (Manual verification successfully passed by the owner; contact form, branded emails, notifications, and Bell popover dropdown are fully working in production).

---

## 2026-07-03 - Portfolio Contact Form Turnstile Fix

- **Turnstile siteverify URL fix**: Identified and resolved the root cause of the Contact Form failures. The `ai-gateway` Appwrite function was incorrectly calling the non-existent `v1` Cloudflare Turnstile siteverify endpoint (`https://challenges.cloudflare.com/turnstile/v1/siteverify`), which returned HTTP 404 and caused the token validation to fail with `TURNSTILE_SITEVERIFY_FAILED`.
- **API Version Correction**: Corrected the endpoint URL to `https://challenges.cloudflare.com/turnstile/v0/siteverify` in `appwrite-hubs/ai-gateway/src/main.js`.
- **Infrastructure Validation**: Recomputed source hashes in `src/lib/devkit/sourceHashes.generated.json`. Verified Node.js syntax, TypeScript (`npx tsc --noEmit`), and production build (`npm run build`) all pass.
- **Appwrite Deployment**: Successfully ran GitHub Actions workflow "Deploy Appwrite Hubs" targeting only `ai-gateway` (Run ID: `28626574102`, Job ID: `84894323958`), resulting in a successful deployment.
- **Verdict**: `VERIFIED_READY` (Turnstile fix verified via successful form submission by the owner in production).

---

## 2026-07-03 - Secure OTP Password Reset System Implementation & Verification

- **OTP-Based Authentication Flow**: Implemented a secure, OTP-based password reset system, replacing the previous vulnerable link-based flow.
- **Backend Service Implementation** (`email-service`): Added actions `send-password-reset-otp`, `verify-password-reset-otp`, and `reset-password-with-otp` in the Appwrite serverless function. Includes timing-safe HMAC verification of OTP and challenge tokens, and lockout limits (5 attempts) to prevent brute-forcing.
- **Appwrite Schema Setup**: Created an idempotent schema setup script `scripts/setup_password_reset_otps_schema.cjs` configuring the server-only `password_reset_otps` collection with no client read/write permissions (`permissions: []`).
- **Secret Propagation & Deployment**: Registered a cryptographically secure `PASSWORD_RESET_OTP_SECRET` on Appwrite and GitHub Actions. Ran targeted GitHub Actions deploy run `28620551054` for `email-service`, completing successfully.
- **Frontend Integration**: Updated `AuthBold.tsx`, `AuthPage.tsx`, and settings page components to show secure OTP inputs, prevent account enumeration, and support prefilled email redirects upon password reset from settings.
- **Production E2E Verification**: Successfully executed live E2E tests covering: reset requests, OTP delivery, incorrect OTP rejection, successful reset path, login verification, old password rejection, challenge reuse protection, old link rejection, and settings signout redirects. Test accounts were cleanly purged from database after testing.
- **Verdict**: `FULLY VERIFIED`.

---

## 2026-07-02 - Fix Portfolio Contact and Notification flows

- **Turnstile Error Recovery** (`PortfolioContactForm.tsx`): resolved the issue where verification gets stuck requiring a page refresh by adding a 6-second timeout watchdog that resets and recovers the Turnstile widget cleanly. Removed console debug statements.
- **Notification Schema Fallback** (`ai-gateway`, `public-share`): implemented a link-retry fallback in the Appwrite function notifications helper. If the live database notifications collection schema is missing the `link` attribute, the creation retry automatically strips the attribute and writes the notification successfully, preventing silent delivery failures.
- **Portfolio Visit Tracking Permissions** (`api/track-portfolio-view.ts`): reordered the tracking backend to resolve the owner user ID first, write the visit document with owner-only read permissions (`Permission.read(Role.user(ownerUserId))`), and trigger the `portfolio_visit` notification.
- **Unread Badge & Notifications UI** (`AppWorkspaceTopBar.tsx`, `NotificationsPage.tsx`): added a Bell icon and unread indicator badge to the authenticated app top bar, wired 7 filter tabs (All, Unread, Visits, Interests, Messages, AI/Resume, System), and color-coded Lucide icons.
- **i18n & Test Parity** (`locales/en/app.json`, `locales/ar/app.json`, `NotificationsPage.tsx`, `publicPrivacyHardening.test.ts`): translated all fallback notification tabs and empty state strings to Arabic, populated both localization catalogs, verified full key parity, and updated security unit test expectations to support owner-only read permissions.
- **Validation**: `npx tsc --noEmit` passed, production build passed, 813 Vitest tests passed, hub syntax checks passed, and source hashes were regenerated.

---

## 2026-07-02 - Portfolio Production Tracing and Verification

- **Diagnostic Session Report:** Created a dedicated session report `WiseResume_Portfolio_Contact_Notifications_Session_2026-07-02.md` detailing the production debugging and verification findings.
- **Vercel Cache Invalidation:** Added a hidden JSX cache buster element in `src/App.tsx` to force Vite to generate a new entry point hash, successfully bypassing the Vercel Edge CDN cache.
- **Production Console Logs:** Discovered that Vite minification config (`esbuild.pure`) strips `console.log` statements in production. Migrated diagnostic logs in `usePortfolioTracking.ts` and `PublicPortfolioPage.tsx` to `console.warn` to preserve them.
- **Automated Verification:** Created and updated Playwright E2E spec `tests/e2e/specs/28-portfolio-production-tracing.spec.ts` which verified visit tracking and "I'm Interested" clicks successfully in production.
- **Appwrite Database Audit:** Confirmed visit and interest document creation, and the generation of unread owner notifications in the Appwrite production database.
- **Current Status:** `READY_WITH_BLOCKERS`. The public portfolio Contact Form remains blocked on Cloudflare Turnstile captcha validation in production.

---

## 2026-07-02 - Enforce English-default application localization

- **Locale resolution** (`src/i18n/core.ts`): removed browser-language auto-selection. Locale precedence is now `/ar` route, explicit account preference, explicit persisted preference, then English.
- **Fallback safety** (`translate`): English calls no longer render Arabic caller fallbacks when an English catalog key is missing; missing copy resolves to a safe caller fallback or the key.
- **Catalog completion** (`locales/en/app.json`, `locales/en/wisehire.json`): added English copy for Upload, Portfolio, saved jobs, workspace navigation, application tracking, Import Job, validation, and toast/error surfaces. Arabic parity entries preserve explicit Arabic mode.
- **Raw copy cleanup** (`UploadPage`, `ApplicationsPage`, `ImportJobSheet`, `AppWorkspaceTopBar`): replaced unguarded Arabic UI copy and repaired Profile/Templates page titles.
- **Locale-aware dates** (`TailoringHubLanding`): dates now use the application locale instead of the browser locale.
- **Regression coverage**: added static English-catalog coverage, critical-surface checks, locale precedence/fallback tests, and Tailoring Hub date tests.
- **Production verification**: an `ar-AE` browser without a saved choice defaulted to English/LTR. Ten authenticated English routes showed zero app-owned Arabic copy. Vercel deployment `dpl_DBgj7huV93ctRSDHq3dUWz7i2e1b` reached `READY`.
- **Infrastructure**: no backend, Appwrite, auth, AI, payment, schema, or permission changes.

---

## 2026-07-02 - Complete final file evidence and repair native PDF layout

- **Native PDF pagination** (`api/export/pdf-native.ts`, `server/index.ts`): stopped treating the full-page layout sentinel as trimmed content height, preventing footer-only second pages on short resumes.
- **Fixed-width template export** (`src/lib/exportDomUtils.ts`): fit cloned descendants that match the source template width to the native PDF canvas, preventing horizontal text clipping when an 816px template is exported at 612px.
- **Regression coverage** (`pdfNativeTrimmedHeight.test.ts`, `exportDomUtils.test.ts`): locked both failure modes with focused tests.
- **Production evidence**: fresh PDF and DOCX uploads parsed successfully; Designed PDF (28,441 bytes), ATS PDF (29,165 bytes), and DOCX (8,277 bytes) were captured from real browser downloads. Both PDFs are one visually complete page and the DOCX is a valid 20-entry package.
- **Deployment**: Vercel production deployment `dpl_65gKMajyQgySLU81CRCugoC9trHZ` for commit `8a0be13f` reached `READY` and was reverified at `wiseresume.app`.
- **Readiness**: final verdict `LAUNCH_READY`; automated contact submission remains unproven because Turnstile rejected the automation environment while the UI failed closed with clear guidance.

---

## 2026-07-02 - Repair Tailoring history and honest Arabic public content

- **Tailoring persistence** (`TailoringHubPage`, `useCombinedTailorHistory`, `TailoringHubResultPage`, `tailoringResumeMetadata`): removed the unauthorized browser write to the server-only `tailor_history` collection, persisted compact lineage/result metadata in the tailored resume customization field, synthesized cross-device history from resume documents, and retained legacy history as a read fallback.
- **Arabic public routes** (`GuidesPage`, `GuidePage`, `ExamplesPage`): replaced English content rendered under Arabic RTL routes with explicit Arabic review-status shells while leaving English routes unchanged.
- **Regression coverage**: added metadata mapping/preservation and Arabic/English route behavior tests. TypeScript, production build, 14 focused tests, and whitespace validation passed.
- **Production QA**: fresh logout/login, invalid-login feedback, session refresh, education, skills, and autosave passed. Fresh file upload and export artifacts remain blocked by browser attachment/download capture limitations.
- **Deployment**: Vercel production deployment `dpl_Gtfc8YqNuSLZqontqbQBGjdpURsa` reached `READY`; live Arabic guide, guide-detail, and example routes displayed the reviewed Arabic shell.

---

## 2026-07-02 - Fresh credentialed end-to-end QA follow-up

- **Auth/session** (`https://wiseresume.app`): verified invalid-login inline feedback, fresh login, refresh persistence, logout, and a second successful login with the QA account.
- **Resume and AI** (`CreateResumeDialog`, Editor, AI summary enhancement): created `QA Launch Readiness 2026-07-02`, persisted a summary and experience after refresh, applied a substantive AI summary improvement, and confirmed the Premium credit state remained `Unlimited` before and after the action.
- **Tailoring Hub** (`/tailoring-hub`, `/tailoring-hub/result/6a459e7c002c3d85f954`): produced a materially changed tailored resume (50 to 85, +35), verified refresh/direct URL persistence and legacy `/tailor`; production displayed an explicit warning that Tailoring history storage is broken.
- **Portfolio** (`/portfolio`, `/p/explore-test-123-updated-001`): published successfully, verified public rendering, temporary password protection, wrong/correct password behavior, restored public access, and found no owner email, `user_id`, `password_hash`, or `portfolio_settings` strings in the public DOM.
- **Readiness**: recorded `NOT_READY`. `/ar/guides` and `/ar/examples` remain English under RTL; fresh PDF/DOCX file evidence and file-upload parsing were not completed in the in-app browser; the public contact security challenge was blocked by the browser environment with clear recovery messaging.

---

## 2026-07-02 - Comprehensive post-fix QA verification

- **Production smoke QA** (`https://wiseresume.app`): verified the homepage, authenticated dashboard, upload, editor, Tailoring Hub, preview, guides, examples, and mobile layouts at 390x844. Public guide/example content populated after asynchronous initialization and protected routes loaded in the existing QA session.
- **Runtime settings** (`/api/app-settings`): confirmed HTTP 200 with a JSON response on production.
- **Validation**: `npx tsc --noEmit`, `npm run build`, 132 Vitest files / 768 tests, `test:i18n`, and `test:i18n:coverage` passed. Repository-wide lint remains a pre-existing baseline failure (256 errors, 180 warnings), including generated `.vercel` output, fixtures, and existing source findings.
- **Scope**: no product or Appwrite hub code changed; no Appwrite deployment was required. Existing July 1 real-file export evidence remains current for Designed PDF (101,012 bytes), ATS PDF (25,367 bytes), and DOCX (8,109 bytes).

---

## 2026-07-01 - Restore live settings and Arabic PDF rendering

- **Vercel settings endpoint** (`api/app-settings.ts`): changed the shared runtime import to the Node/Vercel ESM-compatible `.js` specifier. A focused packaging regression test now rejects the extensionless import that caused production `ERR_MODULE_NOT_FOUND` responses.
- **Arabic server PDFs** (`src/lib/nativePdfGenerator.ts`): embedded the Noto Sans Arabic webfont assets into Arabic export HTML and forced that font across localized template descendants, preventing template-specific Open Sans rules from dropping Arabic glyphs in Vercel Chromium.
- **Verification**: TypeScript, production build, 132 test files / 768 tests, 17 focused export tests, and both i18n scripts passed. Production deployment `dpl_5vMBz2ZdkUFHDpWxwASFcW1EUmQU` produced real clean-browser downloads: Designed PDF (101,012 bytes), ATS PDF (25,367 bytes), and DOCX (8,109 bytes). Both PDFs were rendered and visually inspected with connected, correctly ordered Arabic and mixed Latin terms.
- **Safety**: no Appwrite deployment or Appwrite environment/schema/permission change was made.

---

## 2026-07-01 - Reliable exports and complete Arabic public flows

- **Export truthfulness** (`src/lib/downloadUtils.ts`, preview/editor/tailoring/dashboard export paths): replaced optimistic download handling with explicit triggered/cancelled/failed outcomes, rejected empty or malformed PDF/DOCX artifacts, and stopped success feedback when a trigger fails. URL export actions now wait for resume bootstrap and require a user-activated download CTA because timer-driven browser downloads can be silently blocked.
- **Arabic product completion** (`src/i18n/legalContent.ts`, landing demos, Settings catalogs): added coherent Arabic privacy/terms content, locale-specific landing mock data and right-origin card animation, document-locale propagation through PDF/DOCX exports, and repaired Settings labels found during browser QA. Arabic legal copy is technically complete but remains `OWNER/LEGAL REVIEW NEEDED` before launch.
- **Public content routing** (`src/AppInterior.tsx`): moved English guides, guide details, and examples outside authentication and `AppShell`, matching their Arabic public routes while preserving error boundaries and loading fallbacks.
- **Verification**: TypeScript, production build, 130 test files / 766 tests, focused Preview tests, and both existing i18n scripts passed. Browser QA produced and inspected real Designed PDF (158,029 bytes), ATS PDF (54,984 bytes), and DOCX (8,109 bytes) files for an Arabic resume; PDF glyphs rendered correctly and DOCX contained the required package entries plus RTL markup.

---

## 2026-06-30 - Keep resume edits, templates, and imported bullets consistent

- **Resume selection state** (`src/store/resumeStore.ts`, `src/components/dashboard/ResumeListCard.tsx`): loading a resume now synchronizes its saved template, while dashboard PDF actions open an ID-addressed authoritative preview instead of overwriting the active resume with a stale list snapshot.
- **Preview template flow** (`src/pages/PreviewPage.tsx`, `src/components/editor/TemplateSelector.tsx`): URL previews always fetch the requested resume, bootstrap once per resume, wait for authoritative data before export, and persist template changes without the bootstrap effect reverting them.
- **Imported experience content** (`src/components/editor/ExperienceItem.tsx`, `src/components/templates/WiseResumeClassicTemplate.tsx`): exposed imported achievements/responsibilities as editable newline-separated highlights and made WiseResume Classic render the editable description together with those highlights.
- **Regression coverage** (`PreviewPage.test.tsx`, `EditorComponents-D2.test.tsx`, `WiseResumeClassicTemplate.test.tsx`, `resumeStore.template.test.ts`): covered same-ID refresh, non-reverting/persisted template selection, template synchronization, visible imported bullets, and Classic description rendering.

---

## 2026-06-30 - Restore production PDF function startup

- **Vercel PDF endpoint** (`api/export/pdf-native.ts`): changed the shared SSRF guard import to an explicit `.js` runtime specifier so Node.js can resolve the compiled module inside the Vercel serverless function bundle.
- **Chromium packaging** (`api/export/pdf-native.ts`): replaced the dependency-hiding indirect import with a statically traceable Chromium import, ensuring Vercel includes the package and its compressed browser binaries in the PDF function.
- **Regression coverage** (`src/lib/security/pdfNativeRuntimeImports.test.ts`): added a packaging contract that rejects extensionless relative runtime imports in the PDF function.
- **Verification**: reproduced both production startup failures (`ERR_MODULE_NOT_FOUND` for the shared guard and the missing `@sparticuz/chromium` package), passed the focused regression tests, generated the production Vercel bundle, and confirmed the deployed-function artifact contains Chromium's package metadata and compressed executable assets.

---

## 2026-06-30 - Accurate DevKit analytics and signup administration

- **Analytics contracts** (`appwrite-hubs/admin-visitor-analytics/src/metrics.cjs`, `admin-visitor-analytics/src/main.js`): added Cairo-day boundaries, distinct session/page-view/visitor/authenticated-user metrics, completeness metadata, session detail, retention aggregation, and 90-day raw-event cleanup.
- **Auth-backed signups and user queries** (`appwrite-hubs/admin-devkit-data/src/user-query.cjs`, `admin-devkit-data/src/main.js`): added `list-signups`/`signup-summary`, global server-side search/filter/sort, Appwrite Auth signup totals, attribution enrichment, and analytics identity cleanup during account deletion.
- **DevKit UI** (`AnalyticsPanel.tsx`, `AdminSignupsPanel.tsx`, `AdminUsersPanel.tsx`): replaced ambiguous KPI fallbacks with six source-labelled metrics, partial-data warnings and drill-downs; added Users > Signups with date, verification, profile, resume and search filters.
- **Tracking and schema** (`visitorTrack.ts`, `track-visitor-event`, `setup_visitor_events_schema.cjs`, `setup_admin_analytics_schema.cjs`): added privacy state fields, feature-gated persistent pre-consent identity, HMAC identity links, visitor aggregate collections, retention fields and indexes.
- **Verification**: added focused hub tests for Cairo boundaries, metric semantics, global user queries, privacy metadata, HMAC identity handling, bot exclusion and rate limiting; `npm run build` passed and the full Vitest suite completed with 744 passed, 1 todo, and 1 skipped.

---

## 2026-06-30 - Arabic authenticated-app recovery sweep

- **Arabic recovery pass** (`src/pages/*`, `src/components/*`, `locales/ar/*`): repaired broken Arabic catalog values, removed `????`/corrupted key values from critical authenticated-app surfaces, and normalized the highest-impact settings, profile, applications, upload/import, portfolio editor, dashboard, and WiseHire shell UI onto `useLocale()` + `t(...)`.
- **Dynamic localization leaks** (`src/components/dashboard/*`, `src/components/jobs/*`, `src/components/job-match/*`, `src/components/wise-workspace/*`, `src/lib/dateUtils.ts`): localized helper-driven labels, imported-job widgets, saved-job dialogs/lists, top-bar and workspace AI labels, and made relative-time rendering respect Arabic mode instead of defaulting to English.
- **Guardrails** (`scripts/check-arabic-coverage.mjs`, `src/i18n/__tests__/criticalArabicCoverage.test.ts`): added a targeted Arabic coverage audit and representative render coverage for critical authenticated surfaces so obvious English literals are caught before they regress.
- **Verification**: `npm run test:i18n`, `npm run test:i18n:coverage`, `npm run test -- src/i18n/__tests__/criticalArabicCoverage.test.ts`, and `npm run build` all passed on June 30, 2026.
- **Residual scope**: broader repo-wide English still remains outside this recovered critical path, especially in lower-priority pages and auxiliary AI/interview/supporting components; those areas need a follow-up Arabic completion pass.

---

## 2026-06-29 - Arabic locale and RTL export foundation

- **Locale architecture** (`src/i18n/`, `locales/`): added English/Arabic catalogs, locale resolution and persistence, global `lang`/`dir`, bidirectional text helpers, public `/ar/...` routes, settings/landing language controls, and Appwrite `user_preferences` synchronization.
- **CV document locale** (`src/types/resume.ts`, `src/i18n/resumeLocale.ts`): added a per-CV `documentLocale` independent from UI language and locale/font-aware page-cut fingerprints with legacy English fallback.
- **Templates and exports** (`src/i18n/localizeResumeTemplate.ts`, PDF/DOCX/LaTeX generators): added Noto Sans Arabic, RTL heading localization across registered templates, Chromium Arabic PDF/cover-letter rendering, RTL DOCX defaults and LTR contact runs, and XeLaTeX Arabic output while retaining English pdflatex output.
- **Public/auth communications**: added Arabic landing/auth copy, localized metadata and `hreflang`, locale-aware auth callbacks, and Arabic transactional verification/reset/welcome/security emails.
- **Quality gates** (`scripts/check-i18n.mjs`, `docs/localization/ar-terminology.md`): added catalog parity, placeholder, empty-value, untranslated-value checks, approved terminology, and focused RTL/export regression coverage.

---

## 2026-06-29 - Public landing route and social preview reliability

- **Landing route** (`src/pages/Index.tsx`, `src/App.tsx`): preserved `/` and `/enterprises` as public `AppLanding` routes for authenticated and unauthenticated visitors; account-type redirects remain limited to protected product routes.
- **Social metadata** (`index.html`): made the WiseResume Open Graph and X image metadata static, added `image/png` and X alt metadata, and aligned the declared `1280x672` dimensions with `public/wiseresume-og.png`.
- **Regression coverage** (`src/lib/__tests__/socialPreviewMetadata.test.ts`, `src/pages/__tests__/landingRouteContract.test.ts`): added crawler-visible metadata, PNG-dimension, and public-route contracts.

---

## 2026-06-21 - Final autonomous QA readiness

- **Job Import**: updated `appwrite-hubs/job-import/src/main.js` so URL job imports prefer DeepSeek before Groq/OpenRouter fallbacks.
- **Regression test**: added `tests/hubs/job-import-routing.test.cjs` to verify `job-import` remains DeepSeek-first.
- **Source hashes**: updated `src/lib/devkit/sourceHashes.generated.json` with `job-import` hash `c00d55c1f5ff8c8ed5bd6179d08928e6f81da4140cfa3e044b68e1b5fa964618`.
- **Deployment**: pushed commit `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`; Vercel production succeeded and official Appwrite workflow run `27884437136` deployed `job-import` as `6a37068e5b8ff5226838`.
- **Readiness status**: recorded `BLOCKED_EXTERNAL_ACCESS` because `PORTFOLIO_JWT_SECRET` is missing from required live functions and safe test credentials were unavailable for authenticated browser QA.

---

## 2026-06-20 - Post-fix deployment readiness

- **Production deployment**: pushed `ba523905b2e57dfe75cc6696a9277efeee51578f` to `origin/main` and verified the Vercel production deployment at `https://wise-resume-1hvl3wy6z-iam-magdy.vercel.app`.
- **Appwrite hubs**: ran the official `Deploy Appwrite Hubs` workflow with target `get-public-portfolio,verify-portfolio-password,ai-gateway`; run `27883728138` completed successfully.
- **Function readiness**: confirmed ready deployments for `get-public-portfolio` (`6a36ff71461f294e1ce4`), `verify-portfolio-password` (`6a36ff80ae087936f7bb`), and `ai-gateway` (`6a36ff8e7cbdd33d3ea5`).
- **Verification**: TypeScript, portfolio password regression test, AI Gateway routing test, targeted Vitest suite, source-hash generation, whitespace check, and production build all passed.
- **Readiness status**: recorded `DEPLOYED_PENDING_MANUAL_QA`; manual/browser QA, `PORTFOLIO_JWT_SECRET` verification, and TestSprite rerun remain required before launch readiness.

---

## 2026-06-20 - Portfolio unlock and AI routing alignment

- **Portfolio unlock**: updated `get-public-portfolio` and `verify-portfolio-password` to verify the bcrypt hashes written by `PortfolioEditorPage`, while preserving legacy raw SHA-256 and `sha256:` password hashes.
- **Portfolio safety**: protected portfolios now fail closed when protection is enabled but the stored hash is missing; public portfolio responses still do not expose `password_hash`.
- **AI Gateway**: fixed `tailor-resume` structured normalization so existing IDs are preserved, company/title matching can map reordered experience entries correctly, omitted originals are appended, and the AI-returned order is not re-sorted away.
- **DevKit catalogue**: aligned `resume-section-ai` with the gateway DeepSeek default route.
- **Navigation**: updated dashboard/search/discovery/job-detail entry points to prefer `/tailoring-hub` while keeping legacy `/tailor` routes available.
- **Verification**: targeted hub tests, DevKit/search Vitest tests, and hub syntax checks passed; full build/source-hash validation was run before commit.

---

## 2026-06-20 - DevKit live audit follow-up fixes

- **Email Automations**: updated `admin-email` and the DevKit Email Automations panel to use Resend Segments (`RESEND_SEGMENT_ALL_USERS`) with legacy Audience fallback (`RESEND_AUDIENCE_ALL_USERS`) instead of failing hard when the old audience variable is absent.
- **Diagnostics**: fixed DevKit diagnostics so the deployed Admin Sentry function is recognized by its real Appwrite function id while still reporting it as `admin-sentry`.
- **User cleanup**: made DevKit user deletion remove owned `subscriptions`, `ai_credits`, and `notifications` rows before deleting the profile/auth user, and tolerate already-missing auth users.
- **Deploy wiring**: propagated Resend segment/audience variables through the GitHub Appwrite hub deploy workflow and deploy script, then refreshed DevKit source hashes.
- **Verification**: `node --check` passed for changed Appwrite hubs, targeted DevKit ESLint passed, and `npm run build` passed.

---

## 2026-06-20 - DevKit visual shell wiring cleanup

- **DevKitUI** (`src/components/dev-kit/DevKitUI.tsx`): restored the shared DevKit helper module deleted in the visual refresh, preserving `DevKitLoading`, `DevKitMetricCard`, `DevKitSection`, and `DevKitTabBar` exports required by `AdminUsersPanel`, `OverviewPanel`, and `GrowthTrafficPanel`.
- **DevKit shared styling** (`src/components/dev-kit/DevKitUI.tsx`): aligned restored helpers with the Phase 1 dark DevKit shell using subtle borders, black translucent surfaces, status color accents, and responsive tab controls.
- **Verification**: confirmed TypeScript and targeted DevKit ESLint checks pass for `DevKitUI.tsx`, `DevToolsPage.tsx`, `HomePanel.tsx`, `DiagnosticsPanel.tsx`, `EmailHubPanel.tsx`, `FeatureFlagsPanel.tsx`, and `AICommandCenterPanel.tsx`.
