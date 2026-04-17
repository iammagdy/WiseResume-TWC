# Library (`src/lib/`)

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:** `src/lib/`, `replit.md`, `project-governance/ARCHITECTURE.md`.

**Canonical owner:** `src/lib/` directory.

---

`src/lib/` is the cross-cutting utility layer. Group-by-purpose:

## AI helpers
- `ai/` — prompt-building helpers (subfolder)
- `agenticChat.ts` — agentic flow client wrapper
- `aiAnalysis.ts`, `aiCostEstimates.ts`, `aiErrorParser.ts`, `aiFallbackToast.ts`, `aiProvider.ts`, `aiTailor.ts`
- `companyBriefingPdf.ts`, `interviewSummaryPdfGenerator.ts`

## Plans, credits, and rate limits
- `planConfig.ts` — `PLAN_CREDIT_LIMITS` (must match server `_shared/planLimits.ts`)
- `rateLimiter.ts` — client-side guard for in-page bursts

## PDF / DOCX / portfolio export
- `pdf/` — page renderer subfolder
- `pdfGenerator.ts`, `pdfParser.ts`, `pdfTextLayer.ts`, `pdfUtils.ts`
- `docxGenerator.ts`, `coverLetterPdfGenerator.ts`, `portfolioPrintLayout.ts`
- `html2canvasRetry.ts`, `downloadUtils.ts`, `dataExport.ts`

## Auth + Supabase plumbing
- `supabaseAuth.ts`, `supabaseBridge.ts`, `supabaseConstants.ts`
- `edgeFunctions.ts` — wrapper for `functions.invoke` calls

## Resume / content
- `resumeCompletionRules.ts`, `resumeExamples.ts`, `sectionHelpers.ts`, `templateConfig.ts`, `templateCustomization.ts`, `templateData.ts`
- `keywordExtractor.ts`, `jobMatchScorer.ts`, `jsonResumeValidator.ts`, `atsParserSimulation.ts`, `atsValidationChecks.ts`, `contentAnalysis.ts`, `contentLibrary.ts`, `skillCloud.ts`
- `careerPath.ts`, `curatedCourses.ts`

## Privacy / safety
- `piiRedact.ts` — masks identifying fields for WiseHire Bias Reduction Mode

## Onboarding / migration
- `onboardingProfile.ts`, `accountBackup.ts`, `migrateLocalKeys.ts`, `migrationRunner.ts`, `dbCleanup.ts`, `guestMigration` (in hooks)

## Misc utilities
- `dateUtils.ts`, `diffUtils.ts`, `urlUtils.ts`, `utils.ts`, `envUtils.ts`, `errorToast.ts`, `monitoring.ts` (Sentry init), `reportWebVitals.ts`, `auditLogger.ts`, `bugReport.ts`, `referralData.ts`, `qr-presets.ts`, `pageTitles.ts`, `navigation.ts`
- `haptics.ts`, `openExternal.ts`, `shareUtils.ts`, `lazyWithRetry.ts`, `preloadLazy.ts`, `discoveryManager.ts`
- `wisehire/` — WiseHire-specific helpers (subfolder)

## Testing
Co-located `.test.ts` files use Vitest.

## Hard rule
- Anything that touches credit deduction, the AI cascade, or rate limits has **server-side** authority. `src/lib/` mirrors are convenience only — they must never be the enforcement layer.
