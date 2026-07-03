# Project Atlas Changelog

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

## 2026-07-02 - Portfolio Production Tracing and Verification

- **Diagnostic Session Report:** Created a dedicated session report `WiseResume_Portfolio_Contact_Notifications_Session_2026-07-02.md` detailing the production debugging and verification findings.
- **Vercel Cache Invalidation:** Added a hidden JSX cache buster element in `src/App.tsx` to force Vite to generate a new entry point hash, successfully bypassing the Vercel Edge CDN cache.
- **Production Console Logs:** Discovered that Vite minification config (`esbuild.pure`) strips `console.log` statements in production. Migrated diagnostic logs in `usePortfolioTracking.ts` and `PublicPortfolioPage.tsx` to `console.warn` to preserve them.
- **Automated Verification:** Created and updated Playwright E2E spec `tests/e2e/specs/28-portfolio-production-tracing.spec.ts` which verified visit tracking and "I'm Interested" clicks successfully in production.
- **Appwrite Database Audit:** Confirmed visit and interest document creation, and the generation of unread owner notifications in the Appwrite production database.
- **Current Status:** `READY_WITH_BLOCKERS`. The public portfolio Contact Form remains blocked on Cloudflare Turnstile captcha validation in production.
