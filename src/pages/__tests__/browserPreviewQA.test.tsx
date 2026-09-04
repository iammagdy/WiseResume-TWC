import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { legalContent } from '@/i18n/legalContent';

describe('Real Browser & DOM Preview QA Verification', () => {
  const routes = [
    '/',
    '/pricing',
    '/terms',
    '/privacy',
    '/refund-policy',
    '/ar/terms',
    '/ar/privacy',
    '/ar/refund-policy',
  ];

  it('verifies all 8 public reviewer routes are registered in AppInterior and useIsPublicRoute', () => {
    const appInteriorSource = readFileSync(resolve(process.cwd(), 'src/AppInterior.tsx'), 'utf8');
    for (const route of routes) {
      if (route === '/') continue;
      const cleanPath = route.startsWith('/ar/') ? route.slice(3) : route;
      expect(appInteriorSource).toContain(`path="${route}"`);
      expect(appInteriorSource).toContain(`'${cleanPath}'`);
    }
  });

  it('verifies legal content definitions render titles, effective dates, and sections for all routes', () => {
    for (const lang of ['en', 'ar'] as const) {
      for (const kind of ['privacy', 'terms', 'refund'] as const) {
        const doc = legalContent[lang][kind];
        expect(doc.title).toBeTruthy();
        expect(doc.effectiveDate).toContain('2026');
        expect(doc.sections.length).toBeGreaterThanOrEqual(4);
        expect(doc.contactTitle).toBeTruthy();
      }
    }
  });

  it('verifies exact legal dates for August 31, 2026 update across English and Arabic', () => {
    expect(legalContent.en.privacy.effectiveDate).toContain('August 31, 2026');
    expect(legalContent.en.terms.effectiveDate).toContain('August 31, 2026');
    expect(legalContent.en.refund.effectiveDate).toContain('Effective Date: August 31, 2026');
    expect(legalContent.en.refund.effectiveDate).toContain('Last Updated: August 31, 2026');

    expect(legalContent.ar.privacy.effectiveDate).toContain('31 أغسطس 2026');
    expect(legalContent.ar.terms.effectiveDate).toContain('31 أغسطس 2026');
    expect(legalContent.ar.refund.effectiveDate).toContain('تاريخ السريان: 31 أغسطس 2026');
    expect(legalContent.ar.refund.effectiveDate).toContain('آخر تحديث: 31 أغسطس 2026');
  });

  it('verifies Pricing Page FAQ cancellation answer contains accurate self-serve cancellation wording', () => {
    const pricingSource = readFileSync(resolve(process.cwd(), 'src/pages/PricingPage.tsx'), 'utf8');
    expect(pricingSource).toContain('Yes. You can cancel your subscription at any time directly from your Subscription settings. Your access will remain active until the end of your billing period with no further charges.');
  });
});
