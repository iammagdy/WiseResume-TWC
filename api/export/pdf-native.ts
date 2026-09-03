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
import { createHash } from 'node:crypto';
import { Client, Databases, Query } from 'node-appwrite';
import { isPuppeteerRequestUrlAllowed } from '../../src/lib/security/ssrfGuards.js';
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
} from '../../src/lib/security/pdfExportPolicy.js';
import { createAppwriteDocumentId } from '../_lib/appwriteDocumentId';
// Keep heavy browser dependencies lazy so top-level bootstrapping and simple
// validation or error responses do not crash during module startup.
// vercel.json includeFiles ensures the ESM and browser binary files ship with the function bundle.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _puppeteer: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chromium: any;
let _pdfLib: typeof import('pdf-lib') | undefined;

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
const EXPORT_BRAND_URL = 'https://wiseresume.app';
const CSS_PX_TO_PDF_POINT_SCALE = 96 / 72;
const DEFAULT_MIN_GAP_PX = 40;
const SECTION_HEADING_GUARD_PX = 80;
const PDF_RATE_LIMIT_COLLECTION = 'pdf_export_rate_limits';
const PDF_ACTIVE_LEASES_COLLECTION = 'pdf_export_active_leases';
const PDF_RATE_WINDOW_MS = 10 * 60 * 1000;
const PDF_RATE_LIMIT = 5;
const PDF_USER_CONCURRENCY_LIMIT = 2;
const PDF_GLOBAL_CONCURRENCY_LIMIT = 8;
const PDF_LEASE_TTL_MS = 90_000;
const PDF_RENDER_TIMEOUT_MS = 45_000;
const PDF_MAX_HTML_BYTES = 2 * 1024 * 1024;
const PDF_MAX_CUSTOM_BREAKS = 100;
const PDF_MAX_CONTENT_HEIGHT_PX = 100_000;
const PDF_MAX_SEGMENTS = 50;
const PDF_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const PDF_RATE_CLEANUP_BATCH_SIZE = 100;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const APPWRITE_DATABASE_ID = 'main';
const NEAR_SECTION_TOP_PX = 24;
const PDF_EXPORT_RATE_LIMIT = 6;
const PDF_EXPORT_RATE_WINDOW_MS = 60_000;
const PDF_EXPORT_MAX_CONCURRENT = 2;

const pdfExportRateLimits = new Map<string, { count: number; resetAt: number }>();
let activePdfExports = 0;

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

function getPdfDb(): Databases {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

function hashPdfKey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 40);
}

function isConflictError(error: unknown): boolean {
  const candidate = error as { code?: number; message?: string };
  return candidate.code === 409 || /already exists|duplicate/i.test(candidate.message || '');
}

function isNotFoundError(error: unknown): boolean {
  const candidate = error as { code?: number; message?: string };
  return candidate.code === 404 || /could not be found|not found/i.test(candidate.message || '');
}

async function cleanupExpiredPdfRateLimits(db: Databases, now = Date.now()): Promise<void> {
  try {
    const expired = await db.listDocuments(APPWRITE_DATABASE_ID, PDF_RATE_LIMIT_COLLECTION, [
      Query.lessThan('expires_at', new Date(now).toISOString()),
      Query.limit(PDF_RATE_CLEANUP_BATCH_SIZE),
    ]);
    for (const document of expired.documents || []) {
      try {
        await db.deleteDocument(APPWRITE_DATABASE_ID, PDF_RATE_LIMIT_COLLECTION, document.$id);
      } catch (error) {
        if (!isNotFoundError(error)) {
          console.warn('[pdf] expired rate-limit cleanup failed:', (error as { code?: number }).code ?? 'unknown');
        }
      }
    }
  } catch (error) {
    // Cleanup is best effort; limiter admission remains fail-closed if its
    // deterministic slot writes cannot be completed.
    console.warn('[pdf] expired rate-limit listing failed:', (error as { code?: number }).code ?? 'unknown');
  }
}

async function claimPdfRateSlot(db: Databases, userId: string, now = Date.now()): Promise<string | null> {
  await cleanupExpiredPdfRateLimits(db, now);
  const windowStart = Math.floor(now / PDF_RATE_WINDOW_MS) * PDF_RATE_WINDOW_MS;
  const prefix = `${hashPdfKey(userId)}-${windowStart}`;
  const expiresAt = new Date(windowStart + PDF_RATE_WINDOW_MS).toISOString();
  for (let slot = 0; slot < PDF_RATE_LIMIT; slot += 1) {
    const documentId = createAppwriteDocumentId('rate', prefix, slot);
    try {
      await db.createDocument(APPWRITE_DATABASE_ID, PDF_RATE_LIMIT_COLLECTION, documentId, {
        owner_user_id: userId,
        window_key: String(windowStart),
        slot,
        expires_at: expiresAt,
      });
      return documentId;
    } catch (error) {
      if (!isConflictError(error)) throw error;
    }
  }
  return null;
}

async function claimPdfLease(
  db: Databases,
  prefix: string,
  limit: number,
  ownerKey: string,
  now = Date.now(),
): Promise<string | null> {
  const expiresAt = new Date(now + PDF_LEASE_TTL_MS).toISOString();
  for (let slot = 0; slot < limit; slot += 1) {
    const documentId = createAppwriteDocumentId('lease', prefix, slot);
    try {
      await db.createDocument(APPWRITE_DATABASE_ID, PDF_ACTIVE_LEASES_COLLECTION, documentId, {
        owner_key: ownerKey,
        scope: prefix,
        slot,
        created_at: new Date(now).toISOString(),
        expires_at: expiresAt,
      });
      return documentId;
    } catch (error) {
      if (!isConflictError(error)) throw error;
      try {
        const existing = await db.getDocument(APPWRITE_DATABASE_ID, PDF_ACTIVE_LEASES_COLLECTION, documentId);
        if (typeof existing.expires_at === 'string' && new Date(existing.expires_at).getTime() <= now) {
          await db.deleteDocument(APPWRITE_DATABASE_ID, PDF_ACTIVE_LEASES_COLLECTION, documentId);
          slot -= 1;
        }
      } catch (lookupError) {
        if (!isNotFoundError(lookupError)) throw lookupError;
      }
    }
  }
  return null;
}

async function releasePdfLease(db: Databases, documentId: string | null): Promise<void> {
  if (!documentId) return;
  try {
    await db.deleteDocument(APPWRITE_DATABASE_ID, PDF_ACTIVE_LEASES_COLLECTION, documentId);
  } catch (error) {
    if (!isNotFoundError(error)) {
      console.warn('[pdf] lease cleanup failed:', (error as { code?: number }).code ?? 'unknown');
    }
  }
}

function withPdfTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('PDF_RENDER_TIMEOUT')), timeoutMs);
    promise.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
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
  layoutContentHeightPx?: number,
): number[] {
  if (!breaks.length || !sections.length) return breaks;
  const sorted = [...sections].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);

  const scale = layoutContentHeightPx && layoutContentHeightPx > 0 ? totalHeightPx / layoutContentHeightPx : 1;

  return breaks.map((breakY) => {
    let y = breakY;

    // Check if we can align user's client-side intent first
    if (layoutContentHeightPx && layoutContentHeightPx > 0) {
      const y_client = y / scale;
      for (const section of sorted) {
        const headTop = section.headingTop ?? section.top;
        const targetBoundary = Math.max(minGapPx, Math.min(section.top, headTop));
        const client_top = section.top / scale;
        const client_head_top = headTop / scale;
        const placedBeforeOnClient = y_client <= client_head_top + 6 || y_client <= client_top + 6;
        const nearOrInSectionServer = y >= targetBoundary - 30 && y <= headTop + 120;

        if (placedBeforeOnClient && nearOrInSectionServer) {
          return Math.min(targetBoundary, maxY);
        }
      }
    }

    for (const section of sorted) {
      const headTop = section.headingTop ?? section.top;
      const targetBoundary = Math.max(minGapPx, Math.min(section.top, headTop));
      const inSection = y > section.top && y < section.bottom;
      const nearSectionTop =
        y >= section.top - NEAR_SECTION_TOP_PX && y <= headTop + SECTION_HEADING_GUARD_PX;

      if (inSection) {
        const fromSectionStart = y - section.top;
        if (fromSectionStart <= SECTION_HEADING_GUARD_PX || y <= headTop + SECTION_HEADING_GUARD_PX) {
          y = targetBoundary;
          break;
        }
      } else if (nearSectionTop) {
        y = targetBoundary;
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
  sections: ExportSectionBounds[] = [],
): number[] {
  if (!breaks.length || !avoidBlocks.length) return breaks;
  const sorted = [...avoidBlocks].sort((a, b) => a.top - b.top);
  const maxY = Math.max(minGapPx, totalHeightPx - minGapPx);
  const pageHeight = Math.max(1, Math.round(pageHeightPx || totalHeightPx));
  const maxShift = Math.min(pageHeight * 0.5, 350);

  return breaks.map((breakY) => {
    let y = breakY;
    const visited = new Set<ExportAvoidBounds>();
    let iterations = 0;

    while (iterations < 10) {
      const hit = sorted.find((block) => y > block.top && y < block.bottom);
      if (!hit) {
        break;
      }

      if (visited.has(hit)) {
        // Cycle detected! Snap backward to the minimum top of all visited blocks
        let minTop = y;
        for (const block of visited) {
          if (block.top < minTop) {
            minTop = block.top;
          }
        }
        y = minTop;
        break;
      }

      visited.add(hit);
      iterations++;

      const blockHeight = hit.bottom - hit.top;
      let proposedY = y;
      let isChildTopSnap = false;

      if (hit.bottom - y <= minGapPx) {
        // Snapping forward: check if it would cross a section boundary
        const wouldCrossSection = sections.some((section) => {
          const headTop = section.headingTop ?? section.top;
          const wasBefore = y <= headTop || y <= section.top;
          const proposedAfter = hit.bottom > headTop || hit.bottom > section.top;
          return wasBefore && proposedAfter;
        });

        if (wouldCrossSection) {
          // Snap backward instead of forward crossing the section heading/top
          proposedY = hit.top;
        } else {
          proposedY = hit.bottom;
        }
      } else if (y - hit.top <= minGapPx) {
        proposedY = hit.top;
      } else if (blockHeight < pageHeight) {
        proposedY = hit.top;
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
        proposedY = best;
        isChildTopSnap = true;
      }

      // Ensure the snapped break does not cross any section heading or section top
      for (const section of sections) {
        const headTop = section.headingTop ?? section.top;
        const targetBoundary = Math.max(minGapPx, Math.min(section.top, headTop));

        const wasBeforeSection = y <= headTop || y <= section.top;
        const proposedAfterSection = proposedY > headTop || proposedY > section.top;

        if (wasBeforeSection && proposedAfterSection) {
          proposedY = targetBoundary;
        }

        const wasAfterSection = y >= targetBoundary;
        const proposedBeforeSection = proposedY < targetBoundary;

        if (wasAfterSection && proposedBeforeSection) {
          proposedY = targetBoundary;
        }
      }

      if (proposedY === y) {
        break;
      }

      y = proposedY;

      if (isChildTopSnap) {
        break;
      }
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
  const avoidSnapped = snapBreakPositionsToAvoidBlocks(sectionSnapped, avoidBlocks, pageHeight, total, minGapPx, sections);
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
  const customBreaks = normalizeBreakPositions(customBreakPositions, validationTotal, minGapPx)
    .filter((position) => position > 0 && position < total);
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

export function buildSegmentHtml(args: {
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
  nodeCount: number;
  sections: ExportSectionBounds[];
  avoidBlocks: ExportAvoidBounds[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function installPuppeteerRequestGuard(page: any): Promise<void> {
  await page.setRequestInterception(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page.on('request', (req: any) => {
    const url = String(req.url?.() || '');
    if (!isPuppeteerRequestUrlAllowed(url)) {
      req.abort().catch(() => undefined);
      return;
    }
    req.continue().catch(() => undefined);
  });
}

async function measureExportLayout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  html: string,
  widthPx: number,
): Promise<ExportLayoutMetrics> {
  const page = await browser.newPage();
  try {
    // The request body is untrusted HTML. Layout inspection is performed via
    // DevTools evaluation, while document scripts and inline event handlers
    // remain disabled for the entire renderer page.
    await page.setJavaScriptEnabled(false);
    await installPuppeteerRequestGuard(page);
    await page.setViewport({ width: widthPx, height: 1200, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    // Wait for fonts so layout heights are accurate (avoids system-font fallback metrics).
    try { await page.evaluateHandle('document.fonts.ready'); } catch { /* ignore */ }
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
        1,
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
        const top = relTop(el);
        return {
          top,
          bottom: top + el.offsetHeight,
          childTops: Array.from(el.querySelectorAll('[data-break-child]')).map((child) =>
            relTop(child),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any,
  html: string,
  widthPx: number,
  heightPx: number,
): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await installPuppeteerRequestGuard(page);

    await page.setViewport({ width: widthPx, height: Math.max(1, heightPx), deviceScaleFactor: 1 });
    // domcontentloaded fires as soon as the DOM is parsed; no waiting for external
    // resources (images, fonts). All CSS is already inlined in the payload.
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    try { await page.evaluateHandle('document.fonts.ready'); } catch { /* ignore */ }
    const pdf = await page.pdf({
      width: `${widthPx / 72}in`,
      height: `${heightPx / 72}in`,
      // Resume layout coordinates intentionally use PDF-point dimensions
      // (612x792 Letter, 595x842 A4) as CSS pixels. Chromium maps one CSS px
      // to 0.75pt, so 4/3 print scaling preserves both the physical paper size
      // and the preview/export layout coordinates.
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
  const headers: Record<string, string> = {
    'X-Appwrite-Project': args.projectId,
  };
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any;
  let pdfDb: Databases | null = null;
  let userLeaseId: string | null = null;
  let globalLeaseId: string | null = null;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'Only POST is supported' });
  }

  // ── Auth: verify Appwrite JWT ─────────────────────────────────────────────
  const jwtToken = req.headers['x-appwrite-jwt'];
  if (!jwtToken || typeof jwtToken !== 'string') {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
  }
  const appwriteEndpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const appwriteProjectId =
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID ||
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
    '';
  if (!appwriteProjectId) {
    console.error('[pdf] APPWRITE_PROJECT_ID env var not configured');
    return res.status(500).json({ error: 'config_error', message: 'Server configuration error' });
  }
  let ownerUserId = '';
  try {
    const authRes = await fetch(`${appwriteEndpoint}/account`, {
      headers: {
        'X-Appwrite-Project': appwriteProjectId,
        'X-Appwrite-JWT': jwtToken,
      },
    });
    if (!authRes.ok) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired session' });
    }
    const account = await authRes.json() as { $id?: unknown };
    ownerUserId = typeof account?.$id === 'string' ? account.$id : '';
    if (!ownerUserId) {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired session' });
    }
  } catch {
    return res.status(401).json({ error: 'unauthorized', message: 'Authentication check failed' });
  }

  const validation = validatePdfExportRequestBody(req.body);
  if (!validation.ok) {
    return res.status(validation.status).json({ error: validation.error, message: validation.message });
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

  if (!checkPdfExportRateLimit(ownerUserId)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Too many PDF exports. Please wait a minute and try again.',
    });
  }
  let showBranding = requestedShowBranding;
  if (!requestedShowBranding) {
    const canRemoveBranding = await loadBrandingRemovalEntitlement({
      endpoint: appwriteEndpoint,
      projectId: appwriteProjectId,
      jwt: jwtToken,
      userId: ownerUserId,
    });
    if (canRemoveBranding === null) {
      return res.status(503).json({
        error: 'entitlement_unavailable',
        message: 'Could not verify the branding setting. Please retry the export.',
      });
    }
    showBranding = !canRemoveBranding;
  }

  if (Buffer.byteLength(html, 'utf8') > PDF_MAX_HTML_BYTES) {
    return res.status(413).json({ error: 'payload_too_large', message: 'PDF HTML exceeds the allowed size.' });
  }
  if (!Array.isArray(customBreakPositions) || customBreakPositions.length > PDF_MAX_CUSTOM_BREAKS || customBreakPositions.some((value) => !Number.isFinite(value))) {
    return res.status(400).json({ error: 'invalid_custom_breaks', message: 'Too many or invalid page breaks.' });
  }
  for (const value of [totalContentHeightPx, layoutContentHeightPx]) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > PDF_MAX_CONTENT_HEIGHT_PX)) {
      return res.status(400).json({ error: 'invalid_content_height', message: 'PDF content height is outside the allowed range.' });
    }
  }
  if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
    console.error('[pdf] durable limiter configuration is incomplete');
    return res.status(503).json({ error: 'limiter_unavailable', message: 'PDF export is temporarily unavailable.' });
  }

  if (activePdfExports >= PDF_EXPORT_MAX_CONCURRENT) {
    res.setHeader('Retry-After', '5');
    return res.status(429).json({
      error: 'renderer_busy',
      message: 'The PDF renderer is busy. Please retry in a few seconds.',
    });
  }
  activePdfExports += 1;

  try {
    pdfDb = getPdfDb();
    const rateSlotId = await claimPdfRateSlot(pdfDb, ownerUserId);
    if (!rateSlotId) {
      return res.status(429).json({ error: 'rate_limited', message: 'Too many PDF exports. Please try again later.' });
    }
    userLeaseId = await claimPdfLease(pdfDb, `pdf-user-${hashPdfKey(ownerUserId)}`, PDF_USER_CONCURRENCY_LIMIT, hashPdfKey(`${ownerUserId}:${Date.now()}`));
    if (!userLeaseId) {
      return res.status(429).json({ error: 'concurrency_limited', message: 'Too many PDF exports are already running for this account.' });
    }
    globalLeaseId = await claimPdfLease(pdfDb, 'pdf-global', PDF_GLOBAL_CONCURRENCY_LIMIT, hashPdfKey(`${ownerUserId}:${Date.now()}`));
    if (!globalLeaseId) {
      return res.status(503).json({ error: 'capacity_limited', message: 'PDF export capacity is temporarily full. Please try again shortly.' });
    }

    const renderDeadline = Date.now() + PDF_RENDER_TIMEOUT_MS;
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
    const puppeteer = _puppeteer;
    if (!_chromium) {
      console.log('[pdf] step: import @sparticuz/chromium');
      _chromium = (await import('@sparticuz/chromium')).default;
      console.log('[pdf] step: @sparticuz/chromium ok');
    }
    const chromium = _chromium;

    console.log('[pdf] step: get chromium args, count:', chromium.args?.length);
    console.log('[pdf] step: get executablePath');
    const execPath = await chromium.executablePath();
    console.log('[pdf] step: executablePath ok:', execPath ? execPath.slice(-50) : 'undefined');
    console.log('[pdf] step: launch browser');
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: true,
      timeout: Math.min(20_000, Math.max(1_000, renderDeadline - Date.now())),
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
    const measuredHeight = Number.isFinite(layout.measuredHeight) ? Math.round(layout.measuredHeight) : 0;
    if (layout.nodeCount > PDF_EXPORT_MAX_DOM_NODES) {
      return res.status(413).json({
        error: 'export_too_large',
        message: 'This document contains too many elements to export safely.',
      });
    }
    if (measuredHeight > PDF_EXPORT_MAX_CONTENT_HEIGHT_PX) {
      return res.status(413).json({
        error: 'export_too_large',
        message: `This document is too long to export safely. The maximum supported length is ${PDF_EXPORT_MAX_PAGES} pages.`,
      });
    }
    // layoutContentHeightPx can include a template's full-page min-height
    // sentinel. Keep it for custom-break validation below, but never let it
    // inflate the rendered content height and create a footer-only page.
    contentHeight = Math.max(Math.round(contentHeight), measuredHeight, contentPageHeight);
    if (contentHeight > PDF_MAX_CONTENT_HEIGHT_PX) {
      return res.status(413).json({ error: 'content_too_large', message: 'PDF content exceeds the allowed height.' });
    }
    if (Date.now() >= renderDeadline) {
      return res.status(504).json({ error: 'render_timeout', message: 'PDF rendering exceeded the allowed time.' });
    }

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

    // A one-page export intentionally ignores saved multi-page cuts and scales
    // the entire source into one standard Letter/A4 page. Multi-page exports
    // continue to honor and validate the user's saved cuts.
    let pageBreaks = onePage ? [] : clampBreakPositions(exactCustomBreaks, validationHeight);
    if (!onePage && exactCustomBreaks.length > 0) {
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
        DEFAULT_MIN_GAP_PX,
        layoutContentHeightPx
      );
      pageBreaks = snapBreakPositionsToAvoidBlocks(
        pageBreaks,
        layout.avoidBlocks,
        contentPageHeight,
        layout.measuredHeight,
        DEFAULT_MIN_GAP_PX,
        layout.sections
      );
      console.log('[pdf] snapped custom breaks:', pageBreaks);
    }

    if (!onePage && exactCustomBreaks.length === 0) {
      pageBreaks = buildAutomaticBreakPositions({
        totalContentHeightPx: contentHeight,
        pageHeightPx: contentPageHeight,
        sections: layout.sections,
        avoidBlocks: layout.avoidBlocks,
      });
      console.log('[pdf] automatic breaks:', pageBreaks,
        'sections:', layout.sections.length, 'avoidBlocks:', layout.avoidBlocks.length);
    } else if (!onePage && pageBreaks.length === 0 && contentHeight > contentPageHeight) {
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
    const onePageScale = onePage
      ? calculateOnePageScale(contentHeight, contentPageHeight)
      : 1;
    const segments = onePage
      ? [{ index: 0, startPx: 0, heightPx: contentPageHeight, isLast: true }]
      : buildExportPageSegments({
          totalContentHeightPx: contentHeight,
          pageHeightPx: contentPageHeight,
          customBreakPositions: pageBreaks,
          breakValidationHeightPx: validationHeight,
        });
    if (segments.length > PDF_EXPORT_MAX_PAGES) {
      return res.status(413).json({
        error: 'export_too_large',
        message: `A PDF export can contain at most ${PDF_EXPORT_MAX_PAGES} pages.`,
      });
    }
    console.log('[pdf] segments:', segments.length, 'footer:', footerHeight, 'px',
      'contentHeight:', contentHeight);
    if (segments.length === 0 || segments.length > PDF_MAX_SEGMENTS) {
      return res.status(413).json({ error: 'too_many_pages', message: 'PDF page count exceeds the allowed limit.' });
    }
    if (Date.now() >= renderDeadline) {
      return res.status(504).json({ error: 'render_timeout', message: 'PDF rendering exceeded the allowed time.' });
    }

    // 5. Render each segment as a separate PDF page.
    const pdfBuffers: Buffer[] = [];
    for (const segment of segments) {
      console.log('[pdf] rendering segment', segment.index + 1, '/',
        segments.length, 'start:', segment.startPx, 'h:', segment.heightPx);
      const pageLabel = showPageNumbers
        ? formatPdfPageNumber(segment.index + 1, segments.length, pageNumberFormat, locale)
        : undefined;
      const segHtml = buildSegmentHtml({
        sourceHtml: html,
        pageWidthPx: dims.widthPx,
        contentStartPx: segment.startPx,
        contentHeightPx: segment.heightPx,
        footerHeightPx: footerHeight,
        pageNumber: pageLabel,
        showBranding,
        sourceScale: onePageScale,
        locale,
      });
      const buf = await withPdfTimeout(renderHtmlToPdfBuffer(
        browser,
        segHtml,
        dims.widthPx,
        segment.heightPx + footerHeight,
      ), Math.max(1, Math.min(PDF_RENDER_TIMEOUT_MS, renderDeadline - Date.now())));
      const accumulatedBytes = pdfBuffers.reduce((total, current) => total + current.length, 0);
      if (buf.length > PDF_EXPORT_MAX_PAGE_BYTES || accumulatedBytes + buf.length > PDF_EXPORT_MAX_OUTPUT_BYTES) {
        return res.status(413).json({
          error: 'export_too_large',
          message: 'The generated PDF is too large. Remove large images and try again.',
        });
      }
      pdfBuffers.push(buf);
      console.log('[pdf] segment', segment.index + 1, 'done:', buf.length, 'bytes');
    }

    const buffersToMerge = pdfBuffers;
    console.log('[pdf] merging', buffersToMerge.length, 'buffer(s)');

    // 7. Merge segment PDFs into the final file.
    const pdfBuffer = await withPdfTimeout(
      mergePdfBuffers(buffersToMerge),
      Math.max(1, Math.min(PDF_RENDER_TIMEOUT_MS, renderDeadline - Date.now())),
    );
    if (pdfBuffer.length > PDF_EXPORT_MAX_OUTPUT_BYTES) {
      return res.status(413).json({
        error: 'export_too_large',
        message: 'The generated PDF is too large. Remove large images and try again.',
      });
    }
    console.log('[pdf] done, total size:', pdfBuffer.length, 'bytes');
    if (pdfBuffer.length > PDF_MAX_OUTPUT_BYTES) {
      return res.status(413).json({ error: 'output_too_large', message: 'Generated PDF exceeds the allowed size.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resume.pdf"');
    res.send(Buffer.from(pdfBuffer));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? '') : '';
    console.error('[pdf-err]', message.slice(0, 300));
    const firstStackLine = stack.split('\n').slice(1, 3).join(' | ');
    if (firstStackLine) console.error('[pdf-trace]', firstStackLine);
    res.status(500).json({ error: 'pdf_failed', message: 'PDF generation failed. Please try again.' });
  } finally {
    if (pdfDb) {
      await releasePdfLease(pdfDb, userLeaseId);
      await releasePdfLease(pdfDb, globalLeaseId);
    }
    await browser?.close();
    activePdfExports = Math.max(0, activePdfExports - 1);
  }
}
