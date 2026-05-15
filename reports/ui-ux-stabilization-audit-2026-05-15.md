# UI/UX Stabilization Verification Report

**Date:** 2026-05-15  
**Scope:** landing, pricing, app shell, dashboard, upload, tailor, and a second-pass route sweep  
**Method:** focused component tests, TypeScript verification, authenticated in-app browser checks, public mobile browser checks

---

## Implemented fixes

- Mobile shell now reserves bottom space for the bottom nav and Ask FAB, and suppresses the Ask FAB on routes with their own fixed bottom actions.
- Desktop nav chrome was tightened to reduce crowding without changing IA.
- Dashboard returning-user CTAs now stack on small screens, keep full labels, and expose `Continue editing` near the hero.
- Dashboard loading now includes visible status copy instead of a skeleton-only first state.
- Dashboard selection mode is now labeled instead of icon-only.
- Dashboard upload widget now stacks cleanly on mobile instead of collapsing into a narrow text column.
- Tailor resume selection now renders a single selected title or placeholder in the closed control.
- Tailor step hierarchy now follows: resume -> job source -> optional settings -> run optimizer.
- Tailor job URL input and extraction button now stack on narrow screens.
- Landing hero spacing was increased so the next band does not crowd the mobile fold.

---

## Verification

### Automated

- `npm exec vitest run src/components/layout/__tests__/appShellLayout.test.ts src/components/dashboard/__tests__/DashboardHero.test.tsx src/components/editor/tailor/__tests__/JobUrlParser.test.tsx`
- `npm exec tsc -- --noEmit`

### Browser verification

Authenticated in-app browser checks were used for dashboard, upload, and tailor because those flows depend on a live signed-in workspace state.

Verified fixed:
- `/dashboard`
  - `Continue editing` is now surfaced near the hero.
  - Selection mode is labeled `Select`.
  - returning-user CTAs no longer use the previous cramped two-column mobile treatment.
- `/tailor`
  - the broken concatenated resume selector state no longer reproduces.
  - the previous React key warning tied to the resume options is gone.
  - the first screen now presents a clearer four-step flow.
- Ask FAB suppression works on fixed-footer routes including:
  - `/cover-letter/new`
  - `/cover-letter/edit/*`
  - `/resignation-letter/new`
  - `/resignation-letter/edit/*`
  - `/qr-code`
  - `/qr-batch`

Public mobile browser checks were run at `390px` width for:
- `/`
- `/pricing`

Verified fixed:
- landing hero has more breathing room before the next content band
- pricing remains readable and unaffected by the shell changes

---

## Second-pass route sweep

Checked after the fixes:

- `/auth`
- `/auth/reset-password`
- `/pricing`
- `/templates`
- `/examples`
- `/guides`
- `/notifications`
- `/subscription`
- `/ai-studio`
- `/cover-letters`
- `/resignation-letters`
- `/portfolio`
- `/analytics`
- `/qr-code`
- `/share/demo`
- `/wisehire/signup`
- `/wisehire/dashboard`

### Net-new findings from the second pass

These were observed after the stabilization work but were not introduced by it:

1. Repeated console warning on several routes:
   - `[useAppSettings] Could not load settings: AppwriteException: The current user is not authorized...`
   - This appears to be an existing settings-fetch authorization issue, not a UI regression from this pass.

2. Landing mobile hero heading still has an existing animated-title rendering problem on narrow screens:
   - the headline text can read as clipped or duplicated during the role animation sequence.
   - This is separate from the fold-spacing fix delivered in this pass.

---

## Conclusion

The confirmed dashboard, tailor, shell, upload, and landing issues from the original audit were addressed in this pass. The second-pass sweep found one recurring console warning path and one pre-existing mobile hero text issue that should be tracked as follow-up work rather than bundled into this stabilization change.

---

## Follow-up resolution - 2026-05-15

The two follow-up items from the second-pass sweep were addressed in a separate verification pass on the same date.

### Fixed

1. `useAppSettings` authorization warning
   - The hook was reading `app_settings` directly from the browser on routes where that collection is not readable for the current user.
   - Expected `401/403` Appwrite read failures are now treated as a quiet fallback-to-defaults path instead of a console warning.

2. Landing mobile animated headline rendering
   - The desktop typewriter overlay pattern was reused on mobile, where it was the wrong layout model.
   - The headline now uses a mobile-safe in-flow word line, while keeping the desktop width-reservation behavior on `sm+`.

### Follow-up verification

- `npm exec vitest run src/hooks/__tests__/useAppSettings.test.tsx src/components/landing/__tests__/TypewriterHeadlineLine.test.tsx`
- `npm exec tsc -- --noEmit`
- Browser verification on the real local WiseResume server confirmed:
  - no `useAppSettings` warning on checked routes
  - mobile landing headline renders as a single stable animated line without the previous broken overlay behavior
