'use strict';

const crypto = require('crypto');
const { Client, Users, Databases, ID } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_FUNCTION_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID;

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getImpersonationSecret() {
  return process.env.IMPERSONATION_HMAC_SECRET
    || process.env.APPWRITE_API_KEY
    || process.env.APPWRITE_FUNCTION_API_KEY
    || '';
}

function signImpersonationPayload(encoded) {
  const secret = getImpersonationSecret();
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
}

function verifyImpersonationToken(token) {
  const secret = getImpersonationSecret();
  if (!secret || !token) return null;
  // Encoded part is base64url (no dots); the dot is solely the separator before the sig.
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx < 1) return null;
  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.x !== 'number' || Date.now() > payload.x) return null;
  return payload;
}

function verifySignedToken(token) {
  const secrets = [
    process.env.APPWRITE_API_KEY,
    process.env.APPWRITE_FUNCTION_API_KEY,
    process.env.DEVKIT_PASSWORD,
  ].filter(Boolean);
  if (!secrets.length || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const signed = secrets.some(secret => {
    const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
    const actualBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
  });
  if (!signed) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function timingSafeStringEqual(a, b) {
  const nonce = crypto.randomBytes(32);
  const h1 = crypto.createHmac('sha256', nonce).update(String(a)).digest();
  const h2 = crypto.createHmac('sha256', nonce).update(String(b)).digest();
  return crypto.timingSafeEqual(h1, h2);
}

function checkAuth(body) {
  const authHeader = body?.__headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const password = process.env.DEVKIT_PASSWORD;
  if (!token) return false;
  if (password && timingSafeStringEqual(token, password)) return true;
  return verifySignedToken(token);
}

module.exports = async ({ req, res, log, error }) => {
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  // verify is self-authenticating via HMAC — no DevKit session required.
  if (body.action === 'verify') {
    const verified = verifyImpersonationToken(body.token);
    if (!verified) return res.json({ success: false, error: 'Invalid or expired impersonation token.' }, 401);
    return res.json({ success: true, nonce: verified.t, userId: verified.u, email: verified.e, expiresAt: verified.x });
  }

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
      const nonce = crypto.randomBytes(16).toString('hex');
      const payloadObj = { t: nonce, u: target_user_id, e: targetUser.email, x: expiresAt, iat: Date.now() };
      const encoded = base64url(JSON.stringify(payloadObj));
      const sig = signImpersonationPayload(encoded);
      if (!sig) return res.json({ success: false, error: 'Server misconfiguration: signing key unavailable.' }, 500);
      const dbs = new Databases(client);
      try {
        await dbs.createDocument('main', 'admin_audit_log', ID.unique(), {
          action: 'impersonation_claimed',
          target_user_id,
          target_email: targetUser.email,
          nonce,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString(),
        });
      } catch (auditErr) {
        error('[audit] Failed to write impersonation audit log: ' + auditErr.message);
      }
      return res.json({
        success: true,
        url: `/act-as#${encoded}.${sig}`,
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
    return res.json({ success: false, error: 'An internal error occurred.' }, 500);
  }
};
