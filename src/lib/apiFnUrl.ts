import { SUPABASE_URL } from './supabaseConstants';

/**
 * Resolve the URL for a Supabase edge-function call.
 *
 * Phase 8 contract (do NOT revert again — see
 * `Project Atlas/01-Currently Implemented/stability-fixes/phase-8-prod-edge-function-routing.md`):
 *
 *   - Dev (`import.meta.env.DEV`): return the relative path `/api/fn/<name>`.
 *     Vite proxies it to the local Express server on :5001, which performs the
 *     Kinde→Supabase token exchange and forwards other authenticated calls.
 *     This keeps dev-only side effects (profile upsert, token-exchange logging,
 *     local Express endpoints) working unchanged.
 *
 *   - Production (Hostinger static hosting at `resume.thewise.cloud`): there is
 *     no Express server — the deploy is a `lftp mirror` of `dist/` to Hostinger
 *     (see `.github/workflows/deploy.yml`). `public/.htaccess` rewrites every
 *     non-existent path to `index.html`, so a relative `/api/fn/...` would
 *     return the SPA HTML with `200 OK + text/html`, JSON.parse would throw,
 *     and the auth bridge would surface the "Sign-in incomplete" card to every
 *     signed-in user. Instead we call the Supabase Edge Function directly:
 *     `${VITE_SUPABASE_URL}/functions/v1/<name>`.
 *
 * Why this is safe in prod without an `apikey` header:
 *   - Every function in `supabase/config.toml` is `verify_jwt = false`, so the
 *     Supabase gateway never blocks the request.
 *   - Auth is enforced *inside* each function (Kinde JWKS for `token-exchange`,
 *     `requireAuth` middleware for everything else).
 *   - CORS allow-lists `https://resume.thewise.cloud`
 *     (`supabase/functions/_shared/cors.ts`) and the CSP `connect-src` in
 *     `public/.htaccess` already includes `https://*.supabase.co`.
 *
 * The defensive fallback to `/api/fn/<name>` when `SUPABASE_URL` is empty is a
 * belt-and-braces safety net only: `src/lib/supabaseConstants.ts` already
 * throws on module load when `VITE_SUPABASE_URL` is missing in a PROD build,
 * so the fallback is unreachable at runtime in a properly-built bundle.
 */
/**
 * Portfolio-public consolidation (Task #49).
 *
 * Routes the four legacy portfolio public function names to the merged
 * `portfolio-public` router. Dispatch is signalled via a `?action=`
 * query parameter (NOT the body) so the original method (GET/POST),
 * body shape, and parse-vs-auth ordering are preserved byte-for-byte
 * inside each sub-handler. Set USE_MERGED_PORTFOLIO_PUBLIC=false to
 * fall back to the original endpoints if they are still deployed.
 *
 * Why a query param instead of a header (the coupons pattern):
 *   - `track-portfolio-view` is invoked via `navigator.sendBeacon`,
 *     which does NOT allow custom headers.
 *   - `portfolio-meta` and `resolve-short-link` are GET endpoints
 *     called from external link previews / redirects where the caller
 *     can only control the URL.
 *   A query-string dispatch works uniformly across all four call sites.
 */
const USE_MERGED_PORTFOLIO_PUBLIC = true;
const PORTFOLIO_FN_ACTIONS: Record<string, 'meta' | 'interest' | 'track-view' | 'resolve-short-link'> = {
  'portfolio-meta': 'meta',
  'portfolio-interest': 'interest',
  'track-portfolio-view': 'track-view',
  'resolve-short-link': 'resolve-short-link',
};

function rewritePortfolioFnName(fnName: string): string {
  if (!USE_MERGED_PORTFOLIO_PUBLIC) return fnName;
  // fnName may already include a query string (e.g. `resolve-short-link?id=xxx`).
  const qIdx = fnName.indexOf('?');
  const base = qIdx >= 0 ? fnName.slice(0, qIdx) : fnName;
  const tail = qIdx >= 0 ? fnName.slice(qIdx + 1) : '';
  const action = PORTFOLIO_FN_ACTIONS[base];
  if (!action) return fnName;
  const merged = `portfolio-public?action=${action}`;
  return tail ? `${merged}&${tail}` : merged;
}

// Visitor tracking endpoint: always call Supabase directly (no Express
// proxy path), even in dev, because sendBeacon cannot follow redirects
// and the dev proxy strips query params on forwarded paths.
const DIRECT_FN_NAMES = new Set(['track-visitor-event', 'stitch-visitor-identity']);

export function apiFnUrl(fnName: string): string {
  const rewritten = rewritePortfolioFnName(fnName);
  // The merged `portfolio-public` router is anonymous, CORS-allow-listed
  // for localhost dev origins, and its dispatch lives in the URL query
  // string. The dev Express proxy at /api/fn/:fnName strips query
  // strings before forwarding upstream (it only forwards path + body),
  // which would drop the `?action=` parameter. Bypass the dev proxy for
  // this router and call Supabase directly so dispatch works in dev
  // too. Production (already-direct) is unaffected.
  if (rewritten.startsWith('portfolio-public?') || rewritten === 'portfolio-public') {
    const directBase = SUPABASE_URL?.replace(/\/+$/, '');
    if (directBase) return `${directBase}/functions/v1/${rewritten}`;
  }
  // Always call visitor tracking / identity stitch directly so sendBeacon
  // works in dev (the Express proxy can't forward beacon payloads reliably).
  if (DIRECT_FN_NAMES.has(rewritten)) {
    const directBase = SUPABASE_URL?.replace(/\/+$/, '');
    if (directBase) return `${directBase}/functions/v1/${rewritten}`;
  }
  if (import.meta.env.DEV) return `/api/fn/${rewritten}`;
  const base = SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) return `/api/fn/${rewritten}`;
  return `${base}/functions/v1/${rewritten}`;
}
