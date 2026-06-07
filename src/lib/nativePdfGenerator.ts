import type { ContactInfo } from '@/types/resume';
import type { OnProgressCallback } from '@/hooks/useExportProgress';
import { PDFDocument } from 'pdf-lib';
import { cloneResumeTemplateElement } from '@/lib/exportDomUtils';
import { getExportContentHeightPx } from '@/lib/exportLayoutMetrics';
import { getAppwriteJWT } from '@/lib/appwriteJWT';

const BRANDING_URL = 'https://resume.thewise.cloud';

/**
 * Thrown when the server-side PDF renderer is unavailable.
 * Export callers use this to show a clear retry/DOCX fallback message.
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

export type NativePdfOptions = GenerateNativePDFOptions;

export interface GenerateCoverLetterNativePDFOptions {
  pageFormat?: 'letter' | 'a4';
  showPageNumbers?: boolean;
  showBranding?: boolean;
  onProgress?: OnProgressCallback;
}

function getLiveLayoutHeightPx(templateEl: HTMLElement): number {
  return Math.max(templateEl.scrollHeight || 0, templateEl.offsetHeight || 0, 1);
}

async function collectDocumentStyles(): Promise<string> {
  const parts: string[] = [];
  const origin = window.location.origin;

  for (const sheet of Array.from(document.styleSheets)) {
    const href = sheet.href;

    // Try direct rule access — succeeds for same-origin sheets in dev environments.
    let rulesAccessed = false;
    try {
      const rules = sheet.cssRules;
      if (rules) {
        rulesAccessed = true;
        for (const rule of Array.from(rules)) {
          let text = rule.cssText;
          // Resolve relative asset URLs to absolute so Puppeteer can locate them.
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
      }
    } catch { /* cross-origin sheet — SecurityError accessing cssRules */ }

    if (rulesAccessed) continue;

    // Cross-origin or production same-origin: fetch and inline the raw CSS text
    // so the HTML payload is self-contained and Puppeteer makes zero external
    // network requests during rendering.
    if (href) {
      try {
        const resp = await fetch(href, { mode: 'cors' });
        if (resp.ok) {
          parts.push(await resp.text());
          continue;
        }
      } catch { /* network failure — fall through to @import fallback */ }
      parts.push(`@import url('${href}');`);
    }
  }

  return parts.join('\n');
}

function buildSelfContainedHTML(
  templateHTML: string,
  css: string,
  pageFormat: 'letter' | 'a4',
  opts: { atsMode?: boolean } = {},
): string {
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
    a {
      color: inherit;
      text-decoration: inherit;
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
  >WiseResume</a>
</body>
</html>`;
}

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
    /** Live (untrimed) layout height — used by the server to safely validate
     *  custom break positions near the bottom of the content without
     *  rejecting them due to trailing-whitespace trimming. */
    layoutContentHeightPx?: number;
  },
  onProgress?: OnProgressCallback,
  attempt = 0,
): Promise<Blob> {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  const url = `${apiBase}/api/export/pdf-native`;

  onProgress?.('finalizing', 70);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  const jwt = await getAppwriteJWT();
  if (jwt) reqHeaders['X-Appwrite-JWT'] = jwt;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: reqHeaders,
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
    const errContentType = response.headers.get('content-type') ?? '';
    if (!errContentType.includes('application/json')) {
      throw new PDFServerUnavailableError();
    }

    let msg = `Server error ${response.status}`;
    try {
      const j = await response.json();
      if (j.message) msg = j.message;
    } catch { /* ignore */ }

    if (attempt === 0 && response.status >= 500) {
      await new Promise(r => setTimeout(r, 3000));
      return callPdfServer(payload, onProgress, 1);
    }

    throw new Error(msg);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/pdf')) {
    throw new PDFServerUnavailableError(
      'PDF server is not available in this environment. Please try again later or use DOCX export.',
    );
  }

  onProgress?.('downloading', 90);
  return response.blob();
}

/**
 * Generates a real browser PDF through the Puppeteer-backed renderer.
 *
 * This intentionally does not use html2canvas. The output keeps selectable
 * text and clickable links because Chromium prints the serialized HTML.
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

  const css = await collectDocumentStyles();
  const pageWidthPx = pageFormat === 'a4' ? 595 : 612;

  onProgress?.('capturing', 20);

  const templateHTML = cloneResumeTemplateElement(templateEl, pageWidthPx).outerHTML;
  const html = buildSelfContainedHTML(templateHTML, css, pageFormat, { atsMode });

  // exportContentHeightPx: trailing-whitespace-trimmed height — used as the
  // render/crop height for the final PDF page (preserves the existing
  // last-page trimming behaviour).
  const exportContentHeightPx = getExportContentHeightPx(templateEl);

  // liveLayoutHeightPx: raw scrollHeight/offsetHeight — used as the safe
  // validation height so custom breaks near the bottom of visible content are
  // never discarded by clampBreakPositions on the server.
  const liveLayoutHeightPx = getLiveLayoutHeightPx(templateEl);

  const hasCustomBreaks = (customBreakPositions?.length ?? 0) > 0;

  // totalContentHeightPx: the height the server uses to crop the final page.
  // When custom breaks exist we still include lastBreak+40 as a floor so the
  // server's trimmed height never undercuts a valid break position.
  const lastCustomBreakPx = hasCustomBreaks
    ? Math.max(...customBreakPositions!.filter(Number.isFinite), 0)
    : 0;
  const totalContentHeightPx = hasCustomBreaks
    ? Math.max(exportContentHeightPx, liveLayoutHeightPx, lastCustomBreakPx + 40)
    : exportContentHeightPx;

  onProgress?.('finalizing', 50);

  return callPdfServer({
    html,
    pageFormat,
    onePage,
    atsMode,
    showPageNumbers,
    showBranding,
    // Render/crop height for the final page — trimmed or guarded as above.
    totalContentHeightPx,
    // Safe validation height for custom break clamping: always >= real layout
    // height so breaks near the bottom of visible content are never dropped.
    layoutContentHeightPx: liveLayoutHeightPx,
    // Send the raw saved positions — the server validates them against the
    // safe validation height (not just the trimmed export height) so that
    // valid breaks near the bottom of the content are preserved.
    customBreakPositions: customBreakPositions ?? [],
  }, onProgress);
}

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

export const _legacyBuildSelfContainedHTML = buildSelfContainedHTML;
