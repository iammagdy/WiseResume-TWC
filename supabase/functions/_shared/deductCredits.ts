import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Atomically deducts AI credits server-side before returning results to the client.
 *
 * For non-BYOK users: calls increment_ai_usage `cost` times sequentially via the
 * service client (which bypasses RLS). Each call increments daily_usage and total_usage.
 *
 * For BYOK users: calls increment_ai_usage once with p_skip_limit_check=true to track
 * total_usage history without touching daily_usage (the service client is authorised to
 * pass this flag; user JWTs are not — see migration restrict_skip_limit_check).
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
    });
    if (error) {
      console.error('[deductCredits] BYOK total_usage log failed:', error);
      throw new Error(`Credit log failed: ${error.message}`);
    }
    return;
  }

  for (let i = 0; i < cost; i++) {
    const { error } = await serviceClient.rpc('increment_ai_usage', {
      p_user_id: userId,
    });
    if (error) {
      console.error(`[deductCredits] increment_ai_usage failed (attempt ${i + 1}/${cost}):`, error);
      throw new Error(`Credit deduction failed: ${error.message}`);
    }
  }
}
