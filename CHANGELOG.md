# Changelog

## 2026-06-21 - Final autonomous QA readiness

- **Job Import**: updated `appwrite-hubs/job-import/src/main.js` so URL job imports prefer DeepSeek before Groq/OpenRouter fallbacks.
- **Regression test**: added `tests/hubs/job-import-routing.test.cjs` to verify `job-import` remains DeepSeek-first.
- **Source hashes**: updated `src/lib/devkit/sourceHashes.generated.json` with `job-import` hash `c00d55c1f5ff8c8ed5bd6179d08928e6f81da4140cfa3e044b68e1b5fa964618`.
- **Deployment**: pushed commit `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`; Vercel production succeeded and official Appwrite workflow run `27884437136` deployed `job-import` as `6a37068e5b8ff5226838`.
- **Readiness status**: recorded `BLOCKED_EXTERNAL_ACCESS` because `PORTFOLIO_JWT_SECRET` is missing from required live functions and safe test credentials were unavailable for authenticated browser QA.

## 2026-06-20 - Post-fix deployment readiness

- **Production deployment**: pushed `ba523905b2e57dfe75cc6696a9277efeee51578f` to `origin/main` and verified the Vercel production deployment at `https://wise-resume-1hvl3wy6z-iam-magdy.vercel.app`.
- **Appwrite hubs**: ran the official `Deploy Appwrite Hubs` workflow with target `get-public-portfolio,verify-portfolio-password,ai-gateway`; run `27883728138` completed successfully.
- **Function readiness**: confirmed ready deployments for `get-public-portfolio` (`6a36ff71461f294e1ce4`), `verify-portfolio-password` (`6a36ff80ae087936f7bb`), and `ai-gateway` (`6a36ff8e7cbdd33d3ea5`).
- **Verification**: TypeScript, portfolio password regression test, AI Gateway routing test, targeted Vitest suite, source-hash generation, whitespace check, and production build all passed.
- **Readiness status**: recorded `DEPLOYED_PENDING_MANUAL_QA`; manual/browser QA, `PORTFOLIO_JWT_SECRET` verification, and TestSprite rerun remain required before launch readiness.

## 2026-06-20 - Portfolio unlock and AI routing alignment

- **Portfolio unlock**: updated `get-public-portfolio` and `verify-portfolio-password` to verify the bcrypt hashes written by `PortfolioEditorPage`, while preserving legacy raw SHA-256 and `sha256:` password hashes.
- **Portfolio safety**: protected portfolios now fail closed when protection is enabled but the stored hash is missing; public portfolio responses still do not expose `password_hash`.
- **AI Gateway**: fixed `tailor-resume` structured normalization so existing IDs are preserved, company/title matching can map reordered experience entries correctly, omitted originals are appended, and the AI-returned order is not re-sorted away.
- **DevKit catalogue**: aligned `resume-section-ai` with the gateway DeepSeek default route.
- **Navigation**: updated dashboard/search/discovery/job-detail entry points to prefer `/tailoring-hub` while keeping legacy `/tailor` routes available.
- **Verification**: targeted hub tests, DevKit/search Vitest tests, and hub syntax checks passed; full build/source-hash validation was run before commit.

## 2026-06-20 - DevKit live audit follow-up fixes

- **Email Automations**: updated `admin-email` and the DevKit Email Automations panel to use Resend Segments (`RESEND_SEGMENT_ALL_USERS`) with legacy Audience fallback (`RESEND_AUDIENCE_ALL_USERS`) instead of failing hard when the old audience variable is absent.
- **Diagnostics**: fixed DevKit diagnostics so the deployed Admin Sentry function is recognized by its real Appwrite function id while still reporting it as `admin-sentry`.
- **User cleanup**: made DevKit user deletion remove owned `subscriptions`, `ai_credits`, and `notifications` rows before deleting the profile/auth user, and tolerate already-missing auth users.
- **Deploy wiring**: propagated Resend segment/audience variables through the GitHub Appwrite hub deploy workflow and deploy script, then refreshed DevKit source hashes.
- **Verification**: `node --check` passed for changed Appwrite hubs, targeted DevKit ESLint passed, and `npm run build` passed.

## 2026-06-20 - DevKit visual shell wiring cleanup

- **DevKitUI** (`src/components/dev-kit/DevKitUI.tsx`): restored the shared DevKit helper module deleted in the visual refresh, preserving `DevKitLoading`, `DevKitMetricCard`, `DevKitSection`, and `DevKitTabBar` exports required by `AdminUsersPanel`, `OverviewPanel`, and `GrowthTrafficPanel`.
- **DevKit shared styling** (`src/components/dev-kit/DevKitUI.tsx`): aligned restored helpers with the Phase 1 dark DevKit shell using subtle borders, black translucent surfaces, status color accents, and responsive tab controls.
- **Verification**: confirmed TypeScript and targeted DevKit ESLint checks pass for `DevKitUI.tsx`, `DevToolsPage.tsx`, `HomePanel.tsx`, `DiagnosticsPanel.tsx`, `EmailHubPanel.tsx`, `FeatureFlagsPanel.tsx`, and `AICommandCenterPanel.tsx`.
