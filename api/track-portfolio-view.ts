import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases, Query, ID, Permission, Role } from 'node-appwrite';

// Vercel serverless target for navigator.sendBeacon portfolio-visit analytics
// (PORT-P2-10). Mirrors the validated logic previously only present in
// server/index.ts (which is NOT deployed on Vercel), so the /api/track-portfolio-view
// route actually exists in production instead of 404-ing and silently dropping
// analytics. Writes are performed server-side with the Appwrite API key; the
// client never writes directly. No raw IP or other visitor PII is stored.
//
// PORT-NOTIF-06: after a successful visit write the endpoint also creates an
// owner notification in the `notifications` collection. The visit document is
// written with a document-level read permission (Permission.read(Role.user(...)))
// so the owner can read it via the frontend Appwrite SDK without broadening
// collection-level permissions.
//
// Visit timing note: the beacon fires on visibilitychange / pagehide / unmount,
// NOT on page load. Owners will see visit notifications after the visitor hides
// or closes the portfolio tab — this is correct and expected behavior.

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const VISITS_COLLECTION = 'portfolio_visits';
const PROFILES_COLLECTION = 'profiles';
const NOTIFICATIONS_COLLECTION = 'notifications';

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

// PORT-NOTIF-07: owner notification helper.
// First attempt includes `link`; if Appwrite returns Unknown attribute (link not
// in live schema), retries without it so the notification is never lost entirely.
async function createVisitNotification(db: Databases, ownerUserId: string): Promise<void> {
  const baseData = {
    user_id: ownerUserId,
    type: 'portfolio_visit',
    title: 'New portfolio visit',
    message: 'Someone viewed your public portfolio.',
    is_read: false,
  };
  try {
    await db.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
      ...baseData,
      link: '/notifications',
    });
    return;
  } catch (e) {
    const err = e as { code?: number; message?: string };
    const isUnknownAttr = err?.code === 400 &&
      /unknown attribute|invalid attribute/i.test(err?.message ?? '');
    if (!isUnknownAttr) {
      console.error(`[track-portfolio-view] notification write failed (code: ${err?.code ?? 'unknown'})`);
      return;
    }
    console.warn('[track-portfolio-view] link attribute absent from notifications schema — retrying without link');
  }
  try {
    await db.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), baseData);
  } catch (e) {
    const code = (e as { code?: number })?.code ?? 'unknown';
    console.error(`[track-portfolio-view] notification write failed no-link retry (code: ${code})`);
  }
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

  const db = getDb();

  // PORT-NOTIF-08: resolve owner BEFORE writing the visit so we can set
  // document-level read permission at write time (owner-only, not read:any).
  // If the profile lookup fails, we proceed without an owner-level permission
  // override and skip the notification — the visit record is still preserved.
  let ownerUserId = '';
  try {
    const profilesRes = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
      Query.equal('username', username),
      Query.limit(1),
    ]);
    if (profilesRes.total > 0) {
      ownerUserId = String(profilesRes.documents[0].user_id ?? '');
    }
  } catch {
    // Best-effort — never block the beacon on a profile lookup failure.
    // ownerUserId remains '' and visit is written without permission override.
  }

  // Write the visit document.
  // If ownerUserId is known, set document-level read permission so the owner
  // can read their visits via the frontend Appwrite SDK session.
  // The server API key can always read/write regardless of document permissions.
  const permissions = ownerUserId
    ? [Permission.read(Role.user(ownerUserId))]
    : undefined;

  try {
    await db.createDocument(DATABASE_ID, VISITS_COLLECTION, ID.unique(), data, permissions);
  } catch (error) {
    // Best-effort — never block the beacon. Log a sanitized marker only
    // (Appwrite error code / message, no username, no IP, no payload).
    const code = (error as { code?: number; type?: string })?.code ?? 'unknown';
    console.error(`[track-portfolio-view] visit write failed (code: ${code})`);
    // Visit failed — do not create a notification without a visit record.
    return res.status(204).end();
  }

  // Visit succeeded — create owner notification (best-effort, awaited before response
  // to avoid serverless freeze after res.end()).
  if (ownerUserId) {
    await createVisitNotification(db, ownerUserId);
  }

  return res.status(204).end();
}
