import { describe, expect, it } from 'vitest';
import { PLAN_CREDIT_LIMITS, PLAN_FEATURE_LABELS } from './planConfig';
import { canRemoveBranding } from './planEntitlements';

describe('commercial plan entitlements', () => {
  it('preserves the canonical internal plan keys and approved AI limits', () => {
    expect(Object.keys(PLAN_CREDIT_LIMITS).sort()).toEqual(['free', 'premium', 'pro']);
    expect(PLAN_CREDIT_LIMITS).toEqual({ free: 5, pro: 50, premium: Infinity });
  });

  it('contains only approved current benefit claims in the public matrix', () => {
    const allLabels = Object.values(PLAN_FEATURE_LABELS).flat();
    expect(allLabels).toContain('Smart Tailoring / Tailoring Hub');
    expect(allLabels).toContain('Analytics + CSV export');
    expect(allLabels).toContain('Remove WiseResume branding');
    expect(allLabels.join(' ')).not.toMatch(/priority support|dedicated support|early access|custom branding|white-label|version history/i);
  });

  it('allows branding removal only for a verified internal premium plan', () => {
    expect(canRemoveBranding('free', true)).toBe(false);
    expect(canRemoveBranding('pro', true)).toBe(false);
    expect(canRemoveBranding('premium', false)).toBe(false);
    expect(canRemoveBranding('premium', true)).toBe(true);
  });
});
