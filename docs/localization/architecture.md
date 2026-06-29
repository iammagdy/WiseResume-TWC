# Localization Architecture

## Locale Ownership

- `LocaleProvider` resolves and applies the interface locale. Resolution order is an explicit `/ar` public route, signed-in preference, local preference, browser preference, then English.
- `LocaleAccountSync` reads and writes `user_preferences.language`. Anonymous preferences remain in local storage.
- Deployments must run `npm run schema:i18n` once with Appwrite admin credentials to create the optional `language` attribute idempotently.
- `TemplateCustomization.documentLocale` owns CV language independently from the interface locale. Existing CVs default to English.

## Routing and Direction

- Public Arabic routes use `/ar/...`. Authenticated application routes retain their existing paths.
- Changing language rewrites only known public routes. It never prefixes `/dashboard`, `/editor`, or other authenticated routes.
- The provider updates `<html lang>` and `<html dir>` and supplies Radix direction. Machine-readable values use explicit LTR direction or bidi isolation.

## Templates and Pagination

- Registered resume templates expose `data-section` markers. The localization pass replaces only recognized generated headings, preserving user-entered content.
- Arabic templates and exports use bundled Noto Sans Arabic. Export measurement waits for `document.fonts.ready`.
- Page cuts are stored in `pageCutsByFingerprint`, keyed by template, page format, document locale, heading/body fonts, and font scale. Legacy `customBreakPositions` are an English-only fallback.

## Export Engines

- Designed and ATS PDFs use Chromium and carry locale, direction, bundled font CSS, and localized page labels.
- Arabic cover letters use Chromium rather than `pdf-lib` standard fonts.
- DOCX uses Noto Sans Arabic, bidirectional paragraphs, RTL runs, and explicit LTR contact runs.
- Arabic LaTeX uses `fontspec` and `polyglossia` for XeLaTeX. English output retains the existing pdflatex-compatible preamble.

## Quality Gates

- `npm run test:i18n` validates namespace/key parity, non-empty values, placeholders, and obvious untranslated values.
- `docs/localization/ar-terminology.md` is the terminology approval gate.
- The `feature_arabic_locale` app setting is the rollout control; native review and export visual QA are required before broad enablement.
