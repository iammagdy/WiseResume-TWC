/**
 * Clerk-to-Supabase token bridge.
 *
 * Provides helpers to get a Clerk-issued JWT (with `sub` = supabaseUuid)
 * and an authenticated Supabase client that uses that JWT.
 */
import { useMemo, useCallback } from 'react';
import { useSession } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hjnnamwgztlhzkeuufln.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqbm5hbXdnenRsaHprZXV1ZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNTE4MTcsImV4cCI6MjA4NTkyNzgxN30.cupd_dz6KHSJaBnUPQzJmQcYc38RTDVIMU5RP25xCso';

/**
 * Get a Clerk-issued Supabase JWT token.
 * The JWT template must be named "supabase" in Clerk Dashboard,
 * with sub = {{user.public_metadata.supabaseUuid}}.
 *
 * Works from any context — no React hook required.
 */
export async function getClerkSupabaseToken(): Promise<string | null> {
  // @ts-expect-error Clerk global is available in browser
  const clerk = window.Clerk;
  if (!clerk?.session) return null;
  try {
    const token = await clerk.session.getToken({ template: 'supabase' });
    return token;
  } catch (e) {
    console.warn('Failed to get Clerk Supabase token:', e);
    return null;
  }
}

/**
 * React hook: returns a Supabase client that automatically
 * uses the Clerk-issued JWT for auth on every request.
 *
 * Usage:
 *   const supabase = useClerkSupabaseClient();
 *   const { data } = await supabase.from('resumes').select('*');
 */
export function useClerkSupabaseClient(): SupabaseClient<Database> {
  const { session } = useSession();

  const client = useMemo(() => {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {},
        fetch: async (input, init) => {
          // Inject the Clerk Supabase token on every request
          let token: string | null = null;
          try {
            token = await session?.getToken({ template: 'supabase' }) ?? null;
          } catch {
            // Session may have expired
          }
          const headers = new Headers(init?.headers);
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          return fetch(input, { ...init, headers });
        },
      },
    });
    // Re-create client when session reference changes (sign-in / sign-out)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return client;
}

/**
 * Hook that returns a stable function to get the current token.
 * Useful inside callbacks where you need the token but can't await in render.
 */
export function useClerkToken() {
  const { session } = useSession();

  return useCallback(async (): Promise<string | null> => {
    if (!session) return null;
    try {
      return await session.getToken({ template: 'supabase' });
    } catch {
      return null;
    }
  }, [session]);
}
