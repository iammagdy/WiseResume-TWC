import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Atomically deducts AI credits server-side before returning results to the client.
 *
 * A single RPC call passes the full `cost` so the deduction is all-or-nothing —
 * no partial charges can occur if the call fails partway through.
 *
 * For non-BYOK users: calls increment_ai_usage with p_cost=cost via the service
 * client (which bypasses RLS). The RPC increments daily_usage and total_usage
 * by `cost` in one atomic operation.
 *
 * For BYOK users: calls increment_ai_usage with p_skip_limit_check=true and
 * p_cost=cost to track total_usage history without touching daily_usage
 * (the service client is authorised to pass this flag; user JWTs are not —
 * see migration restrict_skip_limit_check).
 *
 * Throws on any failure so the caller can return a 500 before sending AI results.
 */
export async function deductCredits(
  userId: string,
  cost: number,
  isByok: boolean,
  serviceClient: SupabaseClient,
): Promise<void> {
  if (isByok) {
    const { error } = await serviceClient.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_skip_limit_check: true,
      p_cost: cost,
    });
    if (error) {
      console.error('[deductCredits] BYOK total_usage log failed:', error);
      throw new Error(`Credit log failed: ${error.message}`);
    }
    return;
  }

  const { error } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: userId,
    p_cost: cost,
  });
  if (error) {
    console.error(`[deductCredits] increment_ai_usage failed (cost=${cost}):`, error);
    throw new Error(`Credit deduction failed: ${error.message}`);
  }
}
