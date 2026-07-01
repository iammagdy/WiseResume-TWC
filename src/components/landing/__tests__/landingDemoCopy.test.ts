import { describe, expect, it } from 'vitest';
import { landingDemoCopy } from '@/components/landing/landingDemoCopy';

describe('landing demo localization', () => {
  it('provides Arabic copy for every animated WiseResume demo', () => {
    for (const demo of ['editor', 'tailoring', 'portfolio', 'interview', 'tracker'] as const) {
      expect(JSON.stringify(landingDemoCopy.ar[demo])).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it('keeps English copy for every animated WiseResume demo', () => {
    for (const demo of ['editor', 'tailoring', 'portfolio', 'interview', 'tracker'] as const) {
      expect(JSON.stringify(landingDemoCopy.en[demo])).toMatch(/[A-Za-z]/);
    }
  });
});

describe('feature entry direction', () => {
  it('starts every Arabic feature card from the right', async () => {
    const { resolveFeatureEntryOrigin } = await import('@/components/landing/FeatureSection');
    expect(resolveFeatureEntryOrigin('ar', 'ltr')).toBe('right');
    expect(resolveFeatureEntryOrigin('ar', 'rtl')).toBe('right');
  });
});
