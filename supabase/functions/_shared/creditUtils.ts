import { getServiceClient } from './dbClient.ts';
import { planDailyLimit, UNLIMITED_SENTINEL } from './planLimits.ts';
import { logger } from './logger.ts';

// BYOK provider allowlist — must stay in sync with callAI in aiClient.ts.
// Only these recognized providers actually use BYOK keys in the AI routing
// logic. Any other declared provider falls through to platform-managed keys,
// so declaring an unknown provider MUST NOT grant a BYOK credit bypass.
const BYOK_PROVIDER_ALLOWLIST = new Set([
  'gemini',
  'openrouter',
  'ollama',
  'openai',
  'anthropic',
  'groq',
  'mistral',
  'xai',
  'cohere',
]);

const log = logger('creditUtils');

export interface CreditCheckResult {
  hasCredits: boolean;
  remaining: number;
  /** True when the user is using their own API key (BYOK). Credit deduction is skipped. */
  isByok: boolean;
}

/** Derives the user's effective plan from a subscription row, respecting active trials. */
function computeEffectivePlan(
  planName: string | null,
  trialPlan: string | null,
  trialExpiresAt: string | null,
): string {
  if (trialPlan && trialExpiresAt && new Date(trialExpiresAt as string) > new Date()) {
    return trialPlan as string;
  }
  return planName ?? 'free';
}

/**
 * ATOMIC credit check-and-deduct for AI endpoint protection.
 *
 * This function combines the credit check AND deduction into a single atomic
 * PostgreSQL RPC (`atomic_attempt_and_deduct_credit`). The credit is deducted
 * BEFORE the AI call, so:
 *   - If accounting fails: the request is rejected (fail-closed).
 *   - If the AI call fails after deduction: the credit is consumed (consistent
 *     with the platform's credit policy — charges apply on attempted use).
 *
 * @param userId - the authenticated user's UUID (set server-side, never from the request body).
 * @param amount - credits to deduct; defaults to 1. Use 2 for expensive endpoints like
 *                 generate-cover-letter and tailor-resume.
 *
 * BYOK policy:
 *   - If the user has declared a non-platform ai_provider AND has a matching
 *     key row in user_api_keys, they are authorized as BYOK. No credit is
 *     deducted — they use their own key.
 *   - If the user has declared a non-platform ai_provider but NO matching key
 *     row exists, the request is REJECTED. The platform's own keys are NEVER
 *     used as a silent fallback when BYOK is configured.
 *   - If ai_provider is unset or 'wiseresume', normal credit deduction applies.
 *
 * Returns: CreditCheckResult where:
 *   - `hasCredits: false` means the request should be rejected with HTTP 402.
 *   - `hasCredits: true` means credits were successfully deducted (or BYOK bypass).
 *   - `isByok: true` means the user's own key should be used (no platform key).
 */
export async function checkAndDeductCredit(
  userId: string,
  amount = 1,
): Promise<CreditCheckResult> {
  const supabase = getServiceClient();

  // Fetch BYOK preference and subscription concurrently.
  const [prefsRes, subRes] = await Promise.all([
    supabase.from('user_preferences').select('ai_provider').eq('user_id', userId).maybeSingle(),
    supabase.from('subscriptions').select('plan_name, trial_plan, trial_expires_at').eq('user_id', userId).maybeSingle(),
  ]);

  // Fail-closed: if billing-identity state is indeterminate (DB error), we MUST
  // reject the request rather than proceeding. Silently continuing on error could
  // route a BYOK user through the platform-key path without credit deduction.
  if (prefsRes.error) {
    log.error('user_preferences lookup failed — rejecting AI request fail-closed', prefsRes.error, { userId });
    throw new Error(`Billing state lookup failed: ${prefsRes.error.message}`);
  }
  if (subRes.error) {
    log.error('subscriptions lookup failed — rejecting AI request fail-closed', subRes.error, { userId });
    throw new Error(`Billing state lookup failed: ${subRes.error.message}`);
  }

  // 1. Evaluate BYOK status.
  //    A non-platform provider MUST be in the recognized allowlist AND have a
  //    stored key row. Unknown provider values are treated as 'wiseresume' so
  //    that a user cannot bypass credit deduction by declaring a fake provider.
  const declaredProvider = prefsRes.data?.ai_provider;
  const isKnownByokProvider =
    declaredProvider &&
    declaredProvider !== 'wiseresume' &&
    BYOK_PROVIDER_ALLOWLIST.has(declaredProvider.toLowerCase());

  if (isKnownByokProvider) {
    const { data: keyRow } = await supabase
      .from('user_api_keys')
      .select('provider')
      .eq('user_id', userId)
      .eq('provider', declaredProvider)
      .maybeSingle();

    if (keyRow?.provider) {
      // BYOK configured and key verified — authorized, no platform credit deducted.
      return { hasCredits: true, remaining: 9999, isByok: true };
    }

    // BYOK declared but no key stored. Reject — platform keys must never be used
    // as a silent fallback for BYOK-configured users.
    log.warn('BYOK rejection: declared provider has no stored key', { userId, declaredProvider });
    return { hasCredits: false, remaining: 0, isByok: false };
  }

  // Unknown/unrecognized providers fall through to normal credit deduction.
  // This prevents a user from declaring an arbitrary provider value to bypass credits.

  // 2. Non-BYOK user. Derive authoritative daily limit from effective plan.
  const sub = subRes.data;
  const effectivePlan = computeEffectivePlan(
    sub?.plan_name as string | null,
    sub?.trial_plan as string | null,
    sub?.trial_expires_at as string | null,
  );
  const authoritativeLimit = planDailyLimit(effectivePlan);

  // 3. Call the atomic check-and-deduct RPC (service_role only, server-side).
  //    This is a SINGLE PostgreSQL transaction: it acquires a FOR UPDATE row lock,
  //    reads the current usage, enforces the daily limit, and increments the counter
  //    — preventing concurrent over-use and ensuring the debit is committed before
  //    any AI call is made.
  //
  //    If this RPC fails (DB error, timeout, etc.), we THROW — this is intentional
  //    fail-closed behavior: no AI call proceeds if credit accounting fails.
  //
  //    Security: the RPC is granted to service_role ONLY. Browser clients cannot
  //    invoke it directly even with a valid session JWT, preventing cross-user
  //    credit manipulation.
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('atomic_attempt_and_deduct_credit', {
      p_user_id:    userId,
      p_plan_limit: authoritativeLimit === UNLIMITED_SENTINEL ? -1 : authoritativeLimit,
      p_amount:     amount,
    });

  if (rpcError) {
    // Fail closed: if accounting cannot be persisted, reject the request.
    // This prevents AI cost from being incurred without a committed debit.
    log.error('atomic_attempt_and_deduct_credit RPC failed — rejecting request', rpcError, {
      userId,
      amount,
      effectivePlan,
    });
    throw new Error(`Credit accounting failed: ${rpcError.message}`);
  }

  const result = rpcResult as { allowed: boolean; remaining: number };

  return {
    hasCredits: result.allowed,
    remaining:  result.remaining,
    isByok:     false,
  };
}
