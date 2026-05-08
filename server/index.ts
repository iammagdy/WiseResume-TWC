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

// ── Fetch-URL proxy ───────────────────────────────────────────────────────────
// Fetches a remote URL server-side and returns the HTML body, bypassing
// browser CORS restrictions. Used by UploadPage and onboardingProfile to
// import LinkedIn/resume pages.
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
