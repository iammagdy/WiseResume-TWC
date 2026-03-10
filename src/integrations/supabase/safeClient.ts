/**
 * Authenticated Supabase client pointing to project jnsfmkzgxsviuthaqlyy.
 *
 * Uses the token bridge (Kinde → Supabase JWT) for authorization.
 * All runtime code should import from this file.
 *
 * On 401 responses, attempts a single token refresh before failing.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken, refreshTokenIfNeeded } from '@/lib/supabaseBridge';

/**
 * Create a Supabase client that injects the bridge token on every request.
 * Automatically retries once on 401 after refreshing the bridge token.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

      const response = await doFetch(getToken());

      // On 401, try refreshing the bridge token once and retry
      if (response.status === 401) {
        const refreshed = await refreshTokenIfNeeded();
        if (refreshed) {
          return doFetch(getToken());
        }
        // Dispatch session expired event for UI handling
        window.dispatchEvent(new CustomEvent('app:session-expired'));
      }

      return response;
    },
  },
});

// Backward-compatible exports
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_PUBLISHABLE_KEY };
