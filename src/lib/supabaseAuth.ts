/**
 * Supabase Auth helpers — now powered by the Kinde→Supabase token bridge.
 *
 * Provides functions to get the current Supabase JWT and user ID,
 * used by edge function callers and utility files.
 */
import { getToken, getUserId } from '@/lib/supabaseBridge';
import {
  isImpersonating,
  getImpersonationToken,
  getImpersonationState,
} from '@/lib/impersonationStore';

/**
 * Get the current Supabase JWT for the active identity.
 *
 * When an admin is impersonating another user, the impersonation JWT is
 * returned so downstream callers (edgeFunctions, hooks, integrations)
 * always operate as the impersonated user. Otherwise the admin's own
 * Kinde→Supabase bridge token is returned. Returns null if no identity
 * is currently active.
 */
export async function getSupabaseToken(): Promise<string | null> {
  if (isImpersonating()) return getImpersonationToken();
  return getToken();
}

/**
 * Get the active authenticated user's UUID. Mirrors `getSupabaseToken()`
 * — impersonation takes precedence so the userId returned matches the JWT.
 */
export async function getAuthUserId(): Promise<string | null> {
  if (isImpersonating()) return getImpersonationState().userId;
  return getUserId();
}
