import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const vercelSource = readFileSync('api/export/pdf-native.ts', 'utf8');
const localSource = readFileSync('server/index.ts', 'utf8');

describe('native PDF renderer hardening contract', () => {
  it.each([
    ['Vercel renderer', vercelSource],
    ['local renderer', localSource],
  ])('%s disables document JavaScript on measurement and render pages', (_name, source) => {
    expect(source.match(/setJavaScriptEnabled\(false\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('validatePdfExportRequestBody');
    expect(source).toContain('PDF_EXPORT_MAX_CONTENT_HEIGHT_PX');
    expect(source).toContain('PDF_EXPORT_MAX_OUTPUT_BYTES');
  });

  it.each([
    ['Vercel renderer', vercelSource],
    ['local renderer', localSource],
  ])('%s verifies Premium branding removal and rate-limits renderer work', (_name, source) => {
    expect(source).toContain('loadBrandingRemovalEntitlement');
    expect(source).toContain('canRemovePdfBranding');
    expect(source).toContain('checkPdfExportRateLimit');
    expect(source).toContain('PDF_EXPORT_MAX_CONCURRENT');
  });

  it.each([
    ['Vercel renderer', vercelSource],
    ['local renderer', localSource],
  ])('%s scales the full document for one-page output instead of selecting page one', (_name, source) => {
    expect(source).toContain('calculateOnePageScale');
    expect(source).toContain('sourceScale: onePageScale');
    expect(source).not.toContain("pageRanges: '1'");
  });
});
