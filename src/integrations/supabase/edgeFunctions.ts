import { createClient } from '@supabase/supabase-js';
import { getClerkSupabaseToken } from '@/lib/clerkSupabase';

const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jnsfmkzgxsviuthaqlyy.supabase.co';
const CLOUD_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impuc2Zta3pneHN2aXV0aGFxbHl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODM4MzQsImV4cCI6MjA4NzQ1OTgzNH0.gzgKuVPKUU3I6TFk9A5C2EPdd8Opz1SYafymiT62lV0';

const _rawClient = createClient(CLOUD_URL, CLOUD_KEY, {
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
