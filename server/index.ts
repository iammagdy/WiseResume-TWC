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
import puppeteer, { type HTTPRequest, type Page } from 'puppeteer';
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
import { isPuppeteerRequestUrlAllowed } from '../src/lib/security/ssrfGuards';
import {
  PDF_EXPORT_MAX_CONTENT_HEIGHT_PX,
  PDF_EXPORT_MAX_DOM_NODES,
  PDF_EXPORT_MAX_OUTPUT_BYTES,
  PDF_EXPORT_MAX_PAGE_BYTES,
  PDF_EXPORT_MAX_PAGES,
  calculateOnePageScale,
  canRemovePdfBranding,
  formatPdfPageNumber,
  validatePdfExportRequestBody,
} from '../src/lib/security/pdfExportPolicy';
import { fetchAppSettingsFromDb } from './appSettingsFetch';
import fetchUrlHandler from '../api/fetch-url';

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

// Keep the local renderer aligned with the Vercel request boundary. The policy
// below applies a stricter six-megabyte HTML limit after JSON parsing.
app.use('/api/export/pdf-native', express.json({ limit: '8mb' }));
app.use('/api/export/pdf-native', express.urlencoded({ extended: true, limit: '8mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Production origins are an explicit allowlist — no wildcards.
// Additional origins can be injected via ALLOWED_ORIGINS (comma-separated)
// for preview deployments or staging environments.
const PRODUCTION_ORIGINS = new Set([
  'https://resume.thewise.cloud',
  'https://thewise.cloud',
  'https://www.thewise.cloud',
  'https://wiseresume.app',
  'https://www.wiseresume.app',
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
      // Replit preview deployments
      if (/\.replit\.dev$/.test(origin) || /\.replit\.app$/.test(origin) || /\.replit\.co$/.test(origin)) {
        return callback(null, true);
      }
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
const EXPORT_BRAND_URL = 'https://wiseresume.app';
const CSS_PX_TO_PDF_POINT_SCALE = 96 / 72;
const PDF_EXPORT_RATE_LIMIT = 6;
const PDF_EXPORT_RATE_WINDOW_MS = 60_000;
const PDF_EXPORT_MAX_CONCURRENT = 2;

const pdfExportRateLimits = new Map<string, { count: number; resetAt: number }>();
let activePdfExports = 0;

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
  sourceScale?: number;
  locale: 'en' | 'ar';
}): string {
  const { head, body } = extractHtmlParts(args.sourceHtml);
  const pageHeightPx = args.contentHeightPx + args.footerHeightPx;
  const pageNumber = args.pageNumber ? escapeHtml(args.pageNumber) : '';
  const sourceScale = Math.min(1, Math.max(0.01, args.sourceScale ?? 1));
  const sourceLeftPx = Math.max(0, (args.pageWidthPx - (args.pageWidthPx * sourceScale)) / 2);

  return `<!DOCTYPE html>
<html lang="${args.locale}" dir="${args.locale === 'ar' ? 'rtl' : 'ltr'}">
<head>
${head}
<style>
  @page { size: ${args.pageWidthPx}pt ${pageHeightPx}pt; margin: 0; }
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
    left: ${sourceLeftPx}px;
    top: -${args.contentStartPx}px;
    width: ${args.pageWidthPx}px;
    transform: scale(${sourceScale});
    transform-origin: top left;
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
        ? `<span>${pageNumber} - ${args.locale === 'ar' ? 'صُمم باستخدام' : 'Made with'} <a href="${EXPORT_BRAND_URL}">WiseResume</a></span>`
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
  nodeCount: number;
  sections: ExportSectionBounds[];
  avoidBlocks: ExportAvoidBounds[];
}

async function installPuppeteerRequestGuard(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on('request', (req: HTTPRequest) => {
    const url = String(req.url?.() || '');
    if (!isPuppeteerRequestUrlAllowed(url)) {
      req.abort().catch(() => undefined);
      return;
    }
    req.continue().catch(() => undefined);
  });
}

async function measureExportLayout(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  html: string,
  widthPx: number,
): Promise<ExportLayoutMetrics> {
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await installPuppeteerRequestGuard(page);
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    return await page.evaluate(`(() => {
      const template = document.querySelector('[data-resume-template]');
      const root = template ?? document.body;
      const nodeCount = root.querySelectorAll('*').length;

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

      const sections = nodeCount > ${PDF_EXPORT_MAX_DOM_NODES}
        ? []
        : Array.from(root.querySelectorAll('[data-section]')).map((sec) => {
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

      const avoidBlocks = nodeCount > ${PDF_EXPORT_MAX_DOM_NODES}
        ? []
        : Array.from(root.querySelectorAll('[data-break-avoid]')).map((node) => {
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

      return { measuredHeight, nodeCount, sections, avoidBlocks };
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
    await page.setJavaScriptEnabled(false);
    await installPuppeteerRequestGuard(page);
    await page.setViewport({ width: widthPx, height: Math.max(1, heightPx), deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
    const pdf = await page.pdf({
      width: `${widthPx / 72}in`,
      height: `${heightPx / 72}in`,
      scale: CSS_PX_TO_PDF_POINT_SCALE,
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

interface AuthenticatedAppwriteRequest {
  jwt: string;
  userId: string;
}

async function requireAppwriteJWT(req: Request, res: Response): Promise<AuthenticatedAppwriteRequest | null> {
  const jwtToken = req.headers['x-appwrite-jwt'];
  if (!jwtToken || typeof jwtToken !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    return null;
  }
  const { endpoint, projectId } = resolveAppwriteServerConfig();
  if (!projectId) {
    console.error('[server] APPWRITE_PROJECT_ID not configured');
    res.status(500).json({ error: 'config_error', message: 'Server configuration error' });
    return null;
  }
  try {
    const authRes = await fetch(`${endpoint}/account`, {
      headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-JWT': jwtToken },
    });
    if (!authRes.ok) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired session' });
      return null;
    }
    const account = await authRes.json() as { $id?: unknown };
    if (typeof account.$id !== 'string' || !account.$id) {
      res.status(401).json({ error: 'unauthorized', message: 'Invalid account response' });
      return null;
    }
    return { jwt: jwtToken, userId: account.$id };
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Authentication check failed' });
    return null;
  }
}

function checkPdfExportRateLimit(userId: string): boolean {
  const now = Date.now();
  if (pdfExportRateLimits.size > 1_000) {
    for (const [key, value] of pdfExportRateLimits) {
      if (value.resetAt <= now) pdfExportRateLimits.delete(key);
    }
  }
  const current = pdfExportRateLimits.get(userId);
  if (!current || current.resetAt <= now) {
    pdfExportRateLimits.set(userId, { count: 1, resetAt: now + PDF_EXPORT_RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= PDF_EXPORT_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function loadBrandingRemovalEntitlement(args: {
  endpoint: string;
  projectId: string;
  jwt: string;
  userId: string;
}): Promise<boolean | null> {
  const params = new URLSearchParams();
  params.append('queries[]', JSON.stringify({ method: 'equal', attribute: 'user_id', values: [args.userId] }));
  params.append('queries[]', JSON.stringify({ method: 'limit', values: [1] }));
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
  const headers: Record<string, string> = { 'X-Appwrite-Project': args.projectId };
  if (apiKey) headers['X-Appwrite-Key'] = apiKey;
  else headers['X-Appwrite-JWT'] = args.jwt;

  try {
    const response = await fetch(
      `${args.endpoint}/databases/main/collections/subscriptions/documents?${params.toString()}`,
      { headers },
    );
    if (!response.ok) return null;
    const payload = await response.json() as { documents?: unknown[] };
    return canRemovePdfBranding(payload.documents?.[0] ?? null);
  } catch {
    return null;
  }
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
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const auth = await requireAppwriteJWT(req, res);
  if (!auth) return;

  const validation = validatePdfExportRequestBody(req.body);
  if (!validation.ok) {
    res.status(validation.status).json({ error: validation.error, message: validation.message });
    return;
  }
  const {
    html,
    pageFormat,
    onePage,
    showPageNumbers,
    pageNumberFormat,
    showBranding: requestedShowBranding,
    customBreakPositions,
    totalContentHeightPx,
    layoutContentHeightPx,
    locale,
  } = validation.value;

  if (!checkPdfExportRateLimit(auth.userId)) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({
      error: 'rate_limited',
      message: 'Too many PDF exports. Please wait a minute and try again.',
    });
    return;
  }

  let showBranding = requestedShowBranding;
  if (!requestedShowBranding) {
    const { endpoint, projectId } = resolveAppwriteServerConfig();
    const canRemoveBranding = await loadBrandingRemovalEntitlement({
      endpoint,
      projectId,
      jwt: auth.jwt,
      userId: auth.userId,
    });
    if (canRemoveBranding === null) {
      res.status(503).json({
        error: 'entitlement_unavailable',
        message: 'Could not verify the branding setting. Please retry the export.',
      });
      return;
    }
    showBranding = !canRemoveBranding;
  }

  if (activePdfExports >= PDF_EXPORT_MAX_CONCURRENT) {
    res.setHeader('Retry-After', '5');
    res.status(429).json({
      error: 'renderer_busy',
      message: 'The PDF renderer is busy. Please retry in a few seconds.',
    });
    return;
  }
  activePdfExports += 1;

  // --no-sandbox is required in containerised/serverless environments where
  // the host kernel does not support the Chromium sandbox. The SSRF guard
  // request interception and the auth check above are the primary mitigations.
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

    const footerHeight = showPageNumbers || showBranding ? EXPORT_FOOTER_HEIGHT_PX : 0;
    const printableHeight = dims.heightPx - footerHeight;
    const clientHeight = totalContentHeightPx ?? dims.heightPx;
    const exactCustomBreaks = customBreakPositions.filter(Number.isFinite).map(Math.round);

    const layout = await measureExportLayout(browser, html, dims.widthPx);
    const measuredHeight = Number.isFinite(layout.measuredHeight) ? Math.round(layout.measuredHeight) : 0;
    if (layout.nodeCount > PDF_EXPORT_MAX_DOM_NODES) {
      res.status(413).json({
        error: 'export_too_large',
        message: 'This document contains too many elements to export safely.',
      });
      return;
    }
    if (measuredHeight > PDF_EXPORT_MAX_CONTENT_HEIGHT_PX) {
      res.status(413).json({
        error: 'export_too_large',
        message: `This document is too long to export safely. The maximum supported length is ${PDF_EXPORT_MAX_PAGES} pages.`,
      });
      return;
    }

    const contentHeight = Math.max(clientHeight, measuredHeight, printableHeight);
    const lastCustomBreakPx = exactCustomBreaks.length ? Math.max(...exactCustomBreaks) : 0;
    const validationHeight = exactCustomBreaks.length
      ? Math.max(contentHeight, layoutContentHeightPx ?? 0, lastCustomBreakPx + 40)
      : contentHeight;

    let pageBreaks = onePage ? [] : clampBreakPositions(exactCustomBreaks, validationHeight);
    if (!onePage && exactCustomBreaks.length > 0) {
      if (layoutContentHeightPx) {
        pageBreaks = scaleBreakPositionsToMeasuredHeight(
          pageBreaks,
          layoutContentHeightPx,
          layout.measuredHeight,
        );
        pageBreaks = snapBreakPositionsToSectionHeadings(
          pageBreaks,
          layout.sections,
          layout.measuredHeight,
          40,
          layoutContentHeightPx,
        );
        pageBreaks = snapBreakPositionsToAvoidBlocks(
          pageBreaks,
          layout.avoidBlocks,
          printableHeight,
          layout.measuredHeight,
          40,
          layout.sections,
        );
      }
    } else if (!onePage) {
      pageBreaks = buildAutomaticBreakPositions({
        totalContentHeightPx: contentHeight,
        pageHeightPx: printableHeight,
        sections: layout.sections,
        avoidBlocks: layout.avoidBlocks,
      });
    }

    if (!onePage && pageBreaks.length === 0 && contentHeight > printableHeight && exactCustomBreaks.length > 0) {
      res.status(400).json({
        error: 'invalid_custom_breaks',
        message: 'Saved page cuts are outside the exportable content range.',
      });
      return;
    }

    const onePageScale = onePage ? calculateOnePageScale(contentHeight, printableHeight) : 1;
    const segments = onePage
      ? [{ index: 0, startPx: 0, heightPx: printableHeight, isLast: true }]
      : buildExportPageSegments({
          totalContentHeightPx: contentHeight,
          pageHeightPx: printableHeight,
          customBreakPositions: pageBreaks,
          breakValidationHeightPx: validationHeight,
        });
    if (segments.length > PDF_EXPORT_MAX_PAGES) {
      res.status(413).json({
        error: 'export_too_large',
        message: `A PDF export can contain at most ${PDF_EXPORT_MAX_PAGES} pages.`,
      });
      return;
    }

    const buffers: Buffer[] = [];
    let accumulatedBytes = 0;
    for (const segment of segments) {
      const segmentHtml = buildSegmentHtml({
        sourceHtml: html,
        pageWidthPx: dims.widthPx,
        contentStartPx: segment.startPx,
        contentHeightPx: segment.heightPx,
        footerHeightPx: footerHeight,
        pageNumber: showPageNumbers
          ? formatPdfPageNumber(segment.index + 1, segments.length, pageNumberFormat, locale)
          : undefined,
        showBranding,
        sourceScale: onePageScale,
        locale,
      });
      const buffer = await renderHtmlToPdfBuffer(
        browser,
        segmentHtml,
        dims.widthPx,
        segment.heightPx + footerHeight,
      );
      accumulatedBytes += buffer.length;
      if (buffer.length > PDF_EXPORT_MAX_PAGE_BYTES || accumulatedBytes > PDF_EXPORT_MAX_OUTPUT_BYTES) {
        res.status(413).json({
          error: 'export_too_large',
          message: 'The generated PDF is too large. Remove large images and try again.',
        });
        return;
      }
      buffers.push(buffer);
    }
    const pdfBuffer = await mergePdfBuffers(buffers);
    if (pdfBuffer.length > PDF_EXPORT_MAX_OUTPUT_BYTES) {
      res.status(413).json({
        error: 'export_too_large',
        message: 'The generated PDF is too large. Remove large images and try again.',
      });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error('[pdf] Puppeteer error:', err);
    res.status(500).json({ error: 'pdf_failed', message: 'PDF generation failed. Please try again.' });
  } finally {
    await browser?.close();
    activePdfExports = Math.max(0, activePdfExports - 1);
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

// ── Portfolio interest (anonymous lead capture) ───────────────────────────────
const INTEREST_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const INTEREST_TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const _interestRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkInterestRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = _interestRateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    _interestRateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

app.post('/api/portfolio-interest', async (req: Request, res: Response) => {
  const apiKey = process.env.APPWRITE_API_KEY;
  const appwriteProjectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '';
  if (!apiKey || !appwriteProjectId) {
    res.status(500).json({ error: 'config_error', message: 'Portfolio interest API is not configured.' });
    return;
  }

  const ip = getServerClientIp(req);
  if (!checkInterestRateLimit(ip)) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!username || !INTEREST_USERNAME_PATTERN.test(username)) {
    res.status(400).json({ error: 'bad_request', message: 'Missing username' });
    return;
  }
  if (!token || !INTEREST_TOKEN_PATTERN.test(token)) {
    res.status(400).json({ error: 'bad_request', message: 'Invalid token' });
    return;
  }

  let referrerHostname: string | null = null;
  if (typeof body.referrer === 'string' && body.referrer.trim()) {
    try {
      referrerHostname = new URL(body.referrer).hostname.slice(0, 200);
    } catch { /* ignore */ }
  }

  const profileRes = await fetch(
    `https://fra.cloud.appwrite.io/v1/databases/main/collections/profiles/documents?queries[]=${encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'username', values: [username] }))}&queries[]=${encodeURIComponent(JSON.stringify({ method: 'equal', attribute: 'portfolio_enabled', values: [true] }))}&queries[]=${encodeURIComponent(JSON.stringify({ method: 'limit', values: [1] }))}`,
    {
      headers: {
        'X-Appwrite-Project': appwriteProjectId,
        'X-Appwrite-Key': apiKey,
      },
    },
  );
  if (!profileRes.ok) {
    res.status(500).json({ error: 'server_error' });
    return;
  }
  const profileJson = await profileRes.json() as { documents?: unknown[] };
  if (!profileJson.documents?.length) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const data: Record<string, string> = {
    token,
    portfolio_username: username,
    interaction_type: 'interested',
  };
  if (referrerHostname) data.referrer_hostname = referrerHostname;

  try {
    const createRes = await fetch(
      'https://fra.cloud.appwrite.io/v1/databases/main/collections/portfolio_interactions/documents',
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
    if (createRes.ok) {
      res.status(200).json({ ok: true });
      return;
    }
    const errText = await createRes.text();
    if (/unique|duplicate|already exists/i.test(errText)) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    res.status(500).json({ error: 'server_error' });
  } catch {
    res.status(500).json({ error: 'server_error' });
  }
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
  await fetchUrlHandler(req as never, res as never);
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
