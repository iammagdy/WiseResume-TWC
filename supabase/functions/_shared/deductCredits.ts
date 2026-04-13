import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Atomically deducts AI credits for a user.
 *
 * Calls `increment_ai_usage(p_user_id)` which increments `daily_usage` and
 * `total_usage` by 1. The RPC enforces plan-based daily limits server-side.
 *
 * BYOK users (remaining === 9999) have unlimited managed-AI credits — their
 * daily_usage is not charged, but `total_usage` is still incremented via the
 * same RPC so usage telemetry remains accurate for all user types.
 *
 * RPC failures are logged with a structured error tag so they can be monitored
 * via log-based alerting. The function does NOT throw on failure so that a
 * successful AI response is always returned to the user even if accounting
 * fails transiently. Callers should instrument `[deductCredits] RPC FAILED`
 * log lines for error-rate alerting in production.
 */
export async function deductCredits(
  userId: string,
  _cost: number,
  isByok: boolean,
  serviceClient: SupabaseClient,
): Promise<void> {
  const { error } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: userId,
  });

  if (error) {
    // Tag: [deductCredits] RPC FAILED — monitor this for silent credit-drift.
    console.error(`[deductCredits] RPC FAILED for user ${userId} (byok=${isByok}):`, error.message ?? error);
  }
}
