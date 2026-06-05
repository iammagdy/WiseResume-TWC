'use strict';

const sdk = require('node-appwrite');
const axios = require('axios');
const crypto = require('crypto');

const DB_ID = 'main';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://resume.thewise.cloud';
// Authoritative admin identity — must be set via ADMIN_EMAIL env variable.
// No hard-coded fallback: when absent, admin-only paths fail closed.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();

// ─── Phase-4: Cold-start startup validation ───────────────────────────────────
(function performStartupValidation() {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  if (!apiKey) {
    console.error('[ALERT] admin-devkit-data: APPWRITE_API_KEY not configured — all DB operations will fail');
  }
  if (!ADMIN_EMAIL) {
    console.error('[ALERT] admin-devkit-data: ADMIN_EMAIL not set — all DevKit actions will be inaccessible');
  }
})();

function requestId() {
  return `dk_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function json(res, requestIdValue, payload, status = 200) {
  return res.json({ requestId: requestIdValue, ...payload }, status);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function getSigningSecret() {
  // Use APPWRITE_API_KEY as the HMAC signing secret for DevKit session tokens.
  const s = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  if (!s) throw new Error('APPWRITE_API_KEY is not configured');
  return s;
}

function signToken(payload) {
  const secret = getSigningSecret();
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token) {
  let secret;
  try { secret = getSigningSecret(); } catch { return false; }
  if (!token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const actualBuffer   = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return false;
  let payload;
  try { payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); } catch { return false; }
  return payload.purpose === 'devkit' && typeof payload.exp === 'number' && Date.now() < payload.exp;
}

function bearerToken(req, body) {
  const authHeader = body?.__headers?.Authorization || req.headers?.authorization || req.headers?.Authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
}

function checkAuth(req, body) {
  const token = bearerToken(req, body);
  if (!token) return false;
  return verifySignedToken(token);
}

function getClients() {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey || '');
  return {
    databases: new sdk.Databases(client),
    functions: new sdk.Functions(client),
    users: new sdk.Users(client),
  };
}

function envPresent(key) { return !!process.env[key]; }
function isoNow() { return new Date().toISOString(); }
function asQuery(query) { return typeof query === 'string' ? query : JSON.stringify(query); }

async function appwriteGet(path, queries = []) {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY is not configured');
  const url = new URL(`${ENDPOINT}${path}`);
  for (const query of queries) url.searchParams.append('queries[]', asQuery(query));
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': apiKey,
    },
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) {
    const message = payload?.message || `Appwrite GET ${path} failed with HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.type = payload?.type;
    throw err;
  }
  return payload;
}

async function getAccountFromJwt(jwt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${ENDPOINT}/account`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-JWT': jwt,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
    if (!response.ok) {
      const message = payload?.message || `Appwrite account lookup failed with HTTP ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function listUsers(queries = []) {
  return appwriteGet('/users', queries);
}

async function getUser(userId) {
  return appwriteGet(`/users/${encodeURIComponent(userId)}`);
}

async function listFunctions(queries = []) {
  return appwriteGet('/functions', queries);
}

async function listFunctionExecutions(functionId, queries = []) {
  return appwriteGet(`/functions/${encodeURIComponent(functionId)}/executions`, queries);
}

async function getFunctionExecution(functionId, executionId) {
  return appwriteGet(`/functions/${encodeURIComponent(functionId)}/executions/${encodeURIComponent(executionId)}`);
}

async function listFunctionVariables(functionId) {
  return appwriteGet(`/functions/${encodeURIComponent(functionId)}/variables`);
}

async function listCollections(queries = []) {
  return appwriteGet(`/databases/${encodeURIComponent(DB_ID)}/collections`, queries);
}

async function listDocuments(collectionId, queries = []) {
  return appwriteGet(`/databases/${encodeURIComponent(DB_ID)}/collections/${encodeURIComponent(collectionId)}/documents`, queries);
}

async function getDocument(collectionId, documentId) {
  return appwriteGet(`/databases/${encodeURIComponent(DB_ID)}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(documentId)}`);
}

function chunk(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
}

async function listAllAuthUsers() {
  const users = [];
  let offset = 0;
  let total = 0;
  do {
    const page = await listUsers([sdk.Query.limit(100), sdk.Query.offset(offset)]);
    total = page.total || 0;
    users.push(...(page.users || []));
    offset += 100;
  } while (users.length < total);
  return { users, total };
}

async function countDocumentsForUserIds(collectionId, userIds) {
  if (!userIds.length) return 0;
  const counts = await Promise.all(chunk(userIds, 100).map(async ids => {
    const page = await safeList(null, collectionId, [sdk.Query.equal('user_id', ids), sdk.Query.limit(1)]);
    return page.total || 0;
  }));
  return counts.reduce((sum, count) => sum + count, 0);
}

async function safeList(databases, collectionId, queries = []) {
  try { return await listDocuments(collectionId, queries); }
  catch (e) { return { documents: [], total: 0, error: e.message }; }
}

async function auditLog(databases, action, metadata = {}, actorId = null) {
  try {
    await databases.createDocument(DB_ID, 'admin_audit_logs', sdk.ID.unique(), {
      action,
      category: 'devkit',
      metadata: JSON.stringify(metadata),
      user_id: actorId,
    });
  } catch (_) {}
}

function item(group, id, label, status, summary, detail) {
  return { group, id, label, status, summary, detail };
}

function worstStatus(items) {
  if (items.some(i => i.status === 'broken')) return 'broken';
  if (items.some(i => i.status === 'warning')) return 'warning';
  if (items.some(i => i.status === 'not_configured')) return 'warning';
  return 'healthy';
}

async function verifyDevKitSession(body) {
  // Verify the caller's Appwrite JWT and confirm the account email matches ADMIN_EMAIL.
  const jwt = body?.__headers?.['X-Appwrite-JWT'];
  if (!jwt) {
    return { success: false, code: 'UNAUTHORIZED', error: 'No Appwrite session found. Please sign in first.' };
  }
  try {
    const user      = await getAccountFromJwt(jwt);
    if (!user.email || user.email.toLowerCase().trim() !== ADMIN_EMAIL) {
      return { success: false, code: 'UNAUTHORIZED', error: 'Access denied.' };
    }
    const now         = Date.now();
    const expiresAtMs = now + SESSION_TTL_MS;
    const token = signToken({ purpose: 'devkit', iat: now, exp: expiresAtMs, version: 2, uid: user.$id });
    return {
      success: true,
      session: { token, expiresAt: new Date(expiresAtMs).toISOString(), email: user.email },
    };
  } catch {
    return { success: false, code: 'UNAUTHORIZED', error: 'Session verification failed. Please sign in again.' };
  }
}

async function handleDiagnostics(log, error) {
  const items = [];

  items.push(item('Access', 'devkit-password', 'DevKit Password', envPresent('DEVKIT_PASSWORD') ? 'healthy' : 'warning', envPresent('DEVKIT_PASSWORD') ? 'DEVKIT_PASSWORD is present.' : 'DEVKIT_PASSWORD is missing.', 'Optional legacy fallback only. Primary DevKit auth uses Appwrite session verification and signed tokens.'));
  items.push(item('Access', 'appwrite-api-key', 'Appwrite API Key', envPresent('APPWRITE_API_KEY') || envPresent('APPWRITE_FUNCTION_API_KEY') ? 'healthy' : 'broken', envPresent('APPWRITE_API_KEY') || envPresent('APPWRITE_FUNCTION_API_KEY') ? 'Server API key is present.' : 'Server API key is missing.', 'Required for cross-user admin reads.'));

  try {
    const authUsers = await listUsers([sdk.Query.limit(1)]);
    items.push(item('Access', 'auth-users', 'Auth Users API', 'healthy', `Users API reachable. Total auth users: ${authUsers.total}.`));
  } catch (e) {
    items.push(item('Access', 'auth-users', 'Auth Users API', 'broken', 'Users API could not be reached.', e.message));
  }

  const requiredFunctions = [
    'admin-devkit-data', 'inspect-ai-keys', 'ai-gateway', 'admin-feature-flags',
    'admin-email', 'admin-testmail', 'admin-visitor-analytics',
    'admin-impersonate', 'admin-onboarding-funnel', 'admin-portfolio-usernames', 'admin-moderation',
    'coupons', 'wisehire-gateway', 'public-share',
  ];
  try {
    const fnPage = await listFunctions([sdk.Query.limit(200)]);
    for (const fn of requiredFunctions) {
      const found = fnPage.functions.find(f => f.$id === fn || f.name === fn);
      items.push(item('Functions', `fn-${fn}`, fn, found ? (found.enabled ? 'healthy' : 'warning') : 'broken', found ? `${fn} is deployed${found.enabled ? ' and enabled' : ' but disabled'}.` : `${fn} is not deployed.`, found ? `Runtime: ${found.runtime || 'unknown'}` : 'Deploy the Appwrite Function from appwrite-hubs.'));
    }
  } catch (e) {
    items.push(item('Functions', 'functions-list', 'Function Inventory', 'broken', 'Could not list Appwrite Functions.', e.message));
  }

  const requiredCollections = ['profiles', 'subscriptions', 'ai_credits', 'resumes', 'admin_audit_logs', 'audit_logs', 'feature_flags', 'error_log', 'edge_function_logs', 'discount_codes', 'app_settings', 'usage_events', 'visitor_events', 'contact_requests', 'notifications', 'ai_routing_config', 'wisehire_accounts', 'wisehire_invites', 'wisehire_waitlist', 'bug_reports', 'blocklist', 'moderation_queue'];
  try {
    const collPage = await listCollections([sdk.Query.limit(200)]);
    for (const coll of requiredCollections) {
      const found = collPage.collections.find(c => c.$id === coll);
      items.push(item('Database', `coll-${coll}`, coll, found ? 'healthy' : 'not_configured', found ? `${coll} collection exists.` : `${coll} collection is missing.`, found ? `Attributes: ${(found.attributes || []).map(a => a.key).join(', ') || 'none'}` : 'Create the collection or keep dependent panels marked as needing schema.'));
    }
  } catch (e) {
    items.push(item('Database', 'collections-list', 'Collection Inventory', 'broken', 'Could not list Appwrite collections.', e.message));
  }

  const providerEnv = [
    ['OPENROUTER_KEY_1', 'OpenRouter primary'],
    ['OPENROUTER_KEY_2', 'OpenRouter secondary'],
    ['GROQ_KEY_1', 'Groq primary'],
    ['DEEPSEEK_KEY', 'DeepSeek'],
    ['NVIDIA_KEY_1', 'NVIDIA NIM primary'],
  ];
  for (const [key, label] of providerEnv) {
    items.push(item('Providers', `env-${key}`, label, envPresent(key) ? 'healthy' : 'not_configured', envPresent(key) ? `${label} key is present.` : `${label} key is not configured.`, key));
  }

  items.push(item('Email', 'resend-key', 'Resend API Key', envPresent('RESEND_API_KEY') ? 'healthy' : 'not_configured', envPresent('RESEND_API_KEY') ? 'RESEND_API_KEY is present.' : 'RESEND_API_KEY is not configured.', 'Email center and Testmail send test require this.'));
  items.push(item('Email', 'testmail-key', 'Testmail API Key', envPresent('TESTMAIL_API_KEY') ? 'healthy' : 'not_configured', envPresent('TESTMAIL_API_KEY') ? 'TESTMAIL_API_KEY is present.' : 'TESTMAIL_API_KEY is not configured.', 'Testmail inbox requires this.'));

  try {
    const site = await axios.get(PRODUCTION_URL, { timeout: 8000, validateStatus: () => true });
    items.push(item('Production', 'production-url', 'Production URL', site.status < 400 ? 'healthy' : 'warning', `${PRODUCTION_URL} returned HTTP ${site.status}.`, 'Default is resume.thewise.cloud.'));
  } catch (e) {
    items.push(item('Production', 'production-url', 'Production URL', 'broken', `${PRODUCTION_URL} is unreachable.`, e.message));
  }

  log(`diagnostics: ${items.length} checks overall=${worstStatus(items)}`);
  return { checkedAt: isoNow(), overallStatus: worstStatus(items), items };
}

// ─── Provider pings (shared by mission-control and ping-providers) ─────────────

const PROVIDER_PING_CONFIGS = [
  { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models' },
  { key: 'GROQ_KEY_1',       provider: 'groq',       url: 'https://api.groq.com/openai/v1/models' },
  { key: 'DEEPSEEK_KEY',     provider: 'deepseek',   url: 'https://api.deepseek.com/models' },
  { key: 'NVIDIA_KEY_1',     provider: 'nvidia',     url: 'https://integrate.api.nvidia.com/v1/models' },
];

async function runProviderPings() {
  const results = [];
  for (const cfg of PROVIDER_PING_CONFIGS) {
    const apiKey = process.env[cfg.key];
    if (!apiKey) { results.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0, configured: false }); continue; }
    const start = Date.now();
    try {
      const r = await axios.get(cfg.url, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 6000, validateStatus: () => true });
      results.push({ provider: cfg.provider, ok: r.status >= 200 && r.status < 300, latencyMs: Date.now() - start, httpStatus: r.status, configured: true });
    } catch { results.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0, configured: true }); }
  }
  return results;
}

async function handlePingProviders() {
  const pings = await runProviderPings();
  return { pings, checkedAt: isoNow() };
}

async function handleListProviderModels(body, log) {
  const { databases } = getClients();
  const CACHE_KEY = 'ai_model_catalog';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  // Return cached result if fresh enough and not forced
  if (!body.force_refresh) {
    const cached = await safeList(databases, 'app_settings', [sdk.Query.equal('key', CACHE_KEY), sdk.Query.limit(1)]);
    if (cached.documents?.length > 0) {
      try {
        const parsed = JSON.parse(cached.documents[0].value || '{}');
        if (parsed.cachedAt && Date.now() - new Date(parsed.cachedAt).getTime() < CACHE_TTL_MS) {
          log('list-provider-models: returning cached catalog');
          return parsed;
        }
      } catch (_) {}
    }
  }

  const providerDefs = [
    { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models',         parseModels: parseOpenRouterModels },
    { key: 'GROQ_KEY_1',       provider: 'groq',       url: 'https://api.groq.com/openai/v1/models',       parseModels: parseGroqModels },
    { key: 'NVIDIA_KEY_1',     provider: 'nvidia',     url: 'https://integrate.api.nvidia.com/v1/models',  parseModels: parseNvidiaModels },
    { key: 'DEEPSEEK_KEY',     provider: 'deepseek',   url: 'https://api.deepseek.com/models',             parseModels: parseDeepseekModels },
  ];

  const catalog = { openrouter: [], groq: [], nvidia: [], deepseek: [], cachedAt: isoNow() };
  for (const def of providerDefs) {
    const apiKey = process.env[def.key];
    if (!apiKey) continue;
    try {
      const r = await axios.get(def.url, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 8000, validateStatus: () => true });
      if (r.status >= 200 && r.status < 300 && r.data) {
        catalog[def.provider] = def.parseModels(r.data);
        log(`list-provider-models: fetched ${catalog[def.provider].length} models from ${def.provider}`);
      }
    } catch (e) { log(`[warn] list-provider-models: ${def.provider} fetch failed: ${e.message}`); }
  }

  // Cache the result
  try {
    const serialized = JSON.stringify(catalog);
    const existing = await safeList(databases, 'app_settings', [sdk.Query.equal('key', CACHE_KEY), sdk.Query.limit(1)]);
    if (existing.documents?.length > 0) {
      await databases.updateDocument(DB_ID, 'app_settings', existing.documents[0].$id, { value: serialized });
    } else {
      await databases.createDocument(DB_ID, 'app_settings', sdk.ID.unique(), { key: CACHE_KEY, value: serialized });
    }
  } catch (e) { log(`[warn] list-provider-models: cache write failed: ${e.message}`); }

  return catalog;
}

function parseOpenRouterModels(data) {
  const models = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.models) ? data.models : []);
  return models
    .filter(m => m && (m.id || m.model_id))
    .map(m => {
      const id = String(m.id || m.model_id || '');
      const label = m.name || id;
      const isFree = id.endsWith(':free') || (m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0);
      return { label, value: id, tier: isFree ? 'free' : 'paid' };
    })
    .sort((a, b) => (a.tier === 'free' ? -1 : 1) - (b.tier === 'free' ? -1 : 1) || a.label.localeCompare(b.label));
}

function parseGroqModels(data) {
  const models = Array.isArray(data?.data) ? data.data : [];
  return models
    .filter(m => m && m.id && m.active !== false)
    .map(m => ({ label: m.id, value: m.id, tier: 'free' }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function parseNvidiaModels(data) {
  const models = Array.isArray(data?.data) ? data.data : [];
  return models
    .filter(m => m && m.id)
    .map(m => ({ label: m.id, value: m.id, tier: 'paid' }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function parseDeepseekModels(data) {
  const models = Array.isArray(data?.data) ? data.data : [];
  return models
    .filter(m => m && m.id)
    .map(m => ({ label: m.id, value: m.id, tier: 'paid' }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function handleMissionControl(log, error) {
  const { databases } = getClients();
  const now = isoNow();
  const deploy = {
    ok: false,
    lastCommitAt: null,
    sha: null,
    branch: 'main',
    repoConfigured: !!process.env.GITHUB_TOKEN,
    repoUrl: 'https://github.com/iammagdy/WiseResume-TWC',
    productionUrl: PRODUCTION_URL,
    siteUp: false,
    sitePingedAt: now,
    siteHttpStatus: 0,
  };

  if (process.env.GITHUB_TOKEN) {
    try {
      const ghRes = await axios.get('https://api.github.com/repos/iammagdy/WiseResume-TWC/commits/main', {
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'User-Agent': 'WiseCloud-DevKit/1.0' },
        timeout: 6000,
      });
      deploy.sha = ghRes.data.sha?.slice(0, 7) ?? null;
      deploy.lastCommitAt = ghRes.data.commit?.committer?.date ?? null;
      deploy.ok = true;
    } catch (e) { error(`GitHub fetch failed: ${e.message}`); }
  }

  try {
    const siteRes = await axios.get(deploy.productionUrl, { timeout: 8000, validateStatus: () => true });
    deploy.siteUp = siteRes.status < 400;
    deploy.siteHttpStatus = siteRes.status;
    deploy.sitePingedAt = isoNow();
  } catch (e) { error(`Site ping failed: ${e.message}`); }

  const providerPings = await runProviderPings();

  const errorDocs = await safeList(databases, 'error_log', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(10)]);
  const adminDocs = await safeList(databases, 'admin_audit_logs', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(5)]);

  return {
    isDevEnvironment: process.env.NODE_ENV !== 'production',
    checkedAt: now,
    deploy,
    ai: {
      providerPings,
      openrouterConfigured: !!process.env.OPENROUTER_KEY_1,
      openrouter2Configured: !!process.env.OPENROUTER_KEY_2,
      groqConfigured: !!process.env.GROQ_KEY_1,
      anyProviderOk: providerPings.some(p => p.ok),
      allProvidersOk: providerPings.length > 0 && providerPings.every(p => p.ok),
      keysConfigured: providerPings.some(p => p.ok),
      keysInAppwriteVars: providerPings.some(p => p.configured),
    },
    email: { resendKeyPresent: !!process.env.RESEND_API_KEY, reachable: !!process.env.RESEND_API_KEY, httpStatus: 0, sends24h: null, keyInAppwriteVars: false, reason: process.env.RESEND_API_KEY ? undefined : 'missing_key' },
    database: { ok: !errorDocs.error, error: errorDocs.error || null, errorCount1h: errorDocs.total },
    secrets: {
      items: ['DEVKIT_PASSWORD', 'APPWRITE_API_KEY', 'RESEND_API_KEY'].map(key => ({ key, label: key, present: envPresent(key), source: 'appwrite_function_variable', lastRotatedAt: null, stale: false, daysSinceRotation: null })),
      missingCount: ['APPWRITE_API_KEY'].filter(k => !envPresent(k)).length,
      staleCount: 0,
    },
    recentErrors: errorDocs.documents.map(d => ({ id: d.$id, message: d.message || '', context: d.context || null, created_at: d.$createdAt, level: d.level || 'error' })),
    recentAdminActions: adminDocs.documents.map(d => ({ id: d.$id, action: d.action || '', category: d.category || null, metadata: d.metadata || null, created_at: d.$createdAt, user_id: d.user_id || null })),
  };
}

async function handleEdgeFnDrift(log) {
  const now = isoNow();
  try {
    const page = await listFunctions([sdk.Query.limit(200)]);
    const functions = page.functions || [];
    const updatedAtValues = functions
      .map(fn => fn.$updatedAt || fn.dateUpdated || fn.dateCreated || null)
      .filter(Boolean)
      .sort();
    return {
      checkedAt: now,
      projectRef: PROJECT_ID,
      deployedCount: functions.length,
      freshness: {
        oldestDeployedAt: updatedAtValues[0] || null,
        newestDeployedAt: updatedAtValues[updatedAtValues.length - 1] || null,
        olderThan30d: updatedAtValues.filter(value => Date.now() - new Date(value).getTime() > 30 * 86400000).length,
      },
      authPosture: {
        total: functions.length,
        pass: functions.filter(fn => fn.enabled !== false).length,
        fail: functions.filter(fn => fn.enabled === false).length,
        knownDriftCount: 0,
        failures: [],
        knownDrifts: [],
        defaultExpected: 200,
      },
    };
  } catch (err) {
    log(`[warn] fn-drift: ${err.message}`);
    return {
      checkedAt: now,
      projectRef: PROJECT_ID,
      deployedCount: 0,
      freshness: {
        oldestDeployedAt: null,
        newestDeployedAt: null,
        olderThan30d: 0,
      },
      authPosture: {
        total: 0,
        pass: 0,
        fail: 0,
        knownDriftCount: 0,
        failures: [{ name: 'functions.read', expected: 1, got: 0, note: err.message }],
        knownDrifts: [],
        defaultExpected: 200,
      },
    };
  }
}

async function handleObservability(body, log) {
  const { databases } = getClients();
  const obs = body.obs_action;

  if (obs === 'get_telemetry') {
    const res = await safeList(databases, 'edge_function_logs', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(500),
    ]);
    if (res.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error)) {
      return { telemetry: [], missing_table: true };
    }
    if (res.error) {
      return { telemetry: [], missing_table: false };
    }

    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    const BUCKET_COUNT = 12;
    const BUCKET_MS = ONE_HOUR / BUCKET_COUNT;

    const byFn = {};
    for (const doc of res.documents) {
      const fn = doc.function_name || 'unknown';
      if (!byFn[fn]) byFn[fn] = { total: 0, last1h: 0, errors: 0, durations: [], buckets: new Array(BUCKET_COUNT).fill(0) };
      byFn[fn].total += 1;
      const age = now - new Date(doc.$createdAt).getTime();
      if (age < ONE_HOUR) {
        byFn[fn].last1h += 1;
        const bucketIdx = Math.min(BUCKET_COUNT - 1, Math.floor(age / BUCKET_MS));
        byFn[fn].buckets[BUCKET_COUNT - 1 - bucketIdx] += 1;
      }
      const isError = (doc.status_code && doc.status_code >= 400) || (doc.level || '').toLowerCase() === 'error';
      if (isError) byFn[fn].errors += 1;
      if (typeof doc.duration_ms === 'number' && doc.duration_ms >= 0) byFn[fn].durations.push(doc.duration_ms);
    }

    const telemetry = Object.entries(byFn).map(([function_name, c]) => {
      const sorted = [...c.durations].sort((a, b) => a - b);
      const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
      const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      return {
        function_name,
        total_count: c.total,
        last_1h_count: c.last1h,
        error_count: c.errors,
        error_rate: c.total > 0 ? Math.round((c.errors / c.total) * 10000) / 100 : 0,
        p50_ms: p50,
        p95_ms: p95,
        sparkline: c.buckets,
      };
    });

    log(`observability/get_telemetry: ${telemetry.length} rows from edge_function_logs`);
    return { telemetry, missing_table: false };
  }

  if (obs === 'get_error_stream') {
    const queries = [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(100)];
    if (body.since) {
      try { queries.push(sdk.Query.greaterThanEqual('$createdAt', body.since)); } catch (_) {}
    }
    const res = await safeList(databases, 'error_log', queries);
    if (res.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error)) {
      return { errors: [], missing_table: true };
    }
    let docs = res.documents || [];
    if (body.severity && body.severity !== 'all') {
      docs = docs.filter(d => (d.level || 'error').toLowerCase().startsWith(body.severity));
    }
    if (body.function_name) {
      const fn = body.function_name.toLowerCase();
      docs = docs.filter(d => (d.source || '').toLowerCase().includes(fn) || (d.context || '').toLowerCase().includes(fn));
    }
    const errors = docs.map(d => ({
      id: d.$id,
      message: d.message || '',
      context: (() => { try { return JSON.parse(d.context || 'null'); } catch { return d.context || null; } })(),
      source: d.source || null,
      level: d.level || 'error',
      user_id: d.user_id || null,
      resolved: d.resolved ?? false,
      reviewed_at: d.reviewed_at || null,
      created_at: d.$createdAt,
    }));
    log(`observability/get_error_stream: ${errors.length} entries`);
    return { errors, missing_table: false };
  }

  if (obs === 'mark_reviewed') {
    const errorId = body.error_id;
    if (!errorId) throw new Error('Missing error_id');
    await databases.updateDocument(DB_ID, 'error_log', errorId, {
      resolved: true,
      reviewed_at: isoNow(),
    });
    log(`observability/mark_reviewed: ${errorId}`);
    return { ok: true };
  }

  throw new Error(`Unknown obs_action: ${obs}`);
}

async function handleOverviewStats(log) {
  const auth = await listAllAuthUsers();
  const authUserIds = auth.users.map(u => u.$id);
  const resumeRes = await safeList(null, 'resumes', [sdk.Query.limit(1)]);
  const activeUserOwnedResumes = await countDocumentsForUserIds('resumes', authUserIds);
  const orphanedResumes = Math.max(0, (resumeRes.total || 0) - activeUserOwnedResumes);
  return {
    totalAuthUsers: auth.total,
    verifiedUsers: auth.users.filter(u => u.emailVerification).length,
    totalResumes: activeUserOwnedResumes,
    rawResumeDocuments: resumeRes.total || 0,
    orphanedResumes,
    unverifiedUsers: auth.users
      .filter(u => !u.emailVerification)
      .map(u => ({ user_id: u.$id, email: u.email || null, name: u.name || null, created_at: u.$createdAt }))
      .slice(0, 10),
  };
}

async function handleGlobalStats(log) {
  const [profiles, premium, pro, suspended] = await Promise.all([
    safeList(null, 'profiles', [sdk.Query.limit(1)]),
    safeList(null, 'subscriptions', [sdk.Query.equal('plan', 'premium'), sdk.Query.limit(1)]),
    safeList(null, 'subscriptions', [sdk.Query.equal('plan', 'pro'), sdk.Query.limit(1)]),
    safeList(null, 'profiles', [sdk.Query.equal('is_suspended', true), sdk.Query.limit(1)]),
  ]);
  const auth = await listUsers([sdk.Query.limit(1)]);
  return { total: auth.total, profilesTotal: profiles.total, premium: premium.total, pro: pro.total, suspended: suspended.total, activeToday: 0 };
}

async function handleListUsersPage(body, log) {
  const pageSize = Math.min(Math.max(1, Number(body.pageSize || body.per_page) || 25), 100);
  const requestedPage = Number(body.page);
  const page = Number.isFinite(requestedPage)
    ? Math.max(0, requestedPage > 0 && body.per_page ? requestedPage - 1 : requestedPage)
    : 0;
  const search = String(body.search || body.query || '').trim().toLowerCase();
  const filterUnconfirmed = body.filter_unconfirmed === true;

  let authPage;
  if (search || filterUnconfirmed) {
    const all = await listAllAuthUsers();
    let users = all.users || [];
    if (filterUnconfirmed) users = users.filter(u => !u.emailVerification);
    if (search) {
      users = users.filter(u =>
        String(u.email || '').toLowerCase().includes(search) ||
        String(u.name || '').toLowerCase().includes(search)
      );
    }
    authPage = {
      users: users.slice(page * pageSize, page * pageSize + pageSize),
      total: users.length,
    };
  } else {
    authPage = await listUsers([sdk.Query.limit(pageSize), sdk.Query.offset(page * pageSize)]);
  }

  const userIds = authPage.users.map(u => u.$id);
  let profiles = [];
  let subs = [];
  let creds = [];
  let resumeCounts = new Map();
  if (userIds.length > 0) {
    const [pRes, sRes, cRes, ...resumePages] = await Promise.all([
      safeList(null, 'profiles', [sdk.Query.equal('user_id', userIds), sdk.Query.limit(pageSize)]),
      safeList(null, 'subscriptions', [sdk.Query.equal('user_id', userIds), sdk.Query.limit(pageSize)]),
      safeList(null, 'ai_credits', [sdk.Query.equal('user_id', userIds), sdk.Query.limit(pageSize)]),
      ...userIds.map(userId => safeList(null, 'resumes', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)])),
    ]);
    profiles = pRes.documents || [];
    subs = sRes.documents || [];
    creds = cRes.documents || [];
    resumeCounts = new Map(userIds.map((userId, index) => [userId, resumePages[index]?.total || 0]));
  }
  const profileMap = new Map(profiles.map(p => [p.user_id, p]));
  const subMap = new Map(subs.map(s => [s.user_id, s]));
  const credMap = new Map(creds.map(c => [c.user_id, c]));

  // Mirrors PLAN_DAILY_LIMITS in ai-gateway so the admin panel shows the real cap
  // even before a user's first AI request creates an ai_credits document.
  const PLAN_CREDIT_DEFAULTS = { premium: -1, pro: 50, free: 5 };

  return {
    users: authPage.users.map(authUser => {
      const doc = profileMap.get(authUser.$id) || {};
      const s = subMap.get(authUser.$id) || {};
      const c = credMap.get(authUser.$id) || {};
      const plan_name = s.plan ?? doc.plan ?? 'free';
      return {
        $id: doc.$id || authUser.$id,
        $createdAt: authUser.$createdAt || doc.$createdAt,
        user_id: authUser.$id,
        email: authUser.email || doc.email || null,
        full_name: doc.full_name || authUser.name || null,
        contact_email: doc.contact_email ?? null,
        plan_name,
        plan_updated_at: s.$updatedAt ?? null,
        is_suspended: doc.is_suspended ?? false,
        suspension_reason: doc.suspension_reason ?? null,
        // Use the ai_credits document limit when present; fall back to plan default
        // so free/pro users without a credits doc show their actual cap (not ∞).
        daily_limit: c.daily_limit != null ? c.daily_limit : (PLAN_CREDIT_DEFAULTS[plan_name] ?? 5),
        credits_used_today: c.daily_usage ?? 0,
        trial_plan: s.trial_plan ?? null,
        trial_expires_at: s.trial_expires_at ?? null,
        resumeCount: resumeCounts.get(authUser.$id) || 0,
        email_verified: !!authUser.emailVerification,
        auth_status: authUser.status === false ? 'disabled' : 'active',
        profile_missing: !doc.$id,
      };
    }),
    total: authPage.total,
  };
}

async function handleSendWisehireInvite(body, log) {
  const { databases } = getClients();
  const email = String(body.recipient_email || body.target_email || '').trim().toLowerCase();
  if (!email) throw new Error('Missing recipient email');

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  const inviteUrl = `${PRODUCTION_URL}/wisehire/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await databases.createDocument(DB_ID, 'wisehire_invites', sdk.ID.unique(), {
    email,
    token,
    status: 'pending',
    expires_at: expiresAt,
    created_at: isoNow(),
    target_user_id: body.target_user_id || null,
  }).catch(async () => {
    await databases.createDocument(DB_ID, 'wisehire_invites', sdk.ID.unique(), {
      email,
      token,
      expires_at: expiresAt,
    });
  });

  let emailSent = false;
  if (process.env.RESEND_API_KEY) {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
    const fromName = process.env.RESEND_FROM_NAME || 'WiseHire';
    await resendRequest('POST', '/emails', {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Your WiseHire invite',
      html: `<p>You have been invited to WiseHire.</p><p><a href="${inviteUrl}">Accept your invite</a></p><p>This link expires in 72 hours.</p>`,
    });
    emailSent = true;
  }

  await auditLog(databases, 'send-wisehire-invite', { email, emailSent, target_user_id: body.target_user_id || null });
  log(`send-wisehire-invite: ${email} emailSent=${emailSent}`);
  return { invite_url: inviteUrl, expires_at: expiresAt, emailSent };
}

async function handlePurgeOrphans(body, log) {
  return { dryRun: body.dryRun !== false, orphanedProfiles: 0, orphanedResumes: 0, sampleProfiles: [], sampleResumes: [], deletedProfiles: 0, deletedResumes: 0 };
}

async function handleListAuditLogs(body, log) {
  const { databases } = getClients();
  const limit = Math.min(Math.max(1, Number(body.limit) || 25), 100);
  const queries = [];
  if (typeof body.category === 'string' && body.category.trim()) {
    queries.push(sdk.Query.equal('category', body.category.trim()));
  }
  queries.push(sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(limit));
  const res = await safeList(databases, 'admin_audit_logs', queries);
  return { documents: res.documents, total: res.total };
}

async function handleDeployHubsStatus() {
  const required = ['GITHUB_TOKEN', 'GITHUB_REPO', 'APPWRITE_API_KEY', 'APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID'];
  const response = await listFunctionVariables('admin-deploy-hubs');
  const variables = response.variables || [];
  const present = new Set(variables.map(v => v.key));
  const missing = required.filter(key => !present.has(key));
  return {
    ready: missing.length === 0,
    required,
    missing,
  };
}

async function handleListFunctions(body, log) {
  const page = await listFunctions([sdk.Query.limit(200)]);
  const search = String(body.search || '').trim().toLowerCase();
  const functions = (page.functions || [])
    .map(fn => ({
      id: fn.$id,
      name: fn.name || fn.$id,
      enabled: !!fn.enabled,
      runtime: fn.runtime || 'unknown',
      deployment: fn.deployment || fn.deploymentId || null,
      updatedAt: fn.$updatedAt || fn.dateUpdated || fn.dateCreated || null,
    }))
    .filter(fn => !search || fn.id.toLowerCase().includes(search) || fn.name.toLowerCase().includes(search));
  log(`list-functions: ${functions.length} functions`);
  return { functions, total: functions.length };
}

async function handleListFunctionExecutions(body, log) {
  const functionId = String(body.functionId || '').trim();
  const limit = Math.min(Math.max(1, Number(body.limit) || 10), 25);
  if (!functionId) throw new Error('Missing functionId');
  const page = await listFunctionExecutions(functionId, [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(limit)]);
  const executions = (page.executions || []).map(execution => ({
    id: execution.$id,
    status: execution.status || 'unknown',
    trigger: execution.trigger || 'unknown',
    duration: execution.duration ?? null,
    responseStatusCode: execution.responseStatusCode ?? null,
    createdAt: execution.$createdAt || null,
  }));
  return { executions, total: executions.length };
}

async function handleGetExecutionLog(body, log) {
  const functionId = String(body.functionId || '').trim();
  const executionId = String(body.executionId || '').trim();
  if (!functionId || !executionId) throw new Error('Missing functionId or executionId');
  const execution = await getFunctionExecution(functionId, executionId);
  const logs = String(execution.logs || execution.stdout || execution.responseBody || '').slice(0, 4000);
  const errors = String(execution.errors || execution.stderr || execution.error || '').slice(0, 4000);
  log(`get-execution-log: ${functionId}/${executionId}`);
  return {
    execution: {
      id: execution.$id || executionId,
      status: execution.status || 'unknown',
      trigger: execution.trigger || 'unknown',
      duration: execution.duration ?? null,
      responseStatusCode: execution.responseStatusCode ?? null,
      createdAt: execution.$createdAt || null,
      logs,
      errors,
    },
  };
}

async function handleListRoutingConfig() {
  const { databases } = getClients();
  const res = await safeList(databases, 'ai_routing_config', [sdk.Query.limit(100)]);
  if (res.error) throw new Error(`ai_routing_config collection is not ready: ${res.error}`);
  return { configs: res.documents, total: res.total };
}

async function handleUpdateRoutingConfig(body, log) {
  const { databases } = getClients();
  const { docId, provider, model } = body;
  if (!docId || !provider || !model) throw new Error('Missing docId, provider, or model');
  const doc = await databases.updateDocument(DB_ID, 'ai_routing_config', docId, { provider, model });
  await auditLog(databases, 'update-routing-config', { docId, provider, model });
  return { config: doc };
}

async function handleCreateRoutingConfig(body, log) {
  const { databases } = getClients();
  const { featureId, provider, model } = body;
  if (!featureId || !provider || !model) throw new Error('Missing featureId, provider, or model');
  const doc = await databases.createDocument(DB_ID, 'ai_routing_config', sdk.ID.unique(), { feature_id: featureId, provider, model });
  await auditLog(databases, 'create-routing-config', { featureId, provider, model });
  return { config: doc };
}

async function handleDeleteRoutingConfig(body, log) {
  const { databases } = getClients();
  const { docId } = body;
  if (!docId) throw new Error('Missing docId');
  await databases.deleteDocument(DB_ID, 'ai_routing_config', docId);
  await auditLog(databases, 'delete-routing-config', { docId });
  return { deleted: true };
}

// ─── issue-test-nonce: short-lived signed nonce for gateway admin tests ───────

async function handleIssueTestNonce(body, log) {
  const featureId = String(body.featureId || '').trim();
  if (!featureId) throw new Error('Missing featureId');
  const now = Date.now();
  const exp = now + 60_000; // 60-second TTL — single-use window
  const nonce = signToken({ purpose: 'gateway-admin-test', featureId, iat: now, exp });
  log(`issue-test-nonce: featureId=${featureId} exp=${new Date(exp).toISOString()}`);
  return { nonce, expiresAt: new Date(exp).toISOString() };
}

// ─── list-routes: merged static defaults + DB overrides, no API keys ─────────

async function handleListRoutes(log) {
  // Mirrors FEATURE_ROUTES in appwrite-hubs/ai-gateway/src/main.js
  const STATIC_DEFAULTS = {
    'generate-cover-letter':        { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
    'tailor-resume':                { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
    'recruiter-simulation':         { provider: 'nvidia',     model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
    'agentic-chat':                 { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'wise-ai-chat':                 { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'resume-section-ai':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'editor-ai':                    { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'detect-and-humanize':          { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'smart-fit-rewrite':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'career-assessment':            { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'generate-portfolio-bio':       { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'generate-resignation-letter':  { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'validate-tailor':              { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'suggest-template':             { provider: 'groq',       model: 'llama-3.1-8b-instant' },
    'analyze-resume':               { provider: 'deepseek',   model: 'deepseek-chat' },
    'generate-fix-suggestions':     { provider: 'deepseek',   model: 'deepseek-chat' },
    'parse-resume':                 { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    'parse-job':                    { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    'optimize-for-linkedin':        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    'generate-question-bank':       { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
    'company-briefing':             { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
    'ask-portfolio':                { provider: 'groq',       model: 'llama-3.3-70b-versatile' },
  };

  // Mirrors FEATURE_CREDIT_COSTS in appwrite-hubs/ai-gateway/src/main.js
  const CREDIT_COSTS = {
    'score-resume': 0, 'analyze-resume': 2, 'tailor-resume': 2,
    'generate-cover-letter': 2, 'generate-question-bank': 1, 'recruiter-simulation': 2,
    'agentic-chat': 1, 'wise-ai-chat': 1, 'resume-section-ai': 1, 'editor-ai': 1,
    'detect-and-humanize': 1, 'smart-fit-rewrite': 2, 'career-assessment': 2,
    'generate-portfolio-bio': 1, 'generate-resignation-letter': 1, 'validate-tailor': 1,
    'suggest-template': 1, 'generate-fix-suggestions': 1, 'parse-resume': 1,
    'parse-job': 1, 'optimize-for-linkedin': 1, 'company-briefing': 1, 'ask-portfolio': 1,
  };

  const { databases } = getClients();
  const res = await safeList(databases, 'ai_routing_config', [sdk.Query.limit(100)]);
  const overrideMap = {};
  for (const doc of (res.documents || [])) {
    overrideMap[doc.feature_id] = { provider: doc.provider, model: doc.model, docId: doc.$id };
  }

  const routes = {};
  for (const [featureId, def] of Object.entries(STATIC_DEFAULTS)) {
    const override = overrideMap[featureId];
    routes[featureId] = {
      provider: override ? override.provider : def.provider,
      model:    override ? override.model    : def.model,
      source:   override ? 'override' : 'default',
      creditCost: CREDIT_COSTS[featureId] ?? 1,
    };
  }
  // Pool-fallback features: credit cost defined but no dedicated static route
  for (const [featureId, cost] of Object.entries(CREDIT_COSTS)) {
    if (!routes[featureId]) {
      routes[featureId] = { provider: null, model: null, source: 'pool', creditCost: cost };
    }
  }

  log(`list-routes: ${Object.keys(routes).length} features, ${Object.keys(overrideMap).length} overrides`);
  return { routes, overrideCount: Object.keys(overrideMap).length, checkedAt: isoNow() };
}

// ─── Phase 9: deployed source hash storage ────────────────────────────────────
// Stores { hubId: hash } in app_settings key 'fn_deployed_hashes'.
// Set by the deploy pipeline (or manually) when a hub is deployed.
// DevKit compares against sourceHashes.generated.json to detect drift.

async function handleGetDeployedHashes(log) {
  const { databases } = getClients();
  const res = await safeList(databases, 'app_settings', [sdk.Query.equal('key', ['fn_deployed_hashes']), sdk.Query.limit(1)]);
  let hashes = {};
  if (res.documents?.[0]?.value) {
    try { hashes = JSON.parse(res.documents[0].value) || {}; } catch { hashes = {}; }
  }
  log(`get-deployed-hashes: ${Object.keys(hashes).length} stored hashes`);
  return { hashes };
}

async function handleSetDeployedHash(body, log) {
  const { databases } = getClients();
  const { hubId, hash } = body;
  if (!hubId || typeof hubId !== 'string') throw new Error('hubId is required');
  if (!hash || typeof hash !== 'string') throw new Error('hash is required');

  const res = await safeList(databases, 'app_settings', [sdk.Query.equal('key', ['fn_deployed_hashes']), sdk.Query.limit(1)]);
  let hashes = {};
  if (res.documents?.[0]?.value) {
    try { hashes = JSON.parse(res.documents[0].value) || {}; } catch { hashes = {}; }
  }

  hashes[hubId] = hash.slice(0, 16); // store 16-char prefix only
  const serialized = JSON.stringify(hashes);

  if (res.documents?.[0]) {
    await databases.updateDocument(DB_ID, 'app_settings', res.documents[0].$id, { value: serialized });
  } else {
    await databases.createDocument(DB_ID, 'app_settings', sdk.ID.unique(), { key: 'fn_deployed_hashes', value: serialized });
  }
  await auditLog(databases, 'set-deployed-hash', { hubId, hash: hash.slice(0, 16) });
  log(`set-deployed-hash: ${hubId} -> ${hash.slice(0, 16)}`);
  return { hashes, updated: hubId };
}

async function handleListDiscountCodes(log) {
  const { databases } = getClients();
  const res = await safeList(databases, 'discount_codes', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(100)]);
  if (res.error) throw new Error(`discount_codes collection is not ready: ${res.error}`);
  return { codes: res.documents, total: res.total };
}

async function handleAddDiscountCode(body, log) {
  const { databases } = getClients();
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) throw new Error('Missing or empty code');
  const doc = await databases.createDocument(DB_ID, 'discount_codes', sdk.ID.unique(), { code, active: body.active !== false, percent_off: Number(body.percent_off) || 100 });
  await auditLog(databases, 'add-discount-code', { code });
  return { code: doc };
}

async function handleListAllResumes(body, log) {
  const limit = Math.min(Math.max(1, Number(body.limit) || 20), 100);
  const offset = Math.max(0, Number(body.offset) || 0);
  const res = await listDocuments('resumes', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(limit), sdk.Query.offset(offset)]);
  return { documents: res.documents, total: res.total };
}

async function handleListErrors(body) {
  const { databases } = getClients();
  const res = await safeList(databases, 'error_log', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(Math.min(Number(body.limit) || 25, 100))]);
  return { errors: res.documents, total: res.total, missing: !!res.error, error: res.error || null };
}

// ─── Helper: find profile doc by user_id ────────────────────────────────────

async function getProfileDoc(databases, userId) {
  const res = await safeList(databases, 'profiles', [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
  return res.documents[0] || null;
}

// ─── Admin mutation handlers ─────────────────────────────────────────────────

// ─── Plan change helpers: notification + email ────────────────────────────────

const PLAN_LABELS = { free: 'Free', pro: 'Pro', premium: 'Premium' };
const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

async function resendRequest(method, path, body) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text }; }
  if (!response.ok) throw new Error(payload?.message || `Resend ${method} ${path} failed HTTP ${response.status}`);
  return payload;
}

function planUpgradeEmailHtml(userEmail, planLabel, durationLabel) {
  const heading = durationLabel
    ? `Your ${planLabel} trial has started`
    : `You've been upgraded to ${planLabel}`;
  const body = durationLabel
    ? `<p style="margin:0 0 16px">Your account has been granted a <strong>${planLabel} trial</strong> for <strong>${durationLabel}</strong>. All ${planLabel} features are now unlocked — enjoy!</p>`
    : `<p style="margin:0 0 16px">Your WiseResume plan has been set to <strong>${planLabel}</strong>. All ${planLabel} features are now active on your account.</p>`;
  const content = `
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">${heading}</h2>
    ${body}
    <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">If you have any questions, reply to this email and we'll be happy to help.</p>
    <a href="https://resume.thewise.cloud/dashboard" style="display:inline-block;background:#9E1B22;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Go to Dashboard</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WiseResume</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#9E1B22;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">WiseResume</span>
  </div>
  <div style="padding:32px;">${content}</div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    WiseResume · The Wise Cloud · thewise.cloud
  </div>
</div>
</body></html>`;
}

async function createPlanNotification(databases, userId, planLabel, durationLabel, log) {
  try {
    const title = durationLabel
      ? `Your ${planLabel} trial has started`
      : `Your plan has been upgraded to ${planLabel}`;
    const message = durationLabel
      ? `You now have access to all ${planLabel} features for ${durationLabel}. Enjoy!`
      : `Your WiseResume plan is now ${planLabel}. All features are active on your account.`;
    await databases.createDocument(DB_ID, 'notifications', sdk.ID.unique(), {
      user_id: userId,
      type: 'system',
      title,
      message,
      is_read: false,
    }, [
      sdk.Permission.read(sdk.Role.user(userId)),
      sdk.Permission.update(sdk.Role.user(userId)),
      sdk.Permission.delete(sdk.Role.user(userId)),
    ]);
  } catch (err) {
    log(`[warn] createPlanNotification failed (non-fatal): ${err.message}`);
  }
}

async function sendPlanUpgradeEmail(userId, planLabel, durationLabel, log) {
  try {
    if (!process.env.RESEND_API_KEY) {
      log('[warn] sendPlanUpgradeEmail: RESEND_API_KEY not set — skipping email');
      return;
    }
    const user = await getUser(userId);
    const email = user.email;
    if (!email) { log('[warn] sendPlanUpgradeEmail: user has no email — skipping'); return; }
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
    const fromName  = process.env.RESEND_FROM_NAME  || 'WiseResume';
    const subject = durationLabel
      ? `Your ${planLabel} trial has started — WiseResume`
      : `You've been upgraded to ${planLabel} — WiseResume`;
    await resendRequest('POST', '/emails', {
      from: `${fromName} <${fromEmail}>`,
      to:   email,
      subject,
      html: planUpgradeEmailHtml(email, planLabel, durationLabel),
    });
    log(`sendPlanUpgradeEmail: sent to ${email} (plan=${planLabel}, duration=${durationLabel || 'permanent'})`);
  } catch (err) {
    log(`[warn] sendPlanUpgradeEmail failed (non-fatal): ${err.message}`);
  }
}

function buildBrandedEmail({
  logoLabel = 'WiseResume',
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}) {
  const ctaHtml = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:#9E1B22;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${ctaLabel}</a>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${logoLabel}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#9E1B22;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">${logoLabel}</span>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827;">${heading}</h2>
    ${bodyHtml}
    ${ctaHtml ? `<div style="margin:24px 0;">${ctaHtml}</div>` : ''}
  </div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    ${footerNote || 'WiseResume · The Wise Cloud · thewise.cloud'}
  </div>
</div>
</body></html>`;
}

function classifyPlanChange(previousPlan, newPlan) {
  if (previousPlan === newPlan) return 'no_change';
  return (PLAN_RANK[newPlan] || 0) > (PLAN_RANK[previousPlan] || 0) ? 'upgrade' : 'downgrade';
}

function getPlanEmailCopy({ previousPlan, newPlan, changeType, durationLabel }) {
  const previousLabel = PLAN_LABELS[previousPlan] || previousPlan;
  const newLabel = PLAN_LABELS[newPlan] || newPlan;

  if (changeType === 'trial_start') {
    return {
      subject: `Your ${newLabel} trial has started - WiseResume`,
      heading: `Your ${newLabel} trial has started`,
      bodyHtml: `<p style="margin:0 0 16px;color:#374151;">Your account has been granted a <strong>${newLabel} trial</strong> for <strong>${durationLabel}</strong>.</p><p style="margin:0;color:#374151;">All ${newLabel} features are now unlocked during the trial period.</p>`,
      notificationTitle: `Your ${newLabel} trial has started`,
      notificationMessage: `You now have access to all ${newLabel} features for ${durationLabel}.`,
    };
  }

  if (changeType === 'trial_end') {
    return {
      subject: `Your ${newLabel} plan is active - WiseResume`,
      heading: 'Your trial has ended',
      bodyHtml: `<p style="margin:0 0 16px;color:#374151;">Your trial has ended and your account is now on the <strong>${newLabel}</strong> plan.</p><p style="margin:0;color:#374151;">You can continue using WiseResume with the features included in ${newLabel}.</p>`,
      notificationTitle: 'Your trial has ended',
      notificationMessage: `Your account is now on the ${newLabel} plan.`,
    };
  }

  if (changeType === 'downgrade') {
    return {
      subject: `Your WiseResume plan is now ${newLabel}`,
      heading: `Your plan has changed to ${newLabel}`,
      bodyHtml: `<p style="margin:0 0 16px;color:#374151;">Your WiseResume plan has been changed from <strong>${previousLabel}</strong> to <strong>${newLabel}</strong>.</p><p style="margin:0;color:#374151;">Your account will continue on the features included in ${newLabel}.</p>`,
      notificationTitle: `Your plan is now ${newLabel}`,
      notificationMessage: `Your WiseResume plan changed from ${previousLabel} to ${newLabel}.`,
    };
  }

  return {
    subject: `You've been upgraded to ${newLabel} - WiseResume`,
    heading: `You've been upgraded to ${newLabel}`,
    bodyHtml: `<p style="margin:0 0 16px;color:#374151;">Your WiseResume plan has been upgraded from <strong>${previousLabel}</strong> to <strong>${newLabel}</strong>.</p><p style="margin:0;color:#374151;">All ${newLabel} features are now active on your account.</p>`,
    notificationTitle: `You've been upgraded to ${newLabel}`,
    notificationMessage: `Your WiseResume plan is now ${newLabel}. All features are active on your account.`,
  };
}

async function createPlanNotificationForChange(databases, userId, options, log) {
  try {
    const copy = getPlanEmailCopy(options);
    await databases.createDocument(DB_ID, 'notifications', sdk.ID.unique(), {
      user_id: userId,
      type: 'system',
      title: copy.notificationTitle,
      message: copy.notificationMessage,
      is_read: false,
    }, [
      sdk.Permission.read(sdk.Role.user(userId)),
      sdk.Permission.update(sdk.Role.user(userId)),
      sdk.Permission.delete(sdk.Role.user(userId)),
    ]);
    return true;
  } catch (err) {
    log(`[warn] createPlanNotificationForChange failed (non-fatal): ${err.message}`);
    return false;
  }
}

async function sendPlanChangeEmail({ userId, previousPlan, newPlan, changeType, durationLabel, log }) {
  if (changeType === 'no_change') return { emailSent: false, emailStatus: 'skipped_no_change' };
  if (!process.env.RESEND_API_KEY) {
    log('[warn] sendPlanChangeEmail: RESEND_API_KEY not set - skipping email');
    return { emailSent: false, emailStatus: 'skipped_no_key' };
  }

  try {
    const user = await getUser(userId);
    const email = user.email;
    if (!email) {
      log('[warn] sendPlanChangeEmail: user has no email - skipping');
      return { emailSent: false, emailStatus: 'skipped_no_email' };
    }

    const copy = getPlanEmailCopy({ previousPlan, newPlan, changeType, durationLabel });
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
    const fromName = process.env.RESEND_FROM_NAME || 'WiseResume';
    await resendRequest('POST', '/emails', {
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: copy.subject,
      html: buildBrandedEmail({
        heading: copy.heading,
        bodyHtml: copy.bodyHtml,
        ctaLabel: 'Go to Dashboard',
        ctaUrl: 'https://resume.thewise.cloud/dashboard',
      }),
    });
    log(`sendPlanChangeEmail: sent to ${email} (${previousPlan} -> ${newPlan}, ${changeType})`);
    return { emailSent: true, emailStatus: 'sent' };
  } catch (err) {
    log(`[warn] sendPlanChangeEmail failed (non-fatal): ${err.message}`);
    return { emailSent: false, emailStatus: 'failed' };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSetPlan(body, log) {
  const { databases } = getClients();
  const { target_user_id, plan, actor_email } = body;
  if (!target_user_id || !plan) throw new Error('Missing target_user_id or plan');
  if (!['free', 'pro', 'premium'].includes(plan)) throw new Error(`Invalid plan: ${plan}`);
  await getUser(target_user_id);
  const profile = await getProfileDoc(databases, target_user_id);
  // Non-fatal: profiles.plan may not exist as a collection attribute in all environments.
  if (profile) {
    try {
      await databases.updateDocument(DB_ID, 'profiles', profile.$id, { plan });
    } catch (e) {
      log(`[warn] profiles.plan update skipped (attribute may not exist): ${e.message}`);
    }
  }

  const subRes = await safeList(databases, 'subscriptions', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const subDoc = subRes.documents[0] || null;
  const previousPlan = subDoc?.effective_plan || subDoc?.trial_plan || subDoc?.plan || profile?.plan || 'free';
  const changeType = classifyPlanChange(previousPlan, plan);
  const patch = { plan, effective_plan: plan, status: 'active', trial_plan: null, trial_expires_at: null };
  const subPerms = [
    sdk.Permission.read(sdk.Role.user(target_user_id)),
    // UPDATE intentionally omitted: written exclusively by server-side admin client.
  ];
  // Always repair document permissions so the user's client session can read their subscription.
  // Use a fallback without effective_plan for schemas that don't have that attribute yet.
  const subPatches = [patch, Object.fromEntries(Object.entries(patch).filter(([k]) => k !== 'effective_plan'))];
  for (let i = 0; i < subPatches.length; i++) {
    try {
      if (subDoc) {
        await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, subPatches[i], subPerms);
      } else {
        await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { user_id: target_user_id, ...subPatches[i] }, subPerms);
      }
      break;
    } catch (e) {
      if (i < subPatches.length - 1) continue;
      throw e;
    }
  }

  await auditLog(databases, 'set-plan', { target_user_id, plan, actor_email });
  log(`set-plan: ${target_user_id} -> ${plan}`);

  const [notificationCreated, emailResult] = await Promise.all([
    createPlanNotificationForChange(databases, target_user_id, { previousPlan, newPlan: plan, changeType, durationLabel: null }, log),
    sendPlanChangeEmail({ userId: target_user_id, previousPlan, newPlan: plan, changeType, durationLabel: null, log }),
  ]);

  return { plan, notificationCreated, ...emailResult };
}

async function handleGrantTrial(body, log) {
  const { databases } = getClients();
  const { target_user_id, plan, days } = body;
  if (!target_user_id || !plan || !days) throw new Error('Missing required fields');
  if (!['pro', 'premium'].includes(plan)) throw new Error(`Invalid trial plan: ${plan}`);
  await getUser(target_user_id);
  const expiresAt = new Date(Date.now() + Number(days) * 86400000).toISOString();

  const subRes = await safeList(databases, 'subscriptions', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const subDoc = subRes.documents[0] || null;
  const previousPlan = subDoc?.effective_plan || subDoc?.trial_plan || subDoc?.plan || 'free';
  const trialPerms = [
    sdk.Permission.read(sdk.Role.user(target_user_id)),
    // UPDATE intentionally omitted: written exclusively by server-side admin client.
  ];
  if (subDoc) {
    const trialPatch = { trial_plan: plan, effective_plan: plan, trial_expires_at: expiresAt, status: 'active' };
    const trialPatches = [trialPatch, Object.fromEntries(Object.entries(trialPatch).filter(([k]) => k !== 'effective_plan'))];
    for (let i = 0; i < trialPatches.length; i++) {
      try { await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, trialPatches[i], trialPerms); break; }
      catch (e) { if (i < trialPatches.length - 1) continue; throw e; }
    }
  } else {
    await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { user_id: target_user_id, plan: 'free', effective_plan: plan, trial_plan: plan, trial_expires_at: expiresAt, status: 'active' }, trialPerms);
  }

  await auditLog(databases, 'grant-trial', { target_user_id, plan, days });
  log(`grant-trial: ${target_user_id} -> ${plan} for ${days}d`);

  const durationLabel = `${days} day${Number(days) === 1 ? '' : 's'}`;
  const [notificationCreated, emailResult] = await Promise.all([
    createPlanNotificationForChange(databases, target_user_id, { previousPlan, newPlan: plan, changeType: 'trial_start', durationLabel }, log),
    sendPlanChangeEmail({ userId: target_user_id, previousPlan, newPlan: plan, changeType: 'trial_start', durationLabel, log }),
  ]);

  return { trial_plan: plan, trial_expires_at: expiresAt, notificationCreated, ...emailResult };
}

async function handleRevokeTrial(body, log) {
  const { databases } = getClients();
  const { target_user_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');

  const subRes = await safeList(databases, 'subscriptions', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const subDoc = subRes.documents[0] || null;
  const previousPlan = subDoc?.effective_plan || subDoc?.trial_plan || subDoc?.plan || 'free';
  const basePlan = subDoc?.plan || 'free';
  if (subDoc) {
    const revokePerms = [
      sdk.Permission.read(sdk.Role.user(target_user_id)),
      // UPDATE intentionally omitted: written exclusively by server-side admin client.
    ];
    const revokePatches = [
      { trial_plan: null, trial_expires_at: null, effective_plan: basePlan },
      { trial_plan: null, trial_expires_at: null },
    ];
    for (let i = 0; i < revokePatches.length; i++) {
      try { await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, revokePatches[i], revokePerms); break; }
      catch (e) { if (i < revokePatches.length - 1) continue; throw e; }
    }
  }

  await auditLog(databases, 'revoke-trial', { target_user_id });
  log(`revoke-trial: ${target_user_id}`);
  const [notificationCreated, emailResult] = await Promise.all([
    createPlanNotificationForChange(databases, target_user_id, { previousPlan, newPlan: basePlan, changeType: 'trial_end', durationLabel: null }, log),
    sendPlanChangeEmail({ userId: target_user_id, previousPlan, newPlan: basePlan, changeType: 'trial_end', durationLabel: null, log }),
  ]);
  return { ok: true, plan: basePlan, notificationCreated, ...emailResult };
}

async function handleSuspendUser(body, log) {
  const { databases, users } = getClients();
  const { target_user_id, suspend, reason, actor_email } = body;
  if (!target_user_id || typeof suspend !== 'boolean') throw new Error('Missing target_user_id or suspend');
  const profile = await getProfileDoc(databases, target_user_id);
  if (!profile) throw new Error('Profile not found for user');
  const patch = { is_suspended: suspend, suspension_reason: suspend ? (reason || null) : null };
  await databases.updateDocument(DB_ID, 'profiles', profile.$id, patch);

  await users.updateStatus(target_user_id, !suspend);

  await auditLog(databases, suspend ? 'suspend-user' : 'unsuspend-user', { target_user_id, reason, actor_email });
  log(`suspend-user: ${target_user_id} -> ${suspend}`);
  return { is_suspended: suspend };
}

async function handleSetCredits(body, log) {
  const { databases } = getClients();
  const { target_user_id, daily_limit, bonus_credits, actor_email } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  const credRes = await safeList(databases, 'ai_credits', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const credDoc = credRes.documents[0] || null;
  if (credDoc) {
    const patch = {};
    if (daily_limit !== undefined && daily_limit !== null) patch.daily_limit = Number(daily_limit);
    if (bonus_credits && Number(bonus_credits) > 0) {
      patch.daily_usage = Math.max(0, (credDoc.daily_usage || 0) - Number(bonus_credits));
    }
    if (Object.keys(patch).length > 0) {
      await databases.updateDocument(DB_ID, 'ai_credits', credDoc.$id, patch);
    }
  } else {
    const patch = { user_id: target_user_id, daily_limit: Number(daily_limit) || 5, daily_usage: 0, total_usage: 0 };
    await databases.createDocument(DB_ID, 'ai_credits', sdk.ID.unique(), patch, [sdk.Permission.read(sdk.Role.user(target_user_id))]);
  }
  await auditLog(databases, 'set-credits', { target_user_id, daily_limit, bonus_credits, actor_email });
  log(`set-credits: ${target_user_id}`);
  return { ok: true };
}

async function handleSaveNote(body, log) {
  const { databases } = getClients();
  // NOTE: 'action' is consumed by the main router (it will always be 'save-note'
  // by the time we get here). Sub-actions (list, delete) are read from 'note_action'.
  const { target_user_id, note_action: noteAction, note_text, note_id, actor_email } = body;
  if (noteAction === 'list') {
    const res = await safeList(databases, 'admin_audit_logs', [
      sdk.Query.equal('user_id', target_user_id || ''),
      sdk.Query.equal('category', 'admin_note'),
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(50),
    ]);
    const notes = res.documents.map(d => ({ id: d.$id, note_text: d.action || '', created_at: d.$createdAt }));
    return { notes };
  }
  if (noteAction === 'delete') {
    if (!note_id) throw new Error('Missing note_id');
    await databases.deleteDocument(DB_ID, 'admin_audit_logs', note_id);
    return { ok: true };
  }
  if (!note_text) throw new Error('Missing note_text');
  const doc = await databases.createDocument(DB_ID, 'admin_audit_logs', sdk.ID.unique(), {
    action: note_text, category: 'admin_note', user_id: target_user_id,
    metadata: JSON.stringify({ actor_email: actor_email || 'admin' }),
  });
  log(`save-note: added for ${target_user_id}`);
  return { note: { id: doc.$id, note_text, created_at: doc.$createdAt } };
}

async function handleDeleteUser(body, log) {
  const { databases, users } = getClients();
  const { target_user_id, actor_email } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  await auditLog(databases, 'delete-user', { target_user_id, actor_email });
  const profile = await getProfileDoc(databases, target_user_id);
  if (profile) { try { await databases.deleteDocument(DB_ID, 'profiles', profile.$id); } catch (_) {} }
  await users.delete(target_user_id);
  log(`delete-user: ${target_user_id}`);
  return { ok: true };
}

async function handleMergeIdentity(body, log) {
  const { databases } = getClients();
  const { collision_user_id } = body;
  if (!collision_user_id) throw new Error('Missing collision_user_id');
  const mergeLog = [];
  const profile = await getProfileDoc(databases, collision_user_id);
  if (profile) {
    await databases.updateDocument(DB_ID, 'profiles', profile.$id, {
      is_suspended: true, suspension_reason: 'identity-collision-merged',
    });
    mergeLog.push(`Suspended collision profile ${profile.$id}`);
  } else {
    mergeLog.push('No profile found for collision user');
  }
  await auditLog(databases, 'merge-identity', { collision_user_id });
  log(`merge-identity: ${collision_user_id}`);
  return { merge_log: mergeLog };
}

async function handleRevokeSessions(body, log) {
  const { databases, users } = getClients();
  const { target_user_id, actor_email } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  await users.deleteSessions(target_user_id);
  await auditLog(databases, 'revoke-sessions', { target_user_id, actor_email });
  log(`revoke-sessions: ${target_user_id}`);
  return { ok: true };
}

async function handleListUserContent(body, log) {
  const { databases } = getClients();
  const { target_user_id, resume_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  if (resume_id) {
    const doc = await getDocument('resumes', resume_id);
    return { resume: { id: doc.$id, title: doc.title, updated_at: doc.$updatedAt, content: doc.resume_data || null } };
  }
  const res = await safeList(databases, 'resumes', [
    sdk.Query.equal('user_id', target_user_id),
    sdk.Query.orderDesc('$updatedAt'), sdk.Query.limit(50),
  ]);
  const resumes = res.documents.map(d => ({
    id: d.$id, title: d.title || 'Untitled',
    updated_at: d.$updatedAt, created_at: d.$createdAt, template_id: d.template_id || null,
  }));
  log(`list-user-content: ${resumes.length} resumes for ${target_user_id}`);
  return { resumes };
}

async function handleUpdateProfile(body, log) {
  const { databases } = getClients();
  const { target_user_id, profile_action, full_name, username, portfolio_enabled, actor_email } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  const profile = await getProfileDoc(databases, target_user_id);
  if (profile_action === 'get') {
    return { profile: profile ? { username: profile.username || null, portfolio_enabled: profile.portfolio_enabled ?? false, full_name: profile.full_name || null } : null };
  }
  if (!profile) throw new Error('Profile not found');
  const patch = {};
  const changed_fields = {};
  if (full_name !== undefined) {
    const v = (full_name || '').trim() || null;
    if (v !== profile.full_name) { patch.full_name = v; changed_fields.full_name = { old: profile.full_name, new: v }; }
  }
  if (username !== undefined && username !== null) {
    const v = (username || '').trim().toLowerCase() || null;
    if (v !== profile.username) { patch.username = v; changed_fields.username = { old: profile.username, new: v }; }
  }
  if (portfolio_enabled !== undefined) {
    if (portfolio_enabled !== profile.portfolio_enabled) {
      patch.portfolio_enabled = portfolio_enabled;
      changed_fields.portfolio_enabled = { old: profile.portfolio_enabled, new: portfolio_enabled };
    }
  }
  if (Object.keys(patch).length > 0) {
    await databases.updateDocument(DB_ID, 'profiles', profile.$id, patch);
    await auditLog(databases, 'update-profile', { target_user_id, changed_fields, actor_email });
  }
  log(`update-profile: ${target_user_id} changed=${JSON.stringify(Object.keys(changed_fields))}`);
  return { changed_fields };
}

async function handleGetIdentity(body, log) {
  const { databases } = getClients();
  const { target_user_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  const profile = await getProfileDoc(databases, target_user_id);
  let authUser = null;
  try { authUser = await getUser(target_user_id); } catch (_) {}
  const is_collision = (profile?.email || '').includes('@collision.') || (profile?.email || '').includes('@placeholder.');
  log(`get-identity: ${target_user_id}`);
  return {
    auth_email: authUser?.email || profile?.email || null,
    contact_email: profile?.contact_email || null,
    kinde_sub: null, kinde_email: null, kinde_email_status: 'not_needed',
    last_exchange_at: null,
    signed_up_at: authUser?.$createdAt || profile?.$createdAt || null,
    last_sign_in_at: authUser?.accessedAt || null,
    is_collision,
  };
}

async function handleUserAuditLogs(body, log) {
  const { databases } = getClients();
  const { target_user_id, limit } = body;
  const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 500);
  const res = await safeList(databases, 'admin_audit_logs', [
    sdk.Query.equal('user_id', target_user_id || ''),
    sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(safeLimit),
  ]);
  const logs = res.documents.map(d => ({
    id: d.$id, action: d.action || '', category: d.category || null,
    metadata: d.metadata || null, created_at: d.$createdAt, user_id: d.user_id || null,
  }));
  log(`user-audit-logs: ${logs.length} entries for ${target_user_id}`);
  return { logs };
}

async function handleWisehireResetUser(body, log) {
  const { databases } = getClients();
  const { target_user_id, actor_email } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  const warnings = [];
  const profile = await getProfileDoc(databases, target_user_id);
  if (profile) {
    try { await databases.updateDocument(DB_ID, 'profiles', profile.$id, { account_type: 'job_seeker' }); }
    catch (e) { warnings.push(`Could not reset account_type: ${e.message}`); }
  } else { warnings.push('No profile found'); }
  try {
    const whRes = await safeList(databases, 'wisehire_accounts', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
    if (whRes.documents[0]) { await databases.deleteDocument(DB_ID, 'wisehire_accounts', whRes.documents[0].$id); }
  } catch (e) { warnings.push(`Could not delete wisehire account: ${e.message}`); }
  await auditLog(databases, 'wisehire-reset-user', { target_user_id, actor_email });
  log(`wisehire-reset-user: ${target_user_id}`);
  return { kinde_deleted: false, invite_tokens_reset: 0, warnings };
}

async function handleLiveActivity(body, log) {
  const { databases } = getClients();
  const { resource, user_id } = body;
  if (resource === 'usage_events') {
    const res = await safeList(databases, 'usage_events', [
      sdk.Query.equal('user_id', user_id || ''),
      sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(50),
    ]);
    return { data: res.documents };
  }
  if (resource === 'user_content_stats') {
    const [resumeRes, credRes] = await Promise.all([
      safeList(databases, 'resumes', [sdk.Query.equal('user_id', user_id || ''), sdk.Query.limit(1)]),
      safeList(databases, 'ai_credits', [sdk.Query.equal('user_id', user_id || ''), sdk.Query.limit(1)]),
    ]);
    const profile = await getProfileDoc(databases, user_id || '');
    const cred = credRes.documents[0];
    return {
      resumeCount: resumeRes.total, coverLetterCount: null,
      hasPortfolio: !!(profile?.username), portfolioEnabled: profile?.portfolio_enabled ?? null,
      portfolioUsername: profile?.username ?? null,
      aiCredits30d: cred ? (cred.credits_used || 0) : null, planHistory: [],
    };
  }
  throw new Error(`Unknown resource: ${resource}`);
}

async function handleImpersonate(body, log) {
  const { target_user_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');
  const targetUser = await getUser(target_user_id);
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({
    u: target_user_id, e: targetUser.email, x: expiresAt,
    t: 'admin-token-' + Math.random().toString(36).substring(7),
  })).toString('base64');
  log(`impersonate: ${target_user_id}`);
  return { url: `/act-as#${payload}`, email: targetUser.email, userId: target_user_id, expiresAt };
}

async function handleListAppSettings(log) {
  const res = await safeList(null, 'app_settings', [sdk.Query.limit(100)]);
  if (res.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error)) {
    return { settings: [], missing_collection: true };
  }
  if (res.error) throw new Error(`app_settings collection error: ${res.error}`);
  return { settings: res.documents, total: res.total };
}

async function handleToggleAppSetting(body, log) {
  const { databases } = getClients();
  const { key, value } = body;
  if (!key) throw new Error('Missing key');
  if (typeof value !== 'string') throw new Error('value must be a string');
  const res = await safeList(databases, 'app_settings', [sdk.Query.equal('key', key), sdk.Query.limit(1)]);
  if (res.documents.length > 0) {
    const doc = await databases.updateDocument(DB_ID, 'app_settings', res.documents[0].$id, { value });
    await auditLog(databases, 'toggle-app-setting', { key, value });
    log(`toggle-app-setting: ${key} -> ${value}`);
    return { setting: { $id: doc.$id, key: doc.key, value: doc.value } };
  } else {
    const doc = await databases.createDocument(DB_ID, 'app_settings', sdk.ID.unique(), { key, value });
    await auditLog(databases, 'toggle-app-setting', { key, value, created: true });
    log(`toggle-app-setting (created): ${key} -> ${value}`);
    return { setting: { $id: doc.$id, key: doc.key, value: doc.value } };
  }
}

// ─── get-key-modes / set-key-mode: slot pinning config ───────────────────────

const VALID_KEY_MODES = new Set(['active', 'pinned', 'standby', 'disabled']);

async function handleGetKeyModes(log) {
  const { databases } = getClients();
  const res = await safeList(databases, 'app_settings', [sdk.Query.equal('key', ['ai_key_modes']), sdk.Query.limit(1)]);
  let modes = {};
  if (res.documents?.[0]?.value) {
    try { modes = JSON.parse(res.documents[0].value) || {}; } catch { modes = {}; }
  }
  log(`get-key-modes: ${Object.keys(modes).length} slot overrides`);
  return { modes };
}

async function handleSetKeyMode(body, log) {
  const { databases } = getClients();
  const { provider, slot, mode } = body;
  if (!provider || !slot) throw new Error('provider and slot are required');
  const slotKey = `${provider}:${slot}`;
  if (!VALID_KEY_MODES.has(mode)) throw new Error(`Invalid mode "${mode}". Allowed: active, pinned, standby, disabled`);

  const res = await safeList(databases, 'app_settings', [sdk.Query.equal('key', ['ai_key_modes']), sdk.Query.limit(1)]);
  let modes = {};
  if (res.documents?.[0]?.value) {
    try { modes = JSON.parse(res.documents[0].value) || {}; } catch { modes = {}; }
  }

  if (mode === 'active') {
    delete modes[slotKey]; // 'active' is default, no need to store
  } else {
    modes[slotKey] = mode;
  }

  const serialized = JSON.stringify(modes);
  if (res.documents?.[0]) {
    await databases.updateDocument(DB_ID, 'app_settings', res.documents[0].$id, { value: serialized });
  } else {
    await databases.createDocument(DB_ID, 'app_settings', sdk.ID.unique(), { key: 'ai_key_modes', value: serialized });
  }
  await auditLog(databases, 'set-key-mode', { slotKey, mode });
  log(`set-key-mode: ${slotKey} -> ${mode}`);
  return { modes, updated: slotKey, mode };
}

async function handleListWisehireWaitlist(log) {
  const res = await safeList(null, 'wisehire_waitlist', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(100)]);
  if (res.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error)) {
    return { entries: [], total: 0, missing_collection: true };
  }
  if (res.error) throw new Error(`wisehire_waitlist error: ${res.error}`);
  return { entries: res.documents, total: res.total };
}

async function handleApproveWisehireWaitlist(body, log) {
  const { databases } = getClients();
  const { waitlist_id } = body;
  if (!waitlist_id) throw new Error('Missing waitlist_id');

  let entry;
  try {
    entry = await getDocument('wisehire_waitlist', waitlist_id);
  } catch (e) {
    throw new Error(`Waitlist entry not found: ${e.message}`);
  }

  const email = entry.email;
  const name = entry.name || 'there';

  // Step 1: Look up existing Appwrite Auth user by email.
  // Fails closed — any lookup error aborts before we modify anything.
  let existingUserId = null;
  const userSearch = await listUsers([sdk.Query.equal('email', email), sdk.Query.limit(1)]);
  const foundUser = (userSearch.users || [])[0] || null;
  if (foundUser) {
    existingUserId = foundUser.$id;
    log(`approve-wisehire-waitlist: found existing user ${existingUserId} for ${email}`);
  } else {
    log(`approve-wisehire-waitlist: no existing user for ${email}, will send sign-up invite`);
  }

  // Step 2: Provision WiseHire access for an existing user.
  // Errors here are fatal — the waitlist entry is preserved for admin retry.
  let approvalOutcome = 'fresh_invite_sent';
  if (existingUserId) {
    const profile = await getProfileDoc(databases, existingUserId);
    if (profile) {
      await databases.updateDocument(DB_ID, 'profiles', profile.$id, { account_type: 'recruiter' });
      log(`approve-wisehire-waitlist: set account_type=recruiter on profile ${profile.$id}`);
    } else {
      log(`approve-wisehire-waitlist: no profile found for ${existingUserId} — skipping account_type update`);
    }

    // Require approved_at to be present in the wisehire_accounts Appwrite collection schema.
    const whRes = await safeList(databases, 'wisehire_accounts', [
      sdk.Query.equal('user_id', existingUserId),
      sdk.Query.limit(1),
    ]);
    if (whRes.error) {
      throw new Error(`Could not check wisehire_accounts for ${existingUserId}: ${whRes.error}`);
    }
    if (whRes.documents && whRes.documents[0]) {
      log(`approve-wisehire-waitlist: wisehire_accounts doc already exists for ${existingUserId}`);
    } else {
      await databases.createDocument(DB_ID, 'wisehire_accounts', sdk.ID.unique(), {
        user_id: existingUserId,
        email,
        approved_at: isoNow(),
      });
      log(`approve-wisehire-waitlist: created wisehire_accounts doc for ${existingUserId}`);
    }

    approvalOutcome = 'existing_user_upgraded';
  }

  // Step 3: Send approval email — sign-in link for existing users, sign-up link for new.
  let emailSent = false;
  if (email && process.env.RESEND_API_KEY) {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
    const fromName  = process.env.RESEND_FROM_NAME  || 'WiseHire';
    const fromAddr  = `${fromName} <${fromEmail}>`;

    let actionUrl;
    let actionLabel;
    let bodyText;

    if (existingUserId) {
      actionUrl   = `${PRODUCTION_URL}/auth/sign-in`;
      actionLabel = 'Sign in to WiseHire';
      bodyText    = `Great news — your WiseHire waitlist application has been approved! Your existing account has been upgraded with recruiter access. Sign in now to start finding and screening top talent.`;
    } else {
      actionUrl   = `${PRODUCTION_URL}/auth/sign-up?email=${encodeURIComponent(email)}&product=wisehire`;
      actionLabel = 'Create your WiseHire account';
      bodyText    = `Great news — your WiseHire waitlist application has been approved! Click the link below to create your account and start using WiseHire to find and screen top talent.`;
    }

    await resendRequest('POST', '/emails', {
      from: fromAddr,
      to: email,
      subject: 'Your WiseHire access has been approved!',
      html: buildBrandedEmail({
        logoLabel: 'WiseHire',
        heading: "You're in! Welcome to WiseHire",
        bodyHtml: `<p style="margin:0 0 16px;color:#374151;">Hi ${name},</p><p style="margin:0 0 16px;color:#374151;">${bodyText}</p><p style="margin:0;color:#6b7280;font-size:14px;">If you have any questions, reply to this email and we'll be happy to help.</p>`,
        ctaLabel: actionLabel,
        ctaUrl: actionUrl,
      }),
    });
    emailSent = true;
    log(`approve-wisehire-waitlist: approval email sent to ${email} (outcome: ${approvalOutcome})`);
  } else {
    log(`approve-wisehire-waitlist: RESEND_API_KEY not set, skipping email for ${email}`);
  }

  // Step 4: Delete the waitlist entry (only reached after successful provisioning).
  try {
    await databases.deleteDocument(DB_ID, 'wisehire_waitlist', waitlist_id);
    log(`approve-wisehire-waitlist: deleted waitlist entry ${waitlist_id}`);
  } catch (e) {
    log(`approve-wisehire-waitlist: could not delete waitlist entry: ${e.message}`);
    throw new Error(`Waitlist entry could not be removed: ${e.message}`);
  }

  await auditLog(databases, 'approve-wisehire-waitlist', {
    waitlist_id,
    email,
    emailSent,
    outcome: approvalOutcome,
    existing_user_id: existingUserId,
  });
  log(`approve-wisehire-waitlist: approved ${waitlist_id} (${email}) → ${approvalOutcome}`);
  return { approved: true, email, emailSent, outcome: approvalOutcome, existingUserId };
}

async function handleDismissWisehireWaitlist(body, log) {
  const { databases } = getClients();
  const { waitlist_id } = body;
  if (!waitlist_id) throw new Error('Missing waitlist_id');

  let entry;
  try {
    entry = await getDocument('wisehire_waitlist', waitlist_id);
  } catch (e) {
    throw new Error(`Waitlist entry not found: ${e.message}`);
  }

  const email = entry.email;

  try {
    await databases.deleteDocument(DB_ID, 'wisehire_waitlist', waitlist_id);
    log(`dismiss-wisehire-waitlist: deleted waitlist entry ${waitlist_id} (${email})`);
  } catch (e) {
    throw new Error(`Could not delete waitlist entry: ${e.message}`);
  }

  await auditLog(databases, 'dismiss-wisehire-waitlist', { waitlist_id, email });
  log(`dismiss-wisehire-waitlist: dismissed ${waitlist_id} (${email})`);
  return { dismissed: true, email };
}

/**
 * Phase 4 — Admin AI request analytics.
 * Queries the ai_request_logs collection written by the ai-gateway on every
 * real (non-cached) AI call.  Returns recent logs, per-feature and per-provider
 * aggregates, credit totals, and idempotency hit rate.
 *
 * Appwrite Console prerequisites (DB: main, Collection: ai_request_logs):
 *   Indexes: user_id (asc), created_at (desc), is_idempotency_hit (asc)
 */
async function handleAIRequestAnalytics(body, log) {
  const limit = Math.min(Math.max(1, Number(body.limit) || 50), 200);
  const queries = [sdk.Query.orderDesc('created_at'), sdk.Query.limit(limit)];
  if (body.user_id)  queries.push(sdk.Query.equal('user_id', body.user_id));
  if (body.feature)  queries.push(sdk.Query.equal('feature_id', body.feature));
  if (body.provider) queries.push(sdk.Query.equal('provider', body.provider));
  if (body.since) {
    try { queries.push(sdk.Query.greaterThanEqual('created_at', body.since)); } catch (_) {}
  }

  const res = await safeList(null, 'ai_request_logs', queries);
  const missingCollection = !!res.error &&
    /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error);

  const docs = res.documents || [];
  let totalCredits = 0;
  let idempotencyHits = 0;
  const byFeature = {};
  const byProvider = {};

  for (const d of docs) {
    const feat = d.feature_id || 'unknown';
    const prov = d.provider    || 'unknown';
    const cred = typeof d.credits_charged === 'number' ? d.credits_charged : 0;
    const isHit = d.is_idempotency_hit === true;

    totalCredits += cred;
    if (isHit) idempotencyHits++;

    if (!byFeature[feat]) byFeature[feat] = { count: 0, credits: 0, idempotencyHits: 0 };
    byFeature[feat].count++;
    byFeature[feat].credits += cred;
    if (isHit) byFeature[feat].idempotencyHits++;

    if (!byProvider[prov]) byProvider[prov] = { count: 0, credits: 0 };
    byProvider[prov].count++;
    byProvider[prov].credits += cred;
  }

  const idempotencyHitRate = docs.length > 0
    ? Math.round((idempotencyHits / docs.length) * 10000) / 100
    : 0;

  log(`ai-request-analytics: ${docs.length} logs, ${totalCredits} credits, ${idempotencyHitRate}% cache hit rate`);
  return {
    logs: docs,
    total_in_window: res.total || docs.length,
    total_credits_charged: totalCredits,
    idempotency_hit_count: idempotencyHits,
    idempotency_hit_rate_pct: idempotencyHitRate,
    stats_by_feature: byFeature,
    stats_by_provider: byProvider,
    missing_collection: missingCollection,
    fetch_error: (!missingCollection && res.error) ? res.error : null,
  };
}

async function handleListAiGatewayActivity(body, log) {
  const { functions } = getClients();
  const limit = Math.min(Math.max(1, Number(body.limit) || 10), 25);

  let executions = [];
  let executionsFetchError = null;
  try {
    const execRes = await functions.listExecutions('ai-gateway', [sdk.Query.limit(limit), sdk.Query.orderDesc('$createdAt')]);
    executions = (execRes.executions || []).map(e => ({
      $id: e.$id,
      status: e.status,
      trigger: e.trigger,
      duration: e.duration,
      $createdAt: e.$createdAt,
    }));
  } catch (e) {
    executionsFetchError = e.message;
    log(`list-ai-gateway-activity: executions fetch failed: ${e.message}`);
  }

  const usageRes = await safeList(null, 'ai_usage_logs', [sdk.Query.limit(50), sdk.Query.orderDesc('$createdAt')]);
  const missingUsageCollection = !!usageRes.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(usageRes.error);
  const usageFetchError = usageRes.error && !missingUsageCollection ? usageRes.error : null;

  const counts = { total: usageRes.total || 0, openrouter: 0, groq: 0, deepseek: 0, nvidia: 0 };
  for (const d of (usageRes.documents || [])) {
    const p = (d.provider || '').toLowerCase();
    if (p.includes('openrouter')) counts.openrouter++;
    else if (p.includes('groq')) counts.groq++;
    else if (p.includes('deepseek')) counts.deepseek++;
    else if (p.includes('nvidia')) counts.nvidia++;
  }

  log(`list-ai-gateway-activity: ${executions.length} executions, ${counts.total} usage logs${executionsFetchError ? ` (exec error: ${executionsFetchError})` : ''}${usageFetchError ? ` (usage error: ${usageFetchError})` : ''}`);
  return {
    executions,
    usageStats: counts,
    missingUsageCollection,
    executionsFetchError,
    usageFetchError,
  };
}

async function handleSendVerificationEmail(body, log) {
  const { users } = getClients();
  const { target_user_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');

  const targetUser = await getUser(target_user_id);
  if (!targetUser) throw new Error('User not found');

  if (targetUser.emailVerification) {
    log(`send-verification-email: ${target_user_id} is already verified`);
    return { ok: true, already_verified: true, email: targetUser.email };
  }

  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const verifyAppUrl = `${PRODUCTION_URL}/auth/verify-email`;

  // Try to create a real verification token via the Appwrite REST API,
  // then deliver it via Resend. Falls back to direct admin verification
  // if the REST call fails or Resend is not configured.
  let usedDirectVerify = false;
  try {
    const tokenRes = await axios.post(
      `${ENDPOINT}/v1/users/${target_user_id}/verification`,
      { url: verifyAppUrl },
      { headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': apiKey, 'Content-Type': 'application/json' } }
    );
    const secret = tokenRes.data?.secret;
    const expires = tokenRes.data?.expire;

    if (secret && process.env.RESEND_API_KEY) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@thewise.cloud';
      const fromName  = process.env.RESEND_FROM_NAME  || 'WiseResume';
      const verifyLink = `${verifyAppUrl}?userId=${target_user_id}&secret=${secret}`;
      await resendRequest('POST', '/emails', {
        from: `${fromName} <${fromEmail}>`,
        to: targetUser.email,
        subject: 'Verify your WiseResume email address',
        html: `<p>Hi ${targetUser.name || 'there'},</p><p>An admin requested a verification email for your account. Click the link below to verify your email address:</p><p><a href="${verifyLink}">Verify Email Address</a></p><p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
      });
      log(`send-verification-email: email sent to ${targetUser.email} (expires ${expires})`);
      return { ok: true, email: targetUser.email, expires_at: expires };
    }

    // Resend not configured — fall through to direct verification
    log(`send-verification-email: RESEND_API_KEY not set, using direct admin verification for ${target_user_id}`);
  } catch (err) {
    log(`send-verification-email: REST token creation failed (${err.message}), falling back to direct verify`);
  }

  // Direct admin verification fallback
  await users.updateEmailVerification(target_user_id, true);
  usedDirectVerify = true;
  log(`send-verification-email: directly verified ${target_user_id} (${targetUser.email}) via admin override`);
  return { ok: true, directly_verified: true, email: targetUser.email };
}

// ─── Analytics: aggregate visitor_events for AnalyticsPanel ─────────────────

function analyticsRangeStart(range) {
  const map = {
    today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
    '7d':  new Date(Date.now() - 7  * 86400000).toISOString(),
    '30d': new Date(Date.now() - 30 * 86400000).toISOString(),
    '90d': new Date(Date.now() - 90 * 86400000).toISOString(),
  };
  return map[range] ?? map['7d'];
}

function analyticsRangeStartPrev(range) {
  const map = {
    today: new Date(Date.now() - 86400000).toISOString(),
    '7d':  new Date(Date.now() - 14 * 86400000).toISOString(),
    '30d': new Date(Date.now() - 60 * 86400000).toISOString(),
    '90d': new Date(Date.now() - 180 * 86400000).toISOString(),
  };
  return map[range] ?? map['7d'];
}

async function fetchAnalyticsEvents(since, until) {
  const allDocs = [];
  let cursor = null;
  while (true) {
    const q = [sdk.Query.greaterThanEqual('$createdAt', since), sdk.Query.limit(500)];
    if (until) q.push(sdk.Query.lessThan('$createdAt', until));
    if (cursor) q.push(sdk.Query.cursorAfter(cursor));
    let page;
    try { page = await listDocuments('visitor_events', q); } catch { break; }
    const docs = page.documents || [];
    allDocs.push(...docs);
    if (docs.length < 500) break;
    cursor = docs[docs.length - 1].$id;
  }
  return allDocs;
}

async function handleAnalytics(body, log) {
  const range = ['today', '7d', '30d', '90d', 'all'].includes(body.range) ? body.range : '7d';
  const since = range === 'all' ? '2020-01-01T00:00:00.000Z' : analyticsRangeStart(range);
  const prevSince = range === 'all' ? '2020-01-01T00:00:00.000Z' : analyticsRangeStartPrev(range);
  const bucket = (range === 'today') ? 'hour' : 'day';

  const [currentDocs, prevDocs] = await Promise.all([
    fetchAnalyticsEvents(since, null),
    fetchAnalyticsEvents(prevSince, since),
  ]);

  // KPIs
  const pageViews = currentDocs.filter(d => d.event_type === 'page_view');
  const prevPageViews = prevDocs.filter(d => d.event_type === 'page_view');
  const anonIds = new Set(currentDocs.map(d => d.anon_id).filter(Boolean));
  const prevAnonIds = new Set(prevDocs.map(d => d.anon_id).filter(Boolean));
  const todaySince = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const ydaySince  = new Date(Date.now() - 86400000);
  ydaySince.setHours(0, 0, 0, 0);
  const todayDocs  = currentDocs.filter(d => d.$createdAt >= todaySince);
  const ydayDocs   = currentDocs.filter(d => d.$createdAt >= ydaySince.toISOString() && d.$createdAt < todaySince);
  const todayUsers = new Set(todayDocs.map(d => d.anon_id).filter(Boolean));
  const ydayUsers  = new Set(ydayDocs.map(d => d.anon_id).filter(Boolean));

  // Activity series (views + users per bucket)
  const seriesMap = {};
  for (const d of currentDocs) {
    const key = bucket === 'hour'
      ? d.$createdAt.slice(0, 13)   // "2025-01-01T14"
      : d.$createdAt.slice(0, 10);  // "2025-01-01"
    if (!seriesMap[key]) seriesMap[key] = { views: 0, users: new Set() };
    if (d.event_type === 'page_view') seriesMap[key].views++;
    if (d.anon_id) seriesMap[key].users.add(d.anon_id);
  }
  const activitySeries = Object.entries(seriesMap)
    .map(([date, v]) => ({ date, views: v.views, users: v.users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Device breakdown
  const deviceMap = {};
  for (const d of currentDocs) {
    const raw = (d.device_type || 'desktop').toLowerCase();
    const dev = raw.includes('mobile') || raw.includes('phone') ? 'mobile'
              : raw.includes('tablet') || raw.includes('ipad') ? 'tablet'
              : 'desktop';
    deviceMap[dev] = (deviceMap[dev] || 0) + 1;
  }
  const deviceBreakdown = Object.entries(deviceMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Top pages
  const pageMap = {};
  for (const d of pageViews) {
    const pg = d.page || '/';
    pageMap[pg] = (pageMap[pg] || 0) + 1;
  }
  const topPages = Object.entries(pageMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Country distribution
  const countryMap = {};
  for (const d of currentDocs) {
    const c = d.country || '??';
    countryMap[c] = (countryMap[c] || 0) + 1;
  }
  const countryRanking = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Feature usage
  const featureMap = {};
  for (const d of currentDocs.filter(d => d.event_type === 'feature_use')) {
    const f = d.target || 'unknown';
    featureMap[f] = (featureMap[f] || 0) + 1;
  }
  const topFeaturesRanked = Object.entries(featureMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const analyticsPayload = {
    // Back-compat fields
    pageViewsAllTime: pageViews.length,
    pageViewsToday: todayDocs.filter(d => d.event_type === 'page_view').length,
    activeUsersToday: todayUsers.size,
    activeUsersYesterday: ydayUsers.size,
    topFeatures: topFeaturesRanked,
    portfolioViewsTotal: pageViews.filter(d => d.page && d.page.startsWith('/p/')).length,
    signupsLast14Days: [],
    aiCreditsToday: 0,
    aiCreditsYesterday: 0,
    countryDistribution: countryRanking.map(c => ({ country: c.country, count: c.count })),
    // New fields
    range,
    bucket,
    rangeKpis: {
      views: { current: pageViews.length, previous: prevPageViews.length },
      activeUsers: { current: anonIds.size, previous: prevAnonIds.size },
      aiCredits: { current: 0, previous: 0 },
      portfolioViews: {
        current: pageViews.filter(d => d.page && d.page.startsWith('/p/')).length,
        previous: prevPageViews.filter(d => d.page && d.page.startsWith('/p/')).length,
      },
      stickiness: (todayUsers.size > 0 && anonIds.size > 0) ? Math.round((todayUsers.size / anonIds.size) * 100) : 0,
      dau: todayUsers.size,
      wau: anonIds.size,
    },
    activitySeries,
    dauRollingSeries: activitySeries.map(p => ({ date: p.date, value: p.users })),
    newVsReturning: activitySeries.map(p => ({ date: p.date, newUsers: p.users, returningUsers: 0 })),
    heatmap: [],
    topFeaturesRanged: topFeaturesRanked.map(f => ({ name: f.name, count: f.count, trend: [] })),
    topReferrers: [],
    deviceBreakdown,
    topPages,
    countryRanking,
    totalCountries: Object.keys(countryMap).length,
  };

  return { data: analyticsPayload };
}

async function handleHomeSummary(log, error) {
  const { databases, users } = getClients();
  const now = isoNow();

  const [siteResult, waitlistResult, errorsResult, auditResult, usersResult, settingsResult] =
    await Promise.allSettled([
      // 1. Ping production site
      axios.get(PRODUCTION_URL, { timeout: 5000, validateStatus: () => true })
        .then(r => ({ siteUp: r.status < 400, siteHttpStatus: r.status }))
        .catch(() => ({ siteUp: false, siteHttpStatus: 0 })),
      // 2. WiseHire waitlist count
      safeList(databases, 'wisehire_waitlist', [sdk.Query.limit(1)]),
      // 3. Recent errors (last 10 rows from error_log)
      safeList(databases, 'error_log', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(10)]),
      // 4. Recent admin audit entries
      safeList(databases, 'admin_audit_logs', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(8)]),
      // 5. Total auth user count
      users.list([sdk.Query.limit(1)]).then(r => ({ total: r.total })).catch(() => ({ total: null })),
      // 6. App settings (for maintenance_mode)
      safeList(databases, 'app_settings', [sdk.Query.limit(50)]),
    ]);

  const site       = siteResult.status       === 'fulfilled' ? siteResult.value       : { siteUp: false, siteHttpStatus: 0 };
  const waitlist   = waitlistResult.status   === 'fulfilled' ? waitlistResult.value   : { total: 0, documents: [] };
  const errors     = errorsResult.status     === 'fulfilled' ? errorsResult.value     : { documents: [], total: 0 };
  const audit      = auditResult.status      === 'fulfilled' ? auditResult.value      : { documents: [] };
  const usersCount = usersResult.status      === 'fulfilled' ? usersResult.value      : { total: null };
  const settings   = settingsResult.status   === 'fulfilled' ? settingsResult.value   : { documents: [] };

  const maintenanceSetting = (settings.documents || []).find(
    d => d.key === 'maintenance_mode' || d.$id === 'maintenance_mode',
  );
  const maintenanceModeOn = maintenanceSetting
    ? String(maintenanceSetting.value).toLowerCase() === 'true'
    : false;

  const aiConfigured = !!(process.env.OPENROUTER_KEY_1 || process.env.GROQ_KEY_1 || process.env.DEEPSEEK_KEY);

  const recentAudit = (audit.documents || []).slice(0, 8).map(d => {
    let meta = {};
    try { meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {}); } catch {}
    return {
      id: d.$id,
      action: d.action || '',
      category: d.category || null,
      metadata: meta,
      created_at: d.$createdAt,
    };
  });

  log(`home-summary: site=${site.siteUp} maintenance=${maintenanceModeOn} waitlist=${waitlist.total} errors=${errors.documents?.length} users=${usersCount.total}`);

  return {
    checkedAt: now,
    siteUp: site.siteUp,
    siteHttpStatus: site.siteHttpStatus,
    maintenanceModeOn,
    aiConfigured,
    wisehireWaitlistCount: waitlist.total ?? 0,
    recentErrorCount: errors.documents?.length ?? 0,
    totalUsers: usersCount.total,
    recentAudit,
  };
}

module.exports = async ({ req, res, log, error }) => {
  const rid = requestId();
  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body || '{}'); } catch { return {}; } })()
    : (req.body || {});

  const { action } = body;
  try {
    if (action === 'verify-devkit-session') {
      const auth = await verifyDevKitSession(body);
      return json(res, rid, auth, auth.success ? 200 : auth.code === 'CONFIG_MISSING' ? 500 : 401);
    }

    if (!checkAuth(req, body)) {
      return json(res, rid, { success: false, code: 'DEVKIT_UNAUTHORIZED', error: 'DevKit token is missing, invalid, or expired.' }, 401);
    }

    let data;
    if (action === 'diagnostics') data = await handleDiagnostics(log, error);
    else if (action === 'mission-control') data = await handleMissionControl(log, error);
    else if (action === 'ping-providers') data = await handlePingProviders();
    else if (action === 'list-provider-models') data = await handleListProviderModels(body, log);
    else if (action === 'fn-drift' || action === 'edge-fn-drift') data = await handleEdgeFnDrift(log);
    else if (action === 'deploy-hubs-status') data = await handleDeployHubsStatus();
    else if (action === 'list-functions') data = await handleListFunctions(body, log);
    else if (action === 'list-function-executions') data = await handleListFunctionExecutions(body, log);
    else if (action === 'get-execution-log') data = await handleGetExecutionLog(body, log);
    else if (action === 'observability') data = await handleObservability(body, log);
    else if (action === 'overview-stats') data = await handleOverviewStats(log);
    else if (action === 'global-stats') data = await handleGlobalStats(log);
    else if (action === 'list-users-page') data = await handleListUsersPage(body, log);
    else if (action === 'purge-orphans') data = await handlePurgeOrphans(body, log);
    else if (action === 'list-audit-logs') data = await handleListAuditLogs(body, log);
    else if (action === 'list-discount-codes') data = await handleListDiscountCodes(log);
    else if (action === 'add-discount-code') data = await handleAddDiscountCode(body, log);
    else if (action === 'list-all-resumes') data = await handleListAllResumes(body, log);
    else if (action === 'list-errors') data = await handleListErrors(body);
    else if (action === 'set-plan') data = await handleSetPlan(body, log);
    else if (action === 'grant-trial') data = await handleGrantTrial(body, log);
    else if (action === 'revoke-trial') data = await handleRevokeTrial(body, log);
    else if (action === 'suspend-user') data = await handleSuspendUser(body, log);
    else if (action === 'set-credits') data = await handleSetCredits(body, log);
    else if (action === 'save-note') data = await handleSaveNote(body, log);
    else if (action === 'delete-user') data = await handleDeleteUser(body, log);
    else if (action === 'merge-identity') data = await handleMergeIdentity(body, log);
    else if (action === 'revoke-sessions') data = await handleRevokeSessions(body, log);
    else if (action === 'list-user-content') data = await handleListUserContent(body, log);
    else if (action === 'update-profile') data = await handleUpdateProfile(body, log);
    else if (action === 'get-identity') data = await handleGetIdentity(body, log);
    else if (action === 'user-audit-logs') data = await handleUserAuditLogs(body, log);
    else if (action === 'wisehire-reset-user') data = await handleWisehireResetUser(body, log);
    else if (action === 'live-activity') data = await handleLiveActivity(body, log);
    else if (action === 'get-resume-detail') data = await handleListUserContent(body, log);
    else if (action === 'impersonate') data = await handleImpersonate(body, log);
    else if (action === 'send-verification-email') data = await handleSendVerificationEmail(body, log);
    else if (action === 'analytics') data = await handleAnalytics(body, log);
    else if (action === 'home-summary') data = await handleHomeSummary(log, error);
    else if (action === 'list-app-settings') data = await handleListAppSettings(log);
    else if (action === 'toggle-app-setting') data = await handleToggleAppSetting(body, log);
    else if (action === 'list-wisehire-waitlist') data = await handleListWisehireWaitlist(log);
    else if (action === 'approve-wisehire-waitlist') data = await handleApproveWisehireWaitlist(body, log);
    else if (action === 'dismiss-wisehire-waitlist') data = await handleDismissWisehireWaitlist(body, log);
    else if (action === 'send-wisehire-invite') data = await handleSendWisehireInvite(body, log);
    else if (action === 'list-ai-gateway-activity') data = await handleListAiGatewayActivity(body, log);
    else if (action === 'ai-request-analytics') data = await handleAIRequestAnalytics(body, log);
    else if (action === 'list-routing-config') data = await handleListRoutingConfig();
    else if (action === 'update-routing-config') data = await handleUpdateRoutingConfig(body, log);
    else if (action === 'create-routing-config') data = await handleCreateRoutingConfig(body, log);
    else if (action === 'delete-routing-config') data = await handleDeleteRoutingConfig(body, log);
    else if (action === 'list-routes') data = await handleListRoutes(log);
    else if (action === 'issue-test-nonce') data = await handleIssueTestNonce(body, log);
    else if (action === 'get-key-modes') data = await handleGetKeyModes(log);
    else if (action === 'set-key-mode') data = await handleSetKeyMode(body, log);
    else if (action === 'get-deployed-hashes') data = await handleGetDeployedHashes(log);
    else if (action === 'set-deployed-hash') data = await handleSetDeployedHash(body, log);
    else return json(res, rid, { success: false, code: 'UNKNOWN_ACTION', error: `Unknown action: ${action}` }, 400);

    return json(res, rid, { success: true, ...data });
  } catch (err) {
    error(`DevKit Data Error [${rid}]: ${err.message}`);
    return json(res, rid, { success: false, code: 'FUNCTION_RUNTIME_FAILED', error: err.message }, 500);
  }
};
