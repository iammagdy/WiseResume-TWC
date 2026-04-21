/**
 * Server-side per-user rate limiter backed by the `rpc_rate_limits` table.
 *
 * This is the authoritative enforcement layer — it prevents bypassing the
 * client-side rate limiter by refreshing the page, opening new tabs, or
 * calling edge functions directly.
 *
 * FAIL-OPEN on infrastructure errors: a DB read failure on this shared
 * rate-limit table is a single point of failure for every AI feature in the
 * app. Rather than returning 503 and taking down chat / scoring / tailoring
 * for everyone on a schema drift or DB blip, we log loudly and allow the
 * request through. Abuse is still bounded by:
 *   - per-request credit checks (checkAndDeductCredit)
 *   - provider-side rate limits (OpenRouter / Groq)
 *   - client-side rate limiters for UX
 * The previous fail-closed behaviour caused an incident where a missing
 * user_id column / migration lag returned 503 "Service temporarily
 * unavailable" for every AI call in the product.
 *
 * Usage:
 *   const result = await checkUserRateLimit(userId, 'tailor', 10, 60);
 *   if (!result.allowed) return 429/503;
 */

import { getServiceClient } from './dbClient.ts';
import { recordFailOpen } from './opsHealth.ts';
import { scrubAndCap } from './scrubSecrets.ts';

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
    // Fail-OPEN on infra errors (see module header). Credits + provider-side
    // limits still bound abuse; blocking every AI call on a DB hiccup is a
    // worse outcome than a single user briefly exceeding their per-feature
    // sliding-window cap.
    console.error(
      '[userRateLimiter] count query failed — FAILING OPEN to keep AI online. ' +
        'Fix the underlying DB/schema issue to restore rate limiting. Error:',
      error,
    );
    // AI-5: structured fail-open signal so on-call can alert when the
    // server-side rate limiter has silently degraded to permissive mode.
    recordFailOpen('rate_limiter_fail_open', {
      feature: featureKey,
      reason: scrubAndCap(error.message),
    });
    return { allowed: true, retryAfterSeconds: 0 };
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
    recordFailOpen('rate_limiter_insert_fail_open', {
      feature: featureKey,
      reason: scrubAndCap(insertError.message),
    });
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
