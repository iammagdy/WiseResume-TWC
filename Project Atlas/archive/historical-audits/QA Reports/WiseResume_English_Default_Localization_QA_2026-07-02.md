# WiseResume English-Default Localization QA — 2026-07-02

## Verdict

`PASS — PRODUCTION VERIFIED`

English is now the default application locale. Arabic remains available through explicit saved/account preferences and `/ar` public routes. No backend or Appwrite deployment was required.

## Root cause

Three independent frontend paths allowed Arabic into an English session:

1. `resolveLocale` accepted browser languages, so an Arabic browser could activate Arabic without an explicit choice.
2. Missing English catalog keys allowed Arabic caller fallbacks to become visible in English UI and toasts.
3. Tailoring Hub dates used `toLocaleDateString(undefined)`, which selected the browser locale instead of the application locale.

## Changes

- Locale precedence is now `/ar` route, explicit account preference, explicit persisted preference, then English.
- Browser language no longer selects the default application locale.
- English translation calls reject Arabic caller fallbacks when an English key is missing; the key remains visible instead of silently showing the wrong language.
- Added missing English and parity Arabic catalog entries for Upload, Portfolio, saved jobs, workspace navigation, Applications, Import Job, and related toast/error copy.
- Removed raw Arabic UI/error strings from Upload and verified unguarded cases in Applications and Import Job.
- Workspace Profile and Templates titles now resolve to owned catalog strings.
- Tailoring Hub dates now use the explicit application locale.

## Regression coverage

- `src/i18n/__tests__/core.test.ts`
  - Arabic browser preference defaults to English.
  - `/ar` and explicit Arabic preferences remain Arabic.
  - English mode rejects Arabic runtime fallback copy.
- `src/i18n/__tests__/englishUiFallbackCoverage.test.ts`
  - Every statically addressed Arabic `t(...)` fallback must have a non-Arabic English catalog value.
- `src/i18n/__tests__/englishCriticalSurfaceCoverage.test.ts`
  - Upload, Portfolio, Profile, Templates, and workspace keys resolve to English.
  - Known unguarded Arabic source literals are rejected.
- `src/components/tailoring-hub/TailoringHubLanding.locale.test.ts`
  - Tailoring dates follow app locale rather than browser locale.

## Validation

- Affected/localization suite: 14 files / 72 tests — PASS.
- Final focused Tailoring/English tests: 2 files / 19 tests — PASS.
- `npm run test:i18n` — PASS (11 matching, non-empty catalogs and placeholders).
- `npm run test:i18n:coverage` — PASS (13 critical surfaces localized).
- `npx tsc --noEmit` — PASS.
- `npm run build` — PASS.
- `git diff --check` — PASS.

## Production browser verification

Production deployment `dpl_DBgj7huV93ctRSDHq3dUWz7i2e1b` for commit `2de4a91a` reached `READY` and was aliased to `wiseresume.app`.

An `ar-AE` browser with no saved locale opened `/` with `lang=en`, `dir=ltr`, and no Arabic UI copy.

The explicitly English authenticated session passed:

- `/upload`
- `/portfolio`
- `/profile`
- `/templates`
- `/applications`
- `/notifications`
- `/settings`
- `/dashboard`
- `/tailoring-hub`
- `/resignation-letter/new`

Every route had `lang=en`, `dir=ltr`, and zero app-owned Arabic text. Dashboard and Profile displayed one Arabic resume title supplied by the QA user; it was correctly classified as user-authored content and was not modified.

Evidence:

- `tests/e2e/.artifacts/english-default-production-audit/results.json`
- `tests/e2e/.artifacts/english-default-production-audit/upload.png`
- `tests/e2e/.artifacts/english-default-production-audit/portfolio.png`

## Backend and Appwrite impact

None. No schema, permission, auth, AI, payment, API, or Appwrite function change was made. No Appwrite deployment is needed.

## Remaining risks

- Parameterized routes without live disposable identifiers were not individually opened in this final browser sweep. Their shared translation layer is covered by the catalog and runtime fallback guards.
- User-authored Arabic content remains visible by design in English sessions.
