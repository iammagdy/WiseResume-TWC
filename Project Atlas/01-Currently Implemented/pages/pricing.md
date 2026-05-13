# PricingPage

  **Last verified:** 2026-05-14
  **Type:** reference card
  **Sources:**
  - `src/pages/PricingPage.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Public pricing page. Works for unauthenticated visitors and authenticated users.

  **Runtime note:** `/pricing` uses the Aurora CSS fallback, not the WebGL Aurora renderer. Root cause verified on 2026-05-14: WebGL Aurora on public utility pages could stall Chromium after render and block Dashboard/navigation clicks even though the route itself loaded. WebGL Aurora remains reserved for the real landing pages (`/`, `/enterprises`).

  **Route(s):**
  - `  /pricing`

  **Where it lives:** `src/pages/PricingPage.tsx`

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  - Public navigation stall fix: `Project Atlas/01-Currently Implemented/stability-fixes/public-page-navigation-webgl-aurora-fix.md`
