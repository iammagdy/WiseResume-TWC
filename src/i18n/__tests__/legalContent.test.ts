import { describe, expect, it } from 'vitest';
import { legalContent } from '@/i18n/legalContent';

describe('localized legal content', () => {
  it('keeps English legal content English', () => {
    expect(legalContent.en.privacy.title).toBe('Privacy Policy');
    expect(legalContent.en.terms.title).toBe('Terms of Service');
  });

  it('provides substantive Arabic content rather than English on Arabic routes', () => {
    expect(legalContent.ar.privacy.title).toBe('سياسة الخصوصية');
    expect(legalContent.ar.terms.title).toBe('شروط الخدمة');
    expect(legalContent.ar.privacy.intro).toMatch(/[\u0600-\u06FF]/);
    expect(legalContent.ar.terms.intro).toMatch(/[\u0600-\u06FF]/);
    expect(legalContent.ar.privacy.intro).not.toContain('Your privacy');
  });
});
