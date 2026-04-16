/**
 * Shared rate limiter for edge functions.
 * Checks ai_usage_logs for recent requests by the same user.
 */

import { getServiceClient } from './dbClient.ts';

export interface RateLimitConfig {
  /** Max requests allowed in the window for Free plan users */
  maxRequests: number;
  /** Max requests allowed in the window for Pro plan users */
  proMaxRequests?: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Action type to track (e.g. 'score', 'enhance', 'tailor') */
  actionType: string;
  /** The user's effective plan: 'free' | 'pro' | 'premium' */
  plan?: string;
}


const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowSeconds: 60,
  actionType: 'ai_request',
};

/**
 * Check if a user has exceeded their rate limit.
 * Returns { allowed: boolean, remaining: number, retryAfterSeconds?: number }
 *
 * Plan-aware limits:
 *  - Premium users: no effective rate limit (very high ceiling of 10000)
 *  - Pro users: proMaxRequests (defaults to 5x maxRequests)
 *  - Free users: maxRequests
 *
 * Fail-OPEN on infra errors: see userRateLimiter.ts for rationale. A shared
 * rate-limit table being a single point of failure for every AI feature is
 * worse than a brief rate-limit bypass. Credits and provider-side limits
 * still bound abuse.
 */
export async function checkRateLimit(
  userId: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number; dbError?: boolean }> {
  const merged = { ...DEFAULT_CONFIG, ...config };
  const { windowSeconds, actionType, plan } = merged;

  // Premium users are not rate-limited
  if (plan === 'premium') {
    return { allowed: true, remaining: 10000 };
  }

  // Determine effective max requests based on plan
  let maxRequests: number;
  if (plan === 'pro') {
    maxRequests = merged.proMaxRequests ?? merged.maxRequests * 5;
  } else {
    maxRequests = merged.maxRequests;
  }

  const supabase = getServiceClient();

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', windowStart);

  if (error) {
    // Fail-OPEN: see module header. Blocking every AI feature because a shared
    // rate-limit table query failed is a worse outcome than a brief bypass.
    console.error(
      '[rateLimiter] check failed — FAILING OPEN to keep AI online. ' +
        'Fix the underlying DB/schema issue to restore rate limiting. Error:',
      error,
    );
    return { allowed: true, remaining: maxRequests };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, maxRequests - used);

  if (used >= maxRequests) {
    return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds };
  }

  return { allowed: true, remaining };
}

/**
 * Check and record an IP-based rate limit against the `rpc_rate_limits` table.
 *
 * Unlike the user-based limiter this targets anonymous/public endpoints.
 * Fail-open: if the DB query errors, the request is allowed through so that
 * a transient DB issue does not block legitimate visitors. DB errors are
 * logged for observability.
 *
 * @param ip             Client IP address (from x-forwarded-for or x-real-ip)
 * @param endpoint       Logical endpoint key, e.g. "track-portfolio-view"
 * @param maxRequests    Maximum requests per window
 * @param windowSeconds  Sliding window size in seconds (default 60)
 */
export async function checkIpRateLimit(
  ip: string,
  endpoint: string,
  maxRequests: number,
  windowSeconds = 60,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error: countError } = await supabase
    .from('rpc_rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart);

  if (countError) {
    console.error('[ipRateLimit] count query failed (fail-open):', countError);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const used = count ?? 0;

  if (used >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  const { error: insertError } = await supabase
    .from('rpc_rate_limits')
    .insert({ ip_address: ip, endpoint });

  if (insertError) {
    console.error('[ipRateLimit] insert failed (allowing current request):', insertError);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Record a usage event for rate limiting.
 */
export async function recordUsage(
  userId: string,
  actionType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from('ai_usage_logs')
    .insert({
      user_id: userId,
      action_type: actionType,
      metadata: metadata ?? null,
    });

  if (error) {
    console.error('Record usage error:', error);
  }
}

/**
 * Fetch the user's effective plan from the profiles/subscriptions table.
 * Returns 'free' | 'pro' | 'premium'.
 * Defaults to 'free' if not found or on error.
 */
export async function getUserPlan(userId: string): Promise<string> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan_name, trial_plan, trial_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn('Failed to fetch user plan for rate limiting, defaulting to free:', error);
    }
    return 'free';
  }

  const KNOWN_PLANS = new Set(['free', 'pro', 'premium']);

  const normalizePlan = (raw: unknown): string => {
    const lowered = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
    return KNOWN_PLANS.has(lowered) ? lowered : 'free';
  };

  // Respect active trial
  if (data.trial_plan && data.trial_expires_at && new Date(data.trial_expires_at) > new Date()) {
    return normalizePlan(data.trial_plan);
  }

  return normalizePlan(data.plan_name);
}
