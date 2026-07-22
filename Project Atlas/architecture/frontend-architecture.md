# Canonical Frontend Architecture

**Last Verified:** 2026-07-22
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
* The global deferred prefetch list may warm Dashboard, Upload, Framer Motion, and the splash component, but it must not include `EditorPage`.
* Authenticated route-aware prefetch is implemented in `AppInterior`; Dashboard/Upload/Editor workspace paths may warm their own route chunks after navigation context is known.
* `tests/build/performance-build-contract.test.cjs` is the post-build regression contract for charts entry isolation, public Editor-prefetch exclusion, and heavy lazy chunk preservation.

## Authenticated Broadcast Policy

* The `broadcasts` collection is treated as an authenticated workspace announcement source, separate from the public app-settings `AnnouncementBanner`.
* Public standalone routes and pre-auth states must not issue the Broadcast collection query.
* Authenticated workspace routes may query only after `authReady` and a user ID are present. Unexpected authenticated failures must produce a scoped safe warning.
* Production currently reports `400 Invalid query: Attribute not found in schema: active` for the authenticated Broadcast query. Resolve that schema/contract drift only in a separately approved Appwrite task; do not broaden public permissions.
