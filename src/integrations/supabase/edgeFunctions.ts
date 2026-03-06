import { supabase } from './safeClient';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';

/**
 * Authenticated edge function client.
 * Reuses the safeClient instance to avoid extra GoTrueClient warnings.
 * Uses Clerk-issued Supabase JWT for authentication.
 */
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

      return supabase.functions.invoke(fnName, {
        ...options,
        headers,
      });
    },
  },
};
