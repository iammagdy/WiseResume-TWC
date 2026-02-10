/**
 * Shared rate limiter for edge functions.
 * Checks ai_usage_logs for recent requests by the same user.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Action type to track (e.g. 'score', 'enhance', 'tailor') */
  actionType: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowSeconds: 60,
  actionType: 'ai_request',
};

/**
 * Check if a user has exceeded their rate limit.
 * Returns { allowed: boolean, remaining: number, retryAfterSeconds?: number }
 */
export async function checkRateLimit(
  userId: string,
  config: Partial<RateLimitConfig> = {}
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds?: number }> {
  const { maxRequests, windowSeconds, actionType } = { ...DEFAULT_CONFIG, ...config };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', actionType)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Rate limit check error:', error);
    // Fail open — don't block users if the check itself fails
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
 * Record a usage event for rate limiting.
 */
export async function recordUsage(
  userId: string,
  actionType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

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
