import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Atomically deducts AI credits for a user.
 *
 * Calls the `increment_ai_usage(p_user_id)` RPC which increments `daily_usage`
 * and `total_usage` by 1. The RPC enforces plan-based limits server-side.
 *
 * BYOK users (remaining === 9999) have unlimited credits — deduction is skipped
 * so their daily_usage counter is not affected by managed-AI calls.
 *
 * A failure to deduct is logged but does NOT throw, ensuring that a successful
 * AI response is still returned to the user even if the accounting step fails.
 */
export async function deductCredits(
  userId: string,
  _cost: number,
  isByok: boolean,
  serviceClient: SupabaseClient,
): Promise<void> {
  if (isByok) {
    return;
  }

  const { error } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: userId,
  });

  if (error) {
    console.error(`[deductCredits] increment_ai_usage failed for user ${userId}:`, error);
  }
}
