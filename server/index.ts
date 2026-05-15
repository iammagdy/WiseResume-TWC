/**
 * WiseResume Express Server — Appwrite-Native (minimal).
 *
 * The Supabase / Kinde bridge has been removed. This server now only
 * provides:
 *   - GET  /api/health           liveness probe
 *   - POST /api/export/pdf-native server-side PDF export (Puppeteer)
 *
 * All other former routes (`/api/fn/*`, `/api/data/*`, `/api/auth/*`,
 * `/api/devkit/*`, …) used to proxy Supabase Edge Functions or query
 * Supabase PostgREST and have been deleted as part of the scorched-
 * earth cleanup. They will be re-implemented on Appwrite Functions.
 *
 * Frontend auth + AI Hub do NOT depend on this server; they call
 * Appwrite directly from the browser.
 */

import * as Sentry from '@sentry/node';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dns from 'dns';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { buildExportPageSegments, normalizeBreakPositions } from '../src/lib/exportPagePlan';

const app = express();
const PORT = parseInt(process.env.API_PORT || '5001', 10);

// ── Sentry ────────────────────────────────────────────────────────────────────
const SENTRY_DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || '';
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  console.log('[server] Sentry error tracking: active');
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Document-Policy', 'js-profiling');
  next();
});

// PDF export receives self-contained HTML with embedded base64 assets that
// can legitimately exceed 10 MB. Register the larger limit before global JSON.
app.use('/api/export/pdf-native', express.json({ limit: '50mb' }));
app.use('/api/export/pdf-native', express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed =
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('https://localhost') ||
        /\.replit\.dev$/.test(origin) ||
        /\.replit\.app$/.test(origin) ||
        origin === 'https://resume.thewise.cloud' ||
        origin === 'https://thewise.cloud';
      callback(null, allowed);
    },
    credentials: true,
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, server: 'wise-resume', stack: 'appwrite-native' });
});

const PDF_FORMATS = {
  letter: { widthPx: 612, heightPx: 792 },
  a4: { widthPx: 595, heightPx: 842 },
} as const;

const EXPORT_FOOTER_HEIGHT_PX = 44;
const EXPORT_BRAND_URL = 'https://resume.thewise.cloud';

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
      ${pageNumber ? `<span>${pageNumber}</span>` : ''}
      ${args.showBranding ? `<a href="${EXPORT_BRAND_URL}">Wise Resume</a>` : ''}
    </div>
  ` : ''}
</body>
</html>`;
}

async function measureContentHeight(browser: Awaited<ReturnType<typeof puppeteer.launch>>, html: string, widthPx: number): Promise<number> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    return await page.evaluate(() => {
      const template = document.querySelector('[data-resume-template]') as HTMLElement | null;
      const source = template ?? document.body;
      return Math.max(source.scrollHeight, source.offsetHeight, document.body.scrollHeight, 1);
    });
  } finally {
    await page.close();
  }
}

async function renderHtmlToPdfBuffer(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
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

app.post('/api/export/pdf-native', async (req: Request, res: Response) => {
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
    res.status(400).json({ error: 'bad_request', message: 'Missing html body' });
    return;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });

    // Match the PDF format's printable width so layout is identical to the browser
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
      const measuredHeight = Number.isFinite(totalContentHeightPx)
        ? Math.max(1, Math.round(totalContentHeightPx as number))
        : await measureContentHeight(browser, html, dims.widthPx);
      const normalizedBreaks = normalizeBreakPositions(customBreakPositions, measuredHeight);
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
          pageNumber: showPageNumbers ? `Page ${segment.index + 1} of ${segments.length}` : undefined,
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
});

// ── SSRF helpers ─────────────────────────────────────────────────────────────
/**
 * Returns true if the hostname resolves to a private, loopback, link-local,
 * or metadata IP range — all of which must be blocked to prevent SSRF.
 *
 * Covers:
 *   - Localhost names: localhost, 0.0.0.0, *.local, ip6-localhost, etc.
 *   - IPv4 private: 10.x, 172.16-31.x, 192.168.x, 100.64-127.x (CG-NAT)
 *   - IPv4 loopback: 127.x
 *   - IPv4 link-local/metadata: 169.254.x (AWS/GCP/Azure metadata)
 *   - IPv4 special: 0.x, 192.0.2.x, 198.18-19.x, 255.x
 *   - IPv6 loopback (::1) and private (fc00::/7)
 */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  // Block dangerous hostnames
  if (h === 'localhost' || h === '0.0.0.0' || h.endsWith('.local') ||
      h === 'ip6-localhost' || h === 'ip6-loopback') {
    return true;
  }

  // Block IPv6 loopback and private ranges (fc00::/7 = fc... and fd...)
  if (h === '::1' || h === '::' || /^(fc|fd)[0-9a-f]{0,2}:/i.test(h)) {
    return true;
  }

  // Block IPv4 private/special ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b, c] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    if (a === 0) return true;                               // 0.x.x.x
    if (a === 10) return true;                              // 10.x.x.x  RFC 1918
    if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64-127.x.x  CG-NAT
    if (a === 127) return true;                             // 127.x.x.x  loopback
    if (a === 169 && b === 254) return true;                // 169.254.x.x  link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16-31.x.x  RFC 1918
    if (a === 192 && b === 0 && c === 2) return true;      // 192.0.2.x  documentation
    if (a === 192 && b === 168) return true;                // 192.168.x.x  RFC 1918
    if (a === 198 && b >= 18 && b <= 19) return true;      // 198.18-19.x.x  benchmarking
    if (a === 255) return true;                             // 255.x.x.x  broadcast
  }

  return false;
}

// ── Portfolio view tracker (sendBeacon target) ────────────────────────────────
// Receives the portfolio visit payload from navigator.sendBeacon and writes it
// to the Appwrite database using the server-side API key — guaranteed delivery
// even on page unload since sendBeacon always completes.
app.post('/api/track-portfolio-view', async (req: Request, res: Response) => {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) {
    // Non-critical analytics endpoint — return 204 so the browser doesn't retry.
    res.status(204).end();
    return;
  }
  try {
    await fetch(
      'https://fra.cloud.appwrite.io/v1/databases/main/collections/portfolio_visits/documents',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': '69fd362b001eb325a192',
          'X-Appwrite-Key': apiKey,
        },
        body: JSON.stringify({ documentId: 'unique()', data: req.body }),
      },
    );
  } catch { /* best-effort — analytics should never block */ }
  res.status(204).end();
});

// ── Fetch-URL proxy ───────────────────────────────────────────────────────────
// Fetches a remote URL server-side and returns the HTML body, bypassing
// browser CORS restrictions. Used by UploadPage and onboardingProfile to
// import LinkedIn/resume pages.
//
// SSRF hardening (two layers):
//   1. Hostname string-check via isBlockedHost() — fast rejection of known
//      dangerous literals (localhost, private CIDR notation, etc.).
//   2. DNS resolution — resolve the hostname to IPs and re-run isBlockedHost()
//      on each resolved address, defeating DNS-rebinding attacks where a public
//      hostname resolves to a private IP.
app.post('/api/fetch-url', async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing or invalid url parameter.' });
    return;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL.' });
    return;
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    res.status(400).json({ error: 'Only http and https URLs are supported.' });
    return;
  }
  // Layer 1: string-based hostname check
  if (isBlockedHost(parsedUrl.hostname)) {
    res.status(400).json({ error: 'URL host is not permitted.' });
    return;
  }
  // Layer 2: DNS resolution — check all resolved IPs against private ranges
  try {
    const addresses = await dns.promises.resolve(parsedUrl.hostname);
    for (const addr of addresses) {
      if (isBlockedHost(addr)) {
        res.status(400).json({ error: 'URL host resolves to a private address.' });
        return;
      }
    }
  } catch {
    // DNS lookup failed — could be NXDOMAIN or network error.
    // Fail closed: reject the request rather than risk fetching an unknown target.
    res.status(400).json({ error: 'Could not resolve URL hostname.' });
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'WiseResume/4.0 (resume-import-bot; +https://thewise.cloud)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    const html = await response.text();
    res.json({ html });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch URL.';
    res.status(502).json({ error: msg });
  }
});

// ── Catch-all for removed routes ──────────────────────────────────────────────
app.use('/api', (req: Request, res: Response) => {
  res.status(503).json({
    error: 'pending_appwrite_migration',
    message: `'${req.method} ${req.path}' was removed in the Appwrite cutover and is pending re-implementation.`,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API (minimal) listening on :${PORT}`);
});
