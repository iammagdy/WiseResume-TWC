/**
 * Authenticated Supabase client pointing to project jnsfmkzgxsviuthaqlyy.
 *
 * Uses the token bridge (Kinde → Supabase JWT) for authorization.
 * All runtime code should import from this file.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';
import { getToken } from '@/lib/supabaseBridge';

/**
 * Create a Supabase client that uses the bridge token for auth.
 * The `accessToken` callback is called on every request, so it always
 * uses the latest bridge token.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {},
    fetch: (url, options = {}) => {
      const bridgeToken = getToken();
      if (bridgeToken) {
        const headers = new Headers(options.headers);
        headers.set('Authorization', `Bearer ${bridgeToken}`);
        return fetch(url, { ...options, headers });
      }
      return fetch(url, options);
    },
  },
});

// Backward-compatible exports
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_PUBLISHABLE_KEY };
