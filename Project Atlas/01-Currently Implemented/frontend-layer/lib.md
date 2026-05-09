# Library (`src/lib/`)

**Last verified:** 2026-05-09
**Type:** reference card
**Sources:** `src/lib/` (≈90 root files + 6 subfolders).

**2026-05-09 changes:**
- `dateUtils.ts`: appended `safeFormatDate(value, fmt, fallback?)` and `safeFormatDistanceToNow(value, opts?, fallback?)` — null-safe wrappers around `date-fns` `format` / `formatDistanceToNow`. Both accept `string | number | Date | null | undefined` and return `fallback` (default `'—'`) instead of throwing `RangeError: Invalid time value` when the input is null, undefined, or unparseable.

**Batch 7 changes:**
- `planConfig.ts`: removed broken JSON import (`supabase/functions/_shared/creditLimits.json` deleted with supabase dir); credit limits now hardcoded (`free: 5`, `pro: 50`, `premium: Infinity`).
- `appwrite-collections.ts`: `BUCKETS` object now contains `avatars: 'avatars'` (provision this bucket in Appwrite Console with CORS `*`).

**Canonical owner:** `src/lib/` directory.

---

`src/lib/` is the cross-cutting utility layer. Group-by-purpose:

## AI helpers

- `ai/` — `parseAIResponse.ts`, `sanitizeContent.ts`, `fixHelpers.ts` (+ tests)
- `agenticChat.ts` — agentic flow client wrapper
- `aiAnalysis.ts`, `aiCostEstimates.ts`, `aiErrorParser.ts`, `aiFallbackToast.ts`, `aiTailor.ts`
- `applyAIResult.ts` — patch-application for AI-generated section edits
- `tailorMerge.ts` — conflict-free merge of AI tailor output into the active resume

## Plans, credits, rate limits

- `planConfig.ts` — `PLAN_CREDIT_LIMITS` (imports from `supabase/functions/_shared/creditLimits.json` — source of truth)
- `rateLimiter.ts` — client-side guard for in-page bursts

## API routing & fetch

- `apiFnUrl.ts` — DEV → `/api/fn/<n>`, PROD → `${SUPABASE_URL}/functions/v1/<n>` plus consolidated-router rewriting (legacy fn name → new router + `?action=` param)
- `apiFetch.ts` — fetch wrapper with auth header + auto-redirect on 401
- `edgeFunctions.ts` — typed `functions.invoke` wrapper; per-feature `USE_MERGED_*` flags

## PDF / DOCX / portfolio export

- `pdf/` — PDF text extraction subfolder: `textExtractor.ts` (with `Promise.withResolvers` polyfill + worker blob wrapper for iOS), `textPreprocessor.ts`, `sectionParsers.ts` (+ tests), `ocrExtractor.ts`
- `pdfGenerator.ts`, `pdfParser.ts`, `pdfUtils.ts`, `nativePdfGenerator.ts` (server-side via `export-resume-pdf` with browser print-to-PDF fallback)
- `exportResumePdf.ts` (+ test) — orchestrates resume export
- `coverLetterPdfGenerator.ts`, `companyBriefingPdf.ts`, `interviewSummaryPdfGenerator.ts`
- `docxGenerator.ts`, `latexGenerator.ts`
- `portfolioPrintLayout.ts`, `portfolioThemes.ts`, `portfolioUrl.ts`
- `html2canvasRetry.ts`, `downloadUtils.ts`, `dataExport.ts`

## Auth + Supabase plumbing

- `supabaseAuth.ts`, `supabaseBridge.ts`, `supabaseConstants.ts`
- `impersonationStore.ts` — sessionStorage-backed impersonation token + identity (consumed by `/act-as`)

## Resume / content

- `resumeCompletionRules.ts`, `resumeExamples.ts`, `sectionHelpers.ts` (+ test), `templateConfig.ts`, `templateCustomization.ts`, `templateData.ts`, `templateMigration.ts`
- `keywordExtractor.ts`, `jobMatchScorer.ts`, `jsonResumeValidator.ts`, `atsParserSimulation.ts`, `atsValidationChecks.ts`, `contentAnalysis.ts`, `contentLibrary.ts`, `skillCloud.ts`
- `careerPath.ts`, `curatedCourses.ts`, `educationFormat.ts`, `emptyStateExamples.ts`

## Smart Fit

- `smartFit/` — orchestrator + bullet-pruner + sentence scorer + section collapse + protected tokens + diff highlight + types (with test coverage). Used by `tailor-resume` smart-fit-rewrite phase.

## Editor session / logging

- `editorSession.ts` — session id + scratch-state lifecycle for the editor
- `editorLogger.ts` — structured editor-event logger

## Privacy / safety

- `piiRedact.ts` — masks identifying fields for WiseHire Bias Reduction Mode
- `sanitizeFileName.ts` — safe filename normalization
- `detectFileType.ts` — magic-byte sniff for upload validation

## Onboarding / migration

- `onboardingProfile.ts`, `accountBackup.ts`, `migrationRunner.ts`, `dbCleanup.ts`

## DevKit helpers (`src/lib/devkit/`)

- `aiTestSlotModels.ts` — slot-model lookup for the AI Test panel
- `devKitAuth.ts` — DevKit password + HMAC token issuance for smoke-tests
- `edgeResponse.ts` — common response normalizer for the Mission Control panel
- `errorTranslate.ts` — human-readable mapping of edge function errors
- `hooks.ts`, `sampleResume.ts`

## WiseHire helpers (`src/lib/wisehire/`)

- `briefPdfExport.ts` — interview brief PDF
- `inviteTokenClient.ts` — HMAC-signed invite token validation client
- `pipelineDragDrop.ts` — drag-and-drop ordering helpers for the pipeline view
- `wisehireAccessClient.ts` — typed wrapper around the `wisehire-access` consolidated router

## Misc utilities

- `dateUtils.ts` (+ test), `diffUtils.ts` (+ test), `urlUtils.ts`, `utils.ts` (+ test), `envUtils.ts`, `errorToast.ts`
- `monitoring.ts` (Sentry init), `reportWebVitals.ts`, `auditLogger.ts`, `bugReport.ts`, `captureErrorShim.ts` (global error capture for crash reports)
- `referralData.ts`, `qr-presets.ts`, `pageTitles.ts`, `navigation.ts` (+ test)
- `haptics.ts`, `openExternal.ts`, `shareUtils.ts`, `sendFeedback.ts`
- `lazyWithRetry.ts`, `preloadLazy.ts`, `discoveryManager.ts`, `persistedQueryCache.ts`
- `usePrefersReducedMotion.ts` (hook lives here for legacy reasons)
- `activityTracker.ts` — per-user activity heartbeat
- `visitorTrack.ts` — anonymous visitor event sender (calls `track-visitor-event`)
- `guidesData.ts` — static guides catalog

## Testing

Co-located `.test.ts` files run via Vitest. Snapshot tests in `__tests__/__snapshots__/`.

## Hard rule

Anything that touches credit deduction, the AI cascade, or rate limits has **server-side** authority. `src/lib/` mirrors are convenience only — they must never be the enforcement layer.
