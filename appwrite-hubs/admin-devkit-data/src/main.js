'use strict';

const sdk = require('node-appwrite');
const axios = require('axios');
const crypto = require('crypto');

const DB_ID = 'main';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://resume.thewise.cloud';

function requestId() {
  return `dk_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function json(res, requestIdValue, payload, status = 200) {
  return res.json({ requestId: requestIdValue, ...payload }, status);
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signToken(payload) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret) throw new Error('DEVKIT_PASSWORD is not configured');
  const encoded = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedToken(token) {
  const secret = process.env.DEVKIT_PASSWORD;
  if (!secret || !token || !token.includes('.')) return false;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
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
  const password = process.env.DEVKIT_PASSWORD;
  if (!password || !token) return false;
  if (token === password) return true;
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

async function listUsers(queries = []) {
  return appwriteGet('/users', queries);
}

async function getUser(userId) {
  return appwriteGet(`/users/${encodeURIComponent(userId)}`);
}

async function listFunctions(queries = []) {
  return appwriteGet('/functions', queries);
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

async function auditLog(databases, action, metadata = {}) {
  try {
    await databases.createDocument(DB_ID, 'admin_audit_logs', sdk.ID.unique(), {
      action,
      category: 'devkit',
      metadata: JSON.stringify(metadata),
      user_id: null,
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
  const password = process.env.DEVKIT_PASSWORD;
  if (!password) return { success: false, code: 'CONFIG_MISSING', error: 'DEVKIT_PASSWORD is not configured.' };
  if (!body.password || body.password !== password) {
    return { success: false, code: 'INVALID_PASSWORD', error: 'Invalid DevKit password.' };
  }
  const now = Date.now();
  const expiresAtMs = now + SESSION_TTL_MS;
  const token = signToken({ purpose: 'devkit', iat: now, exp: expiresAtMs, version: 1 });
  return {
    success: true,
    session: { token, expiresAt: new Date(expiresAtMs).toISOString(), email: 'admin@thewise.cloud' },
  };
}

async function handleDiagnostics(log, error) {
  const items = [];

  items.push(item('Access', 'devkit-password', 'DevKit Password', envPresent('DEVKIT_PASSWORD') ? 'healthy' : 'broken', envPresent('DEVKIT_PASSWORD') ? 'DEVKIT_PASSWORD is present.' : 'DEVKIT_PASSWORD is missing.', 'Required for login and signed token verification.'));
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

  const requiredCollections = ['profiles', 'subscriptions', 'ai_credits', 'resumes', 'admin_audit_logs', 'audit_logs', 'feature_flags', 'error_log', 'edge_function_logs', 'discount_codes', 'app_settings', 'usage_events', 'visitor_events', 'contact_requests'];
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

  const providerPings = [];
  const providers = [
    { key: 'OPENROUTER_KEY_1', provider: 'openrouter', url: 'https://openrouter.ai/api/v1/models' },
    { key: 'GROQ_KEY_1', provider: 'groq', url: 'https://api.groq.com/openai/v1/models' },
    { key: 'DEEPSEEK_KEY', provider: 'deepseek', url: 'https://api.deepseek.com/models' },
    { key: 'NVIDIA_KEY_1', provider: 'nvidia', url: 'https://integrate.api.nvidia.com/v1/models' },
  ];
  for (const cfg of providers) {
    const apiKey = process.env[cfg.key];
    if (!apiKey) { providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 }); continue; }
    const start = Date.now();
    try {
      const r = await axios.get(cfg.url, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 6000, validateStatus: () => true });
      providerPings.push({ provider: cfg.provider, ok: r.status >= 200 && r.status < 300, latencyMs: Date.now() - start, httpStatus: r.status });
    } catch { providerPings.push({ provider: cfg.provider, ok: false, latencyMs: null, httpStatus: 0 }); }
  }

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
    },
    email: { resendKeyPresent: !!process.env.RESEND_API_KEY, reachable: !!process.env.RESEND_API_KEY, httpStatus: 0, sends24h: null, keyInSupabaseVault: false, reason: process.env.RESEND_API_KEY ? undefined : 'missing_key' },
    database: { ok: !errorDocs.error, error: errorDocs.error || null, errorCount1h: errorDocs.total },
    secrets: {
      items: ['DEVKIT_PASSWORD', 'APPWRITE_API_KEY', 'RESEND_API_KEY'].map(key => ({ key, label: key, present: envPresent(key), source: 'appwrite_function_variable', lastRotatedAt: null, stale: false, daysSinceRotation: null })),
      missingCount: ['DEVKIT_PASSWORD', 'APPWRITE_API_KEY'].filter(k => !envPresent(k)).length,
      staleCount: 0,
    },
    recentErrors: errorDocs.documents.map(d => ({ id: d.$id, message: d.message || '', context: d.context || null, created_at: d.$createdAt, level: d.level || 'error' })),
    recentAdminActions: adminDocs.documents.map(d => ({ id: d.$id, action: d.action || '', category: d.category || null, metadata: d.metadata || null, created_at: d.$createdAt, user_id: d.user_id || null })),
  };
}

async function handleEdgeFnDrift(log) {
  const now = isoNow();
  log('edge-fn-drift: returning stub (real drift scanner not yet wired)');
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
      failures: [],
      knownDrifts: [],
      defaultExpected: 200,
    },
  };
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
  const page = Math.max(0, Number(body.page) || 0);
  const pageSize = Math.min(Math.max(1, Number(body.pageSize) || 25), 100);
  const authPage = await listUsers([sdk.Query.limit(pageSize), sdk.Query.offset(page * pageSize)]);

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

  return {
    users: authPage.users.map(authUser => {
      const doc = profileMap.get(authUser.$id) || {};
      const s = subMap.get(authUser.$id) || {};
      const c = credMap.get(authUser.$id) || {};
      return {
        $id: doc.$id || authUser.$id,
        $createdAt: authUser.$createdAt || doc.$createdAt,
        user_id: authUser.$id,
        email: authUser.email || doc.email || null,
        full_name: doc.full_name || authUser.name || null,
        contact_email: doc.contact_email ?? null,
        plan_name: s.plan ?? doc.plan ?? 'free',
        plan_updated_at: s.$updatedAt ?? null,
        is_suspended: doc.is_suspended ?? false,
        suspension_reason: doc.suspension_reason ?? null,
        daily_limit: c.daily_limit ?? null,
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

async function handlePurgeOrphans(body, log) {
  return { dryRun: body.dryRun !== false, orphanedProfiles: 0, orphanedResumes: 0, sampleProfiles: [], sampleResumes: [], deletedProfiles: 0, deletedResumes: 0 };
}

async function handleListAuditLogs(body, log) {
  const { databases } = getClients();
  const limit = Math.min(Math.max(1, Number(body.limit) || 25), 100);
  const res = await safeList(databases, 'admin_audit_logs', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(limit)]);
  return { documents: res.documents, total: res.total };
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
    <a href="https://resume.thewise.cloud/dashboard" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Go to Dashboard</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WiseResume</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#6366f1;padding:24px 32px;">
    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">WiseResume</span>
  </div>
  <div style="padding:32px;">${content}</div>
  <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">
    This email was sent to ${userEmail} by the WiseResume admin panel. thewise.cloud
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

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function handleSetPlan(body, log) {
  const { databases } = getClients();
  const { target_user_id, plan, actor_email } = body;
  if (!target_user_id || !plan) throw new Error('Missing target_user_id or plan');
  if (!['free', 'pro', 'premium'].includes(plan)) throw new Error(`Invalid plan: ${plan}`);
  await getUser(target_user_id);
  const profile = await getProfileDoc(databases, target_user_id);
  if (profile) await databases.updateDocument(DB_ID, 'profiles', profile.$id, { plan });

  const subRes = await safeList(databases, 'subscriptions', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const subDoc = subRes.documents[0] || null;
  const patch = { plan, effective_plan: plan, status: 'active', trial_plan: null, trial_expires_at: null };
  if (subDoc) {
    await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, patch);
  } else {
    await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { user_id: target_user_id, ...patch }, [
      sdk.Permission.read(sdk.Role.user(target_user_id)),
      sdk.Permission.update(sdk.Role.user(target_user_id)),
    ]);
  }

  await auditLog(databases, 'set-plan', { target_user_id, plan, actor_email });
  log(`set-plan: ${target_user_id} -> ${plan}`);

  const planLabel = PLAN_LABELS[plan] || plan;
  await Promise.allSettled([
    createPlanNotification(databases, target_user_id, planLabel, null, log),
    sendPlanUpgradeEmail(target_user_id, planLabel, null, log),
  ]);

  return { plan };
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
  if (subDoc) {
    await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, { trial_plan: plan, effective_plan: plan, trial_expires_at: expiresAt, status: 'active' });
  } else {
    await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), { user_id: target_user_id, plan: 'free', effective_plan: plan, trial_plan: plan, trial_expires_at: expiresAt, status: 'active' }, [
      sdk.Permission.read(sdk.Role.user(target_user_id)),
      sdk.Permission.update(sdk.Role.user(target_user_id)),
    ]);
  }

  await auditLog(databases, 'grant-trial', { target_user_id, plan, days });
  log(`grant-trial: ${target_user_id} -> ${plan} for ${days}d`);

  const planLabel = PLAN_LABELS[plan] || plan;
  const durationLabel = `${days} day${Number(days) === 1 ? '' : 's'}`;
  await Promise.allSettled([
    createPlanNotification(databases, target_user_id, planLabel, durationLabel, log),
    sendPlanUpgradeEmail(target_user_id, planLabel, durationLabel, log),
  ]);

  return { trial_plan: plan, trial_expires_at: expiresAt };
}

async function handleRevokeTrial(body, log) {
  const { databases } = getClients();
  const { target_user_id } = body;
  if (!target_user_id) throw new Error('Missing target_user_id');

  const subRes = await safeList(databases, 'subscriptions', [sdk.Query.equal('user_id', target_user_id), sdk.Query.limit(1)]);
  const subDoc = subRes.documents[0] || null;
  if (subDoc) {
    const basePlan = subDoc.plan || 'free';
    await databases.updateDocument(DB_ID, 'subscriptions', subDoc.$id, { trial_plan: null, trial_expires_at: null, effective_plan: basePlan });
  }

  await auditLog(databases, 'revoke-trial', { target_user_id });
  log(`revoke-trial: ${target_user_id}`);
  return { ok: true };
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
  const { target_user_id, action: noteAction, note_text, note_id, actor_email } = body;
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

async function handleListWisehireWaitlist(log) {
  const res = await safeList(null, 'wisehire_waitlist', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(100)]);
  if (res.error && /not\s+found|could not be found|collection.*missing|does not exist/i.test(res.error)) {
    return { entries: [], total: 0, missing_collection: true };
  }
  if (res.error) throw new Error(`wisehire_waitlist error: ${res.error}`);
  return { entries: res.documents, total: res.total };
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
    else if (action === 'edge-fn-drift') data = await handleEdgeFnDrift(log);
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
    else if (action === 'list-app-settings') data = await handleListAppSettings(log);
    else if (action === 'toggle-app-setting') data = await handleToggleAppSetting(body, log);
    else if (action === 'list-wisehire-waitlist') data = await handleListWisehireWaitlist(log);
    else if (action === 'list-ai-gateway-activity') data = await handleListAiGatewayActivity(body, log);
    else return json(res, rid, { success: false, code: 'UNKNOWN_ACTION', error: `Unknown action: ${action}` }, 400);

    return json(res, rid, { success: true, ...data });
  } catch (err) {
    error(`DevKit Data Error [${rid}]: ${err.message}`);
    return json(res, rid, { success: false, code: 'FUNCTION_RUNTIME_FAILED', error: err.message }, 500);
  }
};
