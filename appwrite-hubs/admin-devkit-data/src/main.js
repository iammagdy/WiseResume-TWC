/**
 * admin-devkit-data — Appwrite Function
 *
 * Serves multiple DevKit admin panels: Mission Control, Analytics, etc.
 */

const sdk = require('node-appwrite');
const axios = require('axios');

const DB_ID = 'main';

// ─── Appwrite client factory ──────────────────────────────────────────────────

function getClients() {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    databases: new sdk.Databases(client),
    functions: new sdk.Functions(client),
    users: new sdk.Users(client),
  };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function checkAuth(req, body) {
  const password = process.env.DEVKIT_PASSWORD;
  if (!password) return false;
  
  // Appwrite SDK executions don't support custom headers, so the frontend
  // passes them in the body as __headers.
  const authHeader = body?.__headers?.Authorization || req.headers['authorization'] || req.headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  return token === password;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoNow() {
  return new Date().toISOString();
}

async function safeList(databases, collectionId, queries = []) {
  try {
    const result = await databases.listDocuments(DB_ID, collectionId, queries);
    return result.documents;
  } catch {
    return [];
  }
}

async function safeCount(databases, collectionId, queries = []) {
  try {
    const result = await databases.listDocuments(DB_ID, collectionId, [
      ...queries,
      sdk.Query.limit(1),
    ]);
    return result.total;
  } catch {
    return 0;
  }
}

// ─── MISSION CONTROL ─────────────────────────────────────────────────────────

async function handleMissionControl(log, error) {
  const { databases } = getClients();
  const now = isoNow();

  let deploy = {
    ok: false,
    lastCommitAt: null,
    sha: null,
    branch: 'main',
    repoConfigured: false,
    repoUrl: null,
    productionUrl: process.env.PRODUCTION_URL || 'https://thewise.cloud',
    siteUp: false,
    sitePingedAt: now,
    siteHttpStatus: 0,
  };

  const githubToken = process.env.GITHUB_TOKEN;
  const repoSlug = 'iammagdy/WiseResume-TWC';

  if (githubToken) {
    try {
      const ghRes = await axios.get(
        `https://api.github.com/repos/${repoSlug}/commits/main`,
        {
          headers: { Authorization: `Bearer ${githubToken}`, 'User-Agent': 'WiseCloud-DevKit/1.0' },
          timeout: 6000,
        },
      );
      deploy.repoConfigured = true;
      deploy.repoUrl = `https://github.com/${repoSlug}`;
      deploy.sha = ghRes.data.sha?.slice(0, 7) ?? null;
      deploy.lastCommitAt = ghRes.data.commit?.committer?.date ?? null;
      deploy.ok = true;
    } catch (e) {
      error(`GitHub fetch failed: ${e.message}`);
      deploy.repoConfigured = true;
      deploy.repoUrl = `https://github.com/${repoSlug}`;
    }
  }

  try {
    const siteRes = await axios.get(deploy.productionUrl, { timeout: 8000, validateStatus: () => true });
    deploy.siteUp = siteRes.status < 400;
    deploy.siteHttpStatus = siteRes.status;
    deploy.sitePingedAt = isoNow();
  } catch (e) {
    error(`Site ping failed: ${e.message}`);
    deploy.siteHttpStatus = 0;
  }

  const providerPings = [];
  const providerConfigs = [
    { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models', configuredKey: 'openrouterConfigured' },
    { key: 'GROQ_KEY_1',       provider: 'groq',        url: 'https://api.groq.com/openai/v1/models', configuredKey: 'groqConfigured' },
  ];

  let openrouterConfigured = !!process.env.OPENROUTER_KEY_1;
  let groqConfigured = !!process.env.GROQ_KEY_1;

  for (const cfg of providerConfigs) {
    const apiKey = process.env[cfg.key];
    if (!apiKey) {
      providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 });
      continue;
    }

    const start = Date.now();
    try {
      const r = await axios.get(cfg.url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 6000,
        validateStatus: () => true,
      });
      providerPings.push({
        provider: cfg.provider,
        ok: r.status >= 200 && r.status < 300,
        latencyMs: Date.now() - start,
        httpStatus: r.status,
      });
    } catch {
      providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 });
    }
  }

  const anyProviderOk = providerPings.some(p => p.ok);
  const allProvidersOk = providerPings.length > 0 && providerPings.every(p => p.ok);

  const resendKey = process.env.RESEND_API_KEY;
  let email = {
    resendKeyPresent: !!resendKey,
    reachable: false,
    httpStatus: 0,
    reason: resendKey ? undefined : 'missing_key',
  };

  if (resendKey) {
    try {
      const rRes = await axios.get('https://api.resend.com/emails', {
        headers: { Authorization: `Bearer ${resendKey}` },
        timeout: 5000,
        validateStatus: () => true,
      });
      email.reachable = rRes.status < 500;
      email.httpStatus = rRes.status;
    } catch {
      email.httpStatus = 0;
    }
  }

  let database = { ok: false, error: null, errorCount1h: null };
  try {
    await databases.listDocuments(DB_ID, 'feature_flags', [sdk.Query.limit(1)]);
    database.ok = true;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    database.errorCount1h = await safeCount(databases, 'error_log', [
      sdk.Query.greaterThanEqual('$createdAt', oneHourAgo),
    ]);
  } catch (e) {
    database.error = e.message;
  }

  const secretDefs = [
    { key: 'DEVKIT_PASSWORD',   label: 'DevKit password',  envKey: 'DEVKIT_PASSWORD' },
    { key: 'RESEND_API_KEY',    label: 'Resend API key',   envKey: 'RESEND_API_KEY' },
    { key: 'APPWRITE_API_KEY',  label: 'Appwrite API key', envKey: 'APPWRITE_API_KEY' },
  ];

  const secretItems = secretDefs.map(def => ({
    key: def.key,
    label: def.label,
    present: !!process.env[def.envKey],
    source: 'appwrite_function_variable',
  }));

  const recentErrorDocs = await safeList(databases, 'error_log', [
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(10),
  ]);
  const recentErrors = recentErrorDocs.map(d => ({
    id: d.$id,
    message: d.message || '',
    context: d.context || null,
    created_at: d.$createdAt,
    level: d.level || 'error',
  }));

  const recentAdminDocs = await safeList(databases, 'admin_audit_logs', [
    sdk.Query.orderDesc('$createdAt'),
    sdk.Query.limit(5),
  ]);
  const recentAdminActions = recentAdminDocs.map(d => ({
    id: d.$id,
    action: d.action || '',
    category: d.category || null,
    metadata: d.metadata || null,
    created_at: d.$createdAt,
    user_id: d.user_id || null,
  }));

  return {
    isDevEnvironment: process.env.NODE_ENV !== 'production',
    checkedAt: now,
    deploy,
    ai: {
      providerPings,
      openrouterConfigured,
      groqConfigured,
      anyProviderOk,
      allProvidersOk,
    },
    email,
    database,
    secrets: {
      items: secretItems,
      missingCount: secretItems.filter(s => !s.present).length,
    },
    recentErrors,
    recentAdminActions,
  };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────

module.exports = async ({ req, res, log, error }) => {
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  if (!checkAuth(req, body)) {
    return res.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const { action } = body;

  try {
    if (action === 'mission-control') {
      const data = await handleMissionControl(log, error);
      return res.json({ success: true, data });
    }

    if (action === 'update-plan') {
      const { user_id, plan } = body;
      if (!user_id || !plan) {
        return res.json({ success: false, error: 'Missing user_id or plan' }, 400);
      }
      const { databases } = getClients();
      const existing = await databases.listDocuments(DB_ID, 'subscriptions', [
        sdk.Query.equal('user_id', user_id),
        sdk.Query.limit(1),
      ]);
      if (existing.total > 0) {
        await databases.updateDocument(DB_ID, 'subscriptions', existing.documents[0].$id, { plan });
      } else {
        await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { user_id, plan });
      }
      log(`update-plan: set user ${user_id} → ${plan}`);
      return res.json({ success: true, plan });
    }

    return res.json({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    error(`DevKit Data Error: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
