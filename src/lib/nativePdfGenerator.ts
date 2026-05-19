import type { ContactInfo } from '@/types/resume';
import type { OnProgressCallback } from '@/hooks/useExportProgress';
import { PDFDocument } from 'pdf-lib';
import { normalizeBreakPositions } from '@/lib/exportPagePlan';
import { cloneResumeTemplateElement } from '@/lib/exportDomUtils';
import { getExportContentHeightPx } from '@/lib/exportLayoutMetrics';

const BRANDING_URL = 'https://resume.thewise.cloud';

/**
 * Thrown when the server PDF pipeline is explicitly unavailable (503).
 * Export callers catch this and show a direct retry/DOCX fallback message.
 */
export class PDFServerUnavailableError extends Error {
  readonly code = 'PDF_SERVER_UNAVAILABLE';

  constructor(message = 'PDF export is temporarily unavailable. Please try again later or use DOCX export.') {
    super(message);
    this.name = 'PDFServerUnavailableError';
  }
}

export interface GenerateNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onePage?: boolean;
  atsMode?: boolean;
  customBreakPositions?: number[];
  onProgress?: OnProgressCallback;
}

export interface GenerateCoverLetterNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onProgress?: OnProgressCallback;
}

// ── Style collection ──────────────────────────────────────────────────────────

/**
 * Collects all CSS rules from document.styleSheets into a single string.
 * - Same-origin sheets: all rules are inlined with relative URLs made absolute.
 * - Cross-origin sheets (Google Fonts, CDN): added as @import so Puppeteer
 *   fetches them directly (Puppeteer is a full browser and CAN load external URLs).
 */
function collectDocumentStyles(): string {
  const parts: string[] = [];
  const origin = window.location.origin;

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        let text = rule.cssText;
        // Make any relative url(...) references absolute so Puppeteer can fetch them
        text = text.replace(
          /url\((['"]?)(?!data:|https?:|ftp:|\/\/)(\/?[^'")]+)\1\)/g,
          (_match, quote, path) => {
            try {
              const abs = new URL(path.startsWith('/') ? path : '/' + path, origin).href;
              return `url(${quote}${abs}${quote})`;
            } catch {
              return _match;
            }
          },
        );
        parts.push(text);
      }
    } catch {
      // Cross-origin sheet — Puppeteer will load it via @import
      if (sheet.href) {
        parts.push(`@import url('${sheet.href}');`);
      }
    }
  }
  return parts.join('\n');
}

/**
 * Builds a self-contained HTML document from a resume template element.
 * Embeds all document CSS so Puppeteer renders it identically to the browser.
 */
function buildSelfContainedHTML(
  templateHTML: string,
  css: string,
  pageFormat: 'letter' | 'a4',
  opts: { onePage?: boolean; atsMode?: boolean } = {},
): string {
  // Match the page width Puppeteer will use for the PDF format
  const pageWidthPx = pageFormat === 'a4' ? 595 : 612;

  const atsModeStyle = opts.atsMode
    ? `
      * { color: #000 !important; background: #fff !important;
          box-shadow: none !important; text-shadow: none !important;
          border-color: #000 !important; }
      [class*="bg-"], [class*="text-"] { color: inherit !important; background: inherit !important; }
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${pageWidthPx}, initial-scale=1.0">
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${pageWidthPx}px;
      background: #fff;
    }
    ${atsModeStyle}
    ${css}
  </style>
</head>
<body>
  <div style="width:${pageWidthPx}px; overflow:hidden;">
    ${templateHTML}
  </div>
  <a
    class="wr-export-watermark-source"
    href="${BRANDING_URL}"
    style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"
  >Wise Resume</a>
</body>
</html>`;
}

// ── API call ──────────────────────────────────────────────────────────────────

/**
 * Posts the serialised HTML to the Express server's Puppeteer PDF endpoint.
 * Uses VITE_API_URL in production (set it to the server's public URL).
 * Falls back to a relative URL in dev (the Vite proxy forwards /api/* → :5001).
 */
async function callPdfServer(
  payload: {
    html: string;
    pageFormat: string;
    onePage?: boolean;
    atsMode?: boolean;
    showPageNumbers?: boolean;
    showBranding?: boolean;
    customBreakPositions?: number[];
    totalContentHeightPx?: number;
  },
  onProgress?: OnProgressCallback,
  attempt = 0,
): Promise<Blob> {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const url = `${apiBase}/api/export/pdf-native`;

  onProgress?.('finalizing', 70);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    throw new PDFServerUnavailableError();
  }
  clearTimeout(timeoutId);

  if (response.status === 503) {
    throw new PDFServerUnavailableError();
  }

  if (!response.ok) {
    let msg = `Server error ${response.status}`;
    try {
      const j = await response.json();
      if (j.message) msg = j.message;
    } catch { /* ignore */ }
    // Retry once for transient server errors (5xx only, not 4xx)
    if (attempt === 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, 3000));
      return callPdfServer(payload, onProgress, 1);
    }
    throw new Error(msg);
  }

  // Guard: if the server returned HTML instead of a PDF (e.g. SPA fallback
  // from Hostinger when the Express server is not deployed), treat it as
  // unavailable rather than downloading an HTML file named .pdf
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new PDFServerUnavailableError(
      'PDF server is not available in this environment. Please try again later or use DOCX export.',
    );
  }

  onProgress?.('downloading', 90);
  return response.blob();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a resume PDF via Puppeteer (server-side) from a live DOM element.
 * Produces a real PDF with selectable text, full colour, and hyperlinks.
 */
export async function generateNativePDF(
  templateEl: HTMLElement,
  options: GenerateNativePDFOptions = {},
): Promise<Blob> {
  const {
    pageFormat = 'letter',
    onePage = false,
    atsMode = false,
    showPageNumbers = true,
    showBranding = true,
    customBreakPositions,
    onProgress,
  } = options;

  onProgress?.('preparing', 5);

  // Collect all page CSS (inline + linked stylesheets)
  const css = collectDocumentStyles();

  onProgress?.('capturing', 20);

  // Serialise without editor-only overlays (page-break guides, section controls)
  const templateHTML = cloneResumeTemplateElement(templateEl).outerHTML;
  const html = buildSelfContainedHTML(templateHTML, css, pageFormat, { onePage, atsMode });
  const totalContentHeightPx = getExportContentHeightPx(templateEl);
  const normalizedBreaks = normalizeBreakPositions(customBreakPositions, totalContentHeightPx);

  onProgress?.('finalizing', 50);

  return callPdfServer({
    html,
    pageFormat,
    onePage,
    atsMode,
    showPageNumbers,
    showBranding,
    totalContentHeightPx,
    customBreakPositions: normalizedBreaks,
  }, onProgress);
}

/**
 * Generate a cover letter PDF.
 * Uses the client-side pdf-lib generator (already produces selectable text).
 */
export async function generateCoverLetterNativePDF(
  letter: unknown,
  _contactInfo: ContactInfo | undefined,
  options: GenerateCoverLetterNativePDFOptions = {},
): Promise<Blob> {
  const { onProgress } = options;
  onProgress?.('preparing', 10);

  const { generateCoverLetterPDF } = await import('@/lib/coverLetterPdfGenerator');
  const bytes = await generateCoverLetterPDF(letter as Parameters<typeof generateCoverLetterPDF>[0]);

  onProgress?.('downloading', 90);
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

/**
 * Merge two PDF blobs into one document (for combined resume + cover letter export).
 * Uses pdf-lib on the client — no server round-trip needed.
 */
export async function mergePDFBlobs(blobA: Blob, blobB: Blob): Promise<Blob> {
  const [bytesA, bytesB] = await Promise.all([
    blobA.arrayBuffer(),
    blobB.arrayBuffer(),
  ]);

  const [docA, docB] = await Promise.all([
    PDFDocument.load(bytesA),
    PDFDocument.load(bytesB),
  ]);

  const merged = await PDFDocument.create();
  const pagesA = await merged.copyPages(docA, docA.getPageIndices());
  pagesA.forEach(p => merged.addPage(p));
  const pagesB = await merged.copyPages(docB, docB.getPageIndices());
  pagesB.forEach(p => merged.addPage(p));

  const mergedBytes = await merged.save();
  return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
