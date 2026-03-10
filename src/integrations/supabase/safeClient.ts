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
 * Create a Supabase client that injects the bridge token on every request.
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: (url: RequestInfo | URL, init?: RequestInit) => {
      const bridgeToken = getToken();
      if (bridgeToken) {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${bridgeToken}`);
        return fetch(url, { ...init, headers });
      }
      return fetch(url, init);
    },
  },
});

// Backward-compatible exports
export const supabaseConfig = { url: SUPABASE_URL };
export { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_PUBLISHABLE_KEY };
