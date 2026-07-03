# WiseResume Full Product QA Audit

**Date:** 2026-07-01
**Mode:** Read-only product QA audit; no product code, backend, data, auth, AI, payment, deployment, or user-account changes were made.
**Audited revision:** `71171141` on `main`; target commit `88cc80ca` is its direct functional predecessor.

## Live export completion addendum - 2026-07-01

**Final status: PASS for the approved live export recovery scope.**

The first production blocker was `/api/app-settings`: Vercel Node could not resolve the extensionless `../server/appSettingsFetch` import and returned HTTP 500 with `ERR_MODULE_NOT_FOUND`. Product commit `2a086f91` changed it to `../server/appSettingsFetch.js`; deployment `dpl_9wfQ19N9NmRe2HH8p6m6vz14VPqx` reached READY, the endpoint returned HTTP 200, and subsequent runtime logs contained no matching module error.

Fresh-browser testing then captured real Designed PDF, ATS PDF, and DOCX download events. Rendering the PDFs exposed a second production-only defect: Arabic glyphs were absent. Vercel Chromium blocks external resources and has no suitable system fallback. Commit `9eca6759` embedded Noto Sans Arabic assets, but visual inspection still failed because template-level Open Sans declarations overrode the inherited Arabic font. Commit `59fba152` added a locale-scoped descendant override. Deployment `dpl_5vMBz2ZdkUFHDpWxwASFcW1EUmQU` reached READY and passed the repeated clean-browser test.

| Live production artifact | Size | Acceptance evidence |
|---|---:|---|
| Designed PDF | 101,012 bytes | Real download event; `%PDF`; rendered page shows connected, correctly ordered Arabic and mixed `Google Analytics` / `SEO` |
| ATS PDF | 25,367 bytes | Real download event; `%PDF`; rendered page shows connected, correctly ordered Arabic and mixed Latin terms |
| DOCX | 8,109 bytes | Real download event; `PK` ZIP; `[Content_Types].xml` and `word/document.xml`; Arabic content and bidi/RTL markup |

Validation passed: `npx tsc --noEmit`; `npm run build`; full Vitest (132 files passed, 1 skipped; 768 tests passed, 1 todo); focused Preview/export suite (17 tests); `npm run test:i18n`; and `npm run test:i18n:coverage`. Both i18n scripts existed. No Appwrite deployment, Appwrite configuration/environment/schema/permission change, payment test, destructive account action, or credential disclosure occurred. Arabic legal copy remains `OWNER/LEGAL REVIEW NEEDED` for launch approval.

## Implementation addendum - 2026-07-01

**Current technical status: LOCAL IMPLEMENTATION PASS; LIVE DEPLOYMENT VERIFICATION PENDING.** The findings in the original read-only audit below were used as the reproduction baseline and have now been addressed in product commit `b21caf99`.

- Arabic privacy and terms routes now contain coherent Arabic content, are standalone RTL pages, and no longer render English legal copy. **OWNER/LEGAL REVIEW NEEDED:** formal legal approval remains a launch item, not a blocker to the technical fix.
- English guides, guide details, and examples moved to the top-level public route group and render without authentication or workspace navigation.
- All Arabic landing demo cards use localized data, stable identifiers/direction attributes, and right-origin animation on desktop and approximately 390 px mobile QA.
- Download handling now has explicit triggered/cancelled/failed outcomes and validates PDF signatures/minimum size and DOCX ZIP/package contents before attempting delivery. Positive feedback is not emitted for cancelled/failed triggers. Timer-driven URL actions now show a user-activated CTA to avoid browser-blocked fake success.
- A disposable Arabic resume named `سيرة ذاتية عربية للاختبار - آمن للحذف` was created with Arabic document locale and Arabic summary text, then saved/reloaded and preserved. Preview and both rendered PDFs showed connected readable Arabic, right-aligned headings/content, and correctly ordered mixed `Google Analytics` / `SEO` terms.

### Physical local download evidence

| Flow | File evidence | Validation |
|---|---:|---|
| Designed PDF | 158,029 bytes | `%PDF-1.7`; 2 pages; rendered and visually inspected |
| ATS PDF | 54,984 bytes | `%PDF-1.7`; rendered and visually inspected |
| DOCX | 8,109 bytes | `PK` ZIP; contains `[Content_Types].xml` and `word/document.xml`; Arabic text and `w:bidi` / `w:rtl` present |

The Playwright-style listener was attached before each required browser action, but this in-app browser bridge returned no download event even when Chrome saved the file. Acceptance therefore used physical saved-file timestamps, sizes, signatures, package inspection, extracted content, and rendered-page inspection. After repeated downloads, the same Chrome session hit its automatic-download quota; fresh-browser verification is mandatory on the live domain.

### Validation after implementation

- `npx tsc --noEmit` - PASS
- `npm run build` - PASS (existing chunk-size/Browserslist warnings only)
- `npm test -- --run` - PASS: 130 files passed, 1 skipped; 766 tests passed, 1 todo
- `npm test -- --run src/pages/__tests__/PreviewPage.test.tsx` - PASS: 11 tests
- `npm run test:i18n` - PASS; script existed
- `npm run test:i18n:coverage` - PASS; script existed
- Focused export/legal/landing/routing/dialog suite - PASS: 25 tests

No Appwrite deployment, payment test, destructive account action, or QA credential disclosure occurred. Live Vercel deployment and fresh-context export evidence must be appended after push; any live export failure returns the work to the product fix/test loop.

## 1. Executive Summary

**Overall status: PARTIAL**

- The legal-route change in `88cc80ca` is correct and narrowly scoped. All four legal pages now render outside `AppShell`, retain the existing `RouteEB` / `Suspense` / `PageLoadingSpinner` wrappers, and passed local browser checks without dashboard navigation or sidebar UI.
- TypeScript, production build, and the complete Vitest suite passed: 125 test files passed, 1 skipped; 752 tests passed, 1 todo.
- The app is suitable for controlled internal testing and targeted authenticated smoke testing. It is **not yet recommended for broad user testing** because public-route behavior is inconsistent and the Arabic legal pages are not localized.
- The app is **not proven safe for launch**. Real export downloads, logged-out auth flows, upload parsing, AI calls, portfolio publication/contact behavior, and mobile layouts were not exercised end-to-end under this audit's safety constraints.

Biggest evidenced risks:

1. **P1 — Arabic legal pages are English-only.** `/ar/privacy-policy` and `/ar/terms-of-service` set `dir="rtl"` but render the English components and English copy.
2. **P1 — English guides/examples are not actually public.** `useIsPublicRoute()` classifies `/guides`, `/guides/:slug`, and `/examples` as public, but their English routes exist only under `ProtectedRoute > JobSeekerRoute > AppShell`. In the authenticated browser they showed the workspace shell; logged-out users are redirected to auth by code.
3. **P1 — launch-critical flows remain unverified live.** Export, upload, AI, public portfolio, and auth were code/test audited but not exercised with side effects.
4. **P2 — bundle-size warnings remain.** The production build succeeded, but Vite reported chunks over 500 kB, including OCR and document-export bundles over 1 MB.

## 2. OpenCode Commit Review — `88cc80ca`

**Status: PASS**

The commit changed only `src/AppInterior.tsx` (30 changed lines: 15 additions, 15 deletions). It removed exactly these routes from the `AppShell` route group and re-added them as top-level routes:

- `/privacy-policy`
- `/terms-of-service`
- `/ar/privacy-policy`
- `/ar/terms-of-service`

Evidence:

- Each moved route retains `RouteEB`, `Suspense`, and `PageLoadingSpinner`.
- Auth routes remain inside their existing `AppShell` group; no `ProtectedRoute`, `JobSeekerRoute`, or protected application route changed.
- `/pricing`, `/whats-new`, `/waitlist`, `/enterprise`, Arabic public routes, and all protected routes were unchanged by the commit.
- `/guides` and `/examples` were unchanged; their pre-existing placement issue is documented separately below.
- `git diff 88cc80ca..HEAD -- src/AppInterior.tsx` was empty, so the later documentation commit did not alter the implementation.
- Local browser checks for all four legal URLs found no `<aside>` or `<nav>` and found the correct legal-page heading.

Regression risk is low and limited to any styling or behavior that legal pages might previously have received only through `AppShell`. No such break was observed: global theme classes and tokens remained active, the pages rendered, and the build/tests passed.

## 3. Build Health

| Check | Status | Evidence / notes |
|---|---|---|
| `git status -sb` | PASS | Started clean: `## main...origin/main`. The only final repository change is this requested report. |
| `git log --oneline -n 8` | PASS | `71171141` is current; `88cc80ca` immediately precedes it. |
| `git show --stat 88cc80ca` | PASS | One file only: `src/AppInterior.tsx`. |
| `npx tsc --noEmit` | PASS | Exit code 0; 2.4 s. |
| `npm run build` | PASS with warnings | Exit code 0; 5,793 modules; no source maps. Vite warned about chunks over 500 kB and stale Browserslist data. |
| `npm test -- --run` | PASS | 125 files passed, 1 skipped; 752 tests passed, 1 todo. Expected error output from an error-boundary auth test appeared, but the suite exited 0. |
| Playwright/E2E suite | NOT RUN | Existing E2E assets include authenticated state and potentially side-effecting flows. The audit did not invoke the suite wholesale. |

The build and tests modify generated/ignored artifacts only; no tracked product files were changed.

## 4. Broken Functionality

| Severity | Area | Issue | Evidence | Impact | Suggested fix direction |
|---|---|---|---|---|---|
| P1 | Arabic legal | Arabic legal URLs render English content | Browser: both `/ar/...` pages had `dir="rtl"` but English headings/body. `PrivacyPage.tsx` and `TermsPage.tsx` contain hard-coded English copy. | Arabic users receive non-localized legal disclosures. | Add locale-backed legal content or dedicated Arabic legal components; retain standalone routing. |
| P1 | Public guides/examples | English routes are protected and shell-wrapped despite being classified public | `AppInterior.tsx`: English `/guides`, `/guides/:slug`, `/examples` are inside `ProtectedRoute > JobSeekerRoute > AppShell`; Arabic equivalents are top-level. Browser showed workspace sidebar on English routes. | Logged-out visitors cannot access intended public SEO/content pages; authenticated visitors get inconsistent layout. | Move English public content routes to the top-level route group, after confirming product intent. |
| P2 | Performance | Oversized production chunks | Build warnings; `doc-export` ~1.47 MB, OCR ~1.02 MB, DevTools ~535 kB before gzip. | Slower first use of export/OCR/dev tooling on constrained devices. | Profile route-level imports and split large optional libraries. |
| P3 | Legal metadata | Legal pages retain the generic app title | Browser title remained `WiseResume AI — AI Resume Builder` on privacy/terms pages. | Weaker accessibility/SEO/browser-history clarity. | Set route-specific document titles and descriptions. |

No P0 issue was proven.

## 5. Export/Download Status

| Export Type | Status | Evidence | Notes |
|---|---|---|---|
| Designed PDF | PARTIAL | `PreviewPage.handleExport('resume')` renders the selected template via `generateNativePDF`; production build and unit tests pass. | Real browser download was not triggered. |
| ATS PDF | PARTIAL | `action=ats-pdf` maps to `handleExport('ats-pdf')`; implementation passes `atsMode: true`; unit test asserts this. | Real output content/ATS quality remains UNKNOWN. |
| DOCX | PARTIAL | `action=docx` maps to `generateAndDownloadDOCX(currentResume)`; generator supports Arabic locale/RTL options; tests pass. | Real Word-file opening/layout remains UNKNOWN. |
| `/preview?id=<resumeId>` | PASS at code/test level | `useResume(id)` fetches the Appwrite document, `dbToResumeData()` populates Zustand, and template selection is restored. | Requires authenticated access and a readable owned resume. |
| URL action export | PASS at code/test level | Accepted actions are `download`, `ats-pdf`, `docx`; action is captured once, waits for bootstrap/render readiness, then exports and removes the query parameter. | Unsupported action values are ignored. |
| Fresh-tab export | PASS at code/test level; live UNKNOWN | Preview no longer depends only on pre-populated Zustand state. Tests cover delayed bootstrap for all three URL actions and fallback behavior. | Browser download permission, pop-up/download UX, and real API availability were not exercised. |

Important nuance: `ResumeDetailPage` navigates to `/preview?action=download` without `id`, relying on the in-session current resume. Resume-list and tailoring-result entry points use `?id=...`, which supports fresh-tab/bootstrap behavior.

## 6. Default Theme / Project Atlas Status

| Area | Status | Evidence | Notes |
|---|---|---|---|
| Default theme | PASS | `settingsStore` defaults to `system`; `AppInterior` resolves the OS preference and applies `light`/`dark` to `<html>`. | Local browser resolved dark because the active environment/system preference was dark. |
| WiseResume crimson brand | PASS | Global `src/index.css` defines WiseResume primary HSL `357 71% 36%` (`#9E1B22`) and applies product-specific tokens. | WiseHire has separate blue tokens. |
| AppShell protected workspace | PARTIAL | Core app routes are correctly under `ProtectedRoute > JobSeekerRoute > AppShell`. | Auth routes and English guides/examples are also in `AppShell`; therefore AppShell is not exclusively protected workspace. |
| Public route styling | PASS | Theme logic and CSS variables are global in `AppInterior`/`index.css`, not dependent on `AppShell`. Pricing/news/legal pages rendered with global styling. | Visual parity was sampled, not exhaustively audited. |
| Legal pages after fix | PASS for layout; PARTIAL overall | All four render standalone with theme classes. | Arabic copy is still English; route-specific metadata is absent. |

**Overall default theme/design-system status: PARTIAL.** The global theme and crimson brand system are intact; route ownership and Arabic legal content remain inconsistent.

## 7. Route/Layout Status

| Route | Expected Layout | Actual Layout | Status | Notes |
|---|---|---|---|---|
| `/` | Public landing | Public landing via lightweight `AppLanding` | PASS | Code/build verified. |
| `/pricing` | Public standalone | Top-level public page; no app sidebar in browser | PASS | Browser checked. |
| `/whats-new` | Public standalone | Top-level public page; no app sidebar in browser | PASS | Browser checked. |
| `/waitlist` | Public standalone | Top-level public page; no app sidebar in browser | PASS | Browser checked. |
| `/enterprise` | Public enterprise page | Top-level enterprise page | PASS | Browser checked; its own page navigation is expected. |
| `/guides` | Public standalone | Protected + AppShell | FAIL | P1. |
| `/guides/:slug` | Public standalone | Protected + AppShell | FAIL | Same route placement as `/guides`; browser detail page not sampled. |
| `/examples` | Public standalone | Protected + AppShell | FAIL | P1. |
| `/privacy-policy` | Public standalone legal | Top-level standalone legal | PASS | No sidebar/nav in browser. |
| `/terms-of-service` | Public standalone legal | Top-level standalone legal | PASS | No sidebar/nav in browser. |
| `/ar/privacy-policy` | Arabic public standalone legal | Standalone RTL page with English copy | PARTIAL | Layout fixed; localization broken. |
| `/ar/terms-of-service` | Arabic public standalone legal | Standalone RTL page with English copy | PARTIAL | Layout fixed; localization broken. |
| `/auth`, `/ar/auth` | Public auth UI | Routes exist inside AppShell | PARTIAL | Existing authenticated session redirected `/auth` to `/dashboard`; logged-out visual state not tested. |
| `/dashboard` | Protected AppShell | Protected AppShell | PASS | Browser rendered workspace shell using an existing session. |
| `/editor`, `/preview`, `/upload`, `/settings`, `/templates` | Protected AppShell | Protected AppShell | PASS at routing level | Functional interaction not fully exercised. |
| `/tailoring-hub`, `/tailoring-hub/result/:resumeId` | Protected AppShell | Protected AppShell | PASS at routing level | Result requires valid data. |
| `/cover-letter/new` | Protected, feature-gated AppShell | Protected, feature-gated AppShell | PASS at routing level | Generation/download not exercised. |
| `/portfolio` | Protected, feature-gated AppShell | Protected, feature-gated AppShell | PASS at routing level | Publication not exercised. |
| `/analytics` | Protected AppShell | Protected AppShell | PASS at routing level | No feature gate observed. |
| `/cover-letter` | Legacy redirect | Redirects to `/cover-letter/new`, preserving search/state | PASS | Code verified. |
| `/tailoring` | Legacy redirect | Redirects to `/tailoring-hub` | PASS | Code verified. |
| `/tailor` | Legacy workspace | Renders `TailorPage` rather than redirecting | PARTIAL | This is internally consistent with a retained legacy page, but differs from a strict “legacy redirect” expectation. Product intent should be confirmed. |

## 8. Auth/Protected Route Status

- `ProtectedRoute` waits for session validation, applies an 8-second fallback, redirects logged-out users to `/auth?mode=login`, preserves a non-dashboard intended route in `redirect=`, and enforces email verification.
- Login and signup are modes of the same `/auth` page (`mode=login` / `mode=signup`). Both code paths exist.
- The existing safe browser session proved authenticated `/dashboard` access and caused `/auth` to redirect to `/dashboard`.
- Logged-out behavior was **not manually verified** because clearing or replacing the existing session was outside the audit's non-mutating posture. Code and passing tests support the expected redirect behavior.
- No redirect loop was observed in the authenticated check. Logged-out callback/reset/verification loops remain UNKNOWN live.
- Maintenance and suspension checks exempt routes classified by `useIsPublicRoute()`. Because English guides/examples are classified public but routed through auth, their maintenance/consent behavior is internally inconsistent.

## 9. Feature-by-Feature QA

### Landing/Public

PARTIAL. Public landing and sampled marketing pages compile and render. Legal pages are standalone. English guides/examples have the P1 route mismatch. CTA-by-CTA navigation was not exhaustively clicked.

### Auth

PARTIAL. Routes, login/signup modes, session validation, verification guard, and intended-route preservation exist. Authenticated redirect works. Logged-out visual and submission flows are UNKNOWN.

### Dashboard

PASS at code/routing level; PARTIAL end-to-end. Dashboard renders in `AppShell`. New resume, upload, job import, tailoring, editor, templates, portfolio, and related navigation handlers are present. Resume cards expose preview/export navigation. No missing imports/build failures were found.

### Upload

PARTIAL. `/upload` is protected and shell-wrapped. Dedicated upload components, OCR assets, parsing code, review UI, and dashboard upload navigation exist and build. No file was uploaded and no parsing service was invoked.

### Editor

PARTIAL. `/editor` is protected. Zustand resume state, persistence mutations, autosave-related hooks, preview navigation, template registry, and AI wrappers build and pass tests. Editing, autosave recovery, AI enhancement, and template fidelity were not manually exercised.

### Tailoring Hub

PARTIAL/PASS at code level. Both required routes exist. `/tailoring` redirects to the hub; `/tailor` intentionally retains the older page. The hub explicitly computes a change summary and returns before save/navigation when output appears unchanged, preventing false success. Result data has persisted fallback logic. Live AI tailoring/export was not run.

### Preview/Export

PARTIAL. URL bootstrap and action dispatch are implemented and strongly unit-tested. Designed PDF, ATS PDF, and DOCX paths are wired. Real downloads and generated-file inspection are UNKNOWN.

### Portfolio

PARTIAL. `/portfolio` and public `/p/:username` routes exist. Public fetching and password checks go through Appwrite functions; comments and types show removal of owner `user_id` and password hash from public data. Password verification and rate-limit states are handled server-side. Custom domains are honestly disabled in UI as **Coming soon**; the resolver documents missing indexed lookup/provisioning. Contact email is intentionally absent from the sanitized payload, while contact forms use a public component/function path. Live publication, password, contact, chat, and private-data inspection were not run.

### Cover Letters

PARTIAL. Creation/edit/list routes, feature gates, resume selection code, generation, persistence, PDF generation, and legacy redirect exist. No AI generation, save, or download was invoked.

### AI Studio/AI Tools

PARTIAL. `/ai-studio` and `/ai-studio/:tool` are protected and feature-gated. Shared AI actions invalidate `me` and `ai-usage-breakdown` after successful actions. Browser code uses Appwrite function wrappers; repository search found no browser-side OpenAI/Anthropic/Gemini provider secret variables. `VITE_TURNSTILE_SITE_KEY` is a public site key, not an AI secret. Live provider routing, credit deduction, and every tool slug remain UNKNOWN.

### Settings/Theme

PASS at code level; PARTIAL visually. Settings route exists. Appearance controls and `light`/`dark`/`system` behavior exist. Default is `system`, and global WiseResume crimson tokens remain active outside `AppShell`.

### Mobile/Responsive

UNKNOWN overall. Code includes `100dvh`, breakpoint-specific shell behavior, mobile bottom navigation, swipe-back handling, scaled preview logic, and responsive class usage. A browser viewport-switch attempt timed out before valid screenshots could be accepted. No evidence-based layout defect was confirmed, but dashboard, editor, preview/export, tailoring, portfolio, and auth still require real small-screen checks, including keyboard, zoom/reflow, overflow, touch target, and download behavior.

## 10. Prioritized Fix Plan

### P0 — fix before any user testing

- None proven.

### P1 — fix before broad testing

1. Localize the Arabic privacy and terms content; validate language, RTL typography, links, and legal accuracy.
2. Resolve the route ownership mismatch for English `/guides`, `/guides/:slug`, and `/examples` so implementation matches the declared public-route policy.
3. Run a controlled end-to-end smoke matrix for logged-out auth, upload, editor save/restore, tailoring, portfolio publication/password/contact, AI credit refresh, and all three primary export formats.

### P2 — fix before launch polish

1. Add route-specific legal page metadata.
2. Profile and split oversized OCR/export/dev-tool chunks where practical.
3. Confirm whether `/tailor` should remain a separate legacy workspace or redirect to `/tailoring-hub`.
4. Complete desktop/mobile browser QA at representative breakpoints and with keyboard-only navigation.

### P3 — backlog

1. Refresh Browserslist compatibility data in a normal dependency-maintenance change.
2. Add route-regression tests that assert public/protected placement and shell presence for the complete route matrix.

## 11. Validation Evidence

Commands run:

```text
git status -sb
git log --oneline -n 8
git show --stat 88cc80ca
git show --format=fuller 88cc80ca -- src/AppInterior.tsx
git diff 88cc80ca..HEAD -- src/AppInterior.tsx
npx tsc --noEmit
npm run build
npm test -- --run
```

Principal files inspected:

- `src/App.tsx`
- `src/AppInterior.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/ProtectedRoute.tsx`
- `src/components/layout/JobSeekerRoute.tsx`
- `src/pages/PrivacyPage.tsx`
- `src/pages/TermsPage.tsx`
- `src/pages/AuthPage.tsx`
- `src/pages/DashboardPage.tsx` and dashboard components
- `src/pages/PreviewPage.tsx`
- `src/pages/__tests__/PreviewPage.test.tsx`
- `src/hooks/useResumes.ts`
- `src/store/resumeStore.ts`
- `src/lib/docxGenerator.ts`
- `src/pages/TailoringHubPage.tsx`
- `src/pages/TailoringHubResultPage.tsx`
- `src/hooks/usePublicPortfolio.ts`
- `src/pages/PublicPortfolioPage.tsx`
- `src/pages/PortfolioEditorPage.tsx`
- `src/components/portfolio/editor/MoreTab.tsx`
- `src/hooks/useAIAction.ts`
- `src/store/settingsStore.ts`
- `src/index.css`

Local browser checks used the current in-app browser and a local Vite server. Verified routes included the four legal URLs, `/auth`, `/dashboard`, `/pricing`, `/whats-new`, `/waitlist`, `/enterprise`, `/guides`, and `/examples`. No form was submitted, account changed, file uploaded, AI action invoked, download triggered, payment touched, or destructive action performed.

## 12. Unknowns / Blocked Checks

- Logged-out login/signup/reset/verification UX: blocked by the existing authenticated browser session and the read-only/no-auth-mutation constraint.
- Screenshot evidence files: not written because the user explicitly prohibited file edits beyond the requested report. Browser DOM/visual state was inspected in-session only.
- Mobile screenshots: blocked by repeated browser timeout after applying a mobile viewport; no invalid screenshot was accepted as evidence.
- Designed PDF, ATS PDF, DOCX, and fresh-tab browser downloads: not triggered to avoid side effects/download writes; output fidelity is UNKNOWN.
- Upload/OCR/import parsing: no test document was submitted.
- AI tools, AI Studio, credit deductions, and provider health: no live AI request was made.
- Public portfolio publication, password attempts, contact form, chat, and custom-domain DNS: no live external/user-facing action was made.
- Payments, billing, delete-account, admin mutation, real-user data changes, deployment, and production checks: intentionally not tested.
- Full WCAG compliance: not claimed; screenshots/code review cannot replace keyboard, screen-reader, contrast, zoom, and reflow testing.

## Recommendation

Proceed to a focused fix phase for the two P1 route/localization defects, then run a controlled end-to-end smoke pass with dedicated test credentials and disposable test data. Do not treat the passing build/unit suite alone as launch approval.
