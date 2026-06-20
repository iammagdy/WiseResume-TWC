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
  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
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

    // Server-side verification
    const isValid = await verifyStoredPassword(password, storedHash);

    if (!isValid) {
      return res.json({ success: false, error: 'Invalid password' }, 401);
    }

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
