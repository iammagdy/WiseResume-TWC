# Phase 2: Dead Code & Bundle Cleanup

## What & Why
Remove confirmed-unused heavy libraries from the production bundle and eliminate debug console logs that leak to users. Three.js (@react-three/fiber, @react-three/drei, three) and GSAP (@gsap/react, gsap) are in `package.json` dependencies but have zero imports anywhere in the source code — they were included in the original project but never used. Removing them directly shrinks the JavaScript bundle that every user downloads. The `vite.config.ts` chunk-splitter also references the `three` package and needs to be updated accordingly.

## Done looks like
- The `three` chunk is gone from production builds — users no longer download Three.js or GSAP code.
- `npm install` is faster and the `node_modules` folder is smaller.
- The `unable to create webgl context` console error no longer appears on page load.
- All 39 `console.log` calls in page files are removed or converted to no-ops, so the browser console is clean for end users.
- All existing features (editor, AI, portfolio, interview, etc.) continue to work exactly as before — these libraries were unused, so no regressions are possible.

## Out of scope
- Removing any libraries that ARE used (framer-motion stays, all Radix stays, etc.)
- Changing any UI or user-visible behaviour
- UX flow fixes (Phase 3)

## Tasks
1. **Remove Three.js packages** — Uninstall `three`, `@react-three/fiber`, and `@react-three/drei` from `package.json` dependencies. Update `vite.config.ts` to remove the `three` entry from the `manualChunks` output function, since that chunk will no longer exist.

2. **Remove GSAP packages** — Uninstall `gsap` and `@gsap/react` from `package.json` dependencies. Both are confirmed unused (zero source imports). `framer-motion` already handles all animations.

3. **Remove debug console.log calls from pages** — Go through each of the 39 `console.log` / `console.warn` / `console.error` calls in `src/pages/*.tsx` and remove informational/debug ones. Preserve any `console.error` calls that surface genuine errors to developers (e.g. caught exception handlers). This is a straightforward line-deletion pass.

## Relevant files
- `package.json:1-105`
- `vite.config.ts:78-92`
- `src/pages/Index.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/EditorPage.tsx`
