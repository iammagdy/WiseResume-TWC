'use strict';

const axios = require('axios');
const crypto = require('crypto');

const SENTRY_API_BASE = 'https://sentry.io/api/0';

// ── Helpers ──────────────────────────────────────────────────────────────────

function requestId() {
  return `sentry_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function json(res, rid, payload, status = 200) {
  return res.json({ requestId: rid, ...payload }, status);
}

function getSigningSecret() {
  const s = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  if (!s) throw new Error('APPWRITE_API_KEY is not configured');
  return s;
}

function verifySignedToken(token) {
  let secret;
  try { secret = getSigningSecret(); } catch { return false; }
  if (!token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  return verifySignedToken(bearerToken(req, body));
}

function sentryHeaders(authToken) {
  return { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' };
}

function getSentryConfig() {
  return {
    authToken: process.env.SENTRY_AUTH_TOKEN,
    // Accept both _SLUG suffix (Appwrite console convention) and bare name
    org: process.env.SENTRY_ORG_SLUG || process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT_SLUG || process.env.SENTRY_PROJECT,
    webhookSecret: process.env.SENTRY_WEBHOOK_SECRET,
  };
}

function sentryConfigured(cfg) {
  return !!(cfg.authToken && cfg.org && cfg.project);
}

// ── Sentry API calls ──────────────────────────────────────────────────────────

async function fetchIssues(cfg, { query = 'is:unresolved', limit = 25, cursor } = {}) {
  const params = { query, limit: Math.min(Number(limit), 100) };
  if (cursor) params.cursor = cursor;
  const res = await axios.get(
    `${SENTRY_API_BASE}/projects/${cfg.org}/${cfg.project}/issues/`,
    { headers: sentryHeaders(cfg.authToken), params },
  );
  // Sentry returns cursor pagination in the Link header
  const linkHeader = res.headers?.link || '';
  const nextCursor = (linkHeader.match(/cursor="([^"]+)"[^>]*rel="next"/) || [])[1] || null;
  return { issues: res.data, nextCursor };
}

async function fetchStats(cfg) {
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;
  const [issuesRes, statsRes, projectRes] = await Promise.allSettled([
    // total unresolved count (read X-Hits header)
    axios.get(`${SENTRY_API_BASE}/projects/${cfg.org}/${cfg.project}/issues/`, {
      headers: sentryHeaders(cfg.authToken),
      params: { query: 'is:unresolved', limit: 1 },
    }),
    // hourly event volume over last 24h
    axios.get(`${SENTRY_API_BASE}/projects/${cfg.org}/${cfg.project}/stats/`, {
      headers: sentryHeaders(cfg.authToken),
      params: { stat: 'received', resolution: '1h', since: dayAgo, until: now },
    }),
    // project health
    axios.get(`${SENTRY_API_BASE}/projects/${cfg.org}/${cfg.project}/`, {
      headers: sentryHeaders(cfg.authToken),
    }),
  ]);

  const totalUnresolved = issuesRes.status === 'fulfilled'
    ? parseInt(issuesRes.value.headers['x-hits'] || issuesRes.value.headers['X-Hits'] || '0', 10)
    : null;

  const hourlyEvents = statsRes.status === 'fulfilled' ? statsRes.value.data : null;

  const project = projectRes.status === 'fulfilled'
    ? { slug: projectRes.value.data?.slug, name: projectRes.value.data?.name, platform: projectRes.value.data?.platform }
    : null;

  return { totalUnresolved, hourlyEvents, project };
}

async function resolveIssue(cfg, issueId) {
  const res = await axios.put(
    `${SENTRY_API_BASE}/issues/${issueId}/`,
    { status: 'resolved' },
    { headers: sentryHeaders(cfg.authToken) },
  );
  return res.data;
}

async function ignoreIssue(cfg, issueId) {
  const res = await axios.put(
    `${SENTRY_API_BASE}/issues/${issueId}/`,
    { status: 'ignored' },
    { headers: sentryHeaders(cfg.authToken) },
  );
  return res.data;
}

// ── Webhook signature verification ────────────────────────────────────────────

function verifyWebhookSig(rawBody, signature, secret) {
  if (!secret) return true; // skip if no secret configured
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  const rid = requestId();
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {});
  } catch { body = {}; }

  const action = body?.action || req.query?.action || '';
  const cfg = getSentryConfig();

  // ── Sentry webhook (no DevKit auth; verified by Sentry signature) ──────────
  const isSentryWebhook = !!(req.headers?.['sentry-hook-resource'] || action === 'webhook');
  if (isSentryWebhook) {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    const sig = req.headers?.['sentry-hook-signature'] || '';
    if (!verifyWebhookSig(rawBody, sig, cfg.webhookSecret)) {
      return json(res, rid, { success: false, error: 'Invalid webhook signature' }, 401);
    }
    const resource = req.headers?.['sentry-hook-resource'] || body?.resource || 'unknown';
    const evt = body?.action || 'unknown';
    log(`Sentry webhook: resource=${resource} event=${evt}`);
    return json(res, rid, { success: true, received: true });
  }

  // ── All other actions require DevKit auth ──────────────────────────────────
  if (!checkAuth(req, body)) {
    return json(res, rid, { success: false, error: 'Unauthorized' }, 401);
  }

  if (!sentryConfigured(cfg)) {
    return json(res, rid, {
      success: false,
      error: 'Sentry not fully configured. Set SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, and SENTRY_PROJECT_SLUG in Appwrite function variables.',
      configured: { authToken: !!cfg.authToken, org: !!cfg.org, project: !!cfg.project },
    }, 503);
  }

  if (action === 'get-issues') {
    try {
      const result = await fetchIssues(cfg, {
        query: body?.query ?? 'is:unresolved',
        limit: body?.limit ?? 25,
        cursor: body?.cursor,
      });
      return json(res, rid, { success: true, ...result });
    } catch (err) {
      error(`get-issues: ${err.message}`);
      return json(res, rid, { success: false, error: err.message }, 500);
    }
  }

  if (action === 'get-stats') {
    try {
      const stats = await fetchStats(cfg);
      return json(res, rid, { success: true, ...stats });
    } catch (err) {
      error(`get-stats: ${err.message}`);
      return json(res, rid, { success: false, error: err.message }, 500);
    }
  }

  if (action === 'resolve-issue') {
    const issueId = body?.issueId;
    if (!issueId) return json(res, rid, { success: false, error: 'issueId is required' }, 400);
    try {
      const issue = await resolveIssue(cfg, issueId);
      return json(res, rid, { success: true, issue });
    } catch (err) {
      error(`resolve-issue: ${err.message}`);
      return json(res, rid, { success: false, error: err.message }, 500);
    }
  }

  if (action === 'ignore-issue') {
    const issueId = body?.issueId;
    if (!issueId) return json(res, rid, { success: false, error: 'issueId is required' }, 400);
    try {
      const issue = await ignoreIssue(cfg, issueId);
      return json(res, rid, { success: true, issue });
    } catch (err) {
      error(`ignore-issue: ${err.message}`);
      return json(res, rid, { success: false, error: err.message }, 500);
    }
  }

  return json(res, rid, {
    success: false,
    error: `Unknown action "${action}". Valid actions: get-issues, get-stats, resolve-issue, ignore-issue, webhook`,
  }, 400);
};
