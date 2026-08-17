import { describe, expect, it } from 'vitest';
import {
  PDF_EXPORT_MAX_CONTENT_HEIGHT_PX,
  PDF_EXPORT_MAX_CUSTOM_BREAKS,
  PDF_EXPORT_MAX_HTML_BYTES,
  calculateOnePageScale,
  canRemovePdfBranding,
  formatPdfPageNumber,
  validatePdfExportRequestBody,
} from './pdfExportPolicy';

const validBody = {
  html: '<!doctype html><html><body><main data-resume-template>Resume</main></body></html>',
  pageFormat: 'letter',
  showPageNumbers: true,
  pageNumberFormat: 'full',
  showBranding: true,
  customBreakPositions: [700],
  totalContentHeightPx: 1_300,
  layoutContentHeightPx: 1_350,
  locale: 'en',
};

describe('PDF export resource and entitlement policy', () => {
  it('normalizes a legitimate export request', () => {
    const result = validatePdfExportRequestBody(validBody);
    expect(result).toEqual({
      ok: true,
      value: {
        ...validBody,
        onePage: false,
        atsMode: false,
      },
    });
  });

  it('rejects oversized HTML before Chromium is launched', () => {
    const result = validatePdfExportRequestBody({
      ...validBody,
      html: 'x'.repeat(PDF_EXPORT_MAX_HTML_BYTES + 1),
    });
    expect(result).toMatchObject({ ok: false, status: 413, error: 'export_too_large' });
  });

  it('rejects unbounded heights and page-cut arrays', () => {
    expect(validatePdfExportRequestBody({
      ...validBody,
      totalContentHeightPx: PDF_EXPORT_MAX_CONTENT_HEIGHT_PX + 1,
    })).toMatchObject({ ok: false, status: 413, error: 'export_too_large' });

    expect(validatePdfExportRequestBody({
      ...validBody,
      customBreakPositions: Array.from(
        { length: PDF_EXPORT_MAX_CUSTOM_BREAKS + 1 },
        (_value, index) => 100 + index * 100,
      ),
    })).toMatchObject({ ok: false, status: 413, error: 'export_too_large' });
  });

  it('rejects malformed booleans, formats, and non-finite page cuts', () => {
    expect(validatePdfExportRequestBody({ ...validBody, showBranding: 'false' }))
      .toMatchObject({ ok: false, status: 400 });
    expect(validatePdfExportRequestBody({ ...validBody, pageNumberFormat: 'roman' }))
      .toMatchObject({ ok: false, status: 400 });
    expect(validatePdfExportRequestBody({ ...validBody, customBreakPositions: [Number.NaN] }))
      .toMatchObject({ ok: false, status: 400 });
  });

  it('allows branding removal only for a server-resolved Premium plan', () => {
    expect(canRemovePdfBranding({ effective_plan: 'premium' })).toBe(true);
    expect(canRemovePdfBranding({ plan: 'premium' })).toBe(true);
    expect(canRemovePdfBranding({ effective_plan: 'pro' })).toBe(false);
    expect(canRemovePdfBranding({ effective_plan: 'free' })).toBe(false);
    expect(canRemovePdfBranding(null)).toBe(false);
  });

  it('honors both page-number formats and calculates a full-content one-page scale', () => {
    expect(formatPdfPageNumber(2, 3, 'simple', 'en')).toBe('2');
    expect(formatPdfPageNumber(2, 3, 'full', 'en')).toBe('Page 2 of 3');
    expect(formatPdfPageNumber(2, 3, 'full', 'ar')).toBe('الصفحة 2 من 3');
    expect(calculateOnePageScale(1_496, 748)).toBe(0.5);
    expect(calculateOnePageScale(500, 748)).toBe(1);
  });
});
