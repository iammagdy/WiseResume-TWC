# Phase 9 — Stale-chunk silent recovery

**Last verified:** 2026-04-21
**Type:** stability fix
**Sources:**
- `src/lib/lazyWithRetry.ts` (chunk-error detection + one-shot silent reload)
- `src/main.tsx` (clears the reload guard once the post-reload boot is stable)
- `src/components/ErrorBoundary.tsx` (existing fallback path, lines 112–143 — kept as belt-and-braces)
- `public/custom-sw.js` (tombstone service worker that activates on the silent reload's update check)
- `public/.htaccess` lines 44–60 (no-cache headers on `index.html` + `custom-sw.js` so the SW update check sees fresh bytes)
- `CHANGELOG.md` 2026-04-21 "Recover silently when a stale service worker serves a missing chunk"

**Canonical owner:** `project-governance/ARCHITECTURE.md` §3 (Frontend boot + SW lifecycle)

---

## Why it exists

Every visitor who installed the old Workbox PWA service worker (pre-removal) still has it cached locally. On their next visit it serves the precached `index.html` + entry bundle from the previous build. That entry bundle's `import("./AppLanding-<old-hash>.js")` then fetches a chunk filename that no longer exists in `public_html/resume/` (the deploy uses `lftp mirror --reverse --delete`, so old hashed chunks are removed). The fetch returns a 404 + HTML fallback, the dynamic `import()` rejects with a `TypeError: Failed to fetch dynamically imported module`, React Suspense bubbles the rejection up to `ErrorBoundary`, and the user sees a red error screen with "Retrying in 5 seconds…" before `clearSiteData()` reloads.

The tombstone `public/custom-sw.js` is byte-correct on the live site (sha256 `3b88c113…`), but a service worker only activates on the next visit's SW update check — which happens *after* the page has booted from the stale precache. So the very first chunk fetch in the bad session is doomed; only the reload after that fetch's failure can pick up the tombstone and clean up.

The user-visible symptom was a red error screen on every "first visit after the next deploy" for any returning user — most painfully on the dashboard after sign-in, where the "Retrying in 5s" countdown looked like a hard crash.

## How it works now

`lazyWithRetry.ts` wraps every dynamic-import factory with a chained `.catch` that runs after the existing 3-attempt online/offline retry loop has been exhausted. On the final failure it inspects the rejection and, if it matches a chunk-load error pattern (`ChunkLoadError`, `Failed to fetch dynamically imported module`, `error loading dynamically imported module`, `Importing a module script failed`, `Loading chunk`, `Loading CSS chunk`), triggers a one-shot `window.location.reload()`. The reload is gated by a `sessionStorage` key (`wr.chunk-reload-attempted`) so a genuinely-broken environment cannot loop. After the reload the browser performs its normal SW update check, picks up the tombstone (served `Cache-Control: no-cache` from `.htaccess`), the tombstone unregisters itself + flushes all named caches in its `activate` handler, and the next request hits the network with a clean slate.

The reload returns a never-resolving Promise so React Suspense doesn't briefly surface the rejection in the dying tab — there is no red flash, no countdown, just a normal page reload.

`src/main.tsx` clears the guard 8 seconds after `createRoot.render()`. If the post-reload boot survives that long, the recovery worked — and we want a *future* deploy that strands the same tab to be allowed its own one-shot recovery, rather than locking the user out for the rest of the browser session.

## Why this is safe

- **DEV is a no-op.** `import.meta.env.DEV` short-circuits the silent-reload path entirely. Vite HMR's chunk fetches that fail mid-edit continue to surface in the existing ErrorBoundary so developers see the real error.
- **No infinite reload loop.** The guard is a per-session sessionStorage key. Two consecutive failures within one boot attempt only trigger one reload; after the reload, even another failure goes through to the ErrorBoundary's existing chunk handler (which has its own independent `wiseresume-chunk-retry-time` / `wiseresume-chunk-retry-count` counter, MAX 3 retries in 30s, then stops).
- **Private-mode browsers degrade gracefully.** If `sessionStorage.setItem` throws (Safari private mode, storage disabled), `attemptSilentReload` returns `false` and the original error is rethrown — the ErrorBoundary path handles it exactly as before.
- **Coordinates with ErrorBoundary, doesn't fight it.** Different sessionStorage namespaces (`wr.*` vs `wiseresume-chunk-retry-*`) means the upstream silent reload and the downstream visible-recovery reload can't double-count each other.
- **Tombstone-readiness is real.** The tombstone SW is already deployed and was verified byte-identical to the repo (`sha256 3b88c113…`). `.htaccess` serves both `index.html` and `custom-sw.js` with `no-cache, no-store, must-revalidate` so the browser's SW update check on the silent reload always sees current bytes and triggers `install` → `activate` → `unregister`.

## What this does NOT change

- The ErrorBoundary's chunk-handling fallback (lines 112–143) is kept verbatim. It is now the second layer (private mode, post-reload re-failure, non-lazy-import code paths), not the primary user experience.
- No change to the tombstone (`public/custom-sw.js`), the deploy workflow (`.github/workflows/deploy.yml`), the Hostinger `.htaccess` cache rules, the theme/scheme stamping in `src/pages/Index.tsx`, or any landing-page CSS.
- No change to `App.tsx`'s lazy entry points themselves — `AppLanding`, `AppInterior`, `AnimatedSplash`, and every page-level `lazyWithRetry(...)` call inherits the new behaviour automatically.

## Operator note

After this fix is deployed (workflow_dispatch on `deploy.yml`), the *first* visit by any returning user with the stale Workbox SW will still trigger one silent reload — that is the recovery itself, and it is invisible. Every visit after that for the same browser is on the clean tombstone path with no SW registered.
