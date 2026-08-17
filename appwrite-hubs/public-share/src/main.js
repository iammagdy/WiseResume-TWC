'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

// FIX-14: Purpose-specific HMAC secret for public-share tokens (WR-2026-023)
// This MUST be set and must be distinct from APPWRITE_API_KEY.
const PUBLIC_SHARE_TOKEN_SECRET = process.env.PUBLIC_SHARE_TOKEN_SECRET;
const PUBLIC_SHARE_TOKEN_SECRET_VALID = typeof PUBLIC_SHARE_TOKEN_SECRET === 'string' &&
  PUBLIC_SHARE_TOKEN_SECRET.length >= 32 &&
  PUBLIC_SHARE_TOKEN_SECRET !== API_KEY;
if (!PUBLIC_SHARE_TOKEN_SECRET_VALID) {
  console.error('[FATAL] PUBLIC_SHARE_TOKEN_SECRET must contain at least 32 characters and be distinct from APPWRITE_API_KEY. Token signing will fail closed.');
}

const PROFILES_COLLECTION_ID = 'profiles';
const RESUMES_COLLECTION_ID = 'resumes';
const RESUME_SHARES_COLLECTION_ID = 'resume_shares';
const SHARE_COMMENTS_COLLECTION_ID = 'share_comments';
const SHARE_RATE_LIMIT_COLLECTION_ID = 'resume_share_rate_limits';
const CHAT_SESSIONS_COLLECTION_ID = 'chat_sessions';
const PORTFOLIO_INTERACTIONS_COLLECTION_ID = 'portfolio_interactions';
const INTEREST_TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SESSION_TOKEN_TTL_MS = 6 * 60 * 60 * 1000;
const INTERNAL_GATEWAY_TOKEN_TTL_MS = 2 * 60 * 1000;
const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CONTENT_LENGTH = 500;
const SESSION_RATE_LIMIT_COLLECTION_ID = 'portfolio_session_rate_limits';
const SESSION_RATE_LIMIT_MAX = 5;
const SESSION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Resume-share links are bearer credentials. New links use 256 bits of
// entropy, while the database stores only their SHA-256 digest. A short-lived
// signed access capability is issued after the server has checked the share's
// active/expiry state and (when configured) its password.
const SHARE_TOKEN_BYTES = 32;
const SHARE_ACCESS_TTL_MS = 30 * 60 * 1000;
const SHARE_PASSWORD_MIN_LENGTH = 8;
const SHARE_PASSWORD_MAX_LENGTH = 256;
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{40,128}$/;
const LEGACY_SHARE_TOKEN_RE = /^[A-Fa-f0-9]{16}$/;
const SHARE_SECTIONS = new Set(['summary', 'experience', 'education', 'skills', 'general']);
const SHARE_RATE_LIMITS = Object.freeze({
  lookup: { max: 60, windowMs: 5 * 60 * 1000 },
  password: { max: 5, windowMs: 15 * 60 * 1000 },
  commentsRead: { max: 60, windowMs: 5 * 60 * 1000 },
  commentsWrite: { max: 8, windowMs: 60 * 60 * 1000 },
  view: { max: 1, windowMs: 30 * 60 * 1000 },
});

function getClient() {
  return new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
}

function getDatabases() {
  return new sdk.Databases(getClient());
}

function getFunctions() {
  return new sdk.Functions(getClient());
}

function parseBody(req) {
  if (typeof req.body !== 'string') {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const wanted = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === wanted) return asString(Array.isArray(value) ? value[0] : value);
  }
  return '';
}

function extractJwt(body, req) {
  const embedded = asRecord(body?.__headers);
  const requestHeaders = asRecord(req?.headers);
  const embeddedJwt = getHeader(embedded, 'X-Appwrite-JWT');
  const requestJwt = getHeader(requestHeaders, 'X-Appwrite-JWT');
  const authorization = getHeader(embedded, 'Authorization') || getHeader(requestHeaders, 'Authorization');
  return embeddedJwt || requestJwt || authorization.replace(/^Bearer\s+/i, '').trim();
}

async function resolveAuthenticatedUser(body, req) {
  const jwt = extractJwt(body, req);
  if (!jwt) return null;
  try {
    const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(jwt);
    const account = new sdk.Account(client);
    const user = await account.get();
    return user?.$id ? user : null;
  } catch {
    return null;
  }
}

function generateShareToken() {
  return crypto.randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
}

function isPlausibleShareToken(token) {
  return SHARE_TOKEN_RE.test(token) || LEGACY_SHARE_TOKEN_RE.test(token);
}

function hashShareToken(token) {
  return sha256Hex(token);
}

function shareTokenStorageMarker(tokenHash) {
  // Fits even the historical 16-character token attribute and cannot be
  // mistaken for a legacy 16-hex bearer token during fallback lookup.
  return `h_${tokenHash.slice(0, 14)}`;
}

function hashSharePassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$v=1$N=16384$r=8$p=1$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

function verifySharePassword(password, stored) {
  const value = String(stored || '');
  if (!value || typeof password !== 'string') return false;

  if (value.startsWith('scrypt$')) {
    const parts = value.split('$');
    if (parts.length !== 7 || parts[1] !== 'v=1') return false;
    const n = Number(parts[2].replace('N=', ''));
    const r = Number(parts[3].replace('r=', ''));
    const p = Number(parts[4].replace('p=', ''));
    if (n !== 16_384 || r !== 8 || p !== 1) return false;
    try {
      const salt = Buffer.from(parts[5], 'base64url');
      const expected = Buffer.from(parts[6], 'base64url');
      const actual = crypto.scryptSync(password, salt, expected.length, {
        N: n,
        r,
        p,
        maxmem: 64 * 1024 * 1024,
      });
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  if (value.startsWith('sha256:')) {
    return timingSafeStringEqual(`sha256:${sha256Hex(password)}`, value);
  }

  // Legacy plaintext is accepted only for a one-time successful migration.
  return timingSafeStringEqual(password, value);
}

function validateNewSharePassword(password) {
  if (password === undefined || password === null || password === '') return null;
  if (typeof password !== 'string' || password.length < SHARE_PASSWORD_MIN_LENGTH || password.length > SHARE_PASSWORD_MAX_LENGTH) {
    const err = new Error(`Share passwords must be ${SHARE_PASSWORD_MIN_LENGTH}-${SHARE_PASSWORD_MAX_LENGTH} characters.`);
    err.httpStatus = 400;
    err.code = 'invalid_password';
    throw err;
  }
  return password;
}

// Timing-safe string equality via HMAC to prevent oracle leakage.
function timingSafeStringEqual(a, b) {
  const nonce = crypto.randomBytes(32);
  const h1 = crypto.createHmac('sha256', nonce).update(String(a)).digest();
  const h2 = crypto.createHmac('sha256', nonce).update(String(b)).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function signToken(payload) {
  if (!PUBLIC_SHARE_TOKEN_SECRET_VALID) {
    throw new Error('PUBLIC_SHARE_TOKEN_SECRET not configured — cannot sign tokens.');
  }
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', PUBLIC_SHARE_TOKEN_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token, expectedPurpose) {
  if (!PUBLIC_SHARE_TOKEN_SECRET_VALID || typeof token !== 'string' || !token.includes('.')) return null;
  const dotIndex = token.lastIndexOf('.');
  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  if (!encoded || !sig) return null;

  try {
    const expected = crypto.createHmac('sha256', PUBLIC_SHARE_TOKEN_SECRET).update(encoded).digest('base64url');
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expected, 'base64url');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload?.purpose !== expectedPurpose) return null;
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

function getClientIpFromReq(req) {
  const h = req.headers || {};
  const cfIp = typeof h['cf-connecting-ip'] === 'string' ? h['cf-connecting-ip'].trim() : null;
  if (cfIp) return cfIp;
  const realIp = typeof h['x-real-ip'] === 'string' ? h['x-real-ip'].trim() : null;
  if (realIp) return realIp;
  const forwarded = h['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() || 'unknown';
  return 'unknown';
}

function shareIsActive(share, now = Date.now()) {
  if (!share || share.is_active !== true) return false;
  if (!share.expires_at) return true;
  const expiresAt = Date.parse(String(share.expires_at));
  return Number.isFinite(expiresAt) && expiresAt > now;
}

async function findShareByToken(db, token, { migrateLegacy = true } = {}) {
  if (!isPlausibleShareToken(token)) return null;
  const tokenHash = hashShareToken(token);
  const hashed = await db.listDocuments(DB_ID, RESUME_SHARES_COLLECTION_ID, [
    sdk.Query.equal('token_hash', tokenHash),
    sdk.Query.limit(1),
  ]);
  let share = hashed.documents?.[0] || null;
  let legacy = false;

  // Only the historical 16-hex format is eligible for a raw-token lookup.
  // Never query the legacy column for a modern token or a leaked 64-char hash.
  if (!share && LEGACY_SHARE_TOKEN_RE.test(token)) {
    const old = await db.listDocuments(DB_ID, RESUME_SHARES_COLLECTION_ID, [
      sdk.Query.equal('token', token),
      sdk.Query.limit(1),
    ]);
    share = old.documents?.[0] || null;
    legacy = !!share;
  }

  if (share && (legacy || share.token_hash !== tokenHash) && migrateLegacy) {
    try {
      await db.updateDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, {
        token_hash: tokenHash,
        token: shareTokenStorageMarker(tokenHash),
        token_prefix: token.slice(0, 8),
      });
      share = {
        ...share,
        token_hash: tokenHash,
        token: shareTokenStorageMarker(tokenHash),
        token_prefix: token.slice(0, 8),
      };
    } catch {
      // Do not return content while raw credential migration failed. This keeps
      // the hash-only-at-rest guarantee fail-closed after the migration ships.
      return null;
    }
  }

  return share ? { share, tokenHash, legacy } : null;
}

function issueShareAccessToken(share, tokenHash) {
  const now = Date.now();
  const shareExpiry = share.expires_at ? Date.parse(String(share.expires_at)) : Number.POSITIVE_INFINITY;
  const exp = Math.min(now + SHARE_ACCESS_TTL_MS, shareExpiry);
  return signToken({
    purpose: 'resume-share-access',
    sid: String(share.$id),
    th: tokenHash,
    av: Number(share.access_version || 1),
    iat: now,
    exp,
  });
}

function validateShareAccessToken(accessToken, share, tokenHash) {
  const payload = verifyToken(accessToken, 'resume-share-access');
  return !!payload &&
    payload.sid === String(share.$id) &&
    payload.th === tokenHash &&
    payload.av === Number(share.access_version || 1) &&
    shareIsActive(share);
}

function parseJsonValue(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function parseJsonArray(value) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed.slice(0, 500) : [];
}

function parseJsonRecord(value) {
  const parsed = parseJsonValue(value, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function sanitizePublicResume(resume) {
  // Explicit allowlist: Appwrite system metadata, user_id, tailoring context,
  // internal scores, and lineage fields must never cross the public boundary.
  return {
    title: asString(resume?.title) || 'Resume',
    template: asString(resume?.template) || undefined,
    summary: asString(resume?.summary),
    contact_info: parseJsonRecord(resume?.contact_info),
    experience: parseJsonArray(resume?.experience),
    education: parseJsonArray(resume?.education),
    skills: parseJsonArray(resume?.skills),
    certifications: parseJsonArray(resume?.certifications),
    awards: parseJsonArray(resume?.awards),
    projects: parseJsonArray(resume?.projects),
    publications: parseJsonArray(resume?.publications),
    volunteering: parseJsonArray(resume?.volunteering),
    hobbies: parseJsonArray(resume?.hobbies),
    references: parseJsonArray(resume?.references),
    languages: parseJsonArray(resume?.languages),
    customization: parseJsonRecord(resume?.customization),
  };
}

function rateLimitDocumentId(bucket, key) {
  return `rsrl_${sha256Hex(`${bucket}:${key}`).slice(0, 31)}`;
}

async function checkResumeShareRateLimit(db, bucket, key, config = SHARE_RATE_LIMITS[bucket]) {
  if (!config) throw new Error(`Unknown resume-share rate-limit bucket: ${bucket}`);
  const id = rateLimitDocumentId(bucket, key);
  const now = Date.now();
  const resetAt = new Date(now + config.windowMs).toISOString();

  try {
    let doc;
    try {
      doc = await db.getDocument(DB_ID, SHARE_RATE_LIMIT_COLLECTION_ID, id);
    } catch (err) {
      if (err?.code !== 404 && !/could not be found/i.test(err?.message || '')) throw err;
      try {
        await db.createDocument(DB_ID, SHARE_RATE_LIMIT_COLLECTION_ID, id, {
          bucket,
          key_hash: sha256Hex(key),
          count: 1,
          reset_at: resetAt,
        });
        return { ok: true, remaining: config.max - 1 };
      } catch (createErr) {
        if (createErr?.code !== 409 && !/already exists|duplicate/i.test(createErr?.message || '')) throw createErr;
        doc = await db.getDocument(DB_ID, SHARE_RATE_LIMIT_COLLECTION_ID, id);
      }
    }

    const existingReset = Date.parse(String(doc.reset_at || ''));
    if (!Number.isFinite(existingReset) || existingReset <= now) {
      await db.updateDocument(DB_ID, SHARE_RATE_LIMIT_COLLECTION_ID, id, {
        count: 1,
        reset_at: resetAt,
      });
      return { ok: true, remaining: config.max - 1 };
    }

    try {
      const updated = await db.incrementDocumentAttribute(
        DB_ID,
        SHARE_RATE_LIMIT_COLLECTION_ID,
        id,
        'count',
        1,
        config.max,
      );
      return {
        ok: true,
        remaining: Math.max(0, config.max - Number(updated.count || config.max)),
      };
    } catch (err) {
      if (err?.code === 409 || err?.code === 400 || /maximum|max value|conflict/i.test(err?.message || '')) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existingReset - now) / 1000)) };
      }
      throw err;
    }
  } catch {
    return { ok: false, unavailable: true, retryAfterSeconds: 60 };
  }
}

function rateLimitResponse(res, result) {
  if (result.unavailable) {
    return res.json({
      status: 'error',
      code: 'share_security_unavailable',
      message: 'Public sharing is temporarily unavailable.',
    }, 503);
  }
  return res.json({
    status: 'error',
    code: 'rate_limited',
    message: 'Too many attempts. Please wait and try again.',
    retry_after_seconds: result.retryAfterSeconds || 60,
  }, 429);
}

// PORT-NOTIF-04: server-side owner notification helper (mirrors ai-gateway implementation).
// Creates a document in the `notifications` collection on behalf of the owner.
// Uses a link-retry pattern so a missing `link` schema attribute does not lose the notification.
// Explicitly sets document-level read, update, and delete permissions for the owner.
// Never throws — all errors are caught and logged with sanitized codes only.
async function createOwnerNotification(db, { user_id, type, title, message, link }) {
  const baseData = { user_id, type, title, message, is_read: false };
  const permissions = [
    sdk.Permission.read(sdk.Role.user(user_id)),
    sdk.Permission.update(sdk.Role.user(user_id)),
    sdk.Permission.delete(sdk.Role.user(user_id))
  ];
  if (link) {
    try {
      await db.createDocument(DB_ID, 'notifications', sdk.ID.unique(), { ...baseData, link }, permissions);
      console.log(`[notify] Owner notification created successfully (type=${type})`);
      return;
    } catch (e) {
      const isUnknownAttr = e?.code === 400 &&
        /unknown attribute|invalid attribute/i.test(e?.message ?? '');
      if (!isUnknownAttr) {
        console.warn('[notify] Owner notification write failed:', e?.code ?? 'unknown', e?.message);
        return;
      }
      console.warn('[notify] Link attribute absent from notifications schema — retrying without link');
    }
  }
  try {
    await db.createDocument(DB_ID, 'notifications', sdk.ID.unique(), baseData, permissions);
    console.log(`[notify] Owner notification created successfully (no-link retry, type=${type})`);
  } catch (e) {
    console.warn('[notify] Owner notification write failed (no-link retry):', e?.code ?? 'unknown', e?.message);
  }
}

async function checkPortfolioSessionRateLimit(db, ip) {
  if (!ip || ip === 'unknown') return { ok: true };
  const ipHash = sha256Hex(ip);
  try {
    let doc;
    try {
      doc = await db.getDocument(DB_ID, SESSION_RATE_LIMIT_COLLECTION_ID, ipHash);
    } catch (e) {
      if (e.code === 404 || /could not be found/i.test(e.message || '')) doc = null;
      else throw e;
    }
    const now = Date.now();
    if (!doc || now > new Date(doc.reset_at).getTime()) {
      const resetAt = new Date(now + SESSION_RATE_LIMIT_WINDOW_MS).toISOString();
      if (!doc) {
        await db.createDocument(DB_ID, SESSION_RATE_LIMIT_COLLECTION_ID, ipHash, { count: 1, reset_at: resetAt });
      } else {
        await db.updateDocument(DB_ID, SESSION_RATE_LIMIT_COLLECTION_ID, ipHash, { count: 1, reset_at: resetAt });
      }
      return { ok: true };
    }
    const count = Number(doc.count || 0);
    if (count >= SESSION_RATE_LIMIT_MAX) {
      return { ok: false, retryAfterSeconds: Math.ceil((new Date(doc.reset_at).getTime() - now) / 1000) };
    }
    await db.updateDocument(DB_ID, SESSION_RATE_LIMIT_COLLECTION_ID, ipHash, { count: count + 1 });
    return { ok: true };
  } catch {
    // PORT-P2-02: fail CLOSED. Previously returned { ok: true }, so a missing
    // rate-limit collection or a DB outage silently disabled IP throttling and
    // allowed unlimited portfolio chat-session creation. Requires the
    // portfolio_session_rate_limits collection to exist (see owner checklist).
    return { ok: false, retryAfterSeconds: 60 };
  }
}

function normalizeUsername(value) {
  const username = asString(value).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(username)) {
    return null;
  }
  return username;
}

async function getPortfolioProfile(db, username) {
  const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
    sdk.Query.equal('username', username),
    sdk.Query.limit(1),
  ]);
  const profile = profileRes.documents?.[0] || null;
  // Use snake_case field from Appwrite (portfolio_enabled)
  if (!profile || profile.portfolio_enabled !== true) return null;
  return profile;
}

async function getResumeForPortfolio(db, profile, userId) {
  // Use selected portfolio_resume_id if available, otherwise fallback to any resume by user
  const selectedResumeId = profile.portfolio_resume_id || profile.portfolioResumeId;
  if (selectedResumeId) {
    try {
      const resume = await db.getDocument(DB_ID, RESUMES_COLLECTION_ID, selectedResumeId);
      // SECURITY (PORT-P1): only return the selected resume if it belongs to the
      // portfolio owner. Without this ownership check, a tampered
      // portfolio_resume_id could surface another user's resume as chat context.
      if (resume && resume.user_id === userId) return resume;
    } catch {
      // Fall through to user_id query if selected resume not found
    }
  }
  // Fallback: fetch any resume by user_id (legacy behavior)
  const resumeRes = await db.listDocuments(DB_ID, RESUMES_COLLECTION_ID, [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ]);
  return resumeRes.documents?.[0] || null;
}

function extractSkills(resume) {
  if (!Array.isArray(resume?.skills)) return [];
  return resume.skills
    .map((skill) => {
      if (typeof skill === 'string') return skill.trim();
      if (skill && typeof skill === 'object' && typeof skill.name === 'string') return skill.name.trim();
      return '';
    })
    .filter(Boolean)
    .slice(0, 20);
}

function extractRecentRole(resume) {
  if (!Array.isArray(resume?.experience) || resume.experience.length === 0) return undefined;
  const latest = resume.experience[0];
  if (!latest || typeof latest !== 'object') return undefined;
  const position = asString(latest.position);
  const company = asString(latest.company);
  return [position, company ? `at ${company}` : ''].filter(Boolean).join(' ').trim() || undefined;
}

function buildProfileContext(profile, resume) {
  // Parse portfolio_extras safely (stored as JSON string in Appwrite)
  let extras = {};
  try {
    const rawExtras = profile.portfolio_extras || profile.portfolioExtras;
    extras = typeof rawExtras === 'string' ? JSON.parse(rawExtras) : (rawExtras || {});
  } catch {
    extras = {};
  }
  const portfolioSummary = asString(extras.portfolioSummary);
  // Use snake_case fields from Appwrite raw documents
  return {
    fullName: asString(profile.full_name || profile.fullName) || 'this professional',
    title: asString(profile.job_title || profile.jobTitle) || undefined,
    location: asString(profile.location) || undefined,
    bio: asString(profile.portfolio_bio || profile.portfolioBio || portfolioSummary || resume?.summary || '').slice(0, 300) || undefined,
    skills: extractSkills(resume),
    recentRole: extractRecentRole(resume),
  };
}

function sanitizeConversationHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : entry.role === 'user' ? 'user' : '',
      content: typeof entry.content === 'string' ? entry.content.trim().slice(0, MAX_HISTORY_CONTENT_LENGTH) : '',
    }))
    .filter((entry) => (entry.role === 'assistant' || entry.role === 'user') && entry.content)
    .slice(-MAX_HISTORY_ITEMS);
}

async function executeAiGateway(payload) {
  // node-appwrite 17.x (bundled here) uses the POSITIONAL createExecution
  // signature: createExecution(functionId, body, async, xpath, method). The
  // object form belongs to newer majors and would be misread as the functionId
  // ("Invalid functionId param"), which silently broke portfolio chat.
  const execution = await getFunctions().createExecution(
    'ai-gateway',
    JSON.stringify(payload),
    false,
    '/',
    'POST',
  );

  if (execution.status === 'failed') {
    throw new Error(execution.errors || 'AI gateway execution failed.');
  }

  let parsed;
  try {
    parsed = JSON.parse(execution.responseBody || '{}');
  } catch {
    parsed = { status: 'error', message: 'AI gateway returned malformed JSON.' };
  }

  return {
    parsed,
    statusCode: execution.responseStatusCode || 200,
  };
}

function shareHasPassword(share) {
  return share?.has_password === true || !!asString(share?.password_hash) || !!asString(share?.password);
}

function storedSharePassword(share) {
  return asString(share?.password_hash) || asString(share?.password);
}

function shareSummary(share, token) {
  return {
    id: String(share.$id),
    resume_id: String(share.resume_id),
    is_active: share.is_active === true,
    has_password: shareHasPassword(share),
    expires_at: share.expires_at || null,
    view_count: Number(share.view_count || 0),
    created_at: share.$createdAt || share.created_at || null,
    ...(token ? { token } : {}),
  };
}

function normalizeShareExpiry(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') {
    const err = new Error('Share expiry must be an ISO timestamp or null.');
    err.httpStatus = 400;
    err.code = 'invalid_expiry';
    throw err;
  }
  const timestamp = Date.parse(value);
  const now = Date.now();
  if (!Number.isFinite(timestamp) || timestamp <= now || timestamp > now + 366 * 24 * 60 * 60 * 1000) {
    const err = new Error('Share expiry must be in the future and no more than 366 days away.');
    err.httpStatus = 400;
    err.code = 'invalid_expiry';
    throw err;
  }
  return new Date(timestamp).toISOString();
}

function buildNewShareDocument({ userId, resumeId, token, password, expiresAt }) {
  const tokenHash = hashShareToken(token);
  return {
    user_id: String(userId),
    resume_id: String(resumeId),
    // The compatibility column contains the digest, never the bearer token.
    token: shareTokenStorageMarker(tokenHash),
    token_hash: tokenHash,
    token_prefix: token.slice(0, 8),
    is_active: true,
    password: null,
    password_hash: password ? hashSharePassword(password) : null,
    has_password: !!password,
    access_version: 1,
    expires_at: expiresAt ?? null,
    view_count: 0,
  };
}

async function requireShareOwner(db, body, req, res) {
  const user = await resolveAuthenticatedUser(body, req);
  if (!user) {
    res.json({ status: 'error', code: 'unauthorized', message: 'Authentication required.' }, 401);
    return null;
  }
  return user;
}

async function handleCreateResumeShare(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const resumeId = asString(body.resumeId || body.resume_id);
  if (!resumeId || resumeId.length > 128) {
    return res.json({ status: 'error', code: 'invalid_resume', message: 'A valid resume is required.' }, 400);
  }

  let resume;
  try {
    resume = await db.getDocument(DB_ID, RESUMES_COLLECTION_ID, resumeId);
  } catch {
    return res.json({ status: 'error', code: 'resume_not_found', message: 'Resume not found.' }, 404);
  }
  if (String(resume.user_id || '') !== String(user.$id)) {
    return res.json({ status: 'error', code: 'resume_not_found', message: 'Resume not found.' }, 404);
  }

  let password;
  let expiresAt;
  try {
    password = validateNewSharePassword(body.password);
    expiresAt = normalizeShareExpiry(body.expires_at);
  } catch (err) {
    return res.json({ status: 'error', code: err.code || 'invalid_share', message: err.message }, err.httpStatus || 400);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = generateShareToken();
    try {
      const share = await db.createDocument(
        DB_ID,
        RESUME_SHARES_COLLECTION_ID,
        sdk.ID.unique(),
        buildNewShareDocument({
          userId: user.$id,
          resumeId,
          token,
          password,
          expiresAt,
        }),
      );
      return res.json({ status: 'success', data: shareSummary(share, token) }, 201);
    } catch (err) {
      if (err?.code === 409 || /duplicate|already exists|unique/i.test(err?.message || '')) continue;
      throw err;
    }
  }
  return res.json({ status: 'error', code: 'token_generation_failed', message: 'Could not create a share link.' }, 503);
}

async function handleListResumeShares(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const resumeId = asString(body.resumeId || body.resume_id);
  if (!resumeId) return res.json({ status: 'success', data: [] });
  const result = await db.listDocuments(DB_ID, RESUME_SHARES_COLLECTION_ID, [
    sdk.Query.equal('user_id', String(user.$id)),
    sdk.Query.equal('resume_id', resumeId),
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(50),
  ]);
  return res.json({ status: 'success', data: (result.documents || []).map((share) => shareSummary(share)) });
}

async function getOwnedShare(db, shareId, userId) {
  if (!shareId || shareId.length > 128) return null;
  try {
    const share = await db.getDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, shareId);
    return String(share.user_id || '') === String(userId) ? share : null;
  } catch {
    return null;
  }
}

async function handleUpdateResumeShare(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const shareId = asString(body.id || body.shareId || body.share_id);
  const share = await getOwnedShare(db, shareId, user.$id);
  if (!share) return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found.' }, 404);

  const updates = asRecord(body.updates);
  const payload = {};
  let rotatedToken;
  if (typeof updates.is_active === 'boolean') payload.is_active = updates.is_active;
  if (Object.prototype.hasOwnProperty.call(updates, 'expires_at')) {
    try { payload.expires_at = normalizeShareExpiry(updates.expires_at); }
    catch (err) { return res.json({ status: 'error', code: err.code, message: err.message }, err.httpStatus || 400); }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'password')) {
    try {
      const password = validateNewSharePassword(updates.password);
      payload.password = null;
      payload.password_hash = password ? hashSharePassword(password) : null;
      payload.has_password = !!password;
    } catch (err) {
      return res.json({ status: 'error', code: err.code, message: err.message }, err.httpStatus || 400);
    }
  }
  if (updates.rotate_token === true) {
    rotatedToken = generateShareToken();
    const tokenHash = hashShareToken(rotatedToken);
    payload.token = shareTokenStorageMarker(tokenHash);
    payload.token_hash = tokenHash;
    payload.token_prefix = rotatedToken.slice(0, 8);
  }
  if (Object.keys(payload).length === 0) {
    return res.json({ status: 'error', code: 'no_updates', message: 'No supported changes were supplied.' }, 400);
  }
  payload.access_version = Number(share.access_version || 1) + 1;
  const updated = await db.updateDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, payload);
  return res.json({ status: 'success', data: shareSummary(updated, rotatedToken) });
}

async function handleDeleteResumeShare(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const shareId = asString(body.id || body.shareId || body.share_id);
  const share = await getOwnedShare(db, shareId, user.$id);
  if (!share) return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found.' }, 404);
  // Revocation is immediate. Physical deletion remains available to the owner,
  // but first setting is_active=false closes any in-flight access capabilities.
  await db.updateDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, { is_active: false });
  await deleteDocumentsByQuery(db, SHARE_COMMENTS_COLLECTION_ID, [
    sdk.Query.equal('share_id', String(share.$id)),
  ]);
  await db.deleteDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id);
  return res.json({ status: 'success', data: { deleted: true } });
}

async function maybeUpgradeSharePassword(db, share, password) {
  const stored = storedSharePassword(share);
  if (stored.startsWith('scrypt$')) return share;
  const passwordHash = hashSharePassword(password);
  await db.updateDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, {
    password: null,
    password_hash: passwordHash,
    has_password: true,
  });
  return { ...share, password: null, password_hash: passwordHash, has_password: true };
}

async function handleGetResumeShare(db, body, req, res) {
  const token = asString(body.token);
  const ipHash = sha256Hex(getClientIpFromReq(req));
  // Ingress throttling is keyed only by a trusted-edge IP digest. Keying an
  // unauthenticated lookup by attacker-controlled tokens would let one caller
  // create unbounded rate-limit documents.
  const lookupLimit = await checkResumeShareRateLimit(db, 'lookup', ipHash);
  if (!lookupLimit.ok) return rateLimitResponse(res, lookupLimit);

  const located = await findShareByToken(db, token);
  if (!located || !shareIsActive(located.share)) {
    return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found or expired.' }, 404);
  }
  let { share } = located;
  const hasPassword = shareHasPassword(share);
  const accessToken = asString(body.accessToken || body.access_token);
  let authorized = !hasPassword || validateShareAccessToken(accessToken, share, located.tokenHash);

  if (!authorized) {
    const password = typeof body.password === 'string' ? body.password : '';
    if (!password) {
      return res.json({ status: 'success', data: { requires_password: true, authenticated: false } });
    }
    const passwordLimit = await checkResumeShareRateLimit(db, 'password', `${ipHash}:${located.tokenHash}`);
    if (!passwordLimit.ok) return rateLimitResponse(res, passwordLimit);
    if (!verifySharePassword(password, storedSharePassword(share))) {
      return res.json({
        status: 'success',
        data: { requires_password: true, authenticated: false, password_incorrect: true },
      });
    }
    try {
      share = await maybeUpgradeSharePassword(db, share, password);
    } catch {
      return res.json({ status: 'error', code: 'share_security_unavailable', message: 'Public sharing is temporarily unavailable.' }, 503);
    }
    authorized = true;
  }

  if (!authorized) {
    return res.json({ status: 'success', data: { requires_password: true, authenticated: false } });
  }

  let resume;
  try {
    resume = await db.getDocument(DB_ID, RESUMES_COLLECTION_ID, String(share.resume_id));
  } catch {
    return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found or expired.' }, 404);
  }
  if (String(resume.user_id || '') !== String(share.user_id || '')) {
    return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found or expired.' }, 404);
  }

  const viewLimit = await checkResumeShareRateLimit(db, 'view', `${ipHash}:${share.$id}`);
  if (viewLimit.ok) {
    try {
      await db.incrementDocumentAttribute(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, 'view_count', 1);
    } catch { /* analytics must not prevent an authorized read */ }
  }

  return res.json({
    status: 'success',
    data: {
      access_token: issueShareAccessToken(share, located.tokenHash),
      share: {
        is_active: true,
        expires_at: share.expires_at || null,
        view_count: Number(share.view_count || 0) + (viewLimit.ok ? 1 : 0),
      },
      resume: sanitizePublicResume(resume),
    },
  });
}

async function handleVerifySharePassword(db, body, req, res) {
  const token = asString(body.token);
  const password = typeof body.password === 'string' ? body.password : '';
  const ipHash = sha256Hex(getClientIpFromReq(req));
  const ingress = await checkResumeShareRateLimit(db, 'lookup', ipHash);
  if (!ingress.ok) return rateLimitResponse(res, ingress);
  const located = await findShareByToken(db, token);
  if (!located || !shareIsActive(located.share) || !shareHasPassword(located.share) || !password) {
    return res.json({ status: 'success', data: { authenticated: false } });
  }
  const limit = await checkResumeShareRateLimit(db, 'password', `${ipHash}:${located.tokenHash}`);
  if (!limit.ok) return rateLimitResponse(res, limit);
  if (!verifySharePassword(password, storedSharePassword(located.share))) {
    return res.json({ status: 'success', data: { authenticated: false } });
  }
  let share;
  try { share = await maybeUpgradeSharePassword(db, located.share, password); }
  catch { return res.json({ status: 'error', code: 'share_security_unavailable', message: 'Public sharing is temporarily unavailable.' }, 503); }
  return res.json({
    status: 'success',
    data: { authenticated: true, access_token: issueShareAccessToken(share, located.tokenHash) },
  });
}

async function authorizePublicShare(db, body) {
  const token = asString(body.token);
  const located = await findShareByToken(db, token);
  if (!located || !shareIsActive(located.share)) return null;
  if (shareHasPassword(located.share)) {
    const accessToken = asString(body.accessToken || body.access_token);
    if (!validateShareAccessToken(accessToken, located.share, located.tokenHash)) return null;
  }
  return located;
}

function publicComment(comment) {
  return {
    id: String(comment.$id),
    author_name: asString(comment.author_name).slice(0, 80),
    section: SHARE_SECTIONS.has(comment.section) ? comment.section : 'general',
    content: asString(comment.content).slice(0, 1000),
    is_resolved: comment.is_resolved === true,
    created_at: comment.$createdAt || comment.created_at || null,
  };
}

async function handleGetPublicShareComments(db, body, req, res) {
  const token = asString(body.token);
  const ipHash = sha256Hex(getClientIpFromReq(req));
  const limit = await checkResumeShareRateLimit(db, 'commentsRead', ipHash);
  if (!limit.ok) return rateLimitResponse(res, limit);
  const located = await authorizePublicShare(db, body);
  if (!located) return res.json({ status: 'error', code: 'share_access_denied', message: 'Share access is required.' }, 403);
  const result = await db.listDocuments(DB_ID, SHARE_COMMENTS_COLLECTION_ID, [
    sdk.Query.equal('share_id', String(located.share.$id)),
    sdk.Query.equal('is_resolved', false),
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(200),
  ]);
  return res.json({ status: 'success', data: (result.documents || []).map(publicComment) });
}

async function handleAddPublicShareComment(db, body, req, res) {
  const token = asString(body.token);
  const ipHash = sha256Hex(getClientIpFromReq(req));
  const limit = await checkResumeShareRateLimit(db, 'commentsWrite', ipHash);
  if (!limit.ok) return rateLimitResponse(res, limit);
  const located = await authorizePublicShare(db, body);
  if (!located) return res.json({ status: 'error', code: 'share_access_denied', message: 'Share access is required.' }, 403);

  const authorName = asString(body.authorName || body.author_name).slice(0, 80);
  const content = asString(body.content).slice(0, 1000);
  const section = SHARE_SECTIONS.has(body.section) ? body.section : 'general';
  if (!authorName || !content) {
    return res.json({ status: 'error', code: 'invalid_comment', message: 'Your name and feedback are required.' }, 400);
  }
  const created = await db.createDocument(DB_ID, SHARE_COMMENTS_COLLECTION_ID, sdk.ID.unique(), {
    share_id: String(located.share.$id),
    author_name: authorName,
    content,
    section,
    is_resolved: false,
  });
  return res.json({ status: 'success', data: publicComment(created) }, 201);
}

async function handleListShareComments(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const share = await getOwnedShare(db, asString(body.shareId || body.share_id), user.$id);
  if (!share) return res.json({ status: 'error', code: 'share_not_found', message: 'Share link not found.' }, 404);
  const result = await db.listDocuments(DB_ID, SHARE_COMMENTS_COLLECTION_ID, [
    sdk.Query.equal('share_id', String(share.$id)),
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(200),
  ]);
  return res.json({ status: 'success', data: (result.documents || []).map(publicComment) });
}

async function handleResolveShareComment(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  const commentId = asString(body.commentId || body.comment_id);
  let comment;
  try { comment = await db.getDocument(DB_ID, SHARE_COMMENTS_COLLECTION_ID, commentId); }
  catch { return res.json({ status: 'error', code: 'comment_not_found', message: 'Comment not found.' }, 404); }
  const share = await getOwnedShare(db, String(comment.share_id || ''), user.$id);
  if (!share) return res.json({ status: 'error', code: 'comment_not_found', message: 'Comment not found.' }, 404);
  const updated = await db.updateDocument(DB_ID, SHARE_COMMENTS_COLLECTION_ID, comment.$id, {
    is_resolved: body.resolved === true,
  });
  return res.json({ status: 'success', data: publicComment(updated) });
}

async function deleteDocumentsByQuery(db, collectionId, queries) {
  let deleted = 0;
  while (true) {
    const page = await db.listDocuments(DB_ID, collectionId, [...queries, sdk.Query.limit(100)]);
    const documents = page.documents || [];
    if (!documents.length) break;
    for (const document of documents) {
      await db.deleteDocument(DB_ID, collectionId, document.$id);
      deleted += 1;
    }
    // Re-run the same first page after deletion; cursor pagination would skip
    // records because the result set is shrinking.
    if (documents.length < 100) break;
  }
  return deleted;
}

async function handleDeleteAllResumeShareData(db, body, req, res) {
  const user = await requireShareOwner(db, body, req, res);
  if (!user) return undefined;
  let sharesDeleted = 0;
  let commentsDeleted = 0;
  while (true) {
    const page = await db.listDocuments(DB_ID, RESUME_SHARES_COLLECTION_ID, [
      sdk.Query.equal('user_id', String(user.$id)),
      sdk.Query.limit(100),
    ]);
    const shares = page.documents || [];
    if (!shares.length) break;
    for (const share of shares) {
      // Revoke first so every already-issued capability fails immediately even
      // if a later delete call is interrupted.
      await db.updateDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id, { is_active: false });
      commentsDeleted += await deleteDocumentsByQuery(db, SHARE_COMMENTS_COLLECTION_ID, [
        sdk.Query.equal('share_id', String(share.$id)),
      ]);
      await db.deleteDocument(DB_ID, RESUME_SHARES_COLLECTION_ID, share.$id);
      sharesDeleted += 1;
    }
    if (shares.length < 100) break;
  }
  return res.json({ status: 'success', data: { shares_deleted: sharesDeleted, comments_deleted: commentsDeleted } });
}

async function handleCreatePortfolioChatSession(db, body, req, res) {
  const username = normalizeUsername(body.username);
  if (!username) {
    return res.json({ status: 'error', message: 'Invalid portfolio username.' }, 400);
  }

  const ip = getClientIpFromReq(req);
  const rateLimit = await checkPortfolioSessionRateLimit(db, ip);
  if (!rateLimit.ok) {
    return res.json({
      status: 'error',
      code: 'rate_limited',
      message: `Too many sessions from your network. Please wait ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
    }, 429);
  }

  const profile = await getPortfolioProfile(db, username);
  if (!profile) {
    return res.json({ status: 'error', message: 'Portfolio chat is unavailable for this profile.' }, 404);
  }

  const chatSession = await db.createDocument(
    DB_ID,
    CHAT_SESSIONS_COLLECTION_ID,
    sdk.ID.unique(),
    { question_count: 0 },
  );

  const now = Date.now();
  const sessionToken = signToken({
    purpose: 'portfolio-chat-session',
    sid: chatSession.$id,
    username,
    ownerUserId: String(profile.user_id || ''),
    iat: now,
    exp: now + SESSION_TOKEN_TTL_MS,
  });

  return res.json({
    status: 'success',
    data: {
      sessionToken,
      maxQuestions: 10,
    },
  });
}

async function handleAskPortfolio(db, body, res) {
  const username = normalizeUsername(body.username);
  if (!username) {
    return res.json({ status: 'error', message: 'Invalid portfolio username.' }, 400);
  }

  const signedSession = asString(body.sessionToken);
  const sessionPayload = verifyToken(signedSession, 'portfolio-chat-session');
  if (!sessionPayload || sessionPayload.username !== username || typeof sessionPayload.sid !== 'string' || typeof sessionPayload.ownerUserId !== 'string') {
    return res.json({ status: 'error', code: 'session_not_found', message: 'Portfolio session not found or expired.' }, 403);
  }

  const question = asString(body.question).slice(0, MAX_QUESTION_LENGTH);
  if (!question) {
    return res.json({ status: 'error', message: 'Question is required.' }, 400);
  }

  const profile = await getPortfolioProfile(db, username);
  if (!profile || String(profile.user_id || '') !== sessionPayload.ownerUserId) {
    return res.json({ status: 'error', message: 'Portfolio chat is unavailable for this profile.' }, 404);
  }

  const resume = await getResumeForPortfolio(db, profile, sessionPayload.ownerUserId);
  const profileContext = buildProfileContext(profile, resume);
  const conversationHistory = sanitizeConversationHistory(body.conversationHistory);

  const now = Date.now();
  const internalToken = signToken({
    purpose: 'public-portfolio-chat',
    sid: sessionPayload.sid,
    username,
    ownerUserId: sessionPayload.ownerUserId,
    iat: now,
    exp: now + INTERNAL_GATEWAY_TOKEN_TTL_MS,
  });

  const { parsed, statusCode } = await executeAiGateway({
    featureName: 'ask-portfolio',
    username,
    question,
    sessionToken: sessionPayload.sid,
    conversationHistory,
    profileContext,
    __headers: {
      'X-Internal-Gateway-Token': internalToken,
    },
  });

  return res.json(parsed, statusCode);
}

function safeReferrerHostname(referrer) {
  if (typeof referrer !== 'string' || !referrer.trim()) return null;
  try { return new URL(referrer).hostname.slice(0, 200); } catch { return null; }
}

// Public "I'm Interested" beacon. Moved here from the Vercel /api route so it uses
// this function's properly-scoped server key instead of a separate Vercel env var.
// Dedup is per-browser token; no PII stored, no IP recorded.
async function handlePortfolioInterest(db, body, res) {
  const correlationId = asString(body.correlationId || '');
  const username = normalizeUsername(body.username);
  if (!username) {
    console.warn(`[interest] [${correlationId}] Rejecting request - invalid username:`, body.username);
    return res.json({ status: 'error', message: 'Invalid portfolio username.' }, 400);
  }
  const token = asString(body.token);
  if (!INTEREST_TOKEN_RE.test(token)) {
    console.warn(`[interest] [${correlationId}] Rejecting request - invalid token format`);
    return res.json({ status: 'error', message: 'Invalid token.' }, 400);
  }

  const hasInterestToken = !!token;
  console.log(`[interest] [${correlationId}] handlePortfolioInterest request. hasInterestToken=${hasInterestToken}, username=${username}`);

  const profile = await getPortfolioProfile(db, username);
  if (!profile) {
    console.warn(`[interest] [${correlationId}] Rejecting request - profile not found or disabled for "${username}"`);
    return res.json({ status: 'error', message: 'Portfolio not found.' }, 404);
  }

  // Dedup on the per-browser token so repeat clicks don't create duplicates.
  const existing = await db.listDocuments(DB_ID, PORTFOLIO_INTERACTIONS_COLLECTION_ID, [
    sdk.Query.equal('token', token),
    sdk.Query.limit(1),
  ]);
  if ((existing.documents?.length ?? 0) > 0) {
    console.log(`[interest] [${correlationId}] Duplicate interest click ignored for user="${profile.user_id}"`);
    return res.json({ status: 'success', data: { ok: true, duplicate: true } });
  }

  const data = { token, portfolio_username: username, interaction_type: 'interested' };
  const referrerHostname = safeReferrerHostname(body.referrer);
  if (referrerHostname) data.referrer_hostname = referrerHostname;

  try {
    await db.createDocument(DB_ID, PORTFOLIO_INTERACTIONS_COLLECTION_ID, sdk.ID.unique(), data);
    console.log(`[interest] [${correlationId}] Interaction document created successfully for user="${profile.user_id}"`);

    // PORT-NOTIF-05: notify owner on first-time interest only (not on the duplicate path above).
    // Owner user_id is resolved from the profile doc server-side, never from the public payload.
    if (profile.user_id) {
      console.log(`[interest] [${correlationId}] Triggering owner notification for user="${profile.user_id}"`);
      await createOwnerNotification(db, {
        user_id: profile.user_id,
        type: 'portfolio_interest',
        title: 'New portfolio interest',
        message: 'Someone showed interest in your portfolio.',
        link: '/notifications',
      });
    } else {
      console.warn(`[interest] [${correlationId}] Owner notification skipped - profile has no user_id for "${username}"`);
    }
    return res.json({ status: 'success', data: { ok: true } });
  } catch (e) {
    if (/unique|duplicate|already exists/i.test(e.message || '')) {
      console.log(`[interest] [${correlationId}] Duplicate document race condition caught`);
      return res.json({ status: 'success', data: { ok: true, duplicate: true } });
    }
    console.error(`[interest] [${correlationId}] Interaction write failed:`, e.message || e);
    throw e;
  }
}

module.exports = async ({ req, res, error }) => {
  try {
    if (!API_KEY) {
      return res.json({ status: 'error', message: 'Public sharing is temporarily unavailable.' }, 500);
    }

    const body = parseBody(req);
    const action = asString(body.action);
    const databases = getDatabases();

    if (action === 'get-resume-share') {
      return await handleGetResumeShare(databases, body, req, res);
    }
    if (action === 'verify-share-password') {
      return await handleVerifySharePassword(databases, body, req, res);
    }
    if (action === 'get-public-share-comments') {
      return await handleGetPublicShareComments(databases, body, req, res);
    }
    if (action === 'add-public-share-comment') {
      return await handleAddPublicShareComment(databases, body, req, res);
    }
    if (action === 'create-resume-share') {
      return await handleCreateResumeShare(databases, body, req, res);
    }
    if (action === 'list-resume-shares') {
      return await handleListResumeShares(databases, body, req, res);
    }
    if (action === 'update-resume-share') {
      return await handleUpdateResumeShare(databases, body, req, res);
    }
    if (action === 'delete-resume-share') {
      return await handleDeleteResumeShare(databases, body, req, res);
    }
    if (action === 'list-share-comments') {
      return await handleListShareComments(databases, body, req, res);
    }
    if (action === 'resolve-share-comment') {
      return await handleResolveShareComment(databases, body, req, res);
    }
    if (action === 'delete-all-resume-share-data') {
      return await handleDeleteAllResumeShareData(databases, body, req, res);
    }
    if (action === 'create-portfolio-chat-session') {
      return await handleCreatePortfolioChatSession(databases, body, req, res);
    }
    if (action === 'ask-portfolio') {
      return await handleAskPortfolio(databases, body, res);
    }
    if (action === 'portfolio-interest') {
      return await handlePortfolioInterest(databases, body, res);
    }

    return res.json({ status: 'error', message: 'Unsupported public sharing request.' }, 400);
  } catch (err) {
    error(`Public share error: ${err.message}`);
    return res.json({ status: 'error', message: 'Public share request failed.' }, 500);
  }
};

module.exports.__test = {
  generateShareToken,
  hashShareToken,
  shareTokenStorageMarker,
  hashSharePassword,
  verifySharePassword,
  isPlausibleShareToken,
  shareIsActive,
  sanitizePublicResume,
  buildNewShareDocument,
  rateLimitDocumentId,
  findShareByToken,
  issueShareAccessToken,
  validateShareAccessToken,
  handleGetResumeShare,
  handleCreateResumeShare,
  handleGetPublicShareComments,
  handleAddPublicShareComment,
  SHARE_RATE_LIMITS,
};
