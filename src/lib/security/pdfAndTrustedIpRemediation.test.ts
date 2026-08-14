import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, afterEach } from 'vitest';
import { getTrustedVercelClientIp } from '../../../api/_lib/trustedClientIp';

const pdfSource = readFileSync(resolve(process.cwd(), 'api/export/pdf-native.ts'), 'utf8');
const trustedIpSource = readFileSync(resolve(process.cwd(), 'api/_lib/trustedClientIp.ts'), 'utf8');

describe('trusted anonymous identity', () => {
  const originalVercel = process.env.VERCEL;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  });

  it('uses one shared unknown bucket outside a verified Vercel runtime', () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;

    expect(getTrustedVercelClientIp({ headers: { 'x-forwarded-for': '198.51.100.1', 'x-real-ip': '203.0.113.5' } })).toBe('unknown');
    expect(getTrustedVercelClientIp({ headers: { 'cf-connecting-ip': '192.0.2.10' } })).toBe('unknown');
  });

  it('does not contain direct arbitrary proxy-header fallback logic', () => {
    expect(trustedIpSource).not.toMatch(/headers\[['"](?:x-forwarded-for|x-real-ip|cf-connecting-ip)/i);
    expect(trustedIpSource).toContain("ipAddress");
  });
});

describe('production PDF abuse controls', () => {
  it('admit-controls before Chromium, bounds payloads, pages, output, and render time', () => {
    expect(pdfSource).toContain("const PDF_RATE_LIMIT_COLLECTION = 'pdf_export_rate_limits';");
    expect(pdfSource).toContain("const PDF_ACTIVE_LEASES_COLLECTION = 'pdf_export_active_leases';");
    expect(pdfSource).toContain('const PDF_MAX_HTML_BYTES = 2 * 1024 * 1024;');
    expect(pdfSource).toContain('const PDF_MAX_SEGMENTS = 50;');
    expect(pdfSource).toContain('const PDF_RENDER_TIMEOUT_MS = 45_000;');
    expect(pdfSource).toContain('const PDF_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;');
    expect(pdfSource).toContain("return res.status(503).json({ error: 'limiter_unavailable'");
    expect(pdfSource).toContain('withPdfTimeout(renderHtmlToPdfBuffer(');
    expect(pdfSource).toContain('await releasePdfLease(pdfDb, userLeaseId);');
    expect(pdfSource.indexOf('claimPdfRateSlot')).toBeLessThan(pdfSource.indexOf('puppeteer.launch'));
    expect(pdfSource).toContain('isPuppeteerRequestUrlAllowed');
    expect(pdfSource).not.toMatch(/new Map\s*<.*pdf/i);
  });
});
