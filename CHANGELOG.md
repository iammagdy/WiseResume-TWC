# Changelog

## 2026-07-01 - Reliable exports and complete Arabic public flows

- **Export truthfulness** (`src/lib/downloadUtils.ts`, preview/editor/tailoring/dashboard export paths): replaced optimistic download handling with explicit triggered/cancelled/failed outcomes, rejected empty or malformed PDF/DOCX artifacts, and stopped success feedback when a trigger fails. URL export actions now wait for resume bootstrap and require a user-activated download CTA because timer-driven browser downloads can be silently blocked.
- **Arabic product completion** (`src/i18n/legalContent.ts`, landing demos, Settings catalogs): added coherent Arabic privacy/terms content, locale-specific landing mock data and right-origin card animation, document-locale propagation through PDF/DOCX exports, and repaired Settings labels found during browser QA. Arabic legal copy is technically complete but remains `OWNER/LEGAL REVIEW NEEDED` before launch.
- **Public content routing** (`src/AppInterior.tsx`): moved English guides, guide details, and examples outside authentication and `AppShell`, matching their Arabic public routes while preserving error boundaries and loading fallbacks.
- **Verification**: TypeScript, production build, 130 test files / 766 tests, focused Preview tests, and both existing i18n scripts passed. Browser QA produced and inspected real Designed PDF (158,029 bytes), ATS PDF (54,984 bytes), and DOCX (8,109 bytes) files for an Arabic resume; PDF glyphs rendered correctly and DOCX contained the required package entries plus RTL markup.

## 2026-06-30 - Keep resume edits, templates, and imported bullets consistent

- **Resume selection state** (`src/store/resumeStore.ts`, `src/components/dashboard/ResumeListCard.tsx`): loading a resume now synchronizes its saved template, while dashboard PDF actions open an ID-addressed authoritative preview instead of overwriting the active resume with a stale list snapshot.
- **Preview template flow** (`src/pages/PreviewPage.tsx`, `src/components/editor/TemplateSelector.tsx`): URL previews always fetch the requested resume, bootstrap once per resume, wait for authoritative data before export, and persist template changes without the bootstrap effect reverting them.
- **Imported experience content** (`src/components/editor/ExperienceItem.tsx`, `src/components/templates/WiseResumeClassicTemplate.tsx`): exposed imported achievements/responsibilities as editable newline-separated highlights and made WiseResume Classic render the editable description together with those highlights.
- **Regression coverage** (`PreviewPage.test.tsx`, `EditorComponents-D2.test.tsx`, `WiseResumeClassicTemplate.test.tsx`, `resumeStore.template.test.ts`): covered same-ID refresh, non-reverting/persisted template selection, template synchronization, visible imported bullets, and Classic description rendering.

## 2026-06-30 - Restore production PDF function startup

- **Vercel PDF endpoint** (`api/export/pdf-native.ts`): changed the shared SSRF guard import to an explicit `.js` runtime specifier so Node.js can resolve the compiled module inside the Vercel serverless function bundle.
- **Chromium packaging** (`api/export/pdf-native.ts`): replaced the dependency-hiding indirect import with a statically traceable Chromium import, ensuring Vercel includes the package and its compressed browser binaries in the PDF function.
- **Regression coverage** (`src/lib/security/pdfNativeRuntimeImports.test.ts`): added a packaging contract that rejects extensionless relative runtime imports in the PDF function.
- **Verification**: reproduced both production startup failures (`ERR_MODULE_NOT_FOUND` for the shared guard and the missing `@sparticuz/chromium` package), passed the focused regression tests, generated the production Vercel bundle, and confirmed the deployed-function artifact contains Chromium's package metadata and compressed executable assets.

## 2026-06-30 - Accurate DevKit analytics and signup administration

- **Analytics contracts** (`appwrite-hubs/admin-visitor-analytics/src/metrics.cjs`, `admin-visitor-analytics/src/main.js`): added Cairo-day boundaries, distinct session/page-view/visitor/authenticated-user metrics, completeness metadata, session detail, retention aggregation, and 90-day raw-event cleanup.
- **Auth-backed signups and user queries** (`appwrite-hubs/admin-devkit-data/src/user-query.cjs`, `admin-devkit-data/src/main.js`): added `list-signups`/`signup-summary`, global server-side search/filter/sort, Appwrite Auth signup totals, attribution enrichment, and analytics identity cleanup during account deletion.
- **DevKit UI** (`AnalyticsPanel.tsx`, `AdminSignupsPanel.tsx`, `AdminUsersPanel.tsx`): replaced ambiguous KPI fallbacks with six source-labelled metrics, partial-data warnings and drill-downs; added Users > Signups with date, verification, profile, resume and search filters.
- **Tracking and schema** (`visitorTrack.ts`, `track-visitor-event`, `setup_visitor_events_schema.cjs`, `setup_admin_analytics_schema.cjs`): added privacy state fields, feature-gated persistent pre-consent identity, HMAC identity links, visitor aggregate collections, retention fields and indexes.
- **Verification**: added focused hub tests for Cairo boundaries, metric semantics, global user queries, privacy metadata, HMAC identity handling, bot exclusion and rate limiting; `npm run build` passed and the full Vitest suite completed with 744 passed, 1 todo, and 1 skipped.

## 2026-06-30 - Arabic authenticated-app recovery sweep

- **Arabic recovery pass** (`src/pages/*`, `src/components/*`, `locales/ar/*`): repaired broken Arabic catalog values, removed `????`/corrupted key values from critical authenticated-app surfaces, and normalized the highest-impact settings, profile, applications, upload/import, portfolio editor, dashboard, and WiseHire shell UI onto `useLocale()` + `t(...)`.
- **Dynamic localization leaks** (`src/components/dashboard/*`, `src/components/jobs/*`, `src/components/job-match/*`, `src/components/wise-workspace/*`, `src/lib/dateUtils.ts`): localized helper-driven labels, imported-job widgets, saved-job dialogs/lists, top-bar and workspace AI labels, and made relative-time rendering respect Arabic mode instead of defaulting to English.
- **Guardrails** (`scripts/check-arabic-coverage.mjs`, `src/i18n/__tests__/criticalArabicCoverage.test.ts`): added a targeted Arabic coverage audit and representative render coverage for critical authenticated surfaces so obvious English literals are caught before they regress.
- **Verification**: `npm run test:i18n`, `npm run test:i18n:coverage`, `npm run test -- src/i18n/__tests__/criticalArabicCoverage.test.ts`, and `npm run build` all passed on June 30, 2026.
- **Residual scope**: broader repo-wide English still remains outside this recovered critical path, especially in lower-priority pages and auxiliary AI/interview/supporting components; those areas need a follow-up Arabic completion pass.

## 2026-06-29 - Arabic locale and RTL export foundation

- **Locale architecture** (`src/i18n/`, `locales/`): added English/Arabic catalogs, locale resolution and persistence, global `lang`/`dir`, bidirectional text helpers, public `/ar/...` routes, settings/landing language controls, and Appwrite `user_preferences` synchronization.
- **CV document locale** (`src/types/resume.ts`, `src/i18n/resumeLocale.ts`): added a per-CV `documentLocale` independent from UI language and locale/font-aware page-cut fingerprints with legacy English fallback.
- **Templates and exports** (`src/i18n/localizeResumeTemplate.ts`, PDF/DOCX/LaTeX generators): added Noto Sans Arabic, RTL heading localization across registered templates, Chromium Arabic PDF/cover-letter rendering, RTL DOCX defaults and LTR contact runs, and XeLaTeX Arabic output while retaining English pdflatex output.
- **Public/auth communications**: added Arabic landing/auth copy, localized metadata and `hreflang`, locale-aware auth callbacks, and Arabic transactional verification/reset/welcome/security emails.
- **Quality gates** (`scripts/check-i18n.mjs`, `docs/localization/ar-terminology.md`): added catalog parity, placeholder, empty-value, untranslated-value checks, approved terminology, and focused RTL/export regression coverage.

## 2026-06-29 - Public landing route and social preview reliability

- **Landing route** (`src/pages/Index.tsx`, `src/App.tsx`): preserved `/` and `/enterprises` as public `AppLanding` routes for authenticated and unauthenticated visitors; account-type redirects remain limited to protected product routes.
- **Social metadata** (`index.html`): made the WiseResume Open Graph and X image metadata static, added `image/png` and X alt metadata, and aligned the declared `1280x672` dimensions with `public/wiseresume-og.png`.
- **Regression coverage** (`src/lib/__tests__/socialPreviewMetadata.test.ts`, `src/pages/__tests__/landingRouteContract.test.ts`): added crawler-visible metadata, PNG-dimension, and public-route contracts.

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
