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

app.post('/api/export/pdf-native', (_req: Request, res: Response) => {
  // PDF export will be re-implemented on Appwrite Functions (Puppeteer
  // worker). Until then, surface a clear 503 so the client can show a
  // friendly "PDF temporarily unavailable" toast instead of hanging.
  res.status(503).json({
    error: 'pending_appwrite_migration',
    message: 'PDF export is being rebuilt on Appwrite. Please try again later.',
  });
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
