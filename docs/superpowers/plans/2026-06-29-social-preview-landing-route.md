# Social Preview and Landing Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public landing routes authentication-independent and serve internally consistent, crawler-visible social-preview metadata.

**Architecture:** Keep social-card data static in `index.html`, backed by one root-level PNG in `public/`. Protect the routing and metadata contracts with source-and-asset integration tests that do not depend on browser JavaScript execution.

**Tech Stack:** Vite, React, TypeScript, Vitest, Vercel

---

### Task 1: Add social-preview and landing-route contracts

**Files:**
- Create: `src/lib/__tests__/socialPreviewMetadata.test.ts`
- Create: `src/pages/__tests__/landingRouteContract.test.ts`

- [x] **Step 1: Write the metadata contract test**

Read `index.html` and the PNG IHDR bytes. Assert that `og:image` and `twitter:image` use the absolute production URL, that the declared width and height equal the image dimensions, that the MIME type is `image/png`, and that both Open Graph and X alt text exist.

- [x] **Step 2: Run the metadata test and verify RED**

Run: `npm test -- src/lib/__tests__/socialPreviewMetadata.test.ts`

Expected: FAIL because the HTML declares `1200x630`, omits `og:image:type`, and omits `twitter:image:alt`.

- [x] **Step 3: Write the landing-route contract test**

Read `src/App.tsx` and `src/pages/Index.tsx`. Assert that `/` and `/enterprises` render `AppLanding`, and that `Index.tsx` does not navigate authenticated users to `/wisehire/dashboard`.

- [x] **Step 4: Run the landing contract**

Run: `npm test -- src/pages/__tests__/landingRouteContract.test.ts`

Expected: PASS because commit `1a93e189` already removed the regression locally.

### Task 2: Correct static social metadata

**Files:**
- Modify: `index.html`
- Modify: `src/pages/Index.tsx`

- [x] **Step 1: Remove crawler-invisible image swapping**

Remove `og:image` and `twitter:image` mutations from the pre-React brand script and the landing component. Preserve favicon switching and runtime title, description, and URL behavior.

- [x] **Step 2: Make static metadata match the asset**

Keep both image tags on `https://wiseresume.app/wiseresume-og.png?v=5`; declare `og:image:secure_url`, `og:image:type=image/png`, `og:image:width=1280`, `og:image:height=672`, `og:image:alt`, and `twitter:image:alt`.

- [x] **Step 3: Run both targeted tests and verify GREEN**

Run: `npm test -- src/lib/__tests__/socialPreviewMetadata.test.ts src/pages/__tests__/landingRouteContract.test.ts`

Expected: both test files pass.

### Task 3: Document and verify

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `Project Atlas/04-For You (Plain Language)/stability-improvements.md`

- [x] **Step 1: Record the technical and owner-facing changes**

Add a dated changelog entry naming the metadata and route contracts. Add a plain-language stability entry and update its `Last verified` date to `2026-06-29`.

- [x] **Step 2: Run production verification**

Run: `npm test -- src/lib/__tests__/socialPreviewMetadata.test.ts src/pages/__tests__/landingRouteContract.test.ts`

Run: `npm run build`

Expected: targeted tests and the production build pass without errors.

- [ ] **Step 3: Deploy and verify live responses**

Deploy the current revision to Vercel production. Fetch `/` and `/wiseresume-og.png?v=5` with X and Facebook crawler user agents and confirm HTTP 200 responses, static metadata, matching dimensions, and no authentication-dependent landing redirect.
