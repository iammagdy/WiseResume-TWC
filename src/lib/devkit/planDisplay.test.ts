import { describe, expect, it } from 'vitest';
import {
  getPlanDisplayLabel,
  normalizePlanKey,
  getPlanBadgeStyle,
  formatAccessSource,
  getSourceBadgeStyle,
  formatProviderStatus,
  formatAccessClassification,
  formatPaymentEvidenceStatus,
  formatProviderValidation,
} from './planDisplay';

describe('planDisplay presentation helpers', () => {
  describe('getPlanDisplayLabel', () => {
    it('maps internal canonical key "premium" to public display "Ultimate"', () => {
      expect(getPlanDisplayLabel('premium')).toBe('Ultimate');
      expect(getPlanDisplayLabel('PREMIUM')).toBe('Ultimate');
    });

    it('maps "pro" and "free" correctly', () => {
      expect(getPlanDisplayLabel('pro')).toBe('Pro');
      expect(getPlanDisplayLabel('free')).toBe('Free');
      expect(getPlanDisplayLabel('')).toBe('Free');
      expect(getPlanDisplayLabel(null)).toBe('Free');
    });

    it('defensively handles "ultimate" as "Ultimate"', () => {
      expect(getPlanDisplayLabel('ultimate')).toBe('Ultimate');
    });
  });

  describe('normalizePlanKey', () => {
    it('maps "ultimate" and "premium" to canonical "premium"', () => {
      expect(normalizePlanKey('ultimate')).toBe('premium');
      expect(normalizePlanKey('premium')).toBe('premium');
      expect(normalizePlanKey('ULTIMATE')).toBe('premium');
    });

    it('maps "pro" to "pro"', () => {
      expect(normalizePlanKey('pro')).toBe('pro');
    });

    it('defaults unknown or falsy to "free"', () => {
      expect(normalizePlanKey('')).toBe('free');
      expect(normalizePlanKey(null)).toBe('free');
      expect(normalizePlanKey('unknown')).toBe('free');
    });
  });

  describe('getPlanBadgeStyle', () => {
    it('returns purple styling for premium/ultimate', () => {
      expect(getPlanBadgeStyle('premium')).toContain('purple');
      expect(getPlanBadgeStyle('ultimate')).toContain('purple');
    });

    it('returns blue styling for pro', () => {
      expect(getPlanBadgeStyle('pro')).toContain('blue');
    });

    it('returns muted styling for free', () => {
      expect(getPlanBadgeStyle('free')).toContain('muted');
    });
  });

  describe('formatAccessSource', () => {
    it('formats known sources truthfully', () => {
      expect(formatAccessSource('whop')).toBe('Whop');
      expect(formatAccessSource('paypal')).toBe('PayPal');
      expect(formatAccessSource('revenuecat')).toBe('RevenueCat');
      expect(formatAccessSource('manual/admin')).toBe('Manual Grant');
      expect(formatAccessSource('active trial')).toBe('Trial');
      expect(formatAccessSource('trial')).toBe('Trial');
      expect(formatAccessSource('coupon')).toBe('Coupon');
      expect(formatAccessSource('free')).toBe('Default Free');
      expect(formatAccessSource(null)).toBe('None');
    });
  });

  describe('getSourceBadgeStyle', () => {
    it('returns amber for whop, sky for paypal, emerald for manual', () => {
      expect(getSourceBadgeStyle('whop')).toContain('amber');
      expect(getSourceBadgeStyle('paypal')).toContain('sky');
      expect(getSourceBadgeStyle('manual/admin')).toContain('emerald');
      expect(getSourceBadgeStyle('revenuecat')).toContain('violet');
    });
  });

  describe('formatProviderStatus', () => {
    it('formats provider status with emerald for active, yellow for trialing', () => {
      expect(formatProviderStatus('active').label).toBe('Active');
      expect(formatProviderStatus('active').className).toContain('emerald');
      expect(formatProviderStatus('trialing').label).toBe('Trialing');
      expect(formatProviderStatus('trialing').className).toContain('yellow');
      expect(formatProviderStatus('canceled').label).toBe('Canceled');
      expect(formatProviderStatus(null).label).toBe('None');
    });
  });

  describe('formatAccessClassification', () => {
    it('formats classifications with human-readable labels', () => {
      expect(formatAccessClassification('FREE').label).toBe('Free Account');
      expect(formatAccessClassification('MANUAL_ADMIN').label).toBe('Manual Admin Grant');
      expect(formatAccessClassification('PAID_PROVIDER').label).toBe('Paid Provider Subscriber');
      expect(formatAccessClassification('MANUAL_PLUS_PAID_PROVIDER').label).toBe('Manual Grant + Active Provider');
      expect(formatAccessClassification('MULTIPLE_PROVIDER_SOURCES').label).toBe('Multiple Provider Sources');
      expect(formatAccessClassification('LEGACY_PROVIDER').label).toBe('Legacy Provider Entitlement');
      expect(formatAccessClassification(null).label).toBe('Standard Free');
    });
  });

  describe('formatPaymentEvidenceStatus', () => {
    it('returns confirmed badge styling for confirmed payment', () => {
      const res = formatPaymentEvidenceStatus('confirmed');
      expect(res.label).toBe('Payment Confirmed');
      expect(res.badgeClass).toContain('emerald');
      expect(res.dotClass).toContain('emerald');
    });

    it('returns unavailable badge styling for legacy unavailable', () => {
      const res = formatPaymentEvidenceStatus('unavailable');
      expect(res.label).toContain('Unavailable');
      expect(res.badgeClass).toContain('violet');
      expect(res.dotClass).toContain('violet');
    });

    it('returns unconfirmed badge styling for not_confirmed', () => {
      const res = formatPaymentEvidenceStatus('not_confirmed');
      expect(res.label).toBe('Payment Unconfirmed');
      expect(res.badgeClass).toContain('amber');
      expect(res.dotClass).toContain('amber');
    });
  });

  describe('formatProviderValidation', () => {
    it('formats valid provider truthfully', () => {
      const res = formatProviderValidation(true, true);
      expect(res.label).toBe('Active Entitlement Provider');
      expect(res.badgeClass).toContain('emerald');
    });

    it('formats record present but inactive/gated truthfully', () => {
      const res = formatProviderValidation(false, true);
      expect(res.label).toContain('Inactive / Gated');
      expect(res.badgeClass).toContain('amber');
    });

    it('formats no provider', () => {
      const res = formatProviderValidation(false, false);
      expect(res.label).toBe('No Provider');
    });
  });
});
