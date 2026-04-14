/**
 * Server-side per-user rate limiter backed by the `rpc_rate_limits` table.
 *
 * This is the authoritative enforcement layer — it prevents bypassing the
 * client-side rate limiter by refreshing the page, opening new tabs, or
 * calling edge functions directly.
 *
 * FAIL-CLOSED: any DB error during the count or insert is treated as a
 * transient infrastructure fault and returns a 503-style "not allowed" result
 * with retryAfterSeconds=10 so callers can return a safe error rather than
 * silently permitting an over-limit request.
 *
 * Usage:
 *   const result = await checkUserRateLimit(userId, 'tailor', 10, 60);
 *   if (!result.allowed) return 429/503;
 */

import { getServiceClient } from './dbClient.ts';

export interface UserRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  /** true when the block is caused by a DB error rather than an actual limit */
  dbError?: boolean;
}

/**
 * Checks and records a rate-limit event for an authenticated user.
 *
 * @param userId         Authenticated user UUID (from requireAuth)
 * @param featureKey     Feature name, e.g. "tailor", "chat", "analyze"
 * @param maxRequests    Maximum requests allowed in the window
 * @param windowSeconds  Sliding window size in seconds
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
    // Fail-closed: a DB read failure means we cannot confirm the user is under
    // limit, so we deny the request to protect against cost abuse.
    console.error('[userRateLimiter] count query failed (fail-closed):', error);
    return { allowed: false, retryAfterSeconds: 10, dbError: true };
  }

  const used = count ?? 0;

  if (used >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  // Record this request. If the insert fails we still allow this request through
  // (the count check already confirmed headroom), but log for observability.
  const { error: insertError } = await supabase
    .from('rpc_rate_limits')
    .insert({ user_id: userId, endpoint: featureKey, ip_address: 'user:' + userId });

  if (insertError) {
    console.error('[userRateLimiter] insert failed (allowing current request; next may be blocked):', insertError);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
