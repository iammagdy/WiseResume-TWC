'use strict';

const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';

function getDatabases() {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey || '');
  return new sdk.Databases(client);
}

module.exports = async ({ req, res, error }) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (body.action !== 'verify-share-password') {
      return res.json({ status: 'error', message: `Unknown public share action: ${body.action}` }, 400);
    }

    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    if (!token || !password) {
      return res.json({ status: 'success', data: { authenticated: false } });
    }

    const databases = getDatabases();
    const shareRes = await databases.listDocuments(DB_ID, 'resume_shares', [
      sdk.Query.equal('token', token),
      sdk.Query.limit(1),
    ]);
    const share = shareRes.documents[0];
    const active = !!share?.is_active && (!share.expires_at || new Date(share.expires_at).getTime() > Date.now());
    const authenticated = active && String(share?.password || '') === password;

    return res.json({ status: 'success', data: { authenticated } });
  } catch (err) {
    error(`Public share error: ${err.message}`);
    return res.json({ status: 'error', message: 'Could not verify share password.' }, 500);
  }
};
