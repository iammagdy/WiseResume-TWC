/**
 * Supabase Auth helpers.
 *
 * Provides functions to get the current session access token and user ID,
 * used by edge function callers and utility files.
 */
import { supabase } from '@/integrations/supabase/safeClient';

/**
 * Get the current Supabase Auth access token.
 * Returns null if the user is not authenticated.
 */
export async function getSupabaseToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user's UUID.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
