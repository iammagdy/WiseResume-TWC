import { createClient } from '@supabase/supabase-js';
import { EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY } from '@/lib/supabaseConstants';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';

/**
 * Authenticated edge function client pointing at jnsfmkzgxsviuthaqlyy
 * (same project as the database — single-project architecture).
 */
const edgeClient = createClient(EDGE_FUNCTIONS_URL, EDGE_FUNCTIONS_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const edgeFunctions = {
  functions: {
    invoke: async (fnName: string, options?: { body?: any; headers?: Record<string, string> }) => {
      const token = await getClerkSupabaseToken();

      const headers: Record<string, string> = {
        ...(options?.headers || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return edgeClient.functions.invoke(fnName, {
        ...options,
        headers,
      });
    },
  },
};
