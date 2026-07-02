# English-Default Localization Hardening

**Date:** 2026-07-02  
**Status:** Approved for implementation

## Problem

English application routes can display Arabic interface copy. Production evidence confirms Arabic upload controls and portfolio strength labels under `lang="en"` and `dir="ltr"`. Some routes also expose untranslated keys such as `app.profile`.

The primary failure mode is incomplete English catalog coverage combined with Arabic strings supplied as runtime fallbacks. Locale resolution also considers the browser language, which can activate Arabic without an explicit user action.

## Required behavior

1. English is the default application locale.
2. Arabic activates only through an explicit user choice, a saved user preference, or an `/ar` public route.
3. Browser language alone must not activate Arabic.
4. English mode must never use an Arabic runtime fallback for application UI, notifications, dialogs, validation messages, or toasts.
5. User-authored Arabic content, Arabic resume data, language names, and controls that explicitly offer Arabic remain valid in English mode.
6. Existing `/ar` routes and an explicitly selected Arabic locale remain supported.

## Implementation design

### Locale resolution

Update locale resolution so its precedence is:

1. `/ar` route
2. explicit account preference
3. explicit persisted local preference
4. English

Browser language is not a locale-selection input for the default application experience.

### Translation catalogs

Complete the English catalog for every statically addressed translation key that currently relies on Arabic fallback copy. Prioritize upload, portfolio editor/status, saved-job surfaces, workspace navigation, application tracking, and toast/error messages.

Existing Arabic catalog entries remain unchanged unless parity validation identifies a missing counterpart.

### Runtime safety

The translation function keeps English-catalog fallback for Arabic mode. In English mode, an Arabic caller fallback must not become visible. Missing keys resolve to a non-Arabic English fallback when supplied; otherwise they resolve to the key so the defect is observable rather than silently presenting the wrong language.

Direct Arabic literals that are intentionally locale-specific remain allowed only when guarded by an explicit Arabic condition or stored in Arabic catalog/content modules.

### Regression protection

Add focused tests that prove:

- Arabic browser preferences still resolve to English without an explicit saved choice.
- `/ar` routes and explicit Arabic preferences still resolve to Arabic.
- English translation calls cannot return Arabic fallback copy.
- Every statically discoverable Arabic `t(...)` fallback used by application code has a corresponding English catalog value.
- Confirmed production cases (`/upload`, `/portfolio`, workspace page titles) return English strings.

## Verification

- Run focused localization and affected-page tests.
- Run the full i18n catalog and critical-surface checks.
- Run `npx tsc --noEmit`, `npm run build`, and `git diff --check`.
- Verify concrete English public and authenticated routes in the browser with `lang=en`, `dir=ltr`, and no Arabic UI copy.
- Treat user-generated Arabic resume/profile content separately from application-owned interface copy.

## Scope limits

- Do not remove Arabic support.
- Do not translate user-authored content.
- Do not alter resume document language behavior; document locale remains independent of application UI locale.
- Do not change payments, account data, Appwrite permissions, or backend schemas.
