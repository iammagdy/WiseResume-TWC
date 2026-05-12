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

async function safeList(databases, collectionId, queries = []) {
  try { return await databases.listDocuments(DB_ID, collectionId, queries); }
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
  const { databases, functions, users } = getClients();
  const items = [];

  items.push(item('Access', 'devkit-password', 'DevKit Password', envPresent('DEVKIT_PASSWORD') ? 'healthy' : 'broken', envPresent('DEVKIT_PASSWORD') ? 'DEVKIT_PASSWORD is present.' : 'DEVKIT_PASSWORD is missing.', 'Required for login and signed token verification.'));
  items.push(item('Access', 'appwrite-api-key', 'Appwrite API Key', envPresent('APPWRITE_API_KEY') || envPresent('APPWRITE_FUNCTION_API_KEY') ? 'healthy' : 'broken', envPresent('APPWRITE_API_KEY') || envPresent('APPWRITE_FUNCTION_API_KEY') ? 'Server API key is present.' : 'Server API key is missing.', 'Required for cross-user admin reads.'));

  try {
    const authUsers = await users.list([sdk.Query.limit(1)]);
    items.push(item('Access', 'auth-users', 'Auth Users API', 'healthy', `Users API reachable. Total auth users: ${authUsers.total}.`));
  } catch (e) {
    items.push(item('Access', 'auth-users', 'Auth Users API', 'broken', 'Users API could not be reached.', e.message));
  }

  const requiredFunctions = ['admin-devkit-data', 'inspect-ai-keys', 'ai-gateway', 'admin-feature-flags', 'admin-email', 'admin-testmail', 'admin-visitor-analytics'];
  try {
    const fnPage = await functions.list([sdk.Query.limit(200)]);
    for (const fn of requiredFunctions) {
      const found = fnPage.functions.find(f => f.$id === fn || f.name === fn);
      items.push(item('Functions', `fn-${fn}`, fn, found ? (found.enabled ? 'healthy' : 'warning') : 'broken', found ? `${fn} is deployed${found.enabled ? ' and enabled' : ' but disabled'}.` : `${fn} is not deployed.`, found ? `Runtime: ${found.runtime || 'unknown'}` : 'Deploy the Appwrite Function from appwrite-hubs.'));
    }
  } catch (e) {
    items.push(item('Functions', 'functions-list', 'Function Inventory', 'broken', 'Could not list Appwrite Functions.', e.message));
  }

  const requiredCollections = ['profiles', 'subscriptions', 'ai_credits', 'resumes', 'admin_audit_logs', 'audit_logs', 'feature_flags', 'error_log', 'discount_codes', 'app_settings', 'usage_events', 'visitor_events', 'contact_requests'];
  try {
    const collPage = await databases.listCollections(DB_ID, [sdk.Query.limit(200)]);
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
      keysInSupabaseVault: false,
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
    const res = await safeList(databases, 'admin_audit_logs', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(500),
    ]);
    if (res.error) {
      return { telemetry: [], missing_table: false };
    }
    const counts = {};
    for (const doc of res.documents) {
      const fn = doc.action || 'unknown';
      if (!counts[fn]) counts[fn] = { total: 0, last1h: 0 };
      counts[fn].total += 1;
      const age = Date.now() - new Date(doc.$createdAt).getTime();
      if (age < 60 * 60 * 1000) counts[fn].last1h += 1;
    }
    const telemetry = Object.entries(counts).map(([function_name, c]) => ({
      function_name,
      total_count: c.total,
      last_1h_count: c.last1h,
      error_count: 0,
      error_rate: 0,
      p50_ms: 0,
      p95_ms: 0,
      sparkline: [],
    }));
    log(`observability/get_telemetry: ${telemetry.length} rows from audit log`);
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
  const { databases, users } = getClients();
  const auth = await users.list([sdk.Query.limit(500)]);
  const resumeRes = await safeList(databases, 'resumes', [sdk.Query.limit(1)]);
  return {
    totalAuthUsers: auth.total,
    verifiedUsers: auth.users.filter(u => u.emailVerification).length,
    totalResumes: resumeRes.total,
    orphanedResumes: 0,
  };
}

async function handleGlobalStats(log) {
  const { databases } = getClients();
  const [profiles, premium, pro, suspended] = await Promise.all([
    safeList(databases, 'profiles', [sdk.Query.limit(1)]),
    safeList(databases, 'subscriptions', [sdk.Query.equal('plan', 'premium'), sdk.Query.limit(1)]),
    safeList(databases, 'subscriptions', [sdk.Query.equal('plan', 'pro'), sdk.Query.limit(1)]),
    safeList(databases, 'profiles', [sdk.Query.equal('is_suspended', true), sdk.Query.limit(1)]),
  ]);
  return { total: profiles.total, premium: premium.total, pro: pro.total, suspended: suspended.total, activeToday: 0 };
}

async function handleListUsersPage(body, log) {
  const { databases } = getClients();
  const page = Math.max(0, Number(body.page) || 0);
  const pageSize = Math.min(Math.max(1, Number(body.pageSize) || 25), 100);
  const profiles = await databases.listDocuments(DB_ID, 'profiles', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(pageSize), sdk.Query.offset(page * pageSize)]);
  return {
    users: profiles.documents.map(doc => ({
      $id: doc.$id,
      $createdAt: doc.$createdAt,
      user_id: doc.user_id,
      email: doc.email ?? null,
      full_name: doc.full_name ?? null,
      contact_email: doc.contact_email ?? null,
      plan_name: doc.plan ?? 'free',
      plan_updated_at: null,
      is_suspended: doc.is_suspended ?? false,
      suspension_reason: doc.suspension_reason ?? null,
      daily_limit: null,
      credits_used_today: doc.daily_usage ?? 0,
      trial_plan: doc.trial_plan ?? null,
      trial_expires_at: doc.trial_expires_at ?? null,
      resumeCount: 0,
    })),
    total: profiles.total,
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
  const { databases } = getClients();
  const limit = Math.min(Math.max(1, Number(body.limit) || 20), 100);
  const offset = Math.max(0, Number(body.offset) || 0);
  const res = await databases.listDocuments(DB_ID, 'resumes', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(limit), sdk.Query.offset(offset)]);
  return { documents: res.documents, total: res.total };
}

async function handleListErrors(body) {
  const { databases } = getClients();
  const res = await safeList(databases, 'error_log', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(Math.min(Number(body.limit) || 25, 100))]);
  return { errors: res.documents, total: res.total, missing: !!res.error, error: res.error || null };
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
    else return json(res, rid, { success: false, code: 'UNKNOWN_ACTION', error: `Unknown action: ${action}` }, 400);

    return json(res, rid, { success: true, ...data });
  } catch (err) {
    error(`DevKit Data Error [${rid}]: ${err.message}`);
    return json(res, rid, { success: false, code: 'FUNCTION_RUNTIME_FAILED', error: err.message }, 500);
  }
};
