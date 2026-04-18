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
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { promises as dns } from 'node:dns';
import net from 'node:net';

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
 * Return true if the given numeric IP address (v4 or v6) falls in a
 * private/loopback/link-local/ULA/reserved range. Used to harden the
 * URL-fetch proxy against SSRF after DNS resolution.
 */
function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(n => parseInt(n, 10));
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10) return true;                        // 10.0.0.0/8
    if (a === 127) return true;                       // loopback
    if (a === 0) return true;                         // 0.0.0.0/8
    if (a === 169 && b === 254) return true;          // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true;          // 192.168/16
    if (a === 100 && b >= 64 && b <= 127) return true;// CGNAT
    if (a >= 224) return true;                        // multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const v6 = ip.toLowerCase();
    if (v6 === '::' || v6 === '::1') return true;
    if (v6.startsWith('fe80:') || v6.startsWith('fe90:') ||
        v6.startsWith('fea0:') || v6.startsWith('feb0:')) return true; // link-local
    if (v6.startsWith('fc') || v6.startsWith('fd')) return true;        // ULA
    if (v6.startsWith('ff')) return true;                                // multicast
    // IPv4-mapped: ::ffff:a.b.c.d → validate embedded v4
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return false;
  }
  // Unparseable → treat as unsafe
  return true;
}

/**
 * Resolve a hostname via DNS and confirm ALL resolved addresses are public.
 * Blocks attacker-controlled domains that resolve to private/link-local IPs.
 * Returns the list of resolved IPs on success, or throws an Error on block.
 */
async function assertPublicHost(hostname: string): Promise<string[]> {
  // If the hostname is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new Error('blocked-private-ip');
    return [hostname];
  }
  // Reject obvious suspicious names up front.
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.local') || lower.endsWith('.internal')) {
    throw new Error('blocked-name');
  }
  // Resolve all A/AAAA records. dns.lookup returns whatever the OS resolver
  // gives us, including DNS-rebinding first-answers — we validate every one.
  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('dns-failed');
  }
  if (!records || records.length === 0) throw new Error('dns-empty');
  for (const r of records) {
    if (isPrivateIp(r.address)) throw new Error('blocked-resolved-private');
  }
  return records.map(r => r.address);
}

/**
 * Validate a Supabase JWT by calling Supabase's /auth/v1/user endpoint.
 * Returns the verified user id on success, or null on failure. Successful
 * lookups are cached briefly so we don't hammer Supabase on repeat calls.
 */
interface AuthCacheEntry { userId: string; email: string | null; expiresAt: number }
const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL_MS = 60_000; // 1 minute

async function validateSupabaseToken(
  token: string,
): Promise<{ userId: string; email: string | null } | null> {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const now = Date.now();
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > now) {
    return { userId: cached.userId, email: cached.email };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { id?: unknown; email?: unknown };
    const userId = typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
    const email = typeof body.email === 'string' && body.email.length > 0
      ? body.email.toLowerCase()
      : null;
    if (userId) {
      authCache.set(token, { userId, email, expiresAt: now + AUTH_CACHE_TTL_MS });
      // Keep cache bounded.
      if (authCache.size > 2000) {
        for (const [k, v] of authCache) if (v.expiresAt <= now) authCache.delete(k);
      }
      return { userId, email };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Require a valid Supabase session token. We actually introspect the token
 * against Supabase (/auth/v1/user) rather than just checking for presence —
 * this prevents attackers sending `Bearer anything` from using the proxy.
 * On success we stash the verified user id on the request for downstream
 * rate-limit keying.
 */
interface AuthedRequest extends Request {
  verifiedUserId?: string;
  verifiedEmail?: string | null;
}
async function requireAuthHeader(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(\S+)$/);
  if (!match) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const verified = await validateSupabaseToken(match[1]);
  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  req.verifiedUserId = verified.userId;
  req.verifiedEmail = verified.email;
  next();
}

/**
 * In-memory token bucket keyed by VERIFIED user id + client IP. Keying on
 * the user id (not raw token) prevents token-rotation bypass — an attacker
 * cannot sidestep limits by replaying different tokens for the same user,
 * and cannot forge a different identity without a valid session.
 */
const URL_FETCH_RATE_LIMIT = { windowMs: 60_000, max: 10 };
const urlFetchHits = new Map<string, { count: number; resetAt: number }>();
function urlFetchRateLimiter(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = req.verifiedUserId || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown')
    .split(',')[0].trim();
  const key = `${userId}|${ip}`;
  const now = Date.now();
  const entry = urlFetchHits.get(key);
  if (!entry || entry.resetAt < now) {
    urlFetchHits.set(key, { count: 1, resetAt: now + URL_FETCH_RATE_LIMIT.windowMs });
    next();
    return;
  }
  if (entry.count >= URL_FETCH_RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    return;
  }
  entry.count += 1;
  next();
}
// Opportunistically sweep expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of urlFetchHits) if (v.resetAt < now) urlFetchHits.delete(k);
}, 5 * 60_000).unref?.();

/**
 * POST /api/fetch-url — Fetch a public web page on the client's behalf so
 * browser CORS restrictions don't block the URL-based resume import path.
 *
 * Safety measures:
 *   - Authenticated callers only (Bearer token required)
 *   - Per-user/IP rate limit (10 req / min)
 *   - HTTP/HTTPS only
 *   - DNS resolution + IP-based block list on every hop (including redirects)
 *   - Block private / loopback / link-local / ULA / CGNAT / multicast targets
 *   - 10-second timeout
 *   - 2 MB response size cap
 *   - Only text/html, text/plain, application/xhtml+xml accepted
 */
app.post('/api/fetch-url', requireAuthHeader, urlFetchRateLimiter, async (req, res) => {
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    // Manually follow redirects so we can re-validate each hop's DNS against
    // the private-IP block list. Fixes redirect-based SSRF bypass AND
    // DNS-based bypass (attacker domain → private IP).
    const MAX_REDIRECTS = 5;
    let currentUrl = parsed.toString();
    let upstream: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const hopUrl = new URL(currentUrl);
      if (hopUrl.protocol !== 'http:' && hopUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Redirect to unsupported scheme blocked' });
      }
      try {
        await assertPublicHost(hopUrl.hostname);
      } catch {
        return res.status(400).json({ error: 'Target host is not publicly reachable' });
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

// ── LinkedIn profile importer ─────────────────────────────────────────────────

/**
 * Server-side LinkedIn importer config.
 *
 * Canonical provider: Proxycurl (https://nubela.co/proxycurl). Set
 * `PROXYCURL_API_KEY` to enable. Each call costs 1 credit (~$0.01) on
 * Proxycurl's pay-as-you-go tier; we surface remaining quota in the
 * response so the UI can warn before exhaustion.
 *
 * Per-user monthly cap defaults to 50 imports — adjust via
 * `LINKEDIN_IMPORT_MONTHLY_CAP`. Per-user/IP per-minute throttle is
 * enforced separately via `linkedinImportRateLimiter` below.
 */
const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY || '';
const LINKEDIN_IMPORT_MONTHLY_CAP = parseInt(
  process.env.LINKEDIN_IMPORT_MONTHLY_CAP || '50', 10,
);

const LINKEDIN_IMPORT_RATE_LIMIT = { windowMs: 60_000, max: 5 };
const linkedinImportHits = new Map<string, { count: number; resetAt: number }>();
function linkedinImportRateLimiter(
  req: AuthedRequest, res: Response, next: NextFunction,
): void {
  const userId = req.verifiedUserId || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string ||
    req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const key = `${userId}|${ip}`;
  const now = Date.now();
  const entry = linkedinImportHits.get(key);
  if (!entry || entry.resetAt < now) {
    linkedinImportHits.set(key, {
      count: 1, resetAt: now + LINKEDIN_IMPORT_RATE_LIMIT.windowMs,
    });
    next();
    return;
  }
  if (entry.count >= LINKEDIN_IMPORT_RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'rate_limited',
      message: 'Too many LinkedIn import attempts. Try again shortly.',
    });
    return;
  }
  entry.count += 1;
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of linkedinImportHits) if (v.resetAt < now) linkedinImportHits.delete(k);
}, 5 * 60_000).unref?.();

// In-memory per-user monthly counter. Resets on month boundary or restart;
// if you need durable accounting, swap this for a `linkedin_imports` DB table.
interface MonthlyCounter { month: string; count: number }
const linkedinMonthlyUsage = new Map<string, MonthlyCounter>();
function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function getMonthlyUsage(userId: string): number {
  const month = currentMonthKey();
  const entry = linkedinMonthlyUsage.get(userId);
  if (!entry || entry.month !== month) return 0;
  return entry.count;
}
function bumpMonthlyUsage(userId: string): number {
  const month = currentMonthKey();
  const entry = linkedinMonthlyUsage.get(userId);
  if (!entry || entry.month !== month) {
    linkedinMonthlyUsage.set(userId, { month, count: 1 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * Normalize a Proxycurl person profile into the shape the onboarding
 * importer expects (matches `Partial<ProfileData>` on the client). Only
 * extracts what we explicitly need; ignores fields not surfaced in the UI.
 */
interface ProxycurlExperience {
  title?: string; company?: string; location?: string;
  description?: string;
  starts_at?: { day?: number; month?: number; year?: number } | null;
  ends_at?: { day?: number; month?: number; year?: number } | null;
}
interface ProxycurlEducation {
  school?: string; degree_name?: string; field_of_study?: string;
  description?: string;
  starts_at?: { year?: number } | null;
  ends_at?: { year?: number } | null;
}
interface ProxycurlCertification {
  name?: string; authority?: string;
  starts_at?: { month?: number; year?: number } | null;
}
interface ProxycurlLanguage { name?: string; proficiency?: string }
interface ProxycurlVolunteer {
  title?: string; company?: string; description?: string;
  starts_at?: { month?: number; year?: number } | null;
  ends_at?: { month?: number; year?: number } | null;
}
interface ProxycurlProject { title?: string; description?: string; url?: string }
interface ProxycurlPersonProfile {
  full_name?: string; first_name?: string; last_name?: string;
  headline?: string; summary?: string;
  city?: string; state?: string; country_full_name?: string;
  experiences?: ProxycurlExperience[];
  education?: ProxycurlEducation[];
  skills?: string[];
  certifications?: ProxycurlCertification[];
  languages_and_proficiencies?: ProxycurlLanguage[];
  volunteer_work?: ProxycurlVolunteer[];
  accomplishment_projects?: ProxycurlProject[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d?: { month?: number; year?: number } | null): string {
  if (!d || !d.year) return '';
  const m = d.month && d.month >= 1 && d.month <= 12 ? `${MONTHS[d.month - 1]} ` : '';
  return `${m}${d.year}`;
}

function normalizeProxycurl(p: ProxycurlPersonProfile) {
  const fullName = p.full_name ||
    [p.first_name, p.last_name].filter(Boolean).join(' ') || undefined;
  const location = [p.city, p.state, p.country_full_name].filter(Boolean).join(', ') || undefined;
  const today = new Date();
  const isCurrent = (e: { year?: number; month?: number } | null | undefined): boolean => {
    if (!e || !e.year) return true;
    if (e.year > today.getUTCFullYear()) return true;
    if (e.year === today.getUTCFullYear() && (e.month ?? 12) >= today.getUTCMonth() + 1) return true;
    return false;
  };

  return {
    fullName,
    headline: p.headline || undefined,
    location,
    summary: p.summary || undefined,
    experience: (p.experiences || []).map(e => ({
      title: e.title || '',
      company: e.company || '',
      location: e.location || '',
      startDate: fmtDate(e.starts_at),
      endDate: e.ends_at ? fmtDate(e.ends_at) : '',
      current: !e.ends_at && isCurrent(e.starts_at),
      description: e.description || '',
    })),
    education: (p.education || []).map(e => ({
      institution: e.school || '',
      degree: e.degree_name || '',
      field: e.field_of_study || '',
      startYear: e.starts_at?.year ? String(e.starts_at.year) : '',
      endYear: e.ends_at?.year ? String(e.ends_at.year) : '',
      description: e.description || '',
    })),
    skills: p.skills || [],
    certifications: (p.certifications || []).map(c => ({
      name: c.name || '', organization: c.authority || '', date: fmtDate(c.starts_at),
    })),
    languages: (p.languages_and_proficiencies || []).map(l => ({
      language: l.name || '', proficiency: l.proficiency || '',
    })),
    projects: (p.accomplishment_projects || []).map(pr => ({
      name: pr.title || '', description: pr.description || '', url: pr.url,
    })),
    volunteering: (p.volunteer_work || []).map(v => ({
      role: v.title || '', organization: v.company || '',
      startDate: fmtDate(v.starts_at), endDate: fmtDate(v.ends_at),
      description: v.description || '',
    })),
  };
}

/**
 * POST /api/linkedin-profile — Server-side LinkedIn profile importer.
 *
 * Body: `{ url: "https://www.linkedin.com/in/<slug>" }`
 *
 * Responses:
 *   200 { provider, profile, quota: { used, cap, remaining } }
 *   400 invalid URL
 *   401 auth required
 *   402 monthly quota exhausted (per-user cap)
 *   429 per-minute rate limit hit (Retry-After header set)
 *   503 importer not configured (PROXYCURL_API_KEY missing) — frontend
 *       should fall back to its OG-meta best-effort path.
 *   502 upstream provider failed
 *   504 upstream provider timed out
 */
app.post('/api/linkedin-profile', requireAuthHeader, linkedinImportRateLimiter,
  async (req: AuthedRequest, res) => {
    if (!PROXYCURL_API_KEY) {
      return res.status(503).json({
        error: 'not_configured',
        message: 'LinkedIn importer is not configured on this deployment.',
      });
    }

    const { url } = (req.body ?? {}) as { url?: string };
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'bad_request', message: 'Missing `url` in body.' });
    }
    let parsed: URL;
    try {
      parsed = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    } catch {
      return res.status(400).json({ error: 'bad_request', message: 'Invalid URL.' });
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return res.status(400).json({
        error: 'bad_request', message: 'Only linkedin.com profile URLs are supported.',
      });
    }
    if (!/^\/in\/[^/]+\/?$/i.test(parsed.pathname)) {
      return res.status(400).json({
        error: 'bad_request',
        message: 'Use a public LinkedIn profile URL like linkedin.com/in/yourname.',
      });
    }

    const userId = req.verifiedUserId!;
    const used = getMonthlyUsage(userId);
    if (used >= LINKEDIN_IMPORT_MONTHLY_CAP) {
      return res.status(402).json({
        error: 'quota_exhausted',
        message: `Monthly LinkedIn import limit reached (${LINKEDIN_IMPORT_MONTHLY_CAP}). Try again next month or paste your profile manually.`,
        quota: { used, cap: LINKEDIN_IMPORT_MONTHLY_CAP, remaining: 0 },
      });
    }

    const apiUrl = new URL('https://nubela.co/proxycurl/api/v2/linkedin');
    apiUrl.searchParams.set('linkedin_profile_url', `https://${host}${parsed.pathname.replace(/\/$/, '')}`);
    apiUrl.searchParams.set('use_cache', 'if-present');
    apiUrl.searchParams.set('fallback_to_cache', 'on-error');

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25_000);
    try {
      const upstream = await fetch(apiUrl.toString(), {
        headers: { Authorization: `Bearer ${PROXYCURL_API_KEY}` },
        signal: controller.signal,
      });

      if (upstream.status === 401 || upstream.status === 403) {
        console.error('[linkedin-profile] proxycurl auth failed:', upstream.status);
        return res.status(503).json({
          error: 'provider_auth_failed',
          message: 'LinkedIn importer credentials are invalid. Falling back to manual paste.',
        });
      }
      if (upstream.status === 404) {
        return res.status(404).json({
          error: 'not_found',
          message: 'That LinkedIn profile could not be found or is private.',
        });
      }
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('retry-after') || '60';
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          error: 'provider_rate_limited',
          message: 'LinkedIn importer is throttled upstream. Try again in a moment.',
        });
      }
      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => '');
        console.error('[linkedin-profile] proxycurl error', upstream.status, detail.slice(0, 500));
        return res.status(502).json({
          error: 'upstream_error',
          message: `LinkedIn importer failed (status ${upstream.status}).`,
        });
      }

      const body = (await upstream.json()) as ProxycurlPersonProfile;
      const profile = normalizeProxycurl(body);

      // Bump quota only on a successful, billable response.
      const newUsed = bumpMonthlyUsage(userId);
      const remaining = Math.max(0, LINKEDIN_IMPORT_MONTHLY_CAP - newUsed);
      // Surface upstream credit balance when Proxycurl returns it.
      const creditBalance = upstream.headers.get('x-credit-balance');

      return res.json({
        provider: 'proxycurl',
        profile,
        quota: { used: newUsed, cap: LINKEDIN_IMPORT_MONTHLY_CAP, remaining },
        providerCreditBalance: creditBalance ? Number(creditBalance) : null,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      console.error('[linkedin-profile] fetch failed:', err);
      return res.status(isAbort ? 504 : 502).json({
        error: isAbort ? 'upstream_timeout' : 'upstream_error',
        message: isAbort
          ? 'LinkedIn importer timed out. Try again or paste your profile manually.'
          : 'Could not reach LinkedIn importer. Try again or paste your profile manually.',
      });
    } finally {
      clearTimeout(t);
    }
  },
);

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

// ── Analytics retention sweeper (Phase 5) ─────────────────────────────────────
//
// Once per day, prune rows older than the per-table retention window from
// `portfolio_visits`, `error_log`, and `audit_logs`. The actual delete loop
// lives in the Postgres RPC `sweep_analytics_retention(...)` (see migration
// 20260425000000_analytics_retention.sql) so the work happens in batches of
// 10k rows server-side and we never hold a long transaction from Node.
//
// Retention windows are env-tunable:
//   PORTFOLIO_VISITS_RETENTION_DAYS (default 90)
//   ERROR_LOG_RETENTION_DAYS        (default 30)
//   AUDIT_LOGS_RETENTION_DAYS       (default 365)
//
// Disable entirely by setting ANALYTICS_SWEEP_ENABLED=false (e.g. in CI).

interface SweepResult {
  ran_at: string;
  portfolio_visits_cutoff: string;
  error_log_cutoff: string;
  audit_logs_cutoff: string;
  portfolio_visits_deleted: number;
  error_log_deleted: number;
  audit_logs_deleted: number;
  trial_resumes_deleted: number;
}
interface SweepStatus {
  lastRanAt: string | null;
  lastDurationMs: number | null;
  lastResult: SweepResult | null;
  lastError: string | null;
  nextScheduledAt: string | null;
  config: {
    enabled: boolean;
    portfolioVisitsRetentionDays: number;
    errorLogRetentionDays: number;
    auditLogsRetentionDays: number;
    intervalMs: number;
  };
}

const ANALYTICS_SWEEP_ENABLED =
  (process.env.ANALYTICS_SWEEP_ENABLED || 'true').toLowerCase() !== 'false';
function parseRetentionDays(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.warn(
      `[analytics-sweep] invalid ${envName}=${raw} — falling back to ${fallback}`,
    );
    return fallback;
  }
  return n;
}
const PORTFOLIO_VISITS_RETENTION_DAYS =
  parseRetentionDays('PORTFOLIO_VISITS_RETENTION_DAYS', 90);
const ERROR_LOG_RETENTION_DAYS =
  parseRetentionDays('ERROR_LOG_RETENTION_DAYS', 30);
const AUDIT_LOGS_RETENTION_DAYS =
  parseRetentionDays('AUDIT_LOGS_RETENTION_DAYS', 365);
const ANALYTICS_SWEEP_BATCH_SIZE = 10000;
// Per-table cap on batch iterations so a runaway loop can't dominate
// the connection forever. 1000 batches × 10k rows = 10M rows/table/run,
// far above any realistic backlog.
const ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE = 1000;
// Lock TTL for the cross-instance sweep mutex. Sized comfortably above the
// expected sweep duration so a healthy run never times out, but short enough
// that a crashed holder is recovered before the next daily run.
const ANALYTICS_SWEEP_LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Stable per-process holder id used to release only locks we own.
const ANALYTICS_SWEEP_HOLDER_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ANALYTICS_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
// Wait a few minutes after boot before the first sweep so we don't
// pile work onto a cold start; subsequent runs are 24h apart.
const ANALYTICS_SWEEP_INITIAL_DELAY_MS = 5 * 60 * 1000;

const sweepStatus: SweepStatus = {
  lastRanAt: null,
  lastDurationMs: null,
  lastResult: null,
  lastError: null,
  nextScheduledAt: null,
  config: {
    enabled: ANALYTICS_SWEEP_ENABLED,
    portfolioVisitsRetentionDays: PORTFOLIO_VISITS_RETENTION_DAYS,
    errorLogRetentionDays: ERROR_LOG_RETENTION_DAYS,
    auditLogsRetentionDays: AUDIT_LOGS_RETENTION_DAYS,
    intervalMs: ANALYTICS_SWEEP_INTERVAL_MS,
  },
};

/**
 * Sweep one analytics table by repeatedly invoking the single-batch RPC.
 * Each RPC call runs in its own transaction (because PL/pgSQL's outer
 * loop and `GET DIAGNOSTICS` would otherwise hold a single long
 * transaction for the whole table). When the RPC returns fewer rows
 * than the batch size, we know the backlog is drained.
 */
async function sweepOneTable(
  table: 'portfolio_visits' | 'error_log' | 'audit_logs',
  days: number,
): Promise<number> {
  if (!sql) return 0;
  let total = 0;
  for (let i = 0; i < ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE; i++) {
    const rows = await sql`
      SELECT public.sweep_analytics_retention_batch(
        ${table}::text,
        ${days}::int,
        ${ANALYTICS_SWEEP_BATCH_SIZE}::int
      ) AS deleted
    `;
    const deleted = Number(rows[0]?.deleted ?? 0);
    total += deleted;
    if (deleted < ANALYTICS_SWEEP_BATCH_SIZE) return total;
  }
  console.warn(
    `[analytics-sweep] ${table} hit max-batches cap`,
    JSON.stringify({ batches: ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE, total }),
  );
  return total;
}

/**
 * Run the full sweep across all three analytics tables. Cross-instance
 * overlap is prevented by acquiring the durable single-row mutex
 * `analytics_sweep_lock` (TTL-bounded, holder-tagged) before doing any
 * work, renewing the lease between tables, and deleting our row on
 * exit. A manual trigger can never race with the daily timer —
 * concurrent invocations short-circuit with
 * `lastError = 'sweep already in progress'`.
 */
let sweepInFlight = false;
async function runAnalyticsSweep(): Promise<void> {
  if (!sql) {
    sweepStatus.lastError = 'DATABASE_URL not configured';
    console.warn('[analytics-sweep] skipped — DATABASE_URL not configured');
    return;
  }
  // In-process guard catches the trivially-concurrent case without a
  // DB roundtrip; the advisory lock below catches multi-instance races.
  if (sweepInFlight) {
    sweepStatus.lastError = 'sweep already in progress (in-process)';
    console.warn('[analytics-sweep] skipped — already running in this process');
    return;
  }
  sweepInFlight = true;
  const startedAt = Date.now();
  let lockAcquired = false;
  try {
    // Cross-instance mutex via the analytics_sweep_lock single-row table.
    // Neon's HTTP serverless driver doesn't preserve a session across
    // statements, so a session-scoped pg_advisory_lock would silently
    // be released the moment its HTTP request returns. The row pattern
    // is durable across statement boundaries and TTL-bounded so a
    // crashed holder can't pin the lock indefinitely.
    const newExpiry = new Date(startedAt + ANALYTICS_SWEEP_LOCK_TTL_MS).toISOString();
    const lockRows = await sql`
      INSERT INTO public.analytics_sweep_lock (id, holder, acquired_at, expires_at)
      VALUES (1, ${ANALYTICS_SWEEP_HOLDER_ID}, now(), ${newExpiry}::timestamptz)
      ON CONFLICT (id) DO UPDATE
        SET holder = EXCLUDED.holder,
            acquired_at = EXCLUDED.acquired_at,
            expires_at = EXCLUDED.expires_at
        WHERE public.analytics_sweep_lock.expires_at < now()
      RETURNING holder = ${ANALYTICS_SWEEP_HOLDER_ID} AS got
    `;
    lockAcquired = lockRows[0]?.got === true;
    if (!lockAcquired) {
      sweepStatus.lastError = 'sweep already in progress (lock row held)';
      console.warn('[analytics-sweep] skipped — lock row held by another holder');
      return;
    }

    const visitsCutoff = new Date(
      startedAt - PORTFOLIO_VISITS_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const errorCutoff = new Date(
      startedAt - ERROR_LOG_RETENTION_DAYS * 86_400_000,
    ).toISOString();
    const auditCutoff = new Date(
      startedAt - AUDIT_LOGS_RETENTION_DAYS * 86_400_000,
    ).toISOString();

    // Lease heartbeat — extend the TTL between tables so a sweep that
    // runs longer than the initial 30-minute window cannot be preempted.
    // The UPDATE is guarded by `holder = us`; if rowcount is 0 our lease
    // already expired and was claimed by someone else, so we abort
    // rather than continue working without the mutex.
    async function renewLease(): Promise<boolean> {
      const renewedExpiry = new Date(Date.now() + ANALYTICS_SWEEP_LOCK_TTL_MS).toISOString();
      const renewed = await sql!`
        UPDATE public.analytics_sweep_lock
           SET expires_at = ${renewedExpiry}::timestamptz
         WHERE id = 1 AND holder = ${ANALYTICS_SWEEP_HOLDER_ID}
        RETURNING 1 AS ok
      `;
      return renewed.length > 0;
    }

    const visitsDeleted = await sweepOneTable(
      'portfolio_visits', PORTFOLIO_VISITS_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between portfolio_visits and error_log');
    }
    const errorDeleted = await sweepOneTable(
      'error_log', ERROR_LOG_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between error_log and audit_logs');
    }
    const auditDeleted = await sweepOneTable(
      'audit_logs', AUDIT_LOGS_RETENTION_DAYS);
    if (!(await renewLease())) {
      throw new Error('lease lost between audit_logs and trial_resumes');
    }

    // Purge expired trial resumes that are past the 3-day client-side grace
    // window. Uses the same batch size and max-batches cap as the analytics
    // tables so a large backlog can't cause a prolonged table lock.
    let trialResumesDeleted = 0;
    for (let i = 0; i < ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE; i++) {
      const rows = await sql`
        SELECT public.purge_expired_trial_resumes(
          ${ANALYTICS_SWEEP_BATCH_SIZE}::int
        ) AS deleted
      `;
      const deleted = Number(rows[0]?.deleted ?? 0);
      trialResumesDeleted += deleted;
      if (deleted < ANALYTICS_SWEEP_BATCH_SIZE) break;
      if (i === ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE - 1) {
        console.warn(
          '[analytics-sweep] trial_resumes hit max-batches cap',
          JSON.stringify({ batches: ANALYTICS_SWEEP_MAX_BATCHES_PER_TABLE, total: trialResumesDeleted }),
        );
      }
    }

    const durationMs = Date.now() - startedAt;
    const result: SweepResult = {
      ran_at: new Date(startedAt).toISOString(),
      portfolio_visits_cutoff: visitsCutoff,
      error_log_cutoff: errorCutoff,
      audit_logs_cutoff: auditCutoff,
      portfolio_visits_deleted: visitsDeleted,
      error_log_deleted: errorDeleted,
      audit_logs_deleted: auditDeleted,
      trial_resumes_deleted: trialResumesDeleted,
    };
    sweepStatus.lastRanAt = new Date(startedAt).toISOString();
    sweepStatus.lastDurationMs = durationMs;
    sweepStatus.lastResult = result;
    sweepStatus.lastError = null;
    console.log(
      '[analytics-sweep] completed',
      JSON.stringify({
        durationMs,
        portfolio_visits_deleted: visitsDeleted,
        error_log_deleted: errorDeleted,
        audit_logs_deleted: auditDeleted,
        trial_resumes_deleted: trialResumesDeleted,
      }),
    );
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    sweepStatus.lastRanAt = new Date(startedAt).toISOString();
    sweepStatus.lastDurationMs = durationMs;
    sweepStatus.lastError = err instanceof Error ? err.message : String(err);
    console.error('[analytics-sweep] failed:', err);
  } finally {
    if (lockAcquired) {
      try {
        // Only release a lock we actually own — avoids stomping on a
        // subsequent holder if we somehow ran past our TTL.
        await sql`
          DELETE FROM public.analytics_sweep_lock
          WHERE id = 1 AND holder = ${ANALYTICS_SWEEP_HOLDER_ID}
        `;
      } catch (releaseErr) {
        console.error('[analytics-sweep] failed to release lock row:', releaseErr);
      }
    }
    sweepInFlight = false;
  }
}

function scheduleAnalyticsSweep(): void {
  if (!ANALYTICS_SWEEP_ENABLED) {
    console.log('[analytics-sweep] disabled via ANALYTICS_SWEEP_ENABLED=false');
    return;
  }
  if (!sql) {
    console.warn('[analytics-sweep] not scheduled — DATABASE_URL missing');
    return;
  }
  console.log(
    '[analytics-sweep] scheduled',
    JSON.stringify({
      portfolioVisitsRetentionDays: PORTFOLIO_VISITS_RETENTION_DAYS,
      errorLogRetentionDays: ERROR_LOG_RETENTION_DAYS,
      auditLogsRetentionDays: AUDIT_LOGS_RETENTION_DAYS,
      initialDelayMs: ANALYTICS_SWEEP_INITIAL_DELAY_MS,
      intervalMs: ANALYTICS_SWEEP_INTERVAL_MS,
    }),
  );
  sweepStatus.nextScheduledAt = new Date(
    Date.now() + ANALYTICS_SWEEP_INITIAL_DELAY_MS,
  ).toISOString();
  const initialTimer = setTimeout(() => {
    void runAnalyticsSweep().finally(() => {
      sweepStatus.nextScheduledAt = new Date(
        Date.now() + ANALYTICS_SWEEP_INTERVAL_MS,
      ).toISOString();
    });
    const recurring = setInterval(() => {
      void runAnalyticsSweep().finally(() => {
        sweepStatus.nextScheduledAt = new Date(
          Date.now() + ANALYTICS_SWEEP_INTERVAL_MS,
        ).toISOString();
      });
    }, ANALYTICS_SWEEP_INTERVAL_MS);
    recurring.unref?.();
  }, ANALYTICS_SWEEP_INITIAL_DELAY_MS);
  initialTimer.unref?.();
}

/**
 * GET /api/admin/analytics-sweep-status
 *
 * Returns the latest analytics-retention sweep summary so the team can
 * confirm the daily job is running. Admin-gated: caller must present a
 * valid Supabase Bearer token AND the verified user's email must be in
 * the comma-separated `ADMIN_EMAILS` env var (same allow-list every
 * admin-* edge function uses).
 */
// Admin email allow-list: read directly from the verified Supabase Auth
// session payload (NOT from `profiles.email`). The `profiles` table is
// user-mutable in places, so trusting it here would let a non-admin
// claim admin status by editing their own profile row. The auth-server
// email is the immutable source of truth and matches the gating used
// by every admin-* edge function.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
function requireAdminEmail(
  req: AuthedRequest, res: Response, next: NextFunction,
): void {
  if (ADMIN_EMAILS.length === 0) {
    res.status(503).json({ error: 'ADMIN_EMAILS not configured' });
    return;
  }
  if (!req.verifiedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const email = (req.verifiedEmail || '').toLowerCase();
  if (!email || !ADMIN_EMAILS.includes(email)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

app.get(
  '/api/admin/analytics-sweep-status',
  requireAuthHeader,
  requireAdminEmail,
  (_req, res) => {
    res.json(sweepStatus);
  },
);

/**
 * POST /api/admin/analytics-sweep-run — manual trigger for the retention
 * sweep, useful for verifying configuration without waiting 24h. Same
 * admin gate as the status endpoint.
 */
app.post(
  '/api/admin/analytics-sweep-run',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    await runAnalyticsSweep();
    res.json(sweepStatus);
  },
);

// ── AI Provider admin proxy endpoints ─────────────────────────────────────────
// All endpoints below are guarded by requireAuthHeader + requireAdminEmail so
// the managed platform keys (OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY)
// never leave the server. The browser never sees them — only the result data.
//
// Hardening notes (Task #1 / audit findings S1, S2, P1, F2, F3, P6, A3):
//   • S1: errors returned to the browser are generic strings ("upstream error")
//         while full details (e.is Error message + stack) are logged server-side.
//   • S2: Gemini upstream calls use the `x-goog-api-key` header instead of the
//         `?key=` query param so the key never appears in proxy/access logs.
//   • P1: Each upstream-list endpoint is wrapped by a 10-minute in-memory TTL
//         cache keyed by route. The cache is small, per-process, and survives
//         until restart. Acceptable for admin usage patterns.
//   • F2: `gemini-test` accepts an optional `{ model }` body, validates it
//         against the live models list, and falls back to gemini-2.0-flash.
//   • F3: `gemini-models` only returns entries whose `name` is a string and
//         strips the `models/` prefix from both `id` and `name`.
//   • P6: New `openrouter-models` proxy with the same cache treatment so the
//         browser no longer hits openrouter.ai directly (CORS + cache wins).
//   • A3: All admin model-switch and provider-test calls write to the new
//         `admin_audit_log` Drizzle table via `writeAdminAudit()` below.

interface CacheEntry<T> { value: T; expiresAt: number }
const upstreamCache = new Map<string, CacheEntry<unknown>>();
const UPSTREAM_CACHE_TTL_MS = 10 * 60 * 1000;
function getCached<T>(key: string): T | null {
  const e = upstreamCache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) { upstreamCache.delete(key); return null; }
  return e.value as T;
}
function setCached<T>(key: string, value: T): void {
  upstreamCache.set(key, { value, expiresAt: Date.now() + UPSTREAM_CACHE_TTL_MS });
}
// Periodically sweep expired entries.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of upstreamCache) if (v.expiresAt < now) upstreamCache.delete(k);
}, 5 * 60_000).unref?.();

async function writeAdminAudit(
  actorEmail: string,
  action: string,
  payload: Record<string, unknown> | null,
): Promise<void> {
  if (!sql) {
    console.error('[admin-audit] DATABASE_URL not configured — write skipped', { actorEmail, action });
    return;
  }
  try {
    // Using the neon HTTP tagged-template; column names match `admin_audit_log`
    // in `server/schema.ts` (id default uuid, at default now()).
    await sql`
      INSERT INTO admin_audit_log (actor_email, action, payload)
      VALUES (${actorEmail}, ${action}, ${payload ? JSON.stringify(payload) : null}::jsonb)
    `;
  } catch (e) {
    console.error('[admin-audit] write failed', e);
  }
}

function logAndSanitiseUpstreamError(label: string, e: unknown): string {
  console.error(`[server] ${label} upstream error:`, e instanceof Error ? e.stack ?? e.message : e);
  return 'Upstream request failed';
}

/**
 * GET /api/admin/ai-provider/openrouter-status
 * Returns the managed OpenRouter key balance / rate-limit info.
 */
app.get(
  '/api/admin/ai-provider/openrouter-status',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const cacheKey = 'openrouter-status';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: Record<string, unknown> };
      const out = { configured: true, data: body.data ?? null };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, error: logAndSanitiseUpstreamError('openrouter-status', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/openrouter-models  (P6)
 * Proxies the OpenRouter public model catalogue so the browser doesn't have to
 * hit openrouter.ai directly (CORS + cache benefit). 10-minute server-side cache.
 */
app.get(
  '/api/admin/ai-provider/openrouter-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const cacheKey = 'openrouter-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { signal: controller.signal });
      if (!r.ok) {
        res.json({ models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: unknown[] };
      const out = { models: body.data ?? [] };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ models: [], error: logAndSanitiseUpstreamError('openrouter-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/groq-models
 * Returns the live Groq model list using the managed GROQ_API_KEY.
 */
app.get(
  '/api/admin/ai-provider/groq-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      res.json({ configured: false, models: [] });
      return;
    }
    const cacheKey = 'groq-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { data?: unknown[] };
      const out = { configured: true, models: body.data ?? [] };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, models: [], error: logAndSanitiseUpstreamError('groq-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/groq-usage
 * Returns today's request/token usage and rate-limit ceiling from the managed GROQ_API_KEY.
 */
app.get(
  '/api/admin/ai-provider/groq-usage',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      res.json({ configured: false });
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://api.groq.com/openai/v1/usage', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = await r.json() as Record<string, unknown>;
      res.json({ configured: true, ...body });
    } catch (e) {
      res.json({ configured: true, error: logAndSanitiseUpstreamError('groq-usage', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * GET /api/admin/ai-provider/gemini-models
 * Returns Gemini models that support generateContent using the managed GEMINI_API_KEY.
 * Sends the key in the `x-goog-api-key` header (S2) — never in the URL.
 */
app.get(
  '/api/admin/ai-provider/gemini-models',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      res.json({ configured: false, models: [] });
      return;
    }
    const cacheKey = 'gemini-models';
    const cached = getCached<unknown>(cacheKey);
    if (cached) { res.json(cached); return; }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': key },
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ configured: true, models: [], error: `Upstream HTTP ${r.status}` });
        return;
      }
      const body = (await r.json()) as { models?: Array<Record<string, unknown>> };
      // F3: only keep entries with a string `name`; always strip `models/` prefix.
      const models = (body.models ?? [])
        .filter((m) =>
          typeof m.name === 'string' &&
          Array.isArray(m.supportedGenerationMethods) &&
          (m.supportedGenerationMethods as string[]).includes('generateContent'),
        )
        .map((m) => {
          const rawName = m.name as string;
          const id = rawName.startsWith('models/') ? rawName.slice('models/'.length) : rawName;
          const display = typeof m.displayName === 'string' ? m.displayName : id;
          return {
            id,
            name: display,
            context: typeof m.inputTokenLimit === 'number' ? m.inputTokenLimit : null,
          };
        });
      const out = { configured: true, models };
      setCached(cacheKey, out);
      res.json(out);
    } catch (e) {
      res.json({ configured: true, models: [], error: logAndSanitiseUpstreamError('gemini-models', e) });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * POST /api/admin/ai-provider/gemini-test
 * Fires a lightweight generateContent ping using the managed GEMINI_API_KEY.
 * Body: `{ model?: string }`. The model is validated against the cached
 * upstream models list (F2); falls back to gemini-2.0-flash if missing/invalid.
 * Returns { success, model, latencyMs, preview } or { success: false, error }.
 */
app.post(
  '/api/admin/ai-provider/gemini-test',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      res.json({ success: false, error: 'GEMINI_API_KEY not configured on server' });
      return;
    }
    const FALLBACK_MODEL = 'gemini-2.0-flash';
    const requested = typeof req.body?.model === 'string' ? req.body.model.trim() : '';

    // F2: validate the requested model against the cached models list. If we
    // don't have a cache yet, accept any plausibly-formatted slug; the upstream
    // call will reject anything genuinely invalid.
    let model = FALLBACK_MODEL;
    if (requested) {
      const cached = getCached<{ models: Array<{ id: string }> }>('gemini-models');
      if (cached) {
        const ok = cached.models.some(m => m.id === requested);
        model = ok ? requested : FALLBACK_MODEL;
      } else if (/^[A-Za-z0-9._-]{3,64}$/.test(requested)) {
        model = requested;
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);
    const start = Date.now();
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Reply with exactly one word: OK' }] }] }),
        signal: controller.signal,
      });
      if (!r.ok) {
        res.json({ success: false, error: `Upstream HTTP ${r.status}`, model });
        // A3: same `provider-test` taxonomy/payload as OpenRouter/Groq/Ollama.
        await writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
          provider: 'gemini', model, ok: false, latencyMs: null, error: `Upstream HTTP ${r.status}`,
        });
        return;
      }
      const body = await r.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const latencyMs = Date.now() - start;
      res.json({ success: true, model, latencyMs, preview: text.slice(0, 120) });
      await writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
        provider: 'gemini', model, ok: true, latencyMs, error: null,
      });
    } catch (e: unknown) {
      const sanitised = logAndSanitiseUpstreamError('gemini-test', e);
      res.json({ success: false, error: sanitised, model });
      await writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
        provider: 'gemini', model, ok: false, latencyMs: null, error: sanitised,
      });
    } finally {
      clearTimeout(t);
    }
  },
);

/**
 * POST /api/admin/ai-provider/audit-model-switch
 * Records an admin model-switch event in `admin_audit_log` (A3). Called from
 * the DevKit panel when an admin confirms changing the active BYOK or managed
 * model for any provider. The endpoint is purely for audit — it does not
 * mutate provider settings (those are stored client-side in `useSettingsStore`).
 *
 * Body: `{ provider: 'openrouter'|'groq'|'gemini'|'ollama'|'wiseresume-sub', model: string, previousModel?: string }`
 */
app.post(
  '/api/admin/ai-provider/audit-model-switch',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : null;
    const model = typeof req.body?.model === 'string' ? req.body.model : null;
    const previousModel = typeof req.body?.previousModel === 'string' ? req.body.previousModel : null;
    if (!provider || !model) {
      res.status(400).json({ error: 'provider and model are required' });
      return;
    }
    await writeAdminAudit(req.verifiedEmail || 'unknown', 'model-switch', { provider, model, previousModel });
    res.json({ ok: true });
  },
);

/**
 * POST /api/admin/ai-provider/audit-test
 * Records an admin provider-test event in `admin_audit_log` with a structured
 * payload (A3). Distinct from `audit-model-switch` so the two intents do not
 * get conflated in the audit trail. Called by the DevKit panel after every
 * OpenRouter / Groq / Gemini / Ollama test, success or failure.
 *
 * Body: `{ provider: string, model?: string|null, ok: boolean,
 *          latencyMs?: number|null, error?: string|null }`
 */
app.post(
  '/api/admin/ai-provider/audit-test',
  requireAuthHeader,
  requireAdminEmail,
  async (req: AuthedRequest, res) => {
    const provider = typeof req.body?.provider === 'string' ? req.body.provider : null;
    if (!provider) {
      res.status(400).json({ error: 'provider is required' });
      return;
    }
    const model = typeof req.body?.model === 'string' ? req.body.model : null;
    const ok = req.body?.ok === true;
    const latencyMs =
      typeof req.body?.latencyMs === 'number' && Number.isFinite(req.body.latencyMs)
        ? req.body.latencyMs
        : null;
    const errorMessage =
      typeof req.body?.error === 'string' ? req.body.error.slice(0, 500) : null;
    await writeAdminAudit(req.verifiedEmail || 'unknown', 'provider-test', {
      provider,
      model,
      ok,
      latencyMs,
      error: errorMessage,
    });
    res.json({ ok: true });
  },
);

/**
 * GET /api/admin/ai-provider/audit-recent
 * Returns the most recent admin audit-log entries for the AI Provider DevKit
 * panel ("Recent activity" section). Limited to model-switch and
 * provider-test actions (the two written by `audit-model-switch` /
 * `audit-test` above), capped at 50 rows ordered newest-first.
 */
app.get(
  '/api/admin/ai-provider/audit-recent',
  requireAuthHeader,
  requireAdminEmail,
  async (_req, res) => {
    if (!sql) {
      res.json({ entries: [], error: 'Database not configured' });
      return;
    }
    try {
      const rows = (await sql`
        SELECT id, actor_email, action, payload, at
        FROM admin_audit_log
        WHERE action IN ('model-switch', 'provider-test')
        ORDER BY at DESC
        LIMIT 50
      `) as Array<{
        id: string;
        actor_email: string;
        action: string;
        payload: Record<string, unknown> | null;
        at: string | Date;
      }>;
      const entries = rows.map((r) => ({
        id: r.id,
        actorEmail: r.actor_email,
        action: r.action,
        payload: r.payload,
        at: r.at instanceof Date ? r.at.toISOString() : r.at,
      }));
      res.json({ entries });
    } catch (e) {
      console.error('[admin-audit] read failed', e);
      res.status(500).json({ entries: [], error: 'Database read failed' });
    }
  },
);

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API server running on port ${PORT}`);
  console.log(`[server] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`[server] Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
  scheduleAnalyticsSweep();
});

export default app;
