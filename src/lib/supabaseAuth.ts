/**
 * Supabase Auth helpers — now powered by the Kinde→Supabase token bridge.
 *
 * Provides functions to get the current Supabase JWT and user ID,
 * used by edge function callers and utility files.
 */
import { getToken, getUserId } from '@/lib/supabaseBridge';

/**
 * Get the current Supabase JWT (from the bridge).
 * Returns null if the bridge hasn't exchanged yet.
 */
export async function getSupabaseToken(): Promise<string | null> {
  return getToken();
}

/**
 * Get the current authenticated user's UUID (deterministic from Kinde ID).
 * Returns null if not authenticated.
 */
export async function getAuthUserId(): Promise<string | null> {
  return getUserId();
}
