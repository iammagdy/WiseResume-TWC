import { createClient } from '@supabase/supabase-js';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConstants';

const _rawClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

/**
 * Authenticated edge function client.
 * Uses Clerk-issued Supabase JWT for authentication.
 */
export const edgeFunctions = {
  functions: {
    invoke: async (fnName: string, options?: { body?: any; headers?: Record<string, string> }) => {
      // Get the Clerk-issued Supabase JWT
      const token = await getClerkSupabaseToken();

      const headers: Record<string, string> = {
        ...(options?.headers || {}),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return _rawClient.functions.invoke(fnName, {
        ...options,
        headers,
      });
    },
  },
};
