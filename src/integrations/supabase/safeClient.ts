/**
 * Authenticated Supabase client pointing to project jnsfmkzgxsviuthaqlyy.
 *
 * Uses the token bridge (Kinde → Supabase JWT) for authorization.
 * All runtime code should import from this file.
 *
 * On 401 responses, attempts a single token refresh before failing.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';
import { getImpersonationToken } from '@/lib/impersonationStore';
import { dispatchSessionExpiredOnce } from './sessionExpired';

/**
 * PostgREST returns these codes when the JWT signing key doesn't match,
 * the token is expired, or claims are invalid. The HTTP status varies
 * (often 401 but sometimes 400 with the code in the body), so we have to
 * peek at the body when the status alone isn't conclusive.
 */
const POSTGREST_AUTH_CODES = new Set(['PGRST301', 'PGRST302', 'PGRST303']);

async function shouldForceRefresh(response: Response): Promise<boolean> {
  if (response.status === 401) return true;
  // PostgREST normally returns 401 for JWT failures, but some configurations /
  // proxies surface the same error on 400, 403, or even 200 with the code in
  // the body (e.g. when a function wraps the call). Be defensive across all
  // of those — we only spend the body-clone cost on non-2xx success paths or
  // on JSON 200 responses that can cheaply be inspected.
  if (![200, 400, 403].includes(response.status)) return false;
  try {
    // Clone so the original response is still consumable by supabase-js.
    const clone = response.clone();
    const ct = clone.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return false;
    const body = await clone.json().catch(() => null) as { code?: string; error?: { code?: string } } | null;
    const code = body?.code ?? body?.error?.code;
    return !!code && POSTGREST_AUTH_CODES.has(code);
  } catch {
    return false;
  }
}

/**
 * Create a Supabase client that injects the bridge token on every request.
 * Automatically retries once on 401 / PGRST301 after force-refreshing the
 * bridge token. Falls back to a placeholder URL when env vars are not
 * configured so the module does not throw at initialization time (all API
 * calls will fail gracefully until real credentials are provided via secrets).
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const doFetch = (token: string | null) => {
        if (token) {
          const headers = new Headers(init?.headers);
          headers.set('Authorization', `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        }
        return fetch(url, init);
      };

      const impersonationToken = getImpersonationToken();
      const response = await doFetch(impersonationToken ?? getToken());

      // On 401 OR a PostgREST JWT-rejection error (PGRST301/PGRST302/PGRST303),
      // the bridge token is unusable even if its local expiry hasn't fired.
      // Skip auto-refresh when impersonating — the impersonation token cannot
      // be refreshed via the standard bridge and a 401 likely means the session
      // was revoked server-side.
      if (impersonationToken) return response;

      // Force-refresh the bridge and retry once before surfacing the failure.
      const needsRetry = await shouldForceRefresh(response);
      if (needsRetry) {
        const refreshed = await refreshTokenIfNeeded(true /* force */);
        if (refreshed) {
          return doFetch(getToken());
        }
        // Dispatch session expired event for UI handling (debounced to avoid storms)
        dispatchSessionExpiredOnce();
      }

      return response;
    },
  },
});

// Backward-compatible exports
export const supabaseConfig = { url: SUPABASE_URL || 'https://placeholder.supabase.co' };
export { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_PUBLISHABLE_KEY };
