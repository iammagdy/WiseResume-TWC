/**
 * Frontend plan configuration.
 *
 * Credit limit values are loaded from the single-source-of-truth JSON file:
 *   supabase/functions/_shared/creditLimits.json
 *
 * Both this file (React frontend) and supabase/functions/_shared/planLimits.ts
 * (edge functions) import from that JSON so they can never drift.
 */
import creditLimitsJson from '../../supabase/functions/_shared/creditLimits.json';

export type PlanKey = 'free' | 'pro' | 'premium';

export const PLAN_PRICES: Record<string, string> = {
  free: '$0',
  pro: '$9',
  premium: '$19',
};

/**
 * Authoritative daily AI credit limits for each plan.
 * Values come from the shared JSON — do NOT edit them here; edit creditLimits.json.
 */
export const PLAN_CREDIT_LIMITS: Record<PlanKey, number> = {
  free: creditLimitsJson.free,
  pro: creditLimitsJson.pro,
  premium: Infinity, // -1 in server, Infinity in frontend display
};

export const PLAN_FEATURE_LABELS: Record<PlanKey, string[]> = {
  free: [
    '1 resume',
    'Basic AI suggestions',
    'ATS score check',
    'PDF export',
    'Portfolio site',
  ],
  pro: [
    'Unlimited resumes',
    'Advanced AI tools',
    'Smart tailoring',
    'Interview coaching',
    'Cover letter generator',
    'Application tracker',
    'Priority support',
  ],
  premium: [
    'Everything in Pro',
    'Custom branding',
    'Analytics dashboard',
    'White-label exports',
    'Early access features',
    'Dedicated support',
  ],
};
