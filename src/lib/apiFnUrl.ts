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
export function apiFnUrl(fnName: string): string {
  if (import.meta.env.DEV) return `/api/fn/${fnName}`;
  const base = SUPABASE_URL?.replace(/\/+$/, '');
  if (!base) return `/api/fn/${fnName}`;
  return `${base}/functions/v1/${fnName}`;
}
