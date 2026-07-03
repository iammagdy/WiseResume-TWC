# SharePage

  **Last verified:** 2026-04-17
  **Type:** reference card
  **Sources:**
  - `src/pages/SharePage.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Public share page for resumes / portfolios (token-gated).

  **Route(s):**
  - `/share/:token` — registered in `src/AppInterior.tsx`

  **Where it lives:** `src/pages/SharePage.tsx`

  **Note:** WiseHire candidate-brief shares are a separate page (`PublicBriefPage`) at route `/share/brief/:shareToken` — see `share-brief.md`.

  **Related:**
  - Sibling card (WiseHire briefs): `Project Atlas/01-Currently Implemented/pages/share-brief.md`
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`
  