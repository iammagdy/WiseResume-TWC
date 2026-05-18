'use strict';

const crypto = require('crypto');
const { Client, Users } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function verifySignedToken(token) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function checkAuth(body) {
  const authHeader = body?.__headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const password = process.env.DEVKIT_PASSWORD;
  if (!password || !token) return false;
  if (token === password) return true;
  return verifySignedToken(token);
}

module.exports = async ({ req, res, log, error }) => {
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  if (!checkAuth(body)) {
    error('Unauthorized: Invalid or expired DevKit token');
    return res.json({ success: false, code: 'UNAUTHORIZED', error: 'Unauthorized: Session expired or invalid' }, 401);
  }

  const { action, target_user_id } = body;
  log(`admin-impersonate: action=${action} target=${target_user_id}`);

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '');
  const users = new Users(client);

  try {
    if (action === 'claim') {
      if (!target_user_id) return res.json({ success: false, error: 'Missing target_user_id' }, 400);
      const targetUser = await users.get(target_user_id);
      const expiresAt = Date.now() + 15 * 60 * 1000;
      const payload = Buffer.from(JSON.stringify({
        u: target_user_id,
        e: targetUser.email,
        x: expiresAt,
        t: 'admin-token-' + Math.random().toString(36).substring(7),
      })).toString('base64');
      return res.json({
        success: true,
        url: `/act-as#${payload}`,
        email: targetUser.email,
        userId: target_user_id,
        expiresAt,
      });
    }

    if (action === 'revoke') {
      if (!target_user_id) return res.json({ success: false, error: 'Missing target_user_id' }, 400);
      log(`Revoking all sessions for user: ${target_user_id}`);
      await users.deleteSessions(target_user_id);
      return res.json({ success: true });
    }

    return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    error('admin-impersonate error: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
