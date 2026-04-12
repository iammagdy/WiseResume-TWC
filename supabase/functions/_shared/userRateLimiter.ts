/**
 * Server-side per-user rate limiter backed by the `rpc_rate_limits` table.
 *
 * This is the authoritative enforcement layer — it prevents bypassing the
 * client-side rate limiter by refreshing the page, opening new tabs, or
 * calling edge functions directly.
 *
 * Usage:
 *   const result = await checkUserRateLimit(userId, 'tailor', 10, 60);
 *   if (!result.allowed) return 429;
 */

import { getServiceClient } from './dbClient.ts';

export interface UserRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Checks and records a rate-limit event for an authenticated user.
 *
 * @param userId       Authenticated user UUID (from requireAuth)
 * @param featureKey   Feature name, e.g. "tailor", "chat", "analyze", "cover_letter"
 * @param maxRequests  Maximum number of requests allowed in the window
 * @param windowSeconds  Sliding window size in seconds
 * @returns `{ allowed: true }` when under the limit; `{ allowed: false, retryAfterSeconds }` when exceeded
 */
export async function checkUserRateLimit(
  userId: string,
  featureKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<UserRateLimitResult> {
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('rpc_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', featureKey)
    .gte('created_at', windowStart);

  if (error) {
    // Fail open on transient DB errors — don't block users for infrastructure issues
    console.error('[userRateLimiter] count query failed:', error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;

  if (used >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  // Record this request (fire-and-forget; a failure here should not block the user)
  const { error: insertError } = await supabase
    .from('rpc_rate_limits')
    .insert({ user_id: userId, endpoint: featureKey, ip_address: 'user:' + userId });

  if (insertError) {
    console.error('[userRateLimiter] insert failed:', insertError);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
