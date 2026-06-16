import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client, Databases, Query } from 'node-appwrite';

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

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

function safeReferrerHostname(referrer: unknown): string | null {
  if (typeof referrer !== 'string' || !referrer.trim()) return null;
  try {
    return new URL(referrer).hostname.slice(0, 200);
  } catch {
    return null;
  }
}

async function portfolioExists(db: Databases, username: string): Promise<boolean> {
  const res = await db.listDocuments(DATABASE_ID, PROFILES_COLLECTION, [
    Query.equal('username', username),
    Query.equal('portfolio_enabled', true),
    Query.limit(1),
  ]);
  return (res.documents?.length ?? 0) > 0;
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

  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
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

  const db = getDb();

  try {
    if (!(await portfolioExists(db, username))) {
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

    await db.createDocument(DATABASE_ID, INTERACTIONS_COLLECTION, 'unique()', data);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Interest request failed.';
    if (/unique|duplicate|already exists/i.test(message)) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    return res.status(500).json({ error: 'server_error', message });
  }
}
