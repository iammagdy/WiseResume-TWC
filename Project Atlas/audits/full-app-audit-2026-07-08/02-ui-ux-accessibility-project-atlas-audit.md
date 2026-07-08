# UI/UX, Accessibility, Responsive Design, and Atlas Alignment

## Audit scope and evidence limit

Combined UX/accessibility review against `Project Atlas/product/requirements.md`, `brand-guidelines.md`, and design-system folders. The in-app browser timed out before an accepted screenshot; therefore no visual step is claimed as verified and WCAG compliance is `UNKNOWN`.

## Strengths from code

- Route-level lazy loading and tailored skeletons are broadly implemented in `src/AppInterior.tsx`.
- Radix/shadcn primitives provide a reasonable semantic/focus foundation.
- Reduced-motion handling is wired through Framer Motion.
- Many primary actions use 44px minimum targets and explicit labels.

## Finding P2-UX-01 — Feature-gate failure is toast-only then redirects

Severity: P2  
Area: Navigation/error recovery  
Evidence: `src/AppInterior.tsx` `FeatureGate` shows `toast.info(...)` and immediately navigates to `/dashboard`, returning `null`.  
Impact: Deep-link users lose context; screen-reader users may miss the transient reason.  
Reproduction: Disable a gated feature and open its route directly.  
Recommended fix: Redirect with persistent route state/banner or render an accessible unavailable state with a clear next action.  
Fix class: Frontend-only. Deployment required: Vercel. Browser QA: Yes.

## Finding P2-UX-02 — Arabic route parity is structurally incomplete

Severity: P2  
Area: Localization/RTL  
Evidence: Explicit Arabic routes exist for auth, marketing, and public share/portfolio, while protected routes such as `/dashboard`, `/editor`, `/upload`, `/tailoring-hub`, `/applications`, `/portfolio`, and settings have no explicit `/ar/...` route in `src/AppInterior.tsx`. Locale may be state-driven, but deep-link parity is not evident.  
Impact: Arabic users may lose locale on direct links, refreshes, or shared support instructions.  
Recommended fix: Define and test one canonical locale-routing policy; add route aliases or document state-driven behavior.  
Fix class: Frontend/documentation. Deployment required: Vercel. Browser QA: Yes.

## Finding P2-UX-03 — Atlas navigation contracts are stale

Severity: P2  
Area: Information architecture/supportability  
Evidence: Atlas states `/portfolio/editor` and `/preview/:resumeId`; code exposes `/portfolio` and `/preview`. It also references component files not present under those names.  
Impact: Support, QA, agents, and users follow incorrect paths; regressions may be missed.  
Recommended fix: Decide canonical routes, add intentional redirects if needed, then update living specs.  
Fix class: Frontend/documentation. Deployment required: Only if redirects change. Browser QA: Yes.

## Finding P2-UX-04 — Arabic translation catalog is missing a notification key

Severity: P2  
Area: Localization  
Evidence: `src/i18n/__tests__/catalogParity.test.ts` fails because Arabic lacks `topBar.notifications` while English contains it.  
Impact: The notification control may fall back to English or an unintended label for Arabic users.  
Recommended fix: Add the reviewed Arabic translation and keep catalog parity enforced.  
Fix class: Frontend-only. Deployment required: Vercel. Browser QA: Yes, including screen-reader name in RTL.

## Required visual steps (all blocked in this run)

1. Landing — `UNKNOWN` (capture failed).
2. Auth/signup/reset — `UNKNOWN`.
3. Dashboard empty/populated — `UNKNOWN`.
4. Upload/import — `UNKNOWN`.
5. Editor desktop/mobile — `UNKNOWN`.
6. Preview/export — `UNKNOWN`.
7. Tailoring input/result/history — `UNKNOWN`.
8. Cover letter/AI Studio — `UNKNOWN`.
9. Portfolio editor/public/password/contact — `UNKNOWN`.
10. Settings/pricing/onboarding/applications/jobs — `UNKNOWN`.

For each, verify 1440px and 390×844, keyboard order, visible focus, dialog focus trap/return, labels/errors, 200% zoom, dark/light, reduced motion, Arabic RTL, scroll containment, sticky bars, and non-toast status messaging.
