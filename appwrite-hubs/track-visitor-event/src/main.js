'use strict';

/**
 * track-visitor-event
 *
 * Server-side ingestion for visitor analytics (DevKit Growth / Visitors).
 *
 * Why this exists (B10): the frontend previously wrote visitor_events directly
 * from the browser with the public SDK. Unauthenticated visitors have no
 * Appwrite session and the collection does not grant guest create, so every
 * write was silently rejected and the Growth/Visitors tabs were always empty.
 * This function accepts the event(s), bot-guards them, and writes via the
 * server API key — so no guest write permission on the collection is required.
 *
 * Deploy / config (manual, not performed by code):
 *   - Set this function's Execute permission to `any` (guests must be able to
 *     call it) — the bot guard + sanitisation below are the abuse controls.
 *   - Set the function variable APPWRITE_API_KEY to a key with
 *     databases.documents.write on the `main` database.
 *   - Optionally run scripts/setup_visitor_events_schema.cjs to add the
 *     `referrer` and `os` attributes (the function strips them and retries if
 *     they are absent, so it never fails closed).
 *
 * Request body: { events: VisitorEvent[], userAgent?: string } or a single
 * VisitorEvent object. { action: 'warmup' } is a no-op keep-warm ping.
 */

const sdk = require('node-appwrite');
const crypto = require('crypto');

const DB_ID = 'main';
const VISITOR_EVENTS_ID = 'visitor_events';
const VISITOR_IDENTITY_LINKS_ID = 'visitor_identity_links';
const ENDPOINT =
  process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID =
  process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const IDENTITY_SECRET = process.env.ANALYTICS_IDENTITY_SECRET || '';

const MAX_EVENTS_PER_REQUEST = 20;
const ALLOWED_EVENT_TYPES = new Set(['page_view', 'click', 'section_view', 'feature_use', 'session_end', 'perf']);
const BOT_UA =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|gtmetrix|uptimerobot|monitor|datadog|scrap|curl|wget|python-requests|axios\//i;
// Optional attributes that may not exist on the collection yet. The write
// strips these and retries on an unknown-attribute error so ingestion never
// fails just because the schema has not been extended.
const OPTIONAL_FIELDS = ['referrer', 'os', 'duration_ms', 'label', 'utm_source', 'utm_medium', 'utm_campaign', 'is_returning', 'consent_state', 'occurred_at', 'is_internal', 'is_bot', 'identity_version'];

// ── Server-side country resolution ──────────────────────────────────────────
// Appwrite injects x-appwrite-country-code and x-appwrite-client-ip headers.
// We use the country code directly; if missing, fall back to geo lookup via IP.
let _serverCountry = { ip: null, country: null, ts: 0 };
const SERVER_COUNTRY_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function resolveCountryServerSide(headers) {
  // Appwrite provides country code directly — no external API call needed
  const appwriteCountry = headers['x-appwrite-country-code'];
  if (appwriteCountry && /^[A-Z]{2}$/.test(appwriteCountry)) {
    return appwriteCountry;
  }

  // Fallback: resolve from client IP via geo API
  const ip = headers['x-appwrite-client-ip']
    || String((headers['x-forwarded-for'] || headers['x-real-ip']) || '')
      .split(',')[0].trim();
  if (!ip || ip === '::1' || ip === '127.0.0.1') return null;

  const now = Date.now();
  if (_serverCountry.ip === ip && _serverCountry.country && (now - _serverCountry.ts) < SERVER_COUNTRY_TTL_MS) {
    return _serverCountry.country;
  }

  try {
    const https = require('https');
    const resp = await new Promise((resolve, reject) => {
      const req = https.get(`https://get.geojs.io/v1/ip/country/${ip}.json`, { timeout: 3000 }, (r) => {
        let body = '';
        r.on('data', (chunk) => { body += chunk; });
        r.on('end', () => {
          try { resolve(JSON.parse(body)); } catch { resolve(null); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    const code = resp && resp.country;
    if (code && /^[A-Z]{2}$/.test(code)) {
      _serverCountry = { ip, country: code, ts: now };
      return code;
    }
  } catch { /* best-effort */ }
  return null;
}

// ── Rate limiting ───────────────────────────────────────────────────────────
// In-memory, per-runtime throttle keyed by session_id / anon_id / forwarded IP.
// Deliberately NOT a per-call DB read+write: this is a high-volume analytics
// ingestion path, and adding a durable round-trip to every page view would be a
// real latency/cost regression. Combined with Appwrite's platform per-execution
// limits, the 20-event cap, the bot guard, and payload validation, this is
// sufficient abuse control for an endpoint with no destructive capability and no
// secret exposure. Serverless caveat: each warm container keeps its own buckets,
// so a flood spread across many cold instances is only partially throttled. If
// stronger cross-instance guarantees are ever required, swap _rlBuckets for a
// durable `visitor_rate_limits` collection (server-side write via the API key).
const RL_WINDOW_MS = 60_000;
const RL_MAX_PER_WINDOW = 30; // a normal visitor flushes ~6x/min; 30 blocks floods
const RL_MAX_KEYS = 5000; // bound memory
const _rlBuckets = new Map(); // key -> { count, windowStart }

function rateLimitKey(body, headers) {
  const ev = Array.isArray(body.events) && body.events.length ? body.events[0] : body;
  const ip = String((headers && (headers['x-forwarded-for'] || headers['x-real-ip'])) || '')
    .split(',')[0]
    .trim();
  const raw = String((ev && (ev.session_id || ev.anon_id)) || ip || 'anon');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function isRateLimited(key) {
  const now = Date.now();
  if (_rlBuckets.size > RL_MAX_KEYS) {
    for (const [k, b] of _rlBuckets) {
      if (now - b.windowStart > RL_WINDOW_MS) _rlBuckets.delete(k);
    }
  }
  const bucket = _rlBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RL_WINDOW_MS) {
    _rlBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  if (bucket.count >= RL_MAX_PER_WINDOW) return true;
  bucket.count += 1;
  return false;
}

function getDatabases() {
  return new sdk.Databases(
    new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
  );
}

function parseBody(req) {
  if (req && typeof req.body !== 'string') {
    return req && req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = (req && req.body ? req.body : '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function str(value, max) {
  return typeof value === 'string' && value ? value.slice(0, max) : undefined;
}

function sanitize(ev) {
  if (!ev || typeof ev !== 'object') return null;
  const type = String(ev.event_type || '');
  if (!ALLOWED_EVENT_TYPES.has(type)) return null;
  // Defense-in-depth: skip /devkit routes at ingestion level
  const page = str(ev.page, 512);
  if (page && page.startsWith('/devkit')) return null;
  const doc = {
    event_type: type,
    session_id: str(ev.session_id, 64),
    anon_id: str(ev.anon_id, 64),
    user_id: str(ev.user_id, 64),
    page,
    target: str(ev.target, 128),
    section: str(ev.section, 128),
    country: str(ev.country, 8),
    device_type: str(ev.device_type, 16),
    browser: str(ev.browser, 32),
    referrer: str(ev.referrer, 512),
    os: str(ev.os, 32),
    duration_ms: typeof ev.duration_ms === 'number' ? Math.min(Math.max(0, Math.round(ev.duration_ms)), 86400000) : undefined,
    label: str(ev.label, 512),
    utm_source: str(ev.utm_source, 128),
    utm_medium: str(ev.utm_medium, 64),
    utm_campaign: str(ev.utm_campaign, 128),
    is_returning: typeof ev.is_returning === 'boolean' ? ev.is_returning : undefined,
    consent_state: ['pending', 'granted', 'rejected'].includes(ev.consent_state) ? ev.consent_state : undefined,
    occurred_at: str(ev.occurred_at, 32),
    is_internal: typeof ev.is_internal === 'boolean' ? ev.is_internal : undefined,
    is_bot: typeof ev.is_bot === 'boolean' ? ev.is_bot : undefined,
    identity_version: str(ev.identity_version, 16),
  };
  for (const key of Object.keys(doc)) {
    if (doc[key] === undefined) delete doc[key];
  }
  return doc;
}

function hashAnonId(anonId, secret = IDENTITY_SECRET) {
  if (!anonId || !secret) return null;
  return crypto.createHmac('sha256', secret).update(String(anonId)).digest('hex');
}

async function linkIdentity(databases, doc) {
  if (!doc.user_id || !doc.anon_id) return;
  const anonHash = hashAnonId(doc.anon_id);
  if (!anonHash) return;
  const documentId = anonHash.slice(0, 36);
  const payload = {
    anon_id_hash: anonHash,
    user_id: doc.user_id,
    linked_at: new Date().toISOString(),
    consent_state: doc.consent_state || 'pending',
    identity_version: doc.identity_version || 'v2',
  };
  try {
    await databases.createDocument(DB_ID, VISITOR_IDENTITY_LINKS_ID, documentId, payload);
  } catch (e) {
    if (e && e.code === 409) await databases.updateDocument(DB_ID, VISITOR_IDENTITY_LINKS_ID, documentId, payload);
  }
}

async function writeEvent(databases, doc) {
  try {
    await databases.createDocument(DB_ID, VISITOR_EVENTS_ID, sdk.ID.unique(), doc);
  } catch (e) {
    const message = String((e && e.message) || '');
    const isUnknownAttr = /unknown attribute/i.test(message) || (e && e.code === 400);
    if (!isUnknownAttr) throw e;
    const core = {};
    for (const key of Object.keys(doc)) {
      if (!OPTIONAL_FIELDS.includes(key)) core[key] = doc[key];
    }
    await databases.createDocument(DB_ID, VISITOR_EVENTS_ID, sdk.ID.unique(), core);
  }
}

async function handler({ req, res, error }) {
  if (!API_KEY) {
    return res.json({ ok: false, error: 'APPWRITE_API_KEY is not configured' }, 500);
  }

  const body = parseBody(req);
  if (body && body.action === 'warmup') {
    return res.json({ ok: true, warm: true });
  }

  // Bot guard — skip known crawlers/monitors so analytics reflects real humans.
  const headers = (req && req.headers) || {};
  const ua = String(
    body.userAgent || headers['x-forwarded-user-agent'] || headers['user-agent'] || '',
  );
  if (ua && BOT_UA.test(ua)) {
    return res.json({ ok: true, written: 0, skipped: 'bot' });
  }

  // Per-caller throttle — drop (do not error) excessive batches.
  if (isRateLimited(rateLimitKey(body, headers))) {
    return res.json({ ok: true, written: 0, skipped: 'rate_limited' });
  }

  const rawEvents = Array.isArray(body.events)
    ? body.events
    : body.event_type
      ? [body]
      : [];
  if (rawEvents.length === 0) {
    return res.json({ ok: true, written: 0 });
  }

  const databases = getDatabases();

  // Resolve country server-side if any event is missing it (best-effort, cached per IP)
  const needsCountry = rawEvents.some(ev => ev && !ev.country);
  let serverCountry = null;
  if (needsCountry) {
    serverCountry = await resolveCountryServerSide(headers);
  }

  let written = 0;
  for (const ev of rawEvents.slice(0, MAX_EVENTS_PER_REQUEST)) {
    const doc = sanitize(ev);
    if (!doc) continue;
    // Fill in country from server-side resolution if client didn't provide one
    if (!doc.country && serverCountry) {
      doc.country = serverCountry;
    }
    try {
      await writeEvent(databases, doc);
      await linkIdentity(databases, doc).catch(() => undefined);
      written += 1;
    } catch (e) {
      if (error) error(`visitor_events write failed: ${(e && e.message) || e}`);
    }
  }

  return res.json({ ok: true, written });
}

module.exports = handler;
module.exports.__test = { sanitize, BOT_UA, ALLOWED_EVENT_TYPES, rateLimitKey, isRateLimited, RL_MAX_PER_WINDOW, hashAnonId };
