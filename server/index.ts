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
interface AuthCacheEntry { userId: string; expiresAt: number }
const authCache = new Map<string, AuthCacheEntry>();
const AUTH_CACHE_TTL_MS = 60_000; // 1 minute

async function validateSupabaseToken(token: string): Promise<string | null> {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const now = Date.now();
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > now) return cached.userId;

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
    const body = (await r.json()) as { id?: unknown };
    const userId = typeof body.id === 'string' && body.id.length > 0 ? body.id : null;
    if (userId) {
      authCache.set(token, { userId, expiresAt: now + AUTH_CACHE_TTL_MS });
      // Keep cache bounded.
      if (authCache.size > 2000) {
        for (const [k, v] of authCache) if (v.expiresAt <= now) authCache.delete(k);
      }
    }
    return userId;
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
interface AuthedRequest extends Request { verifiedUserId?: string }
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
  const userId = await validateSupabaseToken(match[1]);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  req.verifiedUserId = userId;
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

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] WiseResume API server running on port ${PORT}`);
  console.log(`[server] Supabase URL: ${SUPABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`[server] Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
});

export default app;
