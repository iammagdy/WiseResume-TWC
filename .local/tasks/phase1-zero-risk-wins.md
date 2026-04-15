# Phase 1: Zero-Risk Performance Wins

## What & Why
Three surgical, low-risk changes that eliminate the biggest user-facing performance bottleneck (the landing page blocking spinner) and two infrastructure problems (DevToolsPage eager load, puppeteer in production deps). No component logic or data flows are touched — only import patterns and a single conditional render.

## Done looks like
- The landing page renders its full content immediately for all visitors, without waiting for auth to resolve. Auth-dependent UI (user avatar/menu) shows a graceful placeholder while loading, then hydrates when ready.
- The DevToolsPage code is not downloaded by normal users — it only loads when `/devkit` is navigated to.
- `npm install` no longer attempts to download a Chrome browser. No `PUPPETEER_SKIP_DOWNLOAD=true` workaround is needed going forward.
- All existing functionality (auth, routing, dashboard, editor) continues to work exactly as before.

## Out of scope
- Splash screen changes (Phase 2)
- Bundle dependency removals (Phase 2)
- UX flow improvements (Phase 3)

## Tasks
1. **Fix landing page auth-loading guard** — Remove the `if (authLoading) return <PageLoadingSpinner />` early return in `Index.tsx`. Instead, keep rendering the full landing page and make only the user-avatar/dropdown header section conditional on auth state, showing a subtle skeleton or nothing while `authLoading` is true. This is the single change that most directly improves FCP for every visitor.

2. **Lazy-load DevToolsPage** — Convert the eager `import DevToolsPage from "./pages/DevToolsPage"` to a `lazyWithRetry` dynamic import in `App.tsx`, wrapping the route element in a `<Suspense fallback={<PageLoadingSpinner />}>` like all other admin/internal pages.

3. **Move puppeteer to devDependencies** — In `package.json`, move `puppeteer` from `dependencies` to `devDependencies`. The `.npmrc` already has `PUPPETEER_SKIP_DOWNLOAD=true` as a safety net, but the correct fix is the proper dependency classification so production builds and Replit deploys don't attempt to pull a browser binary.

## Relevant files
- `src/pages/Index.tsx:264,364`
- `src/App.tsx:60,348`
- `package.json:106-130`
