'use strict';

const PROVIDER_ENDPOINTS = {
  groq:       'https://api.groq.com/openai/v1/models',
  openrouter: 'https://openrouter.ai/api/v1/models',
  deepseek:   'https://api.deepseek.com/models',
  nvidia:     'https://integrate.api.nvidia.com/v1/models',
};

// ─── Authentication ───────────────────────────────────────────────────────────
// ai-health probes server-held provider credentials, so it must not be callable
// anonymously. Any authenticated Appwrite user session is allowed (this keeps the
// in-app AI Health badge and the DevKit AI panel working — admins are users too);
// only anonymous callers are rejected. The frontend sends the user's JWT via
// X-Appwrite-JWT (see appwrite-functions invoke()).

function extractJwt(body, req) {
  const embedded = (body && typeof body.__headers === 'object' && body.__headers) || {};
  const reqHeaders = (req && typeof req.headers === 'object' && req.headers) || {};
  const fromEmbedded = embedded['X-Appwrite-JWT'] || embedded['x-appwrite-jwt'] || '';
  const authHeader =
    embedded.Authorization || embedded.authorization ||
    reqHeaders['x-appwrite-jwt'] || reqHeaders['authorization'] || reqHeaders['Authorization'] || '';
  const bearer = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  return String(fromEmbedded).trim() || bearer;
}

async function isAuthenticatedUser(jwt) {
  if (!jwt) return false;
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';
  try {
    const response = await fetch(`${endpoint}/account`, {
      method: 'GET',
      headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-JWT': jwt },
      signal: AbortSignal.timeout(6000),
    });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

module.exports = async ({ req, res, log }) => {
  // Require an authenticated Appwrite user session; reject anonymous callers.
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch { body = {}; }
  const jwt = extractJwt(body, req);
  if (!(await isAuthenticatedUser(jwt))) {
    return res.json({ status: 'unauthorized', error: 'Authentication required.' }, 401);
  }

  const timestamp = new Date().toISOString();

  // Collect every configured key across all providers
  const checks = [];
  for (const [provider, url] of Object.entries(PROVIDER_ENDPOINTS)) {
    const envVars = provider === 'deepseek'
      ? ['DEEPSEEK_KEY']
      : ['1', '2', '3'].map(n => `${provider.toUpperCase()}_KEY_${n}`);

    for (const envVar of envVars) {
      const apiKey = process.env[envVar];
      if (!apiKey) continue;
      checks.push({ provider, envVar, apiKey, url });
    }
  }

  // Probe all keys in parallel — no waiting on stragglers
  const results = await Promise.all(checks.map(async ({ provider, envVar, apiKey, url }) => {
    const start = Date.now();
    try {
      const response = await fetch(url, {
        method:  'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        signal:  AbortSignal.timeout(6000),
      });
      const ok        = response.status >= 200 && response.status < 300;
      const latencyMs = Date.now() - start;
      log(`ai-health: ${envVar} → ${response.status} (${latencyMs}ms)`);
      return { provider, envVar, ok, latencyMs, httpStatus: response.status };
    } catch (e) {
      log(`ai-health: ${envVar} → error: ${e.message}`);
      return { provider, envVar, ok: false, latencyMs: null, httpStatus: 0 };
    }
  }));

  // Aggregate per-provider: healthy if ANY key for that provider responds OK
  const providerSummary = {};
  for (const r of results) {
    if (!providerSummary[r.provider]) {
      providerSummary[r.provider] = { ok: false, latencyMs: null, keysTested: 0, keysOk: 0 };
    }
    const p = providerSummary[r.provider];
    p.keysTested++;
    if (r.ok) {
      p.keysOk++;
      p.ok = true;
      // Keep the best (lowest) latency across all keys for this provider
      if (p.latencyMs === null || r.latencyMs < p.latencyMs) p.latencyMs = r.latencyMs;
    }
  }

  const providers = Object.entries(providerSummary).map(([provider, s]) => ({
    provider,
    ok:          s.ok,
    latencyMs:   s.latencyMs,
    keysTested:  s.keysTested,
    keysOk:      s.keysOk,
    configured:  true,
  }));

  const passing = providers.filter(p => p.ok);
  const status  = providers.length === 0     ? 'unknown'
    : passing.length === providers.length    ? 'healthy'
    : passing.length > 0                     ? 'degraded'
    :                                          'down';

  const avgLatency = passing.length > 0
    ? Math.round(passing.reduce((s, p) => s + (p.latencyMs || 0), 0) / passing.length)
    : null;

  return res.json({ status, timestamp, providers, latencyMs: avgLatency });
};

// Exposed for hub regression tests (tests/hubs/ai-health-auth.test.cjs).
module.exports.__test = { extractJwt, isAuthenticatedUser };
