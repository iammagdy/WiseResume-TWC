import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { legalContent } from '@/i18n/legalContent';

describe('Legal routes and compliance requirements', () => {
  it('defines public legal routes before ProtectedRoute in AppInterior.tsx', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/AppInterior.tsx'), 'utf8');
    const protectedAt = source.indexOf('<Route element={<ProtectedRoute />}>');
    const requiredRoutes = [
      'path="/terms"',
      'path="/terms-of-service"',
      'path="/privacy"',
      'path="/privacy-policy"',
      'path="/refund-policy"',
      'path="/refunds"',
      'path="/ar/terms"',
      'path="/ar/terms-of-service"',
      'path="/ar/privacy"',
      'path="/ar/privacy-policy"',
      'path="/ar/refund-policy"',
      'path="/ar/refunds"',
    ];

    for (const route of requiredRoutes) {
      const index = source.indexOf(route);
      expect(index, `${route} must be defined in AppInterior.tsx`).toBeGreaterThan(-1);
      expect(index, `${route} must be placed before ProtectedRoute`).toBeLessThan(protectedAt);
    }
  });

  it('contains accurate dates and excludes stale March 9 dates', () => {
    for (const lang of ['en', 'ar'] as const) {
      const privacy = legalContent[lang].privacy;
      const terms = legalContent[lang].terms;
      const refund = legalContent[lang].refund;

      expect(privacy.effectiveDate).not.toContain('March 9, 2026');
      expect(privacy.effectiveDate).not.toContain('9 مارس 2026');
      expect(terms.effectiveDate).not.toContain('March 9, 2026');
      expect(terms.effectiveDate).not.toContain('9 مارس 2026');
      expect(refund.effectiveDate).not.toContain('March 9, 2026');
      expect(refund.effectiveDate).not.toContain('9 مارس 2026');

      if (lang === 'en') {
        expect(privacy.effectiveDate).toContain('August 31, 2026');
        expect(terms.effectiveDate).toContain('August 31, 2026');
        expect(refund.effectiveDate).toContain('Effective Date: August 31, 2026');
        expect(refund.effectiveDate).toContain('Last Updated: August 31, 2026');
      } else {
        expect(privacy.effectiveDate).toContain('31 أغسطس 2026');
        expect(terms.effectiveDate).toContain('31 أغسطس 2026');
        expect(refund.effectiveDate).toContain('تاريخ السريان: 31 أغسطس 2026');
        expect(refund.effectiveDate).toContain('آخر تحديث: 31 أغسطس 2026');
      }
    }
  });

  it('avoids overclaims regarding instant entitlements, direct settings cancellation, and unverified contacts', () => {
    for (const lang of ['en', 'ar'] as const) {
      const privacyJson = JSON.stringify(legalContent[lang].privacy);
      const termsJson = JSON.stringify(legalContent[lang].terms);
      const refundJson = JSON.stringify(legalContent[lang].refund);
      const allJson = `${privacyJson} ${termsJson} ${refundJson}`;

      // No instant entitlement overclaim
      expect(allJson).not.toContain('update immediately upon plan changes');
      expect(allJson).not.toContain('فور تغيير الخطة');

      // No unverified DPO or formal department titles
      expect(privacyJson).not.toContain('Data Protection Officer');
      expect(privacyJson).not.toContain('مسؤول حماية البيانات');
      expect(termsJson).not.toContain('Legal Department');
      expect(termsJson).not.toContain('القسم القانوني');

      // No unverified claim of canceling from settings
      expect(termsJson).not.toContain('via your account settings');
      expect(termsJson).not.toContain('عبر إعدادات حسابك');
      expect(refundJson).not.toContain('from your account settings');

      // Check process providers
      expect(privacyJson).toContain('Sentry');
      expect(privacyJson).toContain('Cloudflare Turnstile');
      expect(privacyJson).toContain('Appwrite');
      expect(privacyJson).toContain('Paddle');
      expect(privacyJson).toContain('Vercel');

      // No unverified strict standards overclaim
      expect(privacyJson).not.toContain('strict data protection standards');
      expect(privacyJson).not.toContain('أعلى معايير حماية البيانات');
    }

    // Pricing page FAQ does not claim canceling from settings
    const pricingSource = readFileSync(resolve(process.cwd(), 'src/pages/PricingPage.tsx'), 'utf8');
    expect(pricingSource).not.toContain('cancel your subscription at any time from settings');
  });

  it('ensures EN and AR policy parity', () => {
    for (const docKey of ['privacy', 'terms', 'refund'] as const) {
      const enDoc = legalContent.en[docKey];
      const arDoc = legalContent.ar[docKey];
      expect(enDoc.sections.length).toBe(arDoc.sections.length);
    }
  });

  it('includes persistent legal footer links in Footer.tsx', () => {
    const footerSource = readFileSync(resolve(process.cwd(), 'src/components/landing/Footer.tsx'), 'utf8');
    expect(footerSource).toContain('/privacy');
    expect(footerSource).toContain('/terms');
    expect(footerSource).toContain('/refund-policy');
  });
});
