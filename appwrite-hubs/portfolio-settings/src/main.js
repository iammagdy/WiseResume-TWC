'use strict';

// portfolio-settings — owner-authenticated server-side writer for portfolio
// password protection. The `portfolio_settings` collection is intentionally
// server-only (no client read/write); the browser cannot touch it. The editor
// calls this function with the owner's Appwrite JWT; we resolve the real user_id
// server-side (NEVER trust a browser-supplied user_id), hash the password
// server-side with bcrypt (cost 12, matching what the public gate verifies),
// and upsert { user_id, password_enabled, password_hash } with the API key.
//
// Actions: 'status' (no hash returned), 'enable' (optional new password; reuses
// existing hash when toggling on without a new one), 'disable' (clears the hash).
// The response NEVER includes password_hash.

const bcrypt = require('bcryptjs');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const COLL = 'portfolio_settings';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 256;

function getDatabases() {
  return new sdk.Databases(new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
}

function parseBody(req) {
  if (typeof req.body !== 'string') {
    return req.body && typeof req.body === 'object' ? req.body : {};
  }
  const raw = req.body.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const lower = name.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return String(headers[k] || '');
  }
  return '';
}

// JWT priority: embedded __headers (how the browser wrapper sends it), then real
// request headers, then a bearer Authorization header.
function extractJwt(body, req) {
  const embedded = body && typeof body.__headers === 'object' && body.__headers ? body.__headers : {};
  const reqHeaders = (req && req.headers) || {};
  const fromEmbedded = getHeader(embedded, 'X-Appwrite-JWT');
  const fromReq = getHeader(reqHeaders, 'X-Appwrite-JWT');
  const auth = getHeader(embedded, 'Authorization') || getHeader(reqHeaders, 'Authorization');
  return fromEmbedded || fromReq || auth.replace(/^Bearer\s+/i, '').trim();
}

// Default resolver: validate the JWT against Appwrite and return the verified
// account $id. Injectable for tests.
async function resolveUserIdFromJwt(jwt) {
  if (!jwt) return null;
  try {
    const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(jwt);
    const account = new sdk.Account(client);
    const user = await account.get();
    return user && user.$id ? user.$id : null;
  } catch {
    return null;
  }
}

async function findSettingsDoc(db, userId) {
  try {
    const r = await db.listDocuments(DB_ID, COLL, [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
    return (r.documents && r.documents[0]) || null;
  } catch (e) {
    // Re-throw so callers can fail safely rather than silently upserting blind.
    throw e;
  }
}

async function upsertSettings(db, existingDoc, userId, fields) {
  if (existingDoc) {
    await db.updateDocument(DB_ID, COLL, existingDoc.$id, fields);
  } else {
    await db.createDocument(DB_ID, COLL, sdk.ID.unique(), { user_id: userId, ...fields });
  }
}

// Core request processor with injectable deps (resolveUserId, db) for testing.
// Returns { httpStatus, body } — body NEVER contains a hash.
async function processRequest({ body, req, resolveUserId, db }) {
  const userId = await resolveUserId(extractJwt(body, req));
  if (!userId) {
    return { httpStatus: 401, body: { status: 'error', code: 'unauthorized', message: 'Authentication required.' } };
  }

  const action = String(body.action || '').toLowerCase();

  let doc;
  try {
    doc = await findSettingsDoc(db, userId);
  } catch {
    return { httpStatus: 503, body: { status: 'error', code: 'read_failed', message: 'Could not read portfolio settings. Please try again.' } };
  }

  if (action === 'status') {
    return {
      httpStatus: 200,
      body: { status: 'success', passwordEnabled: !!(doc && doc.password_enabled), hasPassword: !!(doc && doc.password_hash) },
    };
  }

  if (action === 'enable') {
    const password = typeof body.password === 'string' ? body.password : '';
    let nextHash = doc && doc.password_hash ? doc.password_hash : null;
    if (password) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        return { httpStatus: 400, body: { status: 'error', code: 'weak_password', message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` } };
      }
      if (password.length > PASSWORD_MAX_LENGTH) {
        return { httpStatus: 400, body: { status: 'error', code: 'invalid', message: 'Password is too long.' } };
      }
      nextHash = await bcrypt.hash(password, 12);
    } else if (!nextHash) {
      return { httpStatus: 400, body: { status: 'error', code: 'no_password', message: 'Set a password before enabling protection.' } };
    }
    try {
      await upsertSettings(db, doc, userId, { password_enabled: true, password_hash: nextHash });
    } catch {
      return { httpStatus: 500, body: { status: 'error', code: 'write_failed', message: 'Could not save password settings.' } };
    }
    return { httpStatus: 200, body: { status: 'success', passwordEnabled: true, hasPassword: true, updated: true } };
  }

  if (action === 'disable') {
    try {
      await upsertSettings(db, doc, userId, { password_enabled: false, password_hash: null });
    } catch {
      return { httpStatus: 500, body: { status: 'error', code: 'write_failed', message: 'Could not save password settings.' } };
    }
    return { httpStatus: 200, body: { status: 'success', passwordEnabled: false, hasPassword: false, updated: true } };
  }

  return { httpStatus: 400, body: { status: 'error', code: 'bad_action', message: `Unknown action: ${action || '(none)'}` } };
}

async function handler({ req, res }) {
  if (!API_KEY) {
    return res.json({ status: 'error', message: 'Server not configured.' }, 500);
  }
  const body = parseBody(req);
  const result = await processRequest({ body, req, resolveUserId: resolveUserIdFromJwt, db: getDatabases() });
  // Safe logging only — never the password or hash.
  const act = String(body.action || '').toLowerCase();
  console.log(`[portfolio-settings] action=${act || '(none)'} -> ${result.httpStatus}`);
  return res.json(result.body, result.httpStatus);
}

module.exports = handler;
module.exports.__test = {
  extractJwt,
  getHeader,
  processRequest,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
};
