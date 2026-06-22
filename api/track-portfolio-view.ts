import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases } from 'node-appwrite';

// Vercel serverless target for navigator.sendBeacon portfolio-visit analytics
// (PORT-P2-10). Mirrors the validated logic previously only present in
// server/index.ts (which is NOT deployed on Vercel), so the /api/track-portfolio-view
// route actually exists in production instead of 404-ing and silently dropping
// analytics. Writes are performed server-side with the Appwrite API key; the
// client never writes directly. No raw IP or other visitor PII is stored.

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const VISITS_COLLECTION = 'portfolio_visits';

// Allowlists / clamps mirror server/index.ts exactly.
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const VALID_DEVICES = new Set(['desktop', 'mobile', 'tablet']);
const VALID_AB_VARIANTS = new Set<string | null>(['a', 'b', null]);
const VALID_SECTION_NAMES = new Set([
  'experience', 'education', 'skills', 'projects', 'github',
  'certifications', 'awards', 'publications', 'volunteering',
  'case-studies', 'services',
]);
const MAX_SECONDS = 86400;

// Per-IP in-memory throttle (best-effort; per-instance, like the other api/ routes).
const TRACK_RATE_LIMIT = 10;
const TRACK_RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function getDb() {
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  return new Databases(client);
}

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
}

// IP is used ONLY as an in-memory rate-limit key — it is never stored or logged.
function getClientIp(req: VercelRequest): string {
  const cfIp = typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'].trim() : '';
  if (cfIp) return cfIp;
  const realIp = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '';
  if (realIp) return realIp;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + TRACK_RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= TRACK_RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function clampSeconds(value: unknown): number {
  return typeof value === 'number' ? Math.max(0, Math.min(Math.round(value), MAX_SECONDS)) : 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This is a fire-and-forget sendBeacon target. Respond opaquely with 204 for
  // accepted AND no-op cases (bad payload, rate-limited, misconfig) so the
  // endpoint can't be probed and never blocks the caller; only reject non-POST.
  if (req.method !== 'POST') {
    return res.status(405).end();
  }
  if (!PROJECT_ID || !API_KEY) {
    return res.status(204).end();
  }

  if (!checkRateLimit(getClientIp(req))) {
    return res.status(204).end();
  }

  const body = parseBody(req);

  // Allowlist: accept only the fields the frontend actually sends.
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!username || !USERNAME_PATTERN.test(username)) {
    return res.status(204).end();
  }

  const ref = typeof body.ref === 'string' ? body.ref.slice(0, 200) : null;
  const timeSpentSeconds = clampSeconds(body.time_spent_seconds);
  const device = VALID_DEVICES.has(String(body.device)) ? String(body.device) : 'desktop';
  const abVariant = VALID_AB_VARIANTS.has(body.ab_variant as string | null)
    ? (body.ab_variant as string | null)
    : null;

  const rawSections = Array.isArray(body.sections_viewed) ? body.sections_viewed : [];
  const sectionsViewed = rawSections
    .filter((s): s is string => typeof s === 'string' && VALID_SECTION_NAMES.has(s))
    .slice(0, 20);

  // sections_timing is a JSON-encoded object { sectionName: durationSeconds }.
  let sectionsTiming: string | null = null;
  if (typeof body.sections_timing === 'string') {
    try {
      const parsed = JSON.parse(body.sections_timing) as Record<string, unknown>;
      const safe: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (VALID_SECTION_NAMES.has(k) && typeof v === 'number') {
          safe[k] = Math.max(0, Math.min(Math.round(v), MAX_SECONDS));
        }
      }
      sectionsTiming = JSON.stringify(safe);
    } catch {
      /* ignore malformed timing */
    }
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
    await getDb().createDocument(DATABASE_ID, VISITS_COLLECTION, 'unique()', data);
  } catch (error) {
    // Best-effort — never block the beacon. Log a sanitized marker only
    // (Appwrite error code / message, no username, no IP, no payload).
    const code = (error as { code?: number; type?: string })?.code ?? 'unknown';
    console.error(`[track-portfolio-view] visit write failed (code: ${code})`);
  }
  return res.status(204).end();
}
