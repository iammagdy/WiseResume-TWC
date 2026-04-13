import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Deducts AI credits for a user via the `increment_ai_usage(p_user_id)` RPC.
 *
 * Production DB function signature (2026-04-13):
 *   increment_ai_usage(p_user_id UUID) → void
 *   - Increments ai_credits.daily_usage AND total_usage by 1 (fixed cost).
 *   - date-aware: resets daily_usage automatically when the calendar date changes.
 *   - Richer signatures (p_skip_limit_check, p_cost) exist in migrations but have
 *     NOT been applied to production yet, so callers must pass only p_user_id.
 *
 * The `cost` parameter is accepted for API forward-compatibility but is ignored
 * until the production DB function is updated; every call charges exactly 1 credit.
 *
 * BYOK users (remaining === 9999) skip the RPC entirely:
 *   - They use their own API keys — daily_usage limits are irrelevant.
 *   - Skipping avoids distorting their daily_usage counter.
 *   - Usage tracking for BYOK can be reintroduced once the DB function supports
 *     p_skip_limit_check (which only charges total_usage, not daily_usage).
 *
 * RPC failures are logged with the tag `[deductCredits] RPC FAILED` for
 * log-based error-rate alerting. The function does NOT throw so that a
 * successful AI response is always returned to the user even if accounting
 * fails transiently.
 */
export async function deductCredits(
  userId: string,
  _cost: number,  // reserved — ignored until DB function supports p_cost
  isByok: boolean,
  serviceClient: SupabaseClient,
): Promise<void> {
  // BYOK users use their own API keys; daily credit limits do not apply.
  // Skip deduction to avoid distorting their daily_usage counter.
  if (isByok) {
    return;
  }

  const { error } = await serviceClient.rpc('increment_ai_usage', {
    p_user_id: userId,
  });

  if (error) {
    // Tag: [deductCredits] RPC FAILED — alert on error-rate spikes to catch
    // silent credit-accounting drift before it becomes a billing problem.
    console.error(`[deductCredits] RPC FAILED for user ${userId}:`, error.message ?? error);
  }
}
