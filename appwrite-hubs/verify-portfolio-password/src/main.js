'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

const PROFILES_COLLECTION_ID = 'profiles';
const PORTFOLIO_SETTINGS_COLLECTION_ID = 'portfolio_settings';
// PORT-P1-03: shared brute-force lockout collection (same as get-public-portfolio).
const PORTFOLIO_RATE_LIMIT_COLLECTION_ID = 'portfolio_session_rate_limits';
const PASSWORD_ATTEMPT_LIMIT = 8;
const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

function getClient() {
  return new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getDatabases() {
  return new sdk.Databases(getClient());
}

function parseBody(req) {
  if (typeof req.body !== 'string') {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  // PORT-P3-03: guard JSON.parse so malformed bodies yield a clean 400 downstream.
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// PORT-P2-05: constant-time, length-independent comparison (see get-public-portfolio).
function timingSafeCompare(a, b) {
  const da = crypto.createHash('sha256').update(String(a)).digest();
  const db = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(da, db);
}

async function verifyStoredPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const submittedSha = sha256Hex(password);
  const normalizedHash = String(storedHash).trim();

  try {
    if (/^\$2[aby]\$\d{2}\$/.test(normalizedHash)) {
      return await bcrypt.compare(password, normalizedHash);
    }

    if (normalizedHash.toLowerCase().startsWith('sha256:')) {
      return timingSafeCompare(`sha256:${submittedSha}`, normalizedHash.toLowerCase());
    }

    if (/^[a-f0-9]{64}$/i.test(normalizedHash)) {
      return timingSafeCompare(submittedSha, normalizedHash.toLowerCase());
    }
  } catch {
    return false;
  }

  return false;
}

// PORT-P1-03: best-effort per-(username, IP) brute-force lockout (fails open on
// rate-limit infrastructure errors so legitimate visitors are never hard-locked).
function getClientIp(req) {
  const headers = (req && req.headers) || {};
  const cfIp = typeof headers['cf-connecting-ip'] === 'string' ? headers['cf-connecting-ip'].trim() : '';
  if (cfIp) return cfIp;
  const realIp = typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'].trim() : '';
  if (realIp) return realIp;
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim() || 'unknown';
  return 'unknown';
}

function passwordAttemptId(username, ip) {
  const digest = sha256Hex(`${String(username).toLowerCase()}|${ip || 'unknown'}`);
  return `pwd_${digest.slice(0, 32)}`;
}

async function getPasswordAttemptState(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  try {
    const doc = await db.getDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id);
    const resetAt = new Date(doc.reset_at).getTime();
    const count = Number(doc.count || 0);
    if (Number.isFinite(resetAt) && Date.now() <= resetAt && count >= PASSWORD_ATTEMPT_LIMIT) {
      return { blocked: true, retryAfterSeconds: Math.ceil((resetAt - Date.now()) / 1000) };
    }
    return { blocked: false };
  } catch {
    return { blocked: false };
  }
}

async function recordPasswordFailure(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  const now = Date.now();
  const resetAt = new Date(now + PASSWORD_ATTEMPT_WINDOW_MS).toISOString();
  try {
    const doc = await db.getDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id);
    const currentReset = new Date(doc.reset_at).getTime();
    const count = Number(doc.count || 0);
    if (!Number.isFinite(currentReset) || now > currentReset) {
      await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: 1, reset_at: resetAt });
      return;
    }
    await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: count + 1 });
  } catch {
    try {
      await db.createDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, { count: 1, reset_at: resetAt });
    } catch {
      // Rate-limit collection unavailable — fail open.
    }
  }
}

async function clearPasswordFailures(db, username, ip) {
  const id = passwordAttemptId(username, ip);
  try {
    await db.updateDocument(DB_ID, PORTFOLIO_RATE_LIMIT_COLLECTION_ID, id, {
      count: 0,
      reset_at: new Date(Date.now() + PASSWORD_ATTEMPT_WINDOW_MS).toISOString(),
    });
  } catch {
    // Best-effort reset.
  }
}

async function handler({ req, res, error }) {
  if (!API_KEY) {
    return res.json({ success: false, error: 'Appwrite API key is not configured.' }, 500);
  }

  const db = getDatabases();
  const body = parseBody(req);

  try {
    const username = body.username;
    const password = body.password;

    if (!username || !password) {
      return res.json({ success: false, error: 'Username and password required' }, 400);
    }

    // Get user_id from profile
    const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
      sdk.Query.equal('username', username.toLowerCase()),
      sdk.Query.limit(1),
    ]);

    if (profileRes.total === 0) {
      return res.json({ success: false, error: 'Portfolio not found' }, 404);
    }

    const profile = profileRes.documents[0];
    const userId = profile.user_id;

    // Get password hash from portfolio_settings (server-side only)
    const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);

    if (settingsRes.total === 0) {
      return res.json({ success: true, protected: false }); // No password set
    }

    const settings = settingsRes.documents[0];
    const passwordEnabled = settings.password_enabled || settings.passwordEnabled;
    const storedHash = settings.password_hash || settings.passwordHash;

    if (!passwordEnabled) {
      return res.json({ success: true, protected: false }); // No password protection
    }

    if (!storedHash) {
      return res.json({ success: false, error: 'Portfolio password is not configured' }, 401);
    }

    // PORT-P1-03: brute-force lockout before attempting verification.
    const clientIp = getClientIp(req);
    const attempt = await getPasswordAttemptState(db, username, clientIp);
    if (attempt.blocked) {
      return res.json({
        success: false,
        error: 'too_many_attempts',
        protected: true,
        retryAfterSeconds: attempt.retryAfterSeconds,
      }, 429);
    }

    // Server-side verification
    const isValid = await verifyStoredPassword(password, storedHash);

    if (!isValid) {
      await recordPasswordFailure(db, username, clientIp);
      return res.json({ success: false, error: 'Invalid password' }, 401);
    }

    await clearPasswordFailures(db, username, clientIp);

    // Return success WITHOUT exposing hash
    return res.json({
      success: true,
      protected: true,
      verified: true
    });

  } catch (err) {
    console.error('Password verification error:', err);
    return res.json({ success: false, error: 'Verification failed' }, 500);
  }
}

module.exports = handler;
module.exports.__test = {
  sha256Hex,
  timingSafeCompare,
  verifyStoredPassword,
};
