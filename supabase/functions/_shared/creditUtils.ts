import { getServiceClient } from './dbClient.ts';

export interface CreditCheckResult {
  hasCredits: boolean;
  remaining: number;
}

/** Sentinel value stored in ai_credits.daily_limit for unlimited plans (Premium). */
const UNLIMITED_SENTINEL = -1;
const PRO_DAILY_LIMIT = 30;
const FREE_DAILY_LIMIT = 5;

/** Compute effective plan from subscription row data. */
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

/** Returns the daily limit for a given effective plan. */
function planDailyLimit(plan: string): number {
  if (plan === 'premium') return UNLIMITED_SENTINEL;
  if (plan === 'pro') return PRO_DAILY_LIMIT;
  return FREE_DAILY_LIMIT;
}

/**
 * Checks if a user has sufficient AI credits (or BYOK setup) to perform an action.
 * Fetches both the ai_credits row and the subscription in parallel so that plan-based
 * overrides (e.g. premium trial) are applied even when a stale ai_credits row exists.
 */
export async function checkUserCreditBalance(userId: string): Promise<CreditCheckResult> {
  const supabase = getServiceClient();

  // Fetch BYOK preference, credits, and subscription concurrently.
  const [prefsRes, creditsRes, subRes] = await Promise.all([
    supabase.from('user_preferences').select('ai_provider').eq('user_id', userId).maybeSingle(),
    supabase.from('ai_credits').select('daily_usage, daily_limit, usage_date').eq('user_id', userId).maybeSingle(),
    supabase.from('subscriptions').select('plan_name, trial_plan, trial_expires_at').eq('user_id', userId).maybeSingle(),
  ]);

  // 1. BYOK users are always unlimited
  const isBYOK = prefsRes.data?.ai_provider && prefsRes.data.ai_provider !== 'wiseresume';
  if (isBYOK) {
    return { hasCredits: true, remaining: 9999 };
  }

  if (creditsRes.error) {
    console.error('Failed to fetch ai_credits:', creditsRes.error);
    return { hasCredits: false, remaining: 0 };
  }

  // 2. Compute effective plan and the plan-entitled daily limit
  const sub = subRes.data;
  const effectivePlan = computeEffectivePlan(
    sub?.plan_name as string | null,
    sub?.trial_plan as string | null,
    sub?.trial_expires_at as string | null,
  );
  const entitledLimit = planDailyLimit(effectivePlan);

  // 3. If no credits row, use the plan-entitled limit
  if (!creditsRes.data) {
    if (entitledLimit === UNLIMITED_SENTINEL) return { hasCredits: true, remaining: 999999 };
    return { hasCredits: true, remaining: entitledLimit };
  }

  const credits = creditsRes.data;

  // 4. Apply plan-based override: use the higher of stored limit vs plan entitlement.
  //    This ensures premium/pro trial users aren't blocked by a stale free-tier row.
  let effectiveLimit = credits.daily_limit as number;
  if (entitledLimit === UNLIMITED_SENTINEL) {
    // Premium — always unlimited regardless of stored value
    return { hasCredits: true, remaining: 999999 };
  }
  if (effectiveLimit !== UNLIMITED_SENTINEL && effectiveLimit < entitledLimit) {
    // Stored limit is lower than plan entitlement (stale) — use the plan limit
    effectiveLimit = entitledLimit;
  }

  // 5. -1 sentinel = unlimited
  if (effectiveLimit === UNLIMITED_SENTINEL) {
    return { hasCredits: true, remaining: 999999 };
  }

  const today = new Date().toISOString().split('T')[0];

  // If last usage wasn't today, the daily counter resets implicitly
  if ((credits.usage_date as string) !== today) {
    return { hasCredits: true, remaining: effectiveLimit };
  }

  const remaining = effectiveLimit - ((credits.daily_usage as number) || 0);

  return {
    hasCredits: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}
