/**
 * src/lib/devkit/planDisplay.ts
 *
 * Authoritative presentation helpers for DevKit billing & entitlements:
 * - Maps internal canonical plan key 'premium' to public human-facing label 'Ultimate'.
 * - Preserves 'pro' -> 'Pro', 'free' -> 'Free'.
 * - Formats access sources, provider statuses, and access classifications.
 * - Centralizes badge styles so the entire DevKit UI stays cohesive and truthful.
 */

export type PlanKey = 'free' | 'pro' | 'premium';

export const PLAN_DISPLAY_LABELS: Record<string, string> = Object.freeze({
  free: 'Free',
  pro: 'Pro',
  premium: 'Ultimate',
  ultimate: 'Ultimate', // Defensive read-only fallback
});

/**
 * Returns human-facing display label for a plan.
 * Internal 'premium' displays as 'Ultimate'.
 */
export function getPlanDisplayLabel(plan: string | null | undefined): string {
  if (!plan) return 'Free';
  const key = String(plan).trim().toLowerCase();
  return PLAN_DISPLAY_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1));
}

/**
 * Normalizes user-input or legacy string to internal canonical plan key.
 * Strictly maps 'ultimate' -> 'premium'.
 */
export function normalizePlanKey(plan: string | null | undefined): PlanKey {
  if (!plan) return 'free';
  const clean = String(plan).trim().toLowerCase();
  if (clean === 'ultimate' || clean === 'premium') return 'premium';
  if (clean === 'pro') return 'pro';
  return 'free';
}

/**
 * Returns CSS classes for plan badge styling.
 */
export function getPlanBadgeStyle(plan: string | null | undefined): string {
  const key = normalizePlanKey(plan);
  switch (key) {
    case 'premium':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold';
    case 'pro':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-semibold';
    case 'free':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Formats provider or access source into a human-friendly string.
 */
export function formatAccessSource(source: string | null | undefined): string {
  if (!source) return 'None';
  const clean = String(source).trim().toLowerCase();
  switch (clean) {
    case 'whop':
      return 'Whop';
    case 'paypal':
      return 'PayPal';
    case 'revenuecat':
      return 'RevenueCat';
    case 'manual/admin':
      return 'Manual Grant';
    case 'active trial':
    case 'trial':
      return 'Trial';
    case 'coupon':
      return 'Coupon';
    case 'free':
      return 'Default Free';
    default:
      return source;
  }
}

/**
 * Returns badge styling for access source pill.
 */
export function getSourceBadgeStyle(source: string | null | undefined): string {
  if (!source) return 'bg-muted text-muted-foreground border-border';
  const clean = String(source).trim().toLowerCase();
  switch (clean) {
    case 'whop':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'paypal':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800';
    case 'revenuecat':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800';
    case 'manual/admin':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'active trial':
    case 'trial':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'coupon':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Formats provider status with appropriate color.
 */
export function formatProviderStatus(status: string | null | undefined): { label: string; className: string } {
  if (!status) return { label: 'None', className: 'text-muted-foreground' };
  const clean = String(status).trim().toLowerCase();
  switch (clean) {
    case 'active':
      return { label: 'Active', className: 'text-emerald-600 dark:text-emerald-400 font-medium' };
    case 'trialing':
      return { label: 'Trialing', className: 'text-yellow-600 dark:text-yellow-400 font-medium' };
    case 'canceled':
      return { label: 'Canceled', className: 'text-amber-600 dark:text-amber-400' };
    case 'past_due':
      return { label: 'Past Due', className: 'text-rose-600 dark:text-rose-400 font-medium' };
    case 'billing_issue':
      return { label: 'Billing Issue', className: 'text-rose-600 dark:text-rose-400 font-medium' };
    default:
      return { label: status, className: 'text-muted-foreground' };
  }
}

/**
 * Formats high-level access classification.
 */
export function formatAccessClassification(classification: string | null | undefined): { label: string; badgeClass: string } {
  if (!classification) return { label: 'Standard Free', badgeClass: 'bg-muted text-muted-foreground border-border' };
  switch (classification) {
    case 'FREE':
      return { label: 'Free Account', badgeClass: 'bg-muted text-muted-foreground border-border' };
    case 'MANUAL_ADMIN':
      return { label: 'Manual Admin Grant', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    case 'TRIAL':
      return { label: 'Active Trial', badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800' };
    case 'COUPON':
      return { label: 'Active Coupon', badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
    case 'PAID_PROVIDER':
      return { label: 'Paid Provider Subscriber', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    case 'MANUAL_PLUS_PAID_PROVIDER':
      return { label: 'Manual Grant + Active Provider', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    case 'MULTIPLE_PROVIDER_SOURCES':
      return { label: 'Multiple Provider Sources', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    case 'LEGACY_PROVIDER':
      return { label: 'Legacy Provider Entitlement', badgeClass: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800' };
    default:
      return { label: classification, badgeClass: 'bg-muted text-muted-foreground border-border' };
  }
}
