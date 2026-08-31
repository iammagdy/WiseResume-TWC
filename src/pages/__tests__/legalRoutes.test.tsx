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

  it('contains required legal content for privacy, terms, and refund in English and Arabic', () => {
    for (const lang of ['en', 'ar'] as const) {
      expect(legalContent[lang].privacy.title).toBeTruthy();
      expect(legalContent[lang].terms.title).toBeTruthy();
      expect(legalContent[lang].refund.title).toBeTruthy();

      // Check Paddle Merchant of Record mention
      const termsSource = JSON.stringify(legalContent[lang].terms);
      const refundSource = JSON.stringify(legalContent[lang].refund);
      expect(termsSource).toContain('Paddle');
      expect(refundSource).toContain('Paddle');

      // Check pricing disclosures
      expect(termsSource).toContain('$5');
      expect(termsSource).toContain('$10');
    }
  });

  it('includes persistent legal footer links in Footer.tsx', () => {
    const footerSource = readFileSync(resolve(process.cwd(), 'src/components/landing/Footer.tsx'), 'utf8');
    expect(footerSource).toContain('/privacy');
    expect(footerSource).toContain('/terms');
    expect(footerSource).toContain('/refund-policy');
  });
});
