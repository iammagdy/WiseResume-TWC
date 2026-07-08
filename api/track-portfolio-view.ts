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
async function createVisitNotification(db: Databases, ownerUserId: string, correlationId: string = ''): Promise<void> {
  const baseData = {
    user_id: ownerUserId,
    type: 'portfolio_visit',
    title: 'New portfolio visit',
    message: 'Someone viewed your public portfolio.',
    is_read: false,
  };
  const permissions = [
    Permission.read(Role.user(ownerUserId)),
    Permission.update(Role.user(ownerUserId)),
    Permission.delete(Role.user(ownerUserId)),
  ];
  try {
    const doc = await db.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), {
      ...baseData,
      link: '/notifications',
    }, permissions);
    console.log(`[track-portfolio-view] [${correlationId}] Visit notification created: ${doc.$id} for owner: ${ownerUserId}`);
    return;
  } catch (e) {
    const err = e as { code?: number; message?: string };
    const isUnknownAttr = err?.code === 400 &&
      /unknown attribute|invalid attribute/i.test(err?.message ?? '');
    if (!isUnknownAttr) {
      console.error(`[track-portfolio-view] [${correlationId}] notification write failed (code: ${err?.code ?? 'unknown'}, message: ${err?.message})`);
      return;
    }
    console.warn(`[track-portfolio-view] [${correlationId}] link attribute absent from notifications schema — retrying without link`);
  }
  try {
    const doc = await db.createDocument(DATABASE_ID, NOTIFICATIONS_COLLECTION, ID.unique(), baseData, permissions);
    console.log(`[track-portfolio-view] [${correlationId}] Visit notification created (no-link retry): ${doc.$id} for owner: ${ownerUserId}`);
  } catch (e) {
    const code = (e as { code?: number; message?: string })?.code ?? 'unknown';
    const msg = (e as { message?: string })?.message ?? '';
    console.error(`[track-portfolio-view] [${correlationId}] notification write failed no-link retry (code: ${code}, message: ${msg})`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const body = parseBody(req);
  const correlationId = typeof body.correlationId === 'string' ? body.correlationId : '';
  const action = typeof body.action === 'string' ? body.action : 'visit_start';
  const visitDocId = typeof body.visitDocId === 'string' ? body.visitDocId : '';

  const hasApiKey = !!API_KEY;
  const hasProjId = !!PROJECT_ID;
  console.log(`[track-portfolio-view] [${correlationId}] Received request. Action: ${action}, hasApiKey: ${hasApiKey}, projectIdPresent: ${hasProjId}`);

  if (!PROJECT_ID || !API_KEY) {
    console.warn(`[track-portfolio-view] [${correlationId}] Missing credentials`);
    return res.status(204).end();
  }

  if (!checkRateLimit(getClientIp(req))) {
    console.warn(`[track-portfolio-view] [${correlationId}] Rate limited`);
    return res.status(204).end();
  }

  // Allowlist: accept only the fields the frontend actually sends.
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  if (!username || !USERNAME_PATTERN.test(username)) {
    console.warn(`[track-portfolio-view] [${correlationId}] Invalid username: ${username}`);
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

  const db = getDb();

  // If action is visit_end, update the existing document
  if (action === 'visit_end') {
    if (!visitDocId) {
      console.warn(`[track-portfolio-view] [${correlationId}] Missing visitDocId for visit_end`);
      return res.status(400).end();
    }
    console.log(`[track-portfolio-view] [${correlationId}] Updating visit document: ${visitDocId}`);
    try {
      const existingDoc = await db.getDocument(DATABASE_ID, VISITS_COLLECTION, visitDocId);
      if (!existingDoc || existingDoc.username !== username) {
        console.warn(`[track-portfolio-view] [${correlationId}] Mismatch or missing document. Document username: ${existingDoc?.username || 'none'}, Request username: ${username}`);
        return res.status(400).end();
      }
      await db.updateDocument(DATABASE_ID, VISITS_COLLECTION, visitDocId, {
        time_spent_seconds: timeSpentSeconds,
        sections_viewed: sectionsViewed,
        sections_timing: sectionsTiming,
      });
      console.log(`[track-portfolio-view] [${correlationId}] Visit document updated successfully`);
    } catch (err) {
      const code = (err as { code?: number; type?: string })?.code ?? 'unknown';
      console.error(`[track-portfolio-view] [${correlationId}] Visit update failed. Code: ${code}`);
      return res.status(400).end();
    }
    return res.status(204).end();
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

  let ownerUserId = '';
  try {
    const profilesRes = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
      Query.equal('username', username),
      Query.limit(1),
    ]);
    if (profilesRes.total > 0) {
      ownerUserId = String(profilesRes.documents[0].user_id ?? '');
    }
    console.log(`[track-portfolio-view] [${correlationId}] Resolved ownerUserId: ${ownerUserId} for username: ${username}`);
  } catch (err) {
    console.warn(`[track-portfolio-view] [${correlationId}] Profile lookup failed:`, err);
  }

  const permissions = ownerUserId
    ? [Permission.read(Role.user(ownerUserId))]
    : undefined;

  let docId = '';
  try {
    const doc = await db.createDocument(DATABASE_ID, VISITS_COLLECTION, ID.unique(), data, permissions);
    docId = doc.$id;
    console.log(`[track-portfolio-view] [${correlationId}] Visit document created: ${docId}, permissions: ${JSON.stringify(permissions)}`);
  } catch (error) {
    const code = (error as { code?: number; type?: string })?.code ?? 'unknown';
    console.error(`[track-portfolio-view] [${correlationId}] visit write failed (code: ${code})`);
    return res.status(204).end();
  }

  if (ownerUserId) {
    await createVisitNotification(db, ownerUserId, correlationId);
  }

  return res.status(200).json({ visitDocId: docId });
}
