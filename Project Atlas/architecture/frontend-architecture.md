# Canonical Frontend Architecture

**Last Verified:** 2026-07-24
**Status:** Canonical Architecture Specification  
**Location:** `Project Atlas/architecture/frontend-architecture.md`  

---

## Technical Stack

* **Core Framework:** React 18, TypeScript 5, Vite 6.
* **Hosting:** Vercel (`wiseresume.app`).
* **Routing:** React Router v6 (`BrowserRouter`).
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`), Zustand stores (`useAuthStore`, `useResumeStore`).
* **Styling:** Tailwind CSS v4, Radix UI primitives, shadcn/ui, Framer Motion (`[0.22, 1, 0.36, 1]` ease-out-quart curve).

---

## Key Design & Performance Standards

1. **Brand Colors:** WiseResume Primary `#9E1B22` (crimson), WiseHire Primary `#1D4ED8` (blue).
2. **Reduced Motion:** All animation loops must gate on Framer Motion's `useReducedMotion()`.
3. **Touch Targets:** 44px minimum height/width for interactive buttons.
4. **Focus Rings:** Visible focus ring on all focusable inputs (`focus-visible:ring-[#9E1B22]`).

---

## Production Bundle and Prefetch Policy

* `src/lib/buildChunkPolicy.ts` is the canonical Vite/Rollup chunk ownership and global deferred-prefetch policy.
* Shared class-name utilities (`clsx`, `class-variance-authority`, and `tailwind-merge`) belong to `ui-utils`; they must not be absorbed into feature chunks.
* Recharts and D3 packages belong to the `charts` feature chunk. Public/auth entry code must not statically import or module-preload that chunk.
* PDF/DOCX dependencies remain in `doc-export`; Tesseract/Mammoth remain in `ocr`; DevTools and monitoring remain lazy route/feature chunks.
* The global deferred prefetch list may warm Dashboard, Upload, Framer Motion, and the splash component, but it must not include `EditorPage` and must not run on exact `/p/:username` or `/ar/p/:username` routes.
* Authenticated route-aware prefetch is implemented in `AppInterior`; Dashboard/Upload/Editor workspace paths may warm their own route chunks after navigation context is known.
* `tests/build/performance-build-contract.test.cjs` is the post-build regression contract for charts entry isolation, public Editor-prefetch exclusion, and heavy lazy chunk preservation.

## Public Portfolio Critical Render Policy

* Exact `/p/:username` and `/ar/p/:username` routes are dispatched before `AppInterior`. Do not move them back into the authenticated workspace shell.
* `PublicPortfolioRoute` starts `usePortfolioGate(username)` and `usePublicPortfolio(username, !gateInfo?.passwordEnabled)` while the page chunk loads. `PublicPortfolioPage` uses the same query keys; this is the request-deduplication boundary.
* Security remains server-enforced. The browser must not read `profiles`, resumes, or `portfolio_settings` directly, and no early-render path may expose owner IDs, owner contact email, password hashes, or server-only settings.
* `PublicHero` and the page shell must not import Framer Motion. Above-the-fold rendering is limited to the gate result, sanitized profile/resume payload, stable hero dimensions, optimized avatar or initials fallback, name/title, and primary actions.
* Appwrite Storage `/view` avatar URLs may be converted only to first-party `/preview` URLs on Appwrite Cloud hosts. Current hero policy uses responsive `160/288/432 px` WebP candidates, `144x144` layout dimensions, eager loading, high fetch priority, async decoding, and one native image request. External and legacy URLs remain unchanged.
* Typewriter and launcher geometry must be reserved before dynamic text or hints render. Do not reintroduce initial hidden-to-visible hero motion that delays LCP or causes layout shifts.
* PublicSections, contact setup, and chat are optional for first paint and currently wait `4,000 ms` after sanitized portfolio data. Exact portfolio-route monitoring waits `10,000 ms`. Analytics semantics remain eventual and must not be removed.
* Production Phase 3 evidence is `5.860 s` median cold-mobile LCP, `0.064` median mobile CLS, and `11.25-11.28 KB` for one mobile avatar request. The `<4.0 s` cold-mobile target remains unmet because the shared entry/provider graph delays route-shell requests to approximately `3.6 s`, followed by approximately one second of Appwrite latency and hero paint.
* Further optimization requires a separately approved architecture pass for a smaller public entry/provider graph or earlier pre-React server-function request. Do not add a duplicate backend, bypass password checks, broaden Appwrite permissions, or hand-roll a second public data contract.

## Editor Startup and Hydration Policy

* The Editor route is query-driven: `/editor?id=<resumeId>`, with `resumeId` accepted as a compatibility query parameter.
* A valid URL target is the synchronous first-render React Query key. Persisted Zustand state must not delay route bootstrap or override a different URL target.
* Editor readiness requires auth, the exact requested document, owner confirmation, and normalized editable state. The full resume library and noncritical workspace data are not readiness dependencies.
* Rendering, autosave, Preview, and Editor effects may consume a resume only when its ID matches the requested target and the fetched document is confirmed for the authenticated owner.
* `src/lib/editorResumeStartup.ts` owns the current route/store resolution and matching-document rules. Keep those rules centralized when changing startup behavior.
* Readiness-critical Appwrite reads must be bounded and must distinguish not-found from timeout/network failure. Current Editor policy is a `5,000 ms` request timeout, no automatic query retry, immediate loading UI, and a `2,500 ms` slow-loading notice.
* Do not restore the former eight-second Editor redirect. Startup failures require an explicit safe Retry/Dashboard state, not an unrelated timed navigation.
* Stable query keys and TanStack Query caching provide same-document request deduplication. Do not add a parallel document-fetch layer.

## Authenticated Broadcast Policy

* The `broadcasts` collection is treated as an authenticated workspace announcement source, separate from the public app-settings `AnnouncementBanner`.
* Public standalone routes and pre-auth states must not issue the Broadcast request.
* Authenticated workspace routes may request Broadcasts only after `authReady` and a user ID are present. `BroadcastBanner` creates a short-lived Appwrite JWT and calls `GET /api/broadcasts`.
* The Vercel endpoint validates the JWT through Appwrite `/account`, reads the server-only collection with the server API key, filters active/non-expired records, fails closed for malformed required fields or expiry values, and returns only `id`, `title`, `body`, and `severity`.
* Browser code must not query the `broadcasts` collection directly. Collection permissions remain empty; normal users have no create, update, delete, activate, or schedule access.
* The canonical status field is `active`; the only approved schedule field is optional `expires_at`. Start-time scheduling is not part of the current contract.
* Session dismissal remains browser-local. Disabling the authenticated policy clears loaded Broadcast state so logout cannot retain a prior workspace banner.
