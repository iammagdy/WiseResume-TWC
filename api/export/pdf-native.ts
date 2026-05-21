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

interface ExportAvoidBounds {
  top: number;
  bottom: number;
  childTops: number[];
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

function clampBreakPositions(
  positions: number[] | undefined,
  totalContentHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!positions?.length || !Number.isFinite(totalContentHeightPx) || totalContentHeightPx <= minGapPx * 2) {
    return [];
  }

  const minY = minGapPx;
  const maxY = totalContentHeightPx - minGapPx;
  return normalizeBreakPositions(
    positions
      .filter((position) => Number.isFinite(position))
      .map((position) => Math.min(maxY, Math.max(minY, Math.round(position)))),
    totalContentHeightPx,
    minGapPx,
  );
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

function snapBreakPositionsToAvoidBlocks(
  breaks: number[],
  avoidBlocks: ExportAvoidBounds[],
  pageHeightPx: number,
  totalHeightPx: number,
  minGapPx: number = DEFAULT_MIN_GAP_PX,
): number[] {
  if (!breaks.length || !avoidBlocks.length) return breaks;
  const sorted = [...avoidBlocks].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);
  const pageHeight = Math.max(1, Math.round(pageHeightPx || totalHeightPx));
  const maxShift = Math.min(pageHeight * 0.5, 350);

  return breaks.map((breakY) => {
    let y = breakY;
    const hit = sorted.find((block) => y > block.top && y < block.bottom);
    if (!hit) return Math.min(Math.max(y, minGapPx), maxY);

    const blockHeight = hit.bottom - hit.top;
    if (hit.bottom - y <= minGapPx) {
      y = hit.bottom;
    } else if (y - hit.top <= minGapPx) {
      y = hit.top;
    } else if (blockHeight < pageHeight) {
      y = hit.top;
    } else if (hit.childTops.length > 0) {
      let best = y;
      let bestDistance = Infinity;
      for (const childTop of hit.childTops) {
        const distance = Math.abs(childTop - y);
        if (distance < bestDistance && distance <= maxShift) {
          best = childTop;
          bestDistance = distance;
        }
      }
      y = best;
    }

    return Math.min(Math.max(y, minGapPx), maxY);
  });
}

function buildAutomaticBreakPositions(args: {
  totalContentHeightPx: number;
  pageHeightPx: number;
  sections?: ExportSectionBounds[];
  avoidBlocks?: ExportAvoidBounds[];
  minGapPx?: number;
}): number[] {
  const {
    totalContentHeightPx,
    pageHeightPx,
    sections = [],
    avoidBlocks = [],
    minGapPx = DEFAULT_MIN_GAP_PX,
  } = args;
  const total = Math.max(1, Math.round(totalContentHeightPx || 0));
  const pageHeight = Math.max(1, Math.round(pageHeightPx || total));
  const rawBreaks = Array.from(
    { length: Math.max(0, Math.ceil(total / pageHeight) - 1) },
    (_unused, index) => pageHeight * (index + 1),
  ).filter((position) => position < total);

  if (rawBreaks.length === 0) return [];

  const sectionSnapped = snapBreakPositionsToSectionHeadings(rawBreaks, sections, total, minGapPx);
  const avoidSnapped = snapBreakPositionsToAvoidBlocks(sectionSnapped, avoidBlocks, pageHeight, total, minGapPx);
  const normalized = normalizeBreakPositions(avoidSnapped, total, minGapPx);

  return normalized.length > 0 ? normalized : normalizeBreakPositions(rawBreaks, total, minGapPx);
}

function buildExportPageSegments(args: {
  totalContentHeightPx: number;
  pageHeightPx: number;
  customBreakPositions?: number[];
  minGapPx?: number;
  /** Safe height for validating custom breaks. When > totalContentHeightPx,
   *  near-bottom user-placed cuts are not silently filtered out by the
   *  trailing-whitespace-trimmed totalContentHeightPx. Segment math (last-page
   *  height) still uses totalContentHeightPx to preserve last-page cropping. */
  breakValidationHeightPx?: number;
}): ExportPageSegment[] {
  const {
    totalContentHeightPx,
    pageHeightPx,
    customBreakPositions,
    minGapPx = DEFAULT_MIN_GAP_PX,
    breakValidationHeightPx,
  } = args;
  const total = Math.max(1, Math.round(totalContentHeightPx || 0));
  const pageHeight = Math.max(1, Math.round(pageHeightPx || total));
  // Use safe validation height for normalizing custom breaks; fall back to
  // total when no safe height is provided or when it's not larger than total.
  const validationTotal = (breakValidationHeightPx && breakValidationHeightPx > total)
    ? Math.round(breakValidationHeightPx)
    : total;
  const customBreaks = normalizeBreakPositions(customBreakPositions, validationTotal, minGapPx);
  const breaks = customBreaks.length > 0
    ? customBreaks
    : Array.from(
        { length: Math.max(0, Math.ceil(total / pageHeight) - 1) },
        (_unused, index) => pageHeight * (index + 1),
      ).filter((position) => position < total);

  // Always use `total` (trimmed height) as the final point so the last page
  // is still cropped to real content — not padded to the safe validation height.
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
    _pdfLib = (await import('pdf-lib')) as typeof import('pdf-lib');
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
  avoidBlocks: ExportAvoidBounds[];
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

      const avoidBlocks = Array.from(root.querySelectorAll('[data-break-avoid]')).map((node) => {
        const el = node as HTMLElement;
        const top = relTop(el);
        return {
          top,
          bottom: top + el.offsetHeight,
          childTops: Array.from(el.querySelectorAll('[data-break-child]')).map((child) =>
            relTop(child as HTMLElement),
          ),
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

      return { measuredHeight, sections, avoidBlocks };
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
    // Interception remains enabled only to preserve the existing request hook;
    // every resource is continued so fonts/images match the approved layout.
    await page.setRequestInterception(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page.on('request', (req: any) => {
      const url: string = req.url() as string;
      const type: string = req.resourceType() as string;
      const shouldBlockResource = false;
      if (shouldBlockResource && (
        type === 'font' ||
        url.includes('fonts.gstatic.com') ||
        url.includes('fonts.googleapis.com')
      )) {
        req.abort().catch(() => undefined);
      } else {
        req.continue().catch(() => undefined);
      }
    });

    await page.setViewport({ width: widthPx, height: Math.max(1, heightPx), deviceScaleFactor: 1 });
    // domcontentloaded fires as soon as the DOM is parsed; no waiting for external
    // resources (images, fonts). All CSS is already inlined in the payload.
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
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
    layoutContentHeightPx,
  } = req.body as {
    html?: string;
    pageFormat?: string;
    onePage?: boolean;
    showPageNumbers?: boolean;
    showBranding?: boolean;
    customBreakPositions?: number[];
    totalContentHeightPx?: number;
    /** Live (untrimmed) layout height sent by the client for safe custom-break
     *  validation — may be larger than totalContentHeightPx when trailing
     *  whitespace has been trimmed for final-page cropping. */
    layoutContentHeightPx?: number;
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
      console.log('[pdf] step: import puppeteer-core');
      // puppeteer-core has dual CJS/ESM exports pointing to the same .js file,
      // so ncc can bundle it inline. Use a regular dynamic import (not
      // importExternalModule) so ncc includes it in the Lambda bundle.
      _puppeteer = (await import('puppeteer-core') as { default: unknown }).default;
      console.log('[pdf] step: puppeteer-core ok');
    }
    if (!_chromium) {
      console.log('[pdf] step: import @sparticuz/chromium');
      _chromium = (await importExternalModule<{ default: unknown }>('@sparticuz/chromium')).default;
      console.log('[pdf] step: chromium module ok, type:', typeof _chromium);
    }
    const puppeteer = _puppeteer;
    const chromium = _chromium;

    console.log('[pdf] step: get chromium args, count:', chromium.args?.length);
    console.log('[pdf] step: get executablePath');
    const execPath = await chromium.executablePath();
    console.log('[pdf] step: executablePath ok:', execPath ? execPath.slice(-50) : 'undefined');
    console.log('[pdf] step: launch browser');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: null,
      executablePath: execPath,
      headless: true,
    });
    console.log('[pdf] step: browser launched');

    const isA4 = pageFormat === 'a4';
    const dims = isA4 ? PDF_FORMATS.a4 : PDF_FORMATS.letter;
    console.log('[pdf] html size (bytes):', html.length, 'format:', pageFormat,
      'trimmedContentH:', totalContentHeightPx, 'layoutContentH:', layoutContentHeightPx);

    // contentHeight: the trailing-whitespace-trimmed height used for FINAL-PAGE
    // CROPPING. This preserves the existing behaviour that the last PDF page is
    // cropped to real content rather than padded with blank space.
    let contentHeight = (totalContentHeightPx && totalContentHeightPx > 0)
      ? totalContentHeightPx
      : dims.heightPx;

    // Saved custom cuts are authoritative — do not snap/move them.
    const exactCustomBreaks = (customBreakPositions ?? [])
      .filter(Number.isFinite)
      .map(Math.round);

    const footerHeight = showPageNumbers || showBranding ? EXPORT_FOOTER_HEIGHT_PX : 0;
    const contentPageHeight = dims.heightPx - footerHeight;
    if (exactCustomBreaks.length > 0) {
      console.log('[pdf] exact custom breaks:', exactCustomBreaks);
    }

    // ALWAYS measure the server-side layout! Headless Chromium on Vercel
    // renders fonts with slightly different metrics than the client OS browser,
    // causing subpixel shifts that accumulate over the page. If we blindly
    // use client Y-coordinates, a cut meant to be exactly before "Education"
    // might accidentally slice through it or leave it stranded on the first page.
    const layout = await measureExportLayout(browser, html, dims.widthPx);
    contentHeight = Math.max(Math.round(contentHeight), Math.round(layout.measuredHeight));

    // ── Custom-break validation height ─────────────────────────────────
    // clampBreakPositions/normalizeBreakPositions filter positions where:
    //   position < minGap  OR  position > validationHeight − minGap
    const lastCustomBreakPx = exactCustomBreaks.length
      ? Math.max(...exactCustomBreaks)
      : 0;
    const validationHeight = exactCustomBreaks.length
      ? Math.max(
          contentHeight,
          (layoutContentHeightPx && layoutContentHeightPx > 0) ? Math.round(layoutContentHeightPx) : 0,
          lastCustomBreakPx + DEFAULT_MIN_GAP_PX,
        )
      : contentHeight;

    if (exactCustomBreaks.length > 0) {
      console.log('[pdf] break validation: trimmedH=', contentHeight,
        'layoutH=', layoutContentHeightPx,
        'lastBreak=', lastCustomBreakPx,
        'validationH=', validationHeight,
        'minGap=', DEFAULT_MIN_GAP_PX);
    }

    // Clamp custom breaks against the safe validation height.
    let pageBreaks = clampBreakPositions(exactCustomBreaks, validationHeight);

    if (exactCustomBreaks.length > 0) {
      // 1. Scale coordinates proportionally if there is a massive difference
      //    between the client's live DOM height and the server's layout height.
      if (layoutContentHeightPx && layoutContentHeightPx > 0) {
        pageBreaks = scaleBreakPositionsToMeasuredHeight(
          pageBreaks,
          layoutContentHeightPx,
          layout.measuredHeight
        );
      }
      // 2. Snap coordinates to EXACT server-side elements!
      //    This guarantees a cut placed "before Education" on the client stays
      //    exactly before "Education" on the server, despite layout shift.
      pageBreaks = snapBreakPositionsToSectionHeadings(
        pageBreaks,
        layout.sections,
        layout.measuredHeight,
        DEFAULT_MIN_GAP_PX
      );
      pageBreaks = snapBreakPositionsToAvoidBlocks(
        pageBreaks,
        layout.avoidBlocks,
        contentPageHeight,
        layout.measuredHeight,
        DEFAULT_MIN_GAP_PX
      );
      console.log('[pdf] snapped custom breaks:', pageBreaks);
    }

    if (exactCustomBreaks.length === 0) {
      pageBreaks = buildAutomaticBreakPositions({
        totalContentHeightPx: contentHeight,
        pageHeightPx: contentPageHeight,
        sections: layout.sections,
        avoidBlocks: layout.avoidBlocks,
      });
      console.log('[pdf] automatic breaks:', pageBreaks,
        'sections:', layout.sections.length, 'avoidBlocks:', layout.avoidBlocks.length);
    } else if (pageBreaks.length === 0 && contentHeight > contentPageHeight) {
      console.error('[pdf] all custom breaks were rejected:',
        'exactCustomBreaks=', exactCustomBreaks,
        'validationHeight=', validationHeight,
        'contentHeight=', contentHeight,
        'minGap=', DEFAULT_MIN_GAP_PX);
      return res.status(400).json({
        error: 'invalid_custom_breaks',
        message: 'Saved page cuts are outside the exportable content range.',
      });
    }
    // Build segments using contentHeight (trimmed) for last-page cropping +
    // validationHeight for break normalization so near-bottom breaks survive.
    const segments = buildExportPageSegments({
      totalContentHeightPx: contentHeight,
      pageHeightPx: contentPageHeight,
      customBreakPositions: pageBreaks,
      breakValidationHeightPx: validationHeight,
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
    // Use a unique prefix so Vercel log queries can find this exact line
    // without it being shadowed by the earlier "[pdf] loading modules" line.
    console.error('[pdf-err]', message.slice(0, 300));
    const firstStackLine = stack.split('\n').slice(1, 3).join(' | ');
    if (firstStackLine) console.error('[pdf-trace]', firstStackLine);
    res.status(500).json({ error: 'pdf_failed', message });
  } finally {
    await browser?.close();
  }
}
