import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases, Query, Permission, Role, ID } from 'node-appwrite';
import { createHash } from 'crypto';

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID ||
  process.env.VITE_APPWRITE_PROJECT_ID ||
  process.env.APPWRITE_FUNCTION_PROJECT_ID ||
  '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DATABASE_ID = 'main';
const INTERACTIONS_COLLECTION = 'portfolio_interactions';
const PROFILES_COLLECTION = 'profiles';
const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;
const TOKEN_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getClientIp(req: VercelRequest): string {
  const cfIp = typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'].trim() : '';
  if (cfIp) return cfIp;
  const realIp = typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'].trim() : '';
  if (realIp) return realIp;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

const RATE_LIMIT_COLLECTION = 'portfolio_session_rate_limits';
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_LIMIT = 5;

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function checkRateLimit(db: Databases, ip: string): Promise<boolean> {
  if (!ip || ip === 'unknown') return true;
  const ipHash = sha256(ip + ':interest').slice(0, 32);
  try {
    let doc;
    try {
      doc = await db.getDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, ipHash);
    } catch (e: unknown) {
      const err = e as { code?: number; message?: string };
      if (err.code === 404 || /could not be found/i.test(err.message || '')) {
        doc = null;
      } else {
        throw e;
      }
    }
    const now = Date.now();
    if (!doc || now > new Date(doc.reset_at).getTime()) {
      const resetAt = new Date(now + WINDOW_MS).toISOString();
      if (!doc) {
        await db.createDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, ipHash, {
          count: 1,
          reset_at: resetAt,
        });
      } else {
        await db.updateDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, ipHash, {
          count: 1,
          reset_at: resetAt,
        });
      }
      return true;
    }
    const count = Number(doc.count || 0);
    if (count >= MAX_LIMIT) {
      return false;
    }
    await db.updateDocument(DATABASE_ID, RATE_LIMIT_COLLECTION, ipHash, {
      count: count + 1,
    });
    return true;
  } catch (err) {
    console.error('[interest] Rate limit check failed. Failing closed:', err);
    return false;
  }
}

function safeReferrerHostname(referrer: unknown): string | null {
  if (typeof referrer !== 'string' || !referrer.trim()) return null;
  try {
    return new URL(referrer).hostname.slice(0, 200);
  } catch {
    return null;
  }
}

async function getPortfolioOwnerUserId(db: Databases, username: string): Promise<string | null> {
  const res = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', username),
    Query.equal('portfolio_enabled', true),
    Query.limit(1),
  ]);
  return (res.documents?.[0]?.user_id as string) ?? null;
}

async function createOwnerNotification(
  db: Databases,
  { user_id, type, title, message, link }: { user_id: string; type: string; title: string; message: string; link?: string }
): Promise<void> {
  const baseData = { user_id, type, title, message, is_read: false };
  const permissions = [
    Permission.read(Role.user(user_id)),
    Permission.update(Role.user(user_id)),
    Permission.delete(Role.user(user_id))
  ];
  try {
    await db.createDocument(DATABASE_ID, 'notifications', ID.unique(), link ? { ...baseData, link } : baseData, permissions);
  } catch (e) {
    // ignore
  }
}

async function tokenAlreadyUsed(db: Databases, token: string): Promise<boolean> {
  const res = await db.listDocuments(DATABASE_ID, INTERACTIONS_COLLECTION, [
    Query.equal('token', token),
    Query.limit(1),
  ]);
  return (res.documents?.length ?? 0) > 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!PROJECT_ID || !API_KEY) {
    return res.status(500).json({ error: 'config_error', message: 'Portfolio interest API is not configured.' });
  }

  const db = getDb();

  const ip = getClientIp(req);
  if (!(await checkRateLimit(db, ip))) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const body = parseBody(req);
  const username = asString(body.username).toLowerCase();
  const token = asString(body.token);

  if (!username || !USERNAME_PATTERN.test(username)) {
    return res.status(400).json({ error: 'bad_request', message: 'Missing username' });
  }
  if (!token || !TOKEN_PATTERN.test(token)) {
    return res.status(400).json({ error: 'bad_request', message: 'Invalid token' });
  }

  try {
    const ownerUserId = await getPortfolioOwnerUserId(db, username);
    if (!ownerUserId) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (await tokenAlreadyUsed(db, token)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    const data: Record<string, string> = {
      token,
      portfolio_username: username,
      interaction_type: 'interested',
    };
    const referrerHostname = safeReferrerHostname(body.referrer);
    if (referrerHostname) data.referrer_hostname = referrerHostname;

    await db.createDocument(DATABASE_ID, INTERACTIONS_COLLECTION, ID.unique(), data);

    await createOwnerNotification(db, {
      user_id: ownerUserId,
      type: 'portfolio_interest',
      title: 'New portfolio interest',
      message: 'Someone showed interest in your portfolio.',
      link: '/notifications',
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Interest request failed.';
    if (/unique|duplicate|already exists/i.test(message)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    return res.status(500).json({ error: 'server_error', message });
  }
}
