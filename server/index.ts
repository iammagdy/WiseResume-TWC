/**
 * WiseResume Express Server — Appwrite-Native (minimal).
 *
 * The Supabase / Kinde bridge has been removed. This server now only
 * provides:
 *   - GET  /api/health           liveness probe
 *   - GET  /api/app-settings     public maintenance + feature gates (API key server-side)
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
import {
  buildAutomaticBreakPositions,
  buildExportPageSegments,
  clampBreakPositions,
  scaleBreakPositionsToMeasuredHeight,
  snapBreakPositionsToSectionHeadings,
  snapBreakPositionsToAvoidBlocks,
  type ExportAvoidBounds,
  type ExportSectionBounds,
} from '../src/lib/exportPagePlan';
import { fetchAppSettingsFromDb } from './appSettingsFetch';

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

// Production origins are an explicit allowlist — no wildcards.
// Additional origins can be injected via ALLOWED_ORIGINS (comma-separated)
// for preview deployments or staging environments.
const PRODUCTION_ORIGINS = new Set([
  'https://resume.thewise.cloud',
  'https://thewise.cloud',
  'https://www.thewise.cloud',
]);

function buildExtraOriginSet(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS || '';
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // same-origin / server-to-server
      if (PRODUCTION_ORIGINS.has(origin)) return callback(null, true);
      // Localhost allowed only outside production to support local dev.
      if (process.env.NODE_ENV !== 'production' &&
          (origin.startsWith('http://localhost') || origin.startsWith('https://localhost'))) {
        return callback(null, true);
      }
      // Operator-configured extra origins (e.g. staging / preview URLs).
      if (buildExtraOriginSet().has(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, server: 'wise-resume', stack: 'appwrite-native' });
});

app.get('/api/app-settings', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  try {
    const settings = await fetchAppSettingsFromDb();
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
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

interface ExportLayoutMetrics {
  measuredHeight: number;
  sections: ExportSectionBounds[];
  avoidBlocks: ExportAvoidBounds[];
}

async function measureExportLayout(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  html: string,
  widthPx: number,
): Promise<ExportLayoutMetrics> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    return await page.evaluate(`(() => {
      const template = document.querySelector('[data-resume-template]');
      const root = template ?? document.body;

      const relTop = (el) => {
        let top = 0;
        let curr = el;
        while (curr && curr !== root && root.contains(curr)) {
          top += curr.offsetTop;
          curr = curr.offsetParent;
        }
        return top;
      };

      const layoutHeight = Math.max(
        root.scrollHeight,
        root.offsetHeight,
        document.body.scrollHeight,
        1
      );

      const sections = Array.from(root.querySelectorAll('[data-section]')).map((sec) => {
        const sectionEl = sec;
        const top = relTop(sectionEl);
        const directHeading = sectionEl.querySelector(':scope > h2, :scope > h3');
        const heading = directHeading ?? sectionEl.querySelector('h2, h3');
        const headingTop = heading ? relTop(heading) : top;
        return {
          top,
          bottom: top + sectionEl.offsetHeight,
          headingTop,
        };
      });

      const avoidBlocks = Array.from(root.querySelectorAll('[data-break-avoid]')).map((node) => {
        const el = node;
        return {
          top: relTop(el),
          bottom: relTop(el) + el.offsetHeight,
          childTops: Array.from(el.querySelectorAll('[data-break-child]')).map((child) =>
            relTop(child)
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
    })()`) as Promise<ExportLayoutMetrics>;
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

// ── Appwrite JWT auth middleware ──────────────────────────────────────────────
function resolveAppwriteServerConfig(): { endpoint: string; projectId: string } {
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.VITE_APPWRITE_ENDPOINT ||
    'https://fra.cloud.appwrite.io/v1';
  const projectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    '';
  return { endpoint, projectId };
}

async function requireAppwriteJWT(req: Request, res: Response): Promise<boolean> {
  const jwtToken = req.headers['x-appwrite-jwt'];
  if (!jwtToken || typeof jwtToken !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return false;
  }
  const { endpoint, projectId } = resolveAppwriteServerConfig();
  if (!projectId) {
    console.error('[server] APPWRITE_PROJECT_ID not configured');
    res.status(500).json({ error: 'config_error', message: 'Server configuration error' });
    return false;
  }
  try {
    const authRes = await fetch(`${endpoint}/account`, {
      headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-JWT': jwtToken },
    });
    if (!authRes.ok) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired session' });
      return false;
    }
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication check failed' });
    return false;
  }
  return true;
}

// ── Trusted IP extraction (M-4) ──────────────────────────────────────────────
// Trust order: cf-connecting-ip (Cloudflare) → x-real-ip (trusted reverse
// proxy) → req.ip (Express trust-proxy-resolved) → socket address.
// x-forwarded-for is NOT read directly — any client can set arbitrary values.
function getServerClientIp(req: Request): string {
  const h = req.headers;
  const cf = typeof h['cf-connecting-ip'] === 'string' ? h['cf-connecting-ip'].trim() : null;
  if (cf) return cf;
  const ri = typeof h['x-real-ip'] === 'string' ? h['x-real-ip'].trim() : null;
  if (ri) return ri;
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

// ── OG image rate limiter (in-memory, per-IP) ─────────────────────────────────
const _ogRateLimits = new Map<string, { count: number; resetAt: number }>();
const OG_RATE_LIMIT = 5;
const OG_RATE_WINDOW_MS = 60_000;
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,50}$/;

function checkOgRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _ogRateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    _ogRateLimits.set(ip, { count: 1, resetAt: now + OG_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= OG_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

app.post('/api/export/pdf-native', async (req: Request, res: Response) => {
  if (!await requireAppwriteJWT(req, res)) return;
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
    layoutContentHeightPx?: number;
  };

  if (!html || typeof html !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'Missing html body' });
    return;
  }

  // --no-sandbox is required in containerised/serverless environments where
  // the host kernel does not support the Chromium sandbox. The SSRF guard
  // (isPuppeteerUrlAllowed) and auth check above are the primary mitigations.
  // This is accepted practice for cloud-native Puppeteer deployments (L-3).
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
      const clientHeight =
        Number.isFinite(totalContentHeightPx) && (totalContentHeightPx as number) > 0
          ? Math.round(totalContentHeightPx as number)
          : dims.heightPx;
      const requestedLayoutHeight =
        Number.isFinite(layoutContentHeightPx) && (layoutContentHeightPx as number) > 0
          ? Math.round(layoutContentHeightPx as number)
          : 0;
      const exactCustomBreaks = (customBreakPositions ?? [])
        .filter(Number.isFinite)
        .map(Math.round);

      let contentHeight = clientHeight;

      // ALWAYS measure layout to fix Chromium-Linux vs Client-OS font drift.
      const layout = await measureExportLayout(browser, html, dims.widthPx);
      const measuredHeight = Number.isFinite(layout.measuredHeight) ? Math.round(layout.measuredHeight) : 0;
      contentHeight = Math.max(clientHeight, requestedLayoutHeight, measuredHeight, printableHeight);

      const lastCustomBreakPx = exactCustomBreaks.length ? Math.max(...exactCustomBreaks) : 0;
      const validationHeight = exactCustomBreaks.length
        ? Math.max(
            contentHeight,
            (layoutContentHeightPx && layoutContentHeightPx > 0) ? Math.round(layoutContentHeightPx) : 0,
            lastCustomBreakPx + 40,
          )
        : contentHeight;

      let pageBreaks = clampBreakPositions(exactCustomBreaks, validationHeight);

      if (exactCustomBreaks.length > 0) {
        if (layoutContentHeightPx && layoutContentHeightPx > 0) {
          pageBreaks = scaleBreakPositionsToMeasuredHeight(
            pageBreaks,
            layoutContentHeightPx,
            layout.measuredHeight
          );
          pageBreaks = snapBreakPositionsToSectionHeadings(pageBreaks, layout.sections, layout.measuredHeight, 40, layoutContentHeightPx);
          pageBreaks = snapBreakPositionsToAvoidBlocks(pageBreaks, layout.avoidBlocks, printableHeight, layout.measuredHeight, 40, layout.sections);
        }
      } else {
        pageBreaks = buildAutomaticBreakPositions({
          totalContentHeightPx: contentHeight,
          pageHeightPx: printableHeight,
          sections: layout.sections,
          avoidBlocks: layout.avoidBlocks,
        });
      }

      if (pageBreaks.length === 0 && contentHeight > printableHeight && exactCustomBreaks.length > 0) {
        res.status(400).json({
          error: 'invalid_custom_breaks',
          message: 'Saved page cuts are outside the exportable content range.',
        });
        return;
      }

      const segments = buildExportPageSegments({
        totalContentHeightPx: contentHeight,
        pageHeightPx: printableHeight,
        customBreakPositions: pageBreaks,
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
    res.status(500).json({ error: 'pdf_failed', message: 'PDF generation failed. Please try again.' });
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
//
// Note: the active frontend path (usePortfolioTracking.ts) writes directly to
// Appwrite via the browser SDK; this route is retained for beacon compatibility
// and is hardened against abuse.
const _trackRateLimits = new Map<string, { count: number; resetAt: number }>();
const TRACK_RATE_LIMIT = 10;
const TRACK_RATE_WINDOW_MS = 60_000;
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const VALID_DEVICES = new Set(['desktop', 'mobile', 'tablet']);
const VALID_AB_VARIANTS = new Set(['a', 'b', null]);
const VALID_SECTION_NAMES = new Set([
  'experience', 'education', 'skills', 'projects', 'github',
  'certifications', 'awards', 'publications', 'volunteering',
  'case-studies', 'services',
]);

function checkTrackRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _trackRateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    _trackRateLimits.set(ip, { count: 1, resetAt: now + TRACK_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= TRACK_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

app.post('/api/track-portfolio-view', async (req: Request, res: Response) => {
  const apiKey = process.env.APPWRITE_API_KEY;
  const appwriteProjectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '';
  if (!apiKey || !appwriteProjectId) {
    res.status(204).end();
    return;
  }

  const ip = getServerClientIp(req);
  if (!checkTrackRateLimit(ip)) {
    res.status(204).end();
    return;
  }

  const body = req.body as Record<string, unknown>;

  // Allowlist: accept only the fields the frontend actually sends.
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!username || !USERNAME_PATTERN.test(username)) {
    res.status(204).end();
    return;
  }

  const ref = typeof body.ref === 'string' ? body.ref.slice(0, 200) : null;
  const timeSpentSeconds = typeof body.time_spent_seconds === 'number'
    ? Math.max(0, Math.min(Math.round(body.time_spent_seconds), 86400))
    : 0;
  const device = VALID_DEVICES.has(String(body.device)) ? String(body.device) : 'desktop';
  const abVariant = VALID_AB_VARIANTS.has(body.ab_variant as string | null)
    ? (body.ab_variant as string | null)
    : null;

  const rawSections = Array.isArray(body.sections_viewed) ? body.sections_viewed : [];
  const sectionsViewed = rawSections
    .filter((s): s is string => typeof s === 'string' && VALID_SECTION_NAMES.has(s))
    .slice(0, 20);

  // sections_timing is a JSON-encoded object {sectionName: durationSeconds}.
  let sectionsTiming: string | null = null;
  if (typeof body.sections_timing === 'string') {
    try {
      const parsed = JSON.parse(body.sections_timing) as Record<string, unknown>;
      const safe: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (VALID_SECTION_NAMES.has(k) && typeof v === 'number') {
          safe[k] = Math.max(0, Math.min(Math.round(v), 86400));
        }
      }
      sectionsTiming = JSON.stringify(safe);
    } catch { /* ignore malformed timing */ }
  }

  const data = {
    username,
    ref,
    sections_viewed: sectionsViewed,
    sections_timing: sectionsTiming,
    time_spent_seconds: timeSpentSeconds,
    device,
    ab_variant: abVariant,
  };

  try {
    await fetch(
      'https://fra.cloud.appwrite.io/v1/databases/main/collections/portfolio_visits/documents',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': apiKey,
        },
        body: JSON.stringify({ documentId: 'unique()', data }),
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
    console.error('[fetch-url] error:', err);
    res.status(502).json({ error: 'fetch_failed', message: 'Failed to fetch the requested URL.' });
  }
});

// ── OG Image generation ───────────────────────────────────────────────────────
app.get('/og-image/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'invalid_username' });
    return;
  }

  const clientIp = getServerClientIp(req);
  if (!checkOgRateLimit(clientIp)) {
    res.status(429).json({ error: 'rate_limited', message: 'Too many requests. Please try again later.' });
    return;
  }
  // Fetch profile data from Appwrite REST API
  let name = username;
  let jobTitle = '';
  try {
    const apiUrl = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_PROJECT_ID || '';
    const dbId = process.env.APPWRITE_DATABASE_ID || '';
    if (projectId && dbId) {
      const resp = await fetch(
        `${apiUrl}/databases/${dbId}/collections/profiles/documents?queries[]=equal("username","${encodeURIComponent(username)}")&queries[]=limit(1)`,
        { headers: { 'X-Appwrite-Project': projectId } }
      );
      if (resp.ok) {
        const data = await resp.json() as { documents?: { fullName?: string; jobTitle?: string }[] };
        const doc = data.documents?.[0];
        if (doc?.fullName) name = doc.fullName;
        if (doc?.jobTitle) jobTitle = doc.jobTitle;
      }
    }
  } catch { /* fallback to username */ }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden}
.card{display:flex;flex-direction:column;align-items:center;gap:24px;text-align:center;padding:60px}
.badge{background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:999px;padding:6px 20px;font-size:14px;color:#a5b4fc;letter-spacing:0.05em;text-transform:uppercase}
h1{font-size:64px;font-weight:700;color:#f1f5f9;line-height:1.1;max-width:800px}
.sub{font-size:28px;color:#94a3b8}
.brand{position:absolute;bottom:40px;right:60px;display:flex;align-items:center;gap:10px;color:#475569;font-size:18px;font-weight:600}
.dot{width:10px;height:10px;border-radius:50%;background:#6366f1}
</style></head>
<body>
<div class="card">
  <div class="badge">Portfolio</div>
  <h1>${name.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c] ?? c))}</h1>
  ${jobTitle ? `<div class="sub">${jobTitle.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c] ?? c))}</div>` : ''}
</div>
<div class="brand"><div class="dot"></div>WiseResume</div>
</body></html>`;

  // --no-sandbox: accepted containerised limitation (L-3). OG image HTML is
  // server-generated, not user-navigated, so SSRF surface is minimal here.
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const screenshot = await page.screenshot({ type: 'png' });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.send(screenshot);
  } catch (err) {
    res.status(500).json({ error: 'og_image_failed' });
  } finally {
    if (browser) await browser.close();
  }
});

// ── Catch-all for removed routes ──────────────────────────────────────────────
app.use('/api', (req: Request, res: Response) => {
  res.status(503).json({
    error: 'pending_appwrite_migration',
    message: `'${req.method} ${req.path}' was removed in the Appwrite cutover and is pending re-implementation.`,
  });
});

const httpServer = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API (minimal) listening on :${PORT}`);
});

httpServer.ref();
