/**
 * Frontend plan configuration.
 *
 * NOTE: The old single-source-of-truth JSON file
 *   supabase/functions/_shared/creditLimits.json
 * was removed when the Supabase directory was deleted. Credit limits are now
 * defined directly here until the Appwrite Functions equivalent is in place.
 * Keep these values in sync with the Appwrite ai-gateway function config.
 */

export type PlanKey = 'free' | 'pro' | 'premium';

export const PLAN_PRICES: Record<string, string> = {
  free: '$0',
  pro: '$9',
  premium: '$19',
};

/**
 * Daily AI credit limits per plan (frontend display / soft guard).
 * The server enforces the hard limit — these values are for UI feedback only.
 */
export const PLAN_CREDIT_LIMITS: Record<PlanKey, number> = {
  free: 5,
  pro: 50,
  premium: Infinity,
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
