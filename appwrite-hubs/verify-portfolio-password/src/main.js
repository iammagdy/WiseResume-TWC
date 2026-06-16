'use strict';

const crypto = require('crypto');
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

module.exports = async ({ req, res, error }) => {
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

    if (!passwordEnabled || !storedHash) {
      return res.json({ success: true, protected: false }); // No password protection
    }

    // Server-side verification
    const submittedHash = sha256Hex(password);
    const isValid = submittedHash === storedHash;

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
};
