# AuthPage

  **Last verified:** 2026-06-16 (UI/UX audit fixes: field labels, `?plan=` signup intent via sessionStorage)
  **Type:** reference card
  **Sources:**
  - `src/pages/AuthPage.tsx`
  - `src/AppInterior.tsx` (route registration)
  - `project-governance/PRODUCT.md` §2


  **Canonical owner:** `project-governance/PRODUCT.md` §2

  ---

  **What it is:** Appwrite-backed sign-in / register entry. Reads `?plan=` query param and saves intent to sessionStorage.

  **Route(s):**
  - `  /auth`
- `  /sign-in`

  **Where it lives:** `src/pages/AuthPage.tsx`

  **Local development note:** Open the app on `http://localhost:5000`, not `http://127.0.0.1:5000`. The Appwrite project currently allows `localhost` as a Web platform origin and rejects `127.0.0.1`. `src/main.tsx` now redirects DEV sessions from `127.0.0.1` to `localhost` before auth calls run.

  **Related:**
  - Pages index: `Project Atlas/01-Currently Implemented/pages/README.md`

