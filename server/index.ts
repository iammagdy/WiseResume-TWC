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
