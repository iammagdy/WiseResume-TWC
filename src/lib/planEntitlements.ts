import type { PlanKey } from './planConfig';

/**
 * Branding removal is an Ultimate-only display/export capability and requires
 * a verified subscription state. The public label maps to the internal
 * `premium` plan key; the key itself must not be renamed.
 */
export function canRemoveBranding(plan: PlanKey, subscriptionVerified: boolean): boolean {
  return plan === 'premium' && subscriptionVerified;
}
