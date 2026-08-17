export const PDF_EXPORT_MAX_HTML_BYTES = 6 * 1024 * 1024;
export const PDF_EXPORT_MAX_PAGES = 12;
export const PDF_EXPORT_MAX_CONTENT_HEIGHT_PX = PDF_EXPORT_MAX_PAGES * (792 - 44);
export const PDF_EXPORT_MAX_CUSTOM_BREAKS = PDF_EXPORT_MAX_PAGES - 1;
export const PDF_EXPORT_MAX_DOM_NODES = 12_000;
export const PDF_EXPORT_MAX_PAGE_BYTES = 8 * 1024 * 1024;
export const PDF_EXPORT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

export type PdfPageFormat = 'letter' | 'a4';
export type PdfPageNumberFormat = 'simple' | 'full';
export type PdfExportLocale = 'en' | 'ar';

export interface NormalizedPdfExportRequest {
  html: string;
  pageFormat: PdfPageFormat;
  onePage: boolean;
  atsMode: boolean;
  showPageNumbers: boolean;
  pageNumberFormat: PdfPageNumberFormat;
  showBranding: boolean;
  customBreakPositions: number[];
  totalContentHeightPx?: number;
  layoutContentHeightPx?: number;
  locale: PdfExportLocale;
}
export type PdfExportRequestValidation =
  | { ok: true; value: NormalizedPdfExportRequest }
  | { ok: false; status: 400 | 413; error: string; message: string };

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function invalid(error: string, message: string): PdfExportRequestValidation {
  return { ok: false, status: 400, error, message };
}

function tooLarge(error: string, message: string): PdfExportRequestValidation {
  return { ok: false, status: 413, error, message };
}

function optionalBoolean(value: unknown, fallback: boolean, field: string): boolean | PdfExportRequestValidation {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') return invalid('bad_request', `${field} must be a boolean.`);
  return value;
}

function optionalHeight(value: unknown, field: string): number | undefined | PdfExportRequestValidation {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return invalid('bad_request', `${field} must be a positive finite number.`);
  }
  if (value > PDF_EXPORT_MAX_CONTENT_HEIGHT_PX) {
    return tooLarge(
      'export_too_large',
      `This document is too long to export safely. The maximum supported length is ${PDF_EXPORT_MAX_PAGES} pages.`,
    );
  }
  return Math.round(value);
}

/**
 * Validates and normalizes the untrusted browser payload before Chromium is
 * launched. The same policy runs in the browser for fast feedback and in both
 * server implementations as the authoritative resource boundary.
 */
export function validatePdfExportRequestBody(body: unknown): PdfExportRequestValidation {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalid('bad_request', 'A PDF export request body is required.');
  }

  const record = body as Record<string, unknown>;
  if (typeof record.html !== 'string' || record.html.trim().length === 0) {
    return invalid('bad_request', 'Missing html body.');
  }
  if (byteLength(record.html) > PDF_EXPORT_MAX_HTML_BYTES) {
    return tooLarge(
      'export_too_large',
      'This document contains too much embedded content to export safely. Remove large images and try again.',
    );
  }

  if (record.pageFormat !== undefined && record.pageFormat !== 'letter' && record.pageFormat !== 'a4') {
    return invalid('bad_request', 'pageFormat must be letter or a4.');
  }
  if (record.pageNumberFormat !== undefined && record.pageNumberFormat !== 'simple' && record.pageNumberFormat !== 'full') {
    return invalid('bad_request', 'pageNumberFormat must be simple or full.');
  }
  if (record.locale !== undefined && record.locale !== 'en' && record.locale !== 'ar') {
    return invalid('bad_request', 'locale must be en or ar.');
  }

  const onePage = optionalBoolean(record.onePage, false, 'onePage');
  if (typeof onePage !== 'boolean') return onePage;
  const atsMode = optionalBoolean(record.atsMode, false, 'atsMode');
  if (typeof atsMode !== 'boolean') return atsMode;
  const showPageNumbers = optionalBoolean(record.showPageNumbers, true, 'showPageNumbers');
  if (typeof showPageNumbers !== 'boolean') return showPageNumbers;
  const showBranding = optionalBoolean(record.showBranding, true, 'showBranding');
  if (typeof showBranding !== 'boolean') return showBranding;

  const totalContentHeightPx = optionalHeight(record.totalContentHeightPx, 'totalContentHeightPx');
  if (totalContentHeightPx && typeof totalContentHeightPx === 'object') return totalContentHeightPx;
  const layoutContentHeightPx = optionalHeight(record.layoutContentHeightPx, 'layoutContentHeightPx');
  if (layoutContentHeightPx && typeof layoutContentHeightPx === 'object') return layoutContentHeightPx;

  const rawBreaks = record.customBreakPositions ?? [];
  if (!Array.isArray(rawBreaks)) {
    return invalid('bad_request', 'customBreakPositions must be an array.');
  }
  if (rawBreaks.length > PDF_EXPORT_MAX_CUSTOM_BREAKS) {
    return tooLarge(
      'export_too_large',
      `A PDF export can contain at most ${PDF_EXPORT_MAX_PAGES} pages.`,
    );
  }
  if (rawBreaks.some((position) =>
    typeof position !== 'number' ||
    !Number.isFinite(position) ||
    position < 0 ||
    position > PDF_EXPORT_MAX_CONTENT_HEIGHT_PX
  )) {
    return invalid('bad_request', 'customBreakPositions contains an invalid page cut.');
  }

  return {
    ok: true,
    value: {
      html: record.html,
      pageFormat: record.pageFormat === 'a4' ? 'a4' : 'letter',
      onePage,
      atsMode,
      showPageNumbers,
      pageNumberFormat: record.pageNumberFormat === 'simple' ? 'simple' : 'full',
      showBranding,
      customBreakPositions: rawBreaks.map((position) => Math.round(position as number)),
      totalContentHeightPx: totalContentHeightPx as number | undefined,
      layoutContentHeightPx: layoutContentHeightPx as number | undefined,
      locale: record.locale === 'ar' ? 'ar' : 'en',
    },
  };
}

export function calculateOnePageScale(contentHeightPx: number, printableHeightPx: number): number {
  const contentHeight = Math.max(1, Number.isFinite(contentHeightPx) ? contentHeightPx : 1);
  const printableHeight = Math.max(1, Number.isFinite(printableHeightPx) ? printableHeightPx : 1);
  return Math.min(1, printableHeight / contentHeight);
}

export function formatPdfPageNumber(
  pageNumber: number,
  totalPages: number,
  format: PdfPageNumberFormat,
  locale: PdfExportLocale,
): string {
  if (format === 'simple') return String(pageNumber);
  return locale === 'ar'
    ? `الصفحة ${pageNumber} من ${totalPages}`
    : `Page ${pageNumber} of ${totalPages}`;
}

export function resolveEffectiveSubscriptionPlan(subscription: unknown): 'free' | 'pro' | 'premium' {
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) return 'free';
  const record = subscription as Record<string, unknown>;
  const raw = String(record.effective_plan ?? record.plan ?? 'free').trim().toLowerCase();
  return raw === 'premium' || raw === 'pro' ? raw : 'free';
}

export function canRemovePdfBranding(subscription: unknown): boolean {
  return resolveEffectiveSubscriptionPlan(subscription) === 'premium';
}
