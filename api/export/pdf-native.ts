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
import { PDFDocument } from 'pdf-lib';
import {
  buildExportPageSegments,
  normalizeBreakPositions,
  scaleBreakPositionsToMeasuredHeight,
  snapBreakPositionsToSectionHeadings,
  type ExportSectionBounds,
} from '../../src/lib/exportPagePlan';

export const config = {
  api: {
    bodyParser: {
      // Production payloads are now small (CSS loaded via @import by Puppeteer).
      // 4mb covers the template HTML + any remaining inline styles safely.
      sizeLimit: '4mb',
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

async function importExternalModule<T = unknown>(specifier: string): Promise<T> {
  // Vercel's ncc bundler must not relocate @sparticuz/chromium, because the
  // package resolves its compressed Chromium binaries relative to its own
  // package directory. An indirect import keeps it external; vercel.json
  // includeFiles ships node_modules/@sparticuz/chromium/** with the function.
  const importer = new Function('specifier', 'return import(specifier)') as
    (specifier: string) => Promise<T>;
  return importer(specifier);
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
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
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
    await page.setViewport({ width: widthPx, height: Math.max(1, heightPx), deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
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
    if (!_puppeteer) {
      _puppeteer = (await import('puppeteer-core')).default;
    }
    if (!_chromium) {
      _chromium = (await importExternalModule<{ default: unknown }>('@sparticuz/chromium')).default;
    }
    const puppeteer = _puppeteer;
    const chromium = _chromium;
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const isA4 = pageFormat === 'a4';
    const dims = isA4 ? PDF_FORMATS.a4 : PDF_FORMATS.letter;

    let pdfBuffer: Uint8Array;
    if (onePage) {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: dims.widthPx, height: dims.heightPx, deviceScaleFactor: 2 });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
        const onePageBuffer = await page.pdf({
          format: isA4 ? 'A4' : 'Letter',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
          pageRanges: '1',
        });
        pdfBuffer = new Uint8Array(onePageBuffer);
      } finally {
        await page.close();
      }
    } else {
      const footerHeight = showPageNumbers || showBranding ? EXPORT_FOOTER_HEIGHT_PX : 0;
      const printableHeight = dims.heightPx - footerHeight;
      const layout = await measureExportLayout(browser, html, dims.widthPx);
      const measuredHeight = layout.measuredHeight;
      const clientHeight =
        Number.isFinite(totalContentHeightPx) && (totalContentHeightPx as number) > 0
          ? Math.round(totalContentHeightPx as number)
          : measuredHeight;
      const scaledBreaks = scaleBreakPositionsToMeasuredHeight(
        customBreakPositions,
        clientHeight,
        measuredHeight,
      );
      const snappedBreaks = snapBreakPositionsToSectionHeadings(
        scaledBreaks,
        layout.sections,
        measuredHeight,
      );
      const normalizedBreaks = normalizeBreakPositions(snappedBreaks, measuredHeight);
      const segments = buildExportPageSegments({
        totalContentHeightPx: measuredHeight,
        pageHeightPx: printableHeight,
        customBreakPositions: normalizedBreaks,
      });
      const buffers: Buffer[] = [];
      for (const segment of segments) {
        const segmentHtml = buildSegmentHtml({
          sourceHtml: html,
          pageWidthPx: dims.widthPx,
          contentStartPx: segment.startPx,
          contentHeightPx: segment.heightPx,
          footerHeightPx: footerHeight,
          pageNumber: showPageNumbers
            ? `Page ${segment.index + 1} of ${segments.length}`
            : undefined,
          showBranding,
        });
        buffers.push(await renderHtmlToPdfBuffer(
          browser,
          segmentHtml,
          dims.widthPx,
          segment.heightPx + footerHeight,
        ));
      }
      pdfBuffer = await mergePdfBuffers(buffers);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('[pdf] Puppeteer error:', err);
    res.status(500).json({ error: 'pdf_failed', message: String(err) });
  } finally {
    await browser?.close();
  }
}
