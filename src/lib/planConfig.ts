export type PlanKey = 'free' | 'pro' | 'premium';

export const PLAN_PRICES: Record<string, string> = {
  free: '$0',
  pro: '$9',
  premium: '$19',
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
