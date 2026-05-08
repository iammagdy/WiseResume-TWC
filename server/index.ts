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
