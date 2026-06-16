'use strict';

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

module.exports = async ({ req, res, error }) => {
  if (!API_KEY) {
    return res.json({ success: false, error: 'Appwrite API key is not configured.' }, 500);
  }

  const db = getDatabases();
  const body = parseBody(req);
  const { username } = body;

  if (!username) {
    return res.json({ 
      exists: false,
      portfolioEnabled: false,
      passwordEnabled: false,
      accentColor: '#e84545'
    });
  }

  try {
    // Get profile
    const profileRes = await db.listDocuments(DB_ID, PROFILES_COLLECTION_ID, [
      sdk.Query.equal('username', username.toLowerCase()),
      sdk.Query.limit(1),
    ]);

    if (profileRes.total === 0) {
      return res.json({
        exists: false,
        portfolioEnabled: false,
        passwordEnabled: false,
        accentColor: '#e84545'
      });
    }

    const profile = profileRes.documents[0];
    const portfolioEnabled = profile.portfolio_enabled === true || profile.portfolioEnabled === true;
    const accentColor = profile.portfolio_accent_color || profile.portfolioAccentColor || '#e84545';

    // Check password protection (server-side only, NO HASH EXPOSED)
    let passwordEnabled = false;
    if (portfolioEnabled) {
      try {
        const settingsRes = await db.listDocuments(DB_ID, PORTFOLIO_SETTINGS_COLLECTION_ID, [
          sdk.Query.equal('user_id', profile.user_id),
          sdk.Query.limit(1),
        ]);
        if (settingsRes.total > 0) {
          const settings = settingsRes.documents[0];
          passwordEnabled = !!(settings.password_enabled || settings.passwordEnabled);
        }
      } catch {
        passwordEnabled = false;
      }
    }

    // Return ONLY safe gate info (NO password_hash, NO internal fields)
    return res.json({
      success: true,
      exists: true,
      portfolioEnabled,
      passwordEnabled,
      accentColor,
    });

  } catch (err) {
    console.error('Portfolio gate error:', err);
    return res.json({
      success: false,
      exists: false,
      portfolioEnabled: false,
      passwordEnabled: false,
      accentColor: '#e84545'
    });
  }
};
