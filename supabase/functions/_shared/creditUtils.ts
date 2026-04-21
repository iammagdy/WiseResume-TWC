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
  /**
   * The effective plan resolved for this user ('free' | 'pro' | 'premium').
   * Exposed so call sites can log billing identity alongside the outcome and
   * so refundCredit() can safely no-op when no deduction actually occurred
   * (BYOK or unlimited plans).
   */
  effectivePlan: string;
  /**
   * The exact `usage_date` row that the deduction RPC committed against.
   * refundCredit() must pass this back so a refund crossing midnight UTC
   * still hits the correct row (Phase 4 fix). undefined when no deduction
   * was performed (BYOK / unlimited / failed lookup).
   */
  usageDate?: string;
}

/**
 * Derives the user's effective plan from a subscription row, respecting active
 * trials. Case-insensitive: any stored value (e.g. 'Premium', 'PRO') is
 * normalised to lowercase so the downstream planDailyLimit lookup and the
 * equality checks in me/index.ts both agree.
 */
function computeEffectivePlan(
  planName: string | null,
  trialPlan: string | null,
  trialExpiresAt: string | null,
): string {
  const normPlan = planName ? planName.toLowerCase().trim() : null;
  const normTrial = trialPlan ? trialPlan.toLowerCase().trim() : null;
  if (normTrial && trialExpiresAt && new Date(trialExpiresAt as string) > new Date()) {
    return normTrial;
  }
  return normPlan ?? 'free';
}

/**
 * ATOMIC credit check-and-deduct for AI endpoint protection.
 *
 * The credit is deducted BEFORE the AI call. If the AI call subsequently
 * fails, callers SHOULD invoke refundCredit() in their catch block so the
 * user is not billed for infrastructure failures. See refundCredit() below.
 *
 * @param userId - the authenticated user's UUID (set server-side, never from the request body).
 * @param amount - credits to deduct; defaults to 1. Use 2 for expensive endpoints like
 *                 generate-cover-letter and tailor-resume.
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

  if (prefsRes.error) {
    log.error('user_preferences lookup failed — rejecting AI request fail-closed', prefsRes.error, { userId });
    throw new Error(`Billing state lookup failed: ${prefsRes.error.message}`);
  }
  if (subRes.error) {
    log.error('subscriptions lookup failed — rejecting AI request fail-closed', subRes.error, { userId });
    throw new Error(`Billing state lookup failed: ${subRes.error.message}`);
  }

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
      return { hasCredits: true, remaining: 9999, isByok: true, effectivePlan: 'byok' };
    }

    log.warn('BYOK rejection: declared provider has no stored key', { userId, declaredProvider });
    return { hasCredits: false, remaining: 0, isByok: false, effectivePlan: 'byok' };
  }

  const sub = subRes.data;
  const effectivePlan = computeEffectivePlan(
    sub?.plan_name as string | null,
    sub?.trial_plan as string | null,
    sub?.trial_expires_at as string | null,
  );
  const authoritativeLimit = planDailyLimit(effectivePlan);

  // Diagnostic log — surfaces the exact billing identity resolved for this
  // request so we can diff what the server saw vs what the UI ('me' endpoint)
  // showed when users report "premium but blocked" discrepancies.
  log.info('credit check resolved billing identity', {
    userId,
    storedPlanName: sub?.plan_name ?? null,
    storedTrialPlan: sub?.trial_plan ?? null,
    trialExpiresAt: sub?.trial_expires_at ?? null,
    effectivePlan,
    authoritativeLimit,
    amount,
  });

  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('atomic_attempt_and_deduct_credit', {
      p_user_id:    userId,
      p_plan_limit: authoritativeLimit === UNLIMITED_SENTINEL ? -1 : authoritativeLimit,
      p_amount:     amount,
    });

  if (rpcError) {
    log.error('atomic_attempt_and_deduct_credit RPC failed — rejecting request', rpcError, {
      userId,
      amount,
      effectivePlan,
    });
    throw new Error(`Credit accounting failed: ${rpcError.message}`);
  }

  const result = rpcResult as { allowed: boolean; remaining: number; usage_date?: string };

  return {
    hasCredits:    result.allowed,
    remaining:     result.remaining,
    isByok:        false,
    effectivePlan,
    usageDate:     result.usage_date,
  };
}

/**
 * Reverses a previously-deducted credit debit. Call this from the catch
 * block of an AI endpoint when the AI call itself fails AFTER checkAndDeductCredit
 * has already committed the debit.
 *
 * Safe to call with a CreditCheckResult whose user was on BYOK or an unlimited
 * plan — in those paths no debit occurred so refund is a no-op. The helper
 * swallows errors intentionally: a refund failure must NEVER overwrite the
 * original user-facing error from the AI call.
 *
 * @param userId - authenticated user UUID
 * @param deduction - the CreditCheckResult returned by the original check
 * @param amount - the amount that was deducted (must match)
 */
export async function refundCredit(
  userId: string,
  deduction: CreditCheckResult,
  amount = 1,
): Promise<void> {
  // No debit occurred in these paths.
  if (deduction.isByok) return;
  if (!deduction.hasCredits) return;
  // AI-3: gate on the captured `usageDate` rather than re-deriving the plan
  // (or, worse, looking the plan up live). `usageDate` is the authoritative
  // signal that the deduct RPC actually wrote a counter row: present →
  // refund the same row; absent → no row was created (e.g. unlimited
  // premium where the RPC short-circuits). This is race-safe: even if the
  // user's effective plan flips between deduct and refund (pro trial expires
  // → free, or trial activates mid-request), the refund still hits the
  // SAME (user, usage_date) row that was debited. Re-resolving the plan
  // here would either no-op a real debit (over-charge by 1) or hit the
  // wrong daily bucket.
  if (!deduction.usageDate) return;

  try {
    const supabase = getServiceClient();
    // Pass the original deduction's usage_date so that a refund that
    // crosses midnight UTC still subtracts from the SAME row that was
    // debited. Without this, the refund would land on the new day's row
    // (or on no row at all) and the user would be permanently overcharged
    // by the deducted amount. See Phase 4 migration for RPC semantics.
    const { error } = await supabase.rpc('atomic_refund_credit', {
      p_user_id:    userId,
      p_amount:     amount,
      p_usage_date: deduction.usageDate,
    });
    if (error) {
      log.warn('atomic_refund_credit RPC failed — user may be over-charged by 1 credit', {
        userId,
        amount,
        error: error.message,
      });
      return;
    }
    log.info('credit refunded after AI failure', { userId, amount });
  } catch (e) {
    log.warn('refundCredit threw — swallowing so original AI error surfaces', {
      userId,
      amount,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
