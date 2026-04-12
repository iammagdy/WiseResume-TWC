import { getServiceClient } from './dbClient.ts';

export interface CreditCheckResult {
  hasCredits: boolean;
  remaining: number;
}

/** Sentinel value stored in ai_credits.daily_limit for unlimited plans (Premium). */
const UNLIMITED_SENTINEL = -1;
const PRO_DAILY_LIMIT = 100;
const FREE_DAILY_LIMIT = 5;

/** Returns the authoritative daily limit for an effective plan. */
function planDailyLimit(plan: string): number {
  if (plan === 'premium') return UNLIMITED_SENTINEL;
  if (plan === 'pro') return PRO_DAILY_LIMIT;
  return FREE_DAILY_LIMIT;
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
 * Checks if a user has sufficient AI credits (or BYOK setup) to perform an action.
 *
 * The authoritative daily limit is ALWAYS derived from the user's current effective
 * plan (subscription + active trial). The stored ai_credits.daily_limit is NOT used
 * for the limit check — only daily_usage and usage_date are read from that table.
 * This prevents stale stored limits from granting elevated credits after downgrades
 * or trial expirations.
 */
export async function checkUserCreditBalance(userId: string): Promise<CreditCheckResult> {
  const supabase = getServiceClient();

  // Fetch BYOK preference, credits usage, and subscription concurrently.
  const [prefsRes, creditsRes, subRes] = await Promise.all([
    supabase.from('user_preferences').select('ai_provider').eq('user_id', userId).maybeSingle(),
    supabase.from('ai_credits').select('daily_usage, usage_date').eq('user_id', userId).maybeSingle(),
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

  // 2. Derive authoritative daily limit from the current effective plan.
  //    This is the canonical source of truth — stale ai_credits.daily_limit is ignored.
  const sub = subRes.data;
  const effectivePlan = computeEffectivePlan(
    sub?.plan_name as string | null,
    sub?.trial_plan as string | null,
    sub?.trial_expires_at as string | null,
  );
  const authoritativeLimit = planDailyLimit(effectivePlan);

  // 3. Premium users are always unlimited
  if (authoritativeLimit === UNLIMITED_SENTINEL) {
    return { hasCredits: true, remaining: 999999 };
  }

  // 4. No credits row → no usage yet today, full limit available
  if (!creditsRes.data) {
    return { hasCredits: true, remaining: authoritativeLimit };
  }

  const credits = creditsRes.data;
  const today = new Date().toISOString().split('T')[0];

  // 5. If last usage wasn't today, the daily counter resets implicitly
  if ((credits.usage_date as string) !== today) {
    return { hasCredits: true, remaining: authoritativeLimit };
  }

  // 6. Compute remaining against the authoritative plan-based limit
  const remaining = authoritativeLimit - ((credits.daily_usage as number) || 0);

  return {
    hasCredits: remaining > 0,
    remaining: Math.max(0, remaining),
  };
}
