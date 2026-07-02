# English-Default Localization Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee English application UI by default while preserving explicit Arabic preferences and `/ar` public routes.

**Architecture:** Keep locale selection centralized in `src/i18n/core.ts` and translation rendering centralized in `translate`. Complete English catalog values for keys whose caller fallbacks are Arabic, and enforce the contract with source/catalog regression tests. Preserve document locale and user-authored content as independent data.

**Tech Stack:** React, TypeScript, i18next, JSON locale catalogs, Vitest, Testing Library.

---

### Task 1: Locale resolution contract

**Files:**
- Modify: `src/i18n/__tests__/core.test.ts`
- Modify: `src/i18n/core.ts`

- [ ] Add tests asserting Arabic browser preferences resolve to English, `/ar` resolves to Arabic, and explicit persisted/account Arabic preferences resolve to Arabic.
- [ ] Run `npx vitest run src/i18n/__tests__/core.test.ts` and confirm the browser-language assertion fails because `resolveLocale` currently accepts `navigator.languages`.
- [ ] Remove browser-language selection from `resolveLocale` while retaining the input field for compatibility and preserving explicit preference precedence.
- [ ] Rerun the focused test and confirm it passes.

### Task 2: Safe English translation fallback

**Files:**
- Modify: `src/i18n/__tests__/core.test.ts`
- Modify: `src/i18n/core.ts`

- [ ] Add a test calling `translate` in English with a missing key and Arabic caller fallback; assert the result is the key, not Arabic.
- [ ] Run the focused test and confirm it fails with the Arabic fallback.
- [ ] Add an Arabic-script guard to English fallback handling so missing English keys resolve to a non-Arabic fallback or the key.
- [ ] Rerun the focused test and confirm it passes without changing Arabic-mode English-catalog fallback behavior.

### Task 3: Static catalog coverage guard

**Files:**
- Create: `src/i18n/__tests__/englishUiFallbackCoverage.test.ts`
- Modify: `locales/en/app.json`
- Modify: `locales/en/wisehire.json`

- [ ] Add a test that scans application TypeScript/TSX files for statically addressed `t('namespace.path', Arabic fallback)` calls and verifies each key exists as a non-Arabic string in the English catalogs.
- [ ] Run the test and confirm it reports the current missing English keys.
- [ ] Add English values for every reported static key, including upload, portfolio, saved jobs, workspace navigation, application tracking, and toast/error keys.
- [ ] Rerun the coverage and catalog parity tests and confirm they pass.

### Task 4: Confirmed route regression tests

**Files:**
- Create or modify: `src/i18n/__tests__/englishCriticalSurfaceCoverage.test.ts`
- Modify if required: `locales/en/app.json`

- [ ] Add assertions for the exact catalog keys rendered by `/upload`, portfolio strength/status UI, `app.profile`, `app.templates`, and workspace navigation.
- [ ] Run the test and confirm it fails for each catalog gap before catalog completion.
- [ ] Complete only the missing English catalog values required by the failing assertions.
- [ ] Rerun the focused test and affected upload/portfolio/page tests.

### Task 5: Direct Arabic literal audit

**Files:**
- Modify only affected frontend files proven to contain unguarded app-owned Arabic copy.
- Test: `src/i18n/__tests__/englishUiFallbackCoverage.test.ts`

- [ ] Extend the source guard to identify unguarded app-owned Arabic literals outside Arabic catalogs/content, tests, explicitly Arabic data, and `locale === 'ar'` branches.
- [ ] Review each hit and classify intentional user/document/Arabic-option content separately.
- [ ] Replace verified unguarded UI/toast literals with catalog-backed English/Arabic keys or explicit locale guards.
- [ ] Run the guard and affected tests until all verified UI leakage is removed.

### Task 6: Full validation and browser verification

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `Project Atlas/04-For You (Plain Language)/stability-improvements.md`
- Create or update: `Project Atlas/QA Reports/WiseResume_English_Default_Localization_QA_2026-07-02.md`

- [ ] Run focused localization and affected-page tests.
- [ ] Run available i18n catalog/coverage scripts.
- [ ] Run `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- [ ] Verify concrete public and authenticated English routes in the in-app browser; require `lang=en`, `dir=ltr`, and no app-owned Arabic visible text.
- [ ] Record user-generated Arabic content separately from product copy.
- [ ] Update technical and plain-language documentation under the auto-docs contract.
- [ ] Commit the implementation only after all required evidence passes.
