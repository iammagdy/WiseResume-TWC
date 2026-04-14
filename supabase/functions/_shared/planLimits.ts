/**
 * Authoritative plan credit limits for edge functions.
 *
 * Credit limit values are loaded from the single-source-of-truth JSON file:
 *   supabase/functions/_shared/creditLimits.json
 *
 * Both this file (edge functions) and src/lib/planConfig.ts (frontend) import
 * from that JSON to eliminate duplicated constants that can drift.
 *
 * UNLIMITED_SENTINEL (-1) is the value stored in ai_credits.daily_limit
 * for Premium users. It is compared against in edge function credit checks.
 */
import creditLimitsJson from './creditLimits.json' assert { type: 'json' };

export const UNLIMITED_SENTINEL = -1;

export const PLAN_DAILY_LIMITS = {
  free: creditLimitsJson.free,
  pro: creditLimitsJson.pro,
  premium: UNLIMITED_SENTINEL, // stored as -1, treated as unlimited
} as const;

export type PlanKey = keyof typeof PLAN_DAILY_LIMITS;

/** Returns the authoritative daily credit limit for the given effective plan. */
export function planDailyLimit(plan: string): number {
  if (plan === 'premium') return PLAN_DAILY_LIMITS.premium;
  if (plan === 'pro') return PLAN_DAILY_LIMITS.pro;
  return PLAN_DAILY_LIMITS.free;
}
