# Cleanup: Index.tsx Leftover Issues

## What & Why
Two small leftover issues in `src/pages/Index.tsx` identified during the post-implementation review of Phase 1–3. Neither breaks functionality, but both are clean-up items that should be resolved.

## Done looks like
- The browser console no longer shows a `401` error on landing page load.
- ESLint reports no unused import warning for `PageLoadingSpinner` in `Index.tsx`.
- All other landing page behaviour (auth state, typewriter, scroll animations, CTAs) remains unchanged.

## Out of scope
- Any changes to other files
- Aurora WebGL error (pre-existing, device/env limitation, not actionable here)

## Tasks
1. **Remove unused `PageLoadingSpinner` import** — Delete the `import { PageLoadingSpinner } from '@/components/ui/PageLoadingSpinner'` line at line 5 of `Index.tsx`. The component it was guarding (`if (authLoading) return <PageLoadingSpinner />`) was removed in Phase 1, leaving this import orphaned.

2. **Fix the Supabase warm-up 401** — The backend warm-up `fetch` in `Index.tsx` sends a HEAD request to `SUPABASE_URL + '/rest/v1/'` which always returns 401 because the REST root requires auth. Replace the target URL with `SUPABASE_URL + '/rest/v1/?limit=0'` pointing to a non-auth endpoint, or more simply, remove the warm-up fetch entirely — Supabase connections are established on the first actual query anyway, so this pre-warm serves no practical purpose and just pollutes the network tab.

## Relevant files
- `src/pages/Index.tsx:5,307-314`
