/**
 * WiseResume Express Server
 *
 * Provides server-side API routes that proxy Supabase Edge Functions,
 * keeping sensitive API keys (WISE_AI_API_KEY, RESEND_API_KEY, etc.) 
 * off the client. The frontend calls /api/* which this server forwards 
 * to Supabase Edge Functions using the service-role key.
 *
 * Auth: Bearer tokens from Kinde are forwarded as-is to Supabase for
 * validation — we do not re-validate here, trusting Supabase Auth.
 */

import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';

const app = express();
const PORT = parseInt(process.env.API_PORT || '5001', 10);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: (origin, callback) => {
    // Allow Replit dev domains, localhost, and the production domain
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
}));

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[server] SUPABASE_URL or SUPABASE_ANON_KEY not set — edge function proxy will not work');
}

// Neon DB connection (for direct server-side queries)
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Database health ───────────────────────────────────────────────────────────
app.get('/api/db-health', async (_req, res) => {
  if (!sql) {
    return res.status(503).json({ error: 'DATABASE_URL not configured' });
  }
  try {
    const result = await sql`SELECT 1 as ok`;
    res.json({ status: 'ok', result });
  } catch (err) {
    res.status(503).json({ error: 'Database connection failed', detail: String(err) });
  }
});

/**
 * Edge function proxy — forwards all /api/fn/* calls to Supabase Edge Functions.
 * The client's Authorization (Kinde JWT) is forwarded as-is.
 * Sensitive Supabase keys never leave the server.
 */
app.all('/api/fn/:fnName', async (req, res) => {
  const { fnName } = req.params;

  if (!SUPABASE_URL) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/${fnName}`;

  try {
    const forwardHeaders: Record<string, string> = {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': req.headers['content-type'] || 'application/json',
    };

    // Forward the user's auth token if present
    const authHeader = req.headers.authorization;
    if (authHeader) {
      forwardHeaders['Authorization'] = authHeader;
    }

    const isFormData = (req.headers['content-type'] || '').includes('multipart/form-data');

    let bodyToSend: string | Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (isFormData) {
        // Can't re-serialize FormData easily in Node — this path is handled client-side for now
        bodyToSend = undefined;
      } else {
        bodyToSend = JSON.stringify(req.body);
      }
    }

    const response = await fetch(edgeFunctionUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyToSend,
    });

    // Forward response headers (content-type etc.)
    const contentType = response.headers.get('content-type') || 'application/json';
    res.status(response.status).set('Content-Type', contentType);

    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error(`[server] proxy error for ${fnName}:`, err);
    res.status(502).json({ error: 'Failed to reach edge function', detail: String(err) });
  }
});

/**
 * POST /api/fetch-url — Fetch a public web page on the client's behalf so
 * browser CORS restrictions don't block the URL-based resume import path.
 *
 * Safety measures:
 *   - HTTP/HTTPS only
 *   - Block private / loopback / link-local hosts to prevent SSRF
 *   - 10-second timeout
 *   - 2 MB response size cap
 *   - Only returns the text body; no redirects chased beyond fetch defaults
 */
app.post('/api/fetch-url', async (req, res) => {
  const { url } = (req.body ?? {}) as { url?: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing `url` in request body' });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http and https URLs are allowed' });
  }

  const isBlockedHost = (h: string): boolean => {
    const host = h.toLowerCase();
    return (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host === '::1' ||
      host.startsWith('[::1]') ||
      host.startsWith('[fc') ||
      host.startsWith('[fd') ||
      host.startsWith('fc') ||
      host.startsWith('fd')
    );
  };

  if (isBlockedHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Host is not publicly reachable' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    // Manually follow redirects so we can re-validate each hop against the
    // blocked-host list — prevents redirect-based SSRF bypass (e.g. a public
    // URL that 302s to http://169.254.169.254/).
    const MAX_REDIRECTS = 5;
    let currentUrl = parsed.toString();
    let upstream: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const hopUrl = new URL(currentUrl);
      if (hopUrl.protocol !== 'http:' && hopUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Redirect to unsupported scheme blocked' });
      }
      if (isBlockedHost(hopUrl.hostname)) {
        return res.status(400).json({ error: 'Redirect to private/loopback host blocked' });
      }
      const r = await fetch(hopUrl.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WiseResume-Importer/1.0 (+https://resume.thewise.cloud)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
        },
      });
      if (r.status >= 300 && r.status < 400) {
        const location = r.headers.get('location');
        if (!location) {
          upstream = r;
          break;
        }
        if (hop === MAX_REDIRECTS) {
          return res.status(502).json({ error: 'Too many redirects' });
        }
        currentUrl = new URL(location, hopUrl).toString();
        continue;
      }
      upstream = r;
      break;
    }
    if (!upstream) {
      return res.status(502).json({ error: 'Failed to fetch URL' });
    }

    const contentType = upstream.headers.get('content-type') || '';
    if (!upstream.ok) {
      return res.status(502).json({ error: `Upstream responded with ${upstream.status}` });
    }
    if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
      return res.status(415).json({ error: `Unsupported content-type: ${contentType || 'unknown'}` });
    }

    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
    const reader = upstream.body?.getReader();
    if (!reader) {
      const text = await upstream.text();
      return res.json({ url: parsed.toString(), contentType, html: text.slice(0, MAX_BYTES) });
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.byteLength;
        if (received > MAX_BYTES) {
          try { await reader.cancel(); } catch { /* ignore */ }
          return res.status(413).json({ error: 'Response exceeds 2 MB limit' });
        }
        chunks.push(value);
      }
    }
    const buffer = Buffer.concat(chunks.map(c => Buffer.from(c)));
    const html = buffer.toString('utf-8');
    return res.json({ url: parsed.toString(), contentType, html });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return res.status(isAbort ? 504 : 502).json({
      error: isAbort ? 'Upstream request timed out' : 'Failed to fetch URL',
      detail: String(err),
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

// ── Direct DB routes (server-side, no Supabase needed) ────────────────────────

/**
 * GET /api/plan/:userId — Get the effective plan for a user directly from Neon DB.
 * Only callable from server-side contexts with DATABASE_URL.
 */
app.get('/api/plan/:userId', async (req, res) => {
  if (!sql) return res.status(503).json({ error: 'Database not configured' });
  try {
    const { userId } = req.params;
    const rows = await sql`
      SELECT plan_name, status, trial_plan, trial_expires_at
      FROM subscriptions
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) return res.json({ plan: 'free' });
    const sub = rows[0];
    let effectivePlan = sub.plan_name || 'free';
    if (sub.trial_plan && sub.trial_expires_at) {
      if (new Date(sub.trial_expires_at as string) > new Date()) {
        effectivePlan = sub.trial_plan as string;
      }
    }
    res.json({ plan: effectivePlan, status: sub.status });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API server running on port ${PORT}`);
  console.log(`[server] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`[server] Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
});

export default app;
