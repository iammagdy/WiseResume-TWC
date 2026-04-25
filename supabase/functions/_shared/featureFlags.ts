/**
 * Shared feature flag helper for Edge Functions.
 *
 * isFeatureEnabled(flagName, userId?, plan?) resolves whether a given flag
 * is active for a specific user/plan combination using the following
 * precedence (highest → lowest):
 *
 *   1. Kill switch — if kill_switch_function is set on this flag, the function
 *      calling this helper is being killed; returns FALSE (caller should 503).
 *   2. Per-user override — if userId is in enabled_user_ids, returns TRUE.
 *   3. Per-plan — if plan is in enabled_plans, returns TRUE.
 *   4. Percentage rollout — if userId is provided, hashes it deterministically
 *      and compares against percentage_rollout (0-100).
 *   5. Global default — returns enabled_globally.
 *
 * isKillSwitchActive(functionName) returns true when a flag has
 * kill_switch_function === functionName and enabled_globally === true.
 * Edge functions should call this at the top of their handler.
 */

import { getServiceClient } from './dbClient.ts';

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled_globally: boolean;
  enabled_plans: string[];
  enabled_user_ids: string[];
  percentage_rollout: number;
  kill_switch_function: string | null;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

/**
 * Deterministic 0-99 bucket for a userId, used for percentage rollouts.
 * Uses a simple FNV-1a-like hash over the UUID bytes.
 */
async function userBucket(userId: string): Promise<number> {
  const encoded = new TextEncoder().encode(userId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const view = new DataView(hashBuffer);
  return view.getUint32(0, false) % 100;
}

/**
 * Returns whether the named feature is enabled for the given user/plan.
 * Returns false if the flag does not exist (fail-closed).
 */
export async function isFeatureEnabled(
  flagName: string,
  userId?: string | null,
  plan?: string | null,
): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('name', flagName)
      .maybeSingle();

    if (error || !data) return false;
    const flag = data as FeatureFlag;

    // Kill switch: if this flag is wired to kill a function, it must NOT
    // be the feature check for that function itself (that is handled by
    // isKillSwitchActive). Here we just check the flag normally.

    // Per-user override
    if (userId && flag.enabled_user_ids?.includes(userId)) return true;

    // Per-plan
    if (plan && flag.enabled_plans?.includes(plan)) return true;

    // Percentage rollout
    if (flag.percentage_rollout > 0 && userId) {
      const bucket = await userBucket(userId);
      if (bucket < flag.percentage_rollout) return true;
    }

    // Global default
    return flag.enabled_globally;
  } catch {
    return false;
  }
}

/**
 * Returns true when an active kill switch targets `functionName`.
 * Edge functions should call this first and return 503 if true.
 *
 * Example usage at the top of an edge function:
 *
 *   if (await isKillSwitchActive('my-edge-function')) {
 *     return new Response(
 *       JSON.stringify({ success: false, error: 'Feature temporarily unavailable' }),
 *       { status: 503, headers: corsHeaders },
 *     );
 *   }
 */
export async function isKillSwitchActive(functionName: string): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled_globally')
      .eq('kill_switch_function', functionName)
      .eq('enabled_globally', true)
      .limit(1);

    if (error || !data) return false;
    return data.length > 0;
  } catch {
    return false;
  }
}
