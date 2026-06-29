import { describe, expect, it } from 'vitest';
import type { ResumeData, TemplateCustomization } from '@/types/resume';
import {
  getDocumentLocale,
  getLayoutFingerprint,
  getPageCutsForLayout,
  setPageCutsForLayout,
} from '../resumeLocale';
import { getSectionLabel } from '@/lib/sectionLabels';

const baseCustomization: TemplateCustomization = {
  accentColor: '#000000',
  fontHeading: 'Inter',
  fontBody: 'Inter',
  fontSize: 'medium',
  layout: 'single',
  spacing: 'normal',
  margins: 'normal',
  lineHeight: '1.15',
  pageFormat: 'a4',
};

describe('resume document locale', () => {
  it('defaults existing resumes to English', () => {
    expect(getDocumentLocale({ customization: baseCustomization } as ResumeData)).toBe('en');
  });

  it('uses the locale stored on the CV independently of the UI', () => {
    expect(getDocumentLocale({
      customization: { ...baseCustomization, documentLocale: 'ar' },
    } as ResumeData)).toBe('ar');
  });

  it('includes locale, page format, fonts, scale, and template in the layout fingerprint', () => {
    const english = getLayoutFingerprint('modern', baseCustomization);
    const arabic = getLayoutFingerprint('modern', { ...baseCustomization, documentLocale: 'ar' });
    expect(english).not.toBe(arabic);
    expect(arabic).toContain('locale=ar');
    expect(arabic).toContain('format=a4');
  });

  it('does not reuse legacy English page cuts for Arabic layouts', () => {
    const legacy = { ...baseCustomization, customBreakPositions: [700] };
    expect(getPageCutsForLayout('modern', legacy)).toEqual([700]);
    expect(getPageCutsForLayout('modern', { ...legacy, documentLocale: 'ar' })).toEqual([]);
  });

  it('stores and retrieves cuts under the current layout fingerprint', () => {
    const arabic = { ...baseCustomization, documentLocale: 'ar' as const };
    const updated = setPageCutsForLayout('modern', arabic, [640, 1280]);
    expect(getPageCutsForLayout('modern', updated)).toEqual([640, 1280]);
    expect(updated.customBreakPositions).toBeUndefined();
  });

  it('returns approved Arabic section terminology', () => {
    expect(getSectionLabel('experience', 'ar')).toBe('الخبرة العملية');
    expect(getSectionLabel('summary', 'ar')).toBe('الملخص المهني');
    expect(getSectionLabel('experience', 'en')).toBe('Experience');
  });
});
