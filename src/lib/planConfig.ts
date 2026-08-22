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
  pro: '$5',
  premium: '$10',
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
    '1 regular resume',
    '5 AI actions/day',
    'Resume Editor',
    'Standard templates',
    'Standard export formats',
    'WiseResume branding on applicable exports',
    'Portfolio core',
    'Current Free portfolio-AI allowance',
    'Readiness/ATS-oriented scoring where supported',
  ],
  pro: [
    'Everything in Free',
    'Unlimited resumes',
    '50 AI actions/day',
    'Current Pro per-minute allowance',
    'Smart Tailoring / Tailoring Hub',
    'AI Studio',
    'Cover Letters',
    'Interview Prep',
    'Application Tracker / saved jobs',
    'Current Pro portfolio-AI allowance',
    'WiseResume branding remains on exports',
  ],
  premium: [
    'Everything in Pro',
    'Unlimited AI actions',
    'Current Ultimate per-minute allowance',
    'Analytics + CSV export',
    'Remove WiseResume branding',
    'Current Ultimate portfolio-AI allowance',
  ],
};
