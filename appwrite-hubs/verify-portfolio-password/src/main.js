/**
 * Verify Portfolio Password (Server-side)
 * 
 * Security fix: Prevents exposing password_hash to browser.
 * Client sends password, server returns success/failure only.
 */

const { sdk } = require('node-appwrite');

const DB_ID = 'main';
const PROFILES_COLLECTION_ID = 'profiles';
const PORTFOLIO_SETTINGS_COLLECTION_ID = 'portfolio_settings';

async function sha256Hex(password) {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

module.exports = async function (req, res) {
  const client = new sdk.Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.env['APPWRITE_API_KEY']);

  const db = new sdk.Databases(client);

  try {
    const { username, password } = JSON.parse(req.payload || '{}');
    
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
    const submittedHash = await sha256Hex(password);
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
