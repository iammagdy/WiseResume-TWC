/**
 * Vercel Serverless Function — PDF Export via Puppeteer
 *
 * Mirrors the Express /api/export/pdf-native endpoint in server/index.ts but
 * runs as a Vercel function using puppeteer-core + @sparticuz/chromium so
 * that PDF export works on the production domain without a separate server.
 *
 * Same-origin deployment: the frontend calls /api/export/pdf-native, which
 * Vercel routes to this function. No VITE_API_URL needed in production.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
// @sparticuz/chromium v120+ is ESM-only. Vercel's ncc bundler outputs CJS, so a
// static import would cause ERR_MODULE_NOT_FOUND at runtime. Dynamic import()
// makes ncc treat it as external — Node.js loads it as ESM from node_modules.
// vercel.json includeFiles ensures the ESM files ship with the function bundle.
// Keep puppeteer-core dynamic as well so simple 405/400 responses do not crash
// when Vercel is resolving the serverless bundle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _puppeteer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chromium: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pdfLib: any;

export const config = {
  api: {
    bodyParser: {
      // CSS is now fully inlined by the client (no @import). Payload = template
      // HTML (~80KB) + inlined stylesheet (~400KB). 8mb gives ample headroom.
      sizeLimit: '8mb',
    },
  },
  // PDF rendering can take 20-45s for multi-page resumes; 60s gives plenty of headroom.
  maxDuration: 60,
};

// ── Constants ─────────────────────────────────────────────────────────────────

const PDF_FORMATS = {
  letter: { widthPx: 612, heightPx: 792 },
  a4:     { widthPx: 595, heightPx: 842 },
} as const;

const EXPORT_FOOTER_HEIGHT_PX = 44;
const EXPORT_BRAND_URL = 'https://resume.thewise.cloud';
const DEFAULT_MIN_GAP_PX = 40;
const SECTION_HEADING_GUARD_PX = 80;
const NEAR_SECTION_TOP_PX = 24;

interface ExportPageSegment {
  index: number;
  startPx: number;
  heightPx: number;
  isLast: boolean;
}

interface ExportSectionBounds {
  top: number;
  bottom: number;
  headingTop: number;
}

function normalizeBreakPositions(
  positions: number[] | undefined,
  totalContentHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!positions?.length || !Number.isFinite(totalContentHeightPx) || totalContentHeightPx <= 0) {
    return [];
  }

  const sorted = positions
    .filter((position) => Number.isFinite(position))
    .map((position) => Math.round(position))
    .filter((position) => position >= minGapPx && position <= totalContentHeightPx - minGapPx)
    .sort((a, b) => a - b);

  const normalized: number[] = [];
  for (const position of sorted) {
    const previous = normalized[normalized.length - 1];
    if (previous === undefined || position - previous >= minGapPx) {
      normalized.push(position);
    }
  }
  return normalized;
}

function scaleBreakPositionsToMeasuredHeight(
  positions: number[] | undefined,
  clientHeightPx: number,
  measuredHeightPx: number,
): number[] {
  if (!positions?.length) return [];
  const client = Math.max(1, Math.round(clientHeightPx));
  const measured = Math.max(1, Math.round(measuredHeightPx));
  if (client === measured) {
    return positions.filter(Number.isFinite).map((p) => Math.round(p));
  }
  const scale = measured / client;
  return positions.filter(Number.isFinite).map((p) => Math.round(p * scale));
}

function snapBreakPositionsToSectionHeadings(
  breaks: number[],
  sections: ExportSectionBounds[],
  totalHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!breaks.length || !sections.length) return breaks;
  const sorted = [...sections].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);

  return breaks.map((breakY) => {
    let y = breakY;
    for (const section of sorted) {
      const headTop = section.headingTop ?? section.top;
      const inSection = y > section.top && y < section.bottom;
      const nearSectionTop =
        y >= section.top - NEAR_SECTION_TOP_PX && y <= headTop + SECTION_HEADING_GUARD_PX;

      if (inSection) {
        const fromSectionStart = y - section.top;
        if (fromSectionStart <= SECTION_HEADING_GUARD_PX || y <= headTop + SECTION_HEADING_GUARD_PX) {
          y = Math.max(minGapPx, headTop);
          break;
        }
      } else if (nearSectionTop) {
        y = Math.max(minGapPx, headTop);
        break;
      }
    }
    return Math.min(y, maxY);
  });
}

function buildExportPageSegments(args: {
  totalContentHeightPx: number;
  pageHeightPx: number;
  customBreakPositions?: number[];
  minGapPx?: number;
}): ExportPageSegment[] {
  const {
    totalContentHeightPx,
    pageHeightPx,
    customBreakPositions,
    minGapPx = DEFAULT_MIN_GAP_PX,
  } = args;
  const total = Math.max(1, Math.round(totalContentHeightPx || 0));
  const pageHeight = Math.max(1, Math.round(pageHeightPx || total));
  const customBreaks = normalizeBreakPositions(customBreakPositions, total, minGapPx);
  const breaks = customBreaks.length > 0
    ? customBreaks
    : Array.from(
        { length: Math.max(0, Math.ceil(total / pageHeight) - 1) },
        (_unused, index) => pageHeight * (index + 1),
      ).filter((position) => position < total);

  const points = [0, ...breaks, total];
  const segments: ExportPageSegment[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const startPx = points[index];
    const endPx = points[index + 1];
    const heightPx = Math.max(1, endPx - startPx);
    segments.push({
      index,
      startPx,
      heightPx,
      isLast: index === points.length - 2,
    });
  }

  return segments;
}

async function importExternalModule<T = unknown>(specifier: string): Promise<T> {
  // Vercel's ncc bundler must not relocate @sparticuz/chromium, because the
  // package resolves its compressed Chromium binaries relative to its own
  // package directory. An indirect import keeps it external; vercel.json
  // includeFiles ships node_modules/@sparticuz/chromium/** with the function.
  const importer = new Function('specifier', 'return import(specifier)') as
    (specifier: string) => Promise<T>;
  return importer(specifier);
}

async function loadPdfLib() {
  if (!_pdfLib) {
    _pdfLib = await importExternalModule<typeof import('pdf-lib')>('pdf-lib');
  }
  return _pdfLib;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function extractHtmlParts(html: string): { head: string; body: string } {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  return { head, body };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSegmentHtml(args: {
  sourceHtml: string;
  pageWidthPx: number;
  contentStartPx: number;
  contentHeightPx: number;
  footerHeightPx: number;
  pageNumber?: string;
  showBranding: boolean;
}): string {
  const { head, body } = extractHtmlParts(args.sourceHtml);
  const pageHeightPx = args.contentHeightPx + args.footerHeightPx;
  const pageNumber = args.pageNumber ? escapeHtml(args.pageNumber) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
${head}
<style>
  @page { size: ${args.pageWidthPx}px ${pageHeightPx}px; margin: 0; }
  html, body {
    width: ${args.pageWidthPx}px !important;
    height: ${pageHeightPx}px !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    background: #fff !important;
  }
  .wr-export-page-clip {
    position: relative;
    width: ${args.pageWidthPx}px;
    height: ${args.contentHeightPx}px;
    overflow: hidden;
    background: #fff;
  }
  .wr-export-page-source {
    position: absolute;
    left: 0;
    top: -${args.contentStartPx}px;
    width: ${args.pageWidthPx}px;
  }
  .wr-export-page-footer {
    width: ${args.pageWidthPx}px;
    height: ${args.footerHeightPx}px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font: 9px Arial, sans-serif;
    color: #737373;
    background: #fff;
  }
  .wr-export-page-footer a {
    color: #737373;
    text-decoration: none;
  }
</style>
</head>
<body>
  <div class="wr-export-page-clip">
    <div class="wr-export-page-source">${body}</div>
  </div>
  ${args.footerHeightPx > 0 ? `
    <div class="wr-export-page-footer">
      ${pageNumber && args.showBranding
        ? `<span>${pageNumber} - Made with <a href="${EXPORT_BRAND_URL}">WiseResume</a></span>`
        : pageNumber
          ? `<span>${pageNumber}</span>`
          : args.showBranding
            ? `<a href="${EXPORT_BRAND_URL}">WiseResume</a>`
            : ''}
    </div>
  ` : ''}
</body>
</html>`;
}

function buildFooterTemplate(args: {
  showPageNumbers: boolean;
  showBranding: boolean;
}): string {
  const pageNumber = args.showPageNumbers
    ? `<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>`
    : '';
  const separator = args.showPageNumbers && args.showBranding ? '<span>&nbsp;-&nbsp;</span>' : '';
  const branding = args.showBranding ? '<span>Made with WiseResume</span>' : '';

  return `
    <div style="
      width: 100%;
      font: 9px Arial, sans-serif;
      color: #737373;
      text-align: center;
      padding-bottom: 12px;
    ">
      ${pageNumber}${separator}${branding}
    </div>
  `;
}

// ── Puppeteer helpers ─────────────────────────────────────────────────────────

interface ExportLayoutMetrics {
  measuredHeight: number;
  sections: ExportSectionBounds[];
}

async function measureExportLayout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  html: string,
  widthPx: number,
): Promise<ExportLayoutMetrics> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    // Wait for fonts so layout heights are accurate (avoids system-font fallback metrics).
    try { await page.evaluateHandle(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready); } catch { /* ignore */ }
    return await page.evaluate(() => {
      const template = document.querySelector('[data-resume-template]') as HTMLElement | null;
      const root = template ?? document.body;

      function relTop(el: HTMLElement): number {
        let top = 0;
        let curr: HTMLElement | null = el;
        while (curr && curr !== root && root.contains(curr)) {
          top += curr.offsetTop;
          curr = curr.offsetParent as HTMLElement | null;
        }
        return top;
      }

      const layoutHeight = Math.max(
        root.scrollHeight,
        root.offsetHeight,
        document.body.scrollHeight,
        1,
      );

      const sections = Array.from(root.querySelectorAll('[data-section]')).map((sec) => {
        const sectionEl = sec as HTMLElement;
        const top = relTop(sectionEl);
        const directHeading = sectionEl.querySelector(':scope > h2, :scope > h3') as HTMLElement | null;
        const heading = directHeading ?? (sectionEl.querySelector('h2, h3') as HTMLElement | null);
        const headingTop = heading ? relTop(heading) : top;
        return {
          top,
          bottom: top + sectionEl.offsetHeight,
          headingTop,
        };
      });

      let measuredHeight = layoutHeight;
      if (sections.length > 0) {
        const maxSectionBottom = Math.max(...sections.map((s) => s.bottom));
        const contentHeight = maxSectionBottom + 8;
        if (layoutHeight > contentHeight * 1.12 && contentHeight >= 120) {
          measuredHeight = Math.max(Math.round(contentHeight), 1);
        }
      }

      return { measuredHeight, sections };
    });
  } finally {
    await page.close();
  }
}

async function renderHtmlToPdfBuffer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  html: string,
  widthPx: number,
  heightPx: number,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: widthPx, height: Math.max(1, heightPx), deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    // Wait for fonts before printing so the PDF uses the correct typefaces.
    try { await page.evaluateHandle(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready); } catch { /* ignore */ }
    const pdf = await page.pdf({
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

async function mergePdfBuffers(buffers: Buffer[]): Promise<Uint8Array> {
  if (buffers.length === 1) return new Uint8Array(buffers[0]);
  const { PDFDocument } = await loadPdfLib();
  const merged = await PDFDocument.create();
  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }
  return merged.save();
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Only POST is supported' });
  }

  const {
    html,
    pageFormat = 'letter',
    onePage = false,
    showPageNumbers = true,
    showBranding = true,
    customBreakPositions = [],
    totalContentHeightPx,
  } = req.body as {
    html?: string;
    pageFormat?: string;
    onePage?: boolean;
    showPageNumbers?: boolean;
    showBranding?: boolean;
    customBreakPositions?: number[];
    totalContentHeightPx?: number;
  };

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'bad_request', message: 'Missing html body' });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any;
  try {
    // Dynamic imports keep Vercel's serverless bundle from crashing during
    // module startup. Cache modules after the first load to avoid repeated work.
    console.log('[pdf] loading modules');
    if (!_puppeteer) {
      _puppeteer = (await import('puppeteer-core')).default;
    }
    if (!_chromium) {
      _chromium = (await importExternalModule<{ default: unknown }>('@sparticuz/chromium')).default;
    }
    const puppeteer = _puppeteer;
    const chromium = _chromium;

    console.log('[pdf] launching browser, chromium args count:', chromium.args?.length);
    const execPath = await chromium.executablePath();
    console.log('[pdf] executablePath:', execPath ? execPath.slice(-60) : 'undefined');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: true,
    });
    console.log('[pdf] browser launched');

    const isA4 = pageFormat === 'a4';
    const dims = isA4 ? PDF_FORMATS.a4 : PDF_FORMATS.letter;
    console.log('[pdf] html size (bytes):', html.length, 'format:', pageFormat,
      'clientHeight:', totalContentHeightPx);

    // Use the client-reported content height directly.
    // The client measures from the live React DOM; the inlined CSS is identical,
    // so server and client heights are the same. Skipping a server measurement
    // pass eliminates one full browser-page open/close cycle (which was the
    // source of extra load time that caused failures).
    const contentHeight = (totalContentHeightPx && totalContentHeightPx > 0)
      ? totalContentHeightPx
      : dims.heightPx;

    // normalizeBreakPositions already ran on the client; just round here.
    const snappedBreaks = (customBreakPositions ?? [])
      .filter(Number.isFinite)
      .map(Math.round);

    // Divide content into page segments.
    const footerHeight = showPageNumbers || showBranding ? EXPORT_FOOTER_HEIGHT_PX : 0;
    const contentPageHeight = dims.heightPx - footerHeight;
    const segments = buildExportPageSegments({
      totalContentHeightPx: contentHeight,
      pageHeightPx: contentPageHeight,
      customBreakPositions: snappedBreaks,
    });
    console.log('[pdf] segments:', segments.length, 'footer:', footerHeight, 'px',
      'contentHeight:', contentHeight);

    // 5. Render each segment as a separate PDF page.
    const pdfBuffers: Buffer[] = [];
    for (const segment of segments) {
      console.log('[pdf] rendering segment', segment.index + 1, '/',
        segments.length, 'start:', segment.startPx, 'h:', segment.heightPx);
      const pageLabel = showPageNumbers
        ? `Page ${segment.index + 1} of ${segments.length}`
        : undefined;
      const segHtml = buildSegmentHtml({
        sourceHtml: html,
        pageWidthPx: dims.widthPx,
        contentStartPx: segment.startPx,
        contentHeightPx: segment.heightPx,
        footerHeightPx: footerHeight,
        pageNumber: pageLabel,
        showBranding,
      });
      const buf = await renderHtmlToPdfBuffer(
        browser,
        segHtml,
        dims.widthPx,
        segment.heightPx + footerHeight,
      );
      pdfBuffers.push(buf);
      console.log('[pdf] segment', segment.index + 1, 'done:', buf.length, 'bytes');
    }

    // 6. onePage: keep only the first segment if requested.
    const buffersToMerge = onePage ? pdfBuffers.slice(0, 1) : pdfBuffers;
    console.log('[pdf] merging', buffersToMerge.length, 'buffer(s)');

    // 7. Merge segment PDFs into the final file.
    const pdfBuffer = await mergePdfBuffers(buffersToMerge);
    console.log('[pdf] done, total size:', pdfBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? '') : '';
    console.error('[pdf] error:', message);
    if (stack) console.error('[pdf] stack:', stack);
    res.status(500).json({ error: 'pdf_failed', message });
  } finally {
    await browser?.close();
  }
}
