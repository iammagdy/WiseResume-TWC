# Index

  **Last verified:** 2026-04-19
  **Type:** reference card
  **Sources:**
  - `src/pages/Index.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Public landing page with the "For Job Seekers" / "For Companies" toggle. All marketing stats live here — never invent them.

  **Route(s):**
  - `/`
- `  /enterprises`

  **Where it lives:** `src/pages/Index.tsx`

  **Key facts (updated 2026-04-19):**
  - FCP is measured at ~820ms ("good") after Sentry deferral + hero animation fix. See stability-fixes addendum.
  - Scroll-stack section: `ScrollStack` with `useWindowScroll`. Cards pin at `stackPosition="20%"`. `FeatureSection` content starts visible (`initial="visible"`) — no whileInView slide animations inside stack cards.
  - `src/lib/captureErrorShim.ts` must be the import source for `captureError` in any eagerly-mounted component. Never import from `@/lib/monitoring` in the entry path.
  - `src/components/landing/landingAnimations.ts`: `SCATTER_SECTION_ITEM.hidden(0)` returns identity transform (hero always visible on first paint).

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Stability fixes: `../stability-fixes/phase-2-frontend-rerender-and-bundle.md` (FCP + scroll-stack addenda)
  