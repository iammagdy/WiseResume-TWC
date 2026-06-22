'use strict';

const axios = require('axios');
const dns = require('dns');
const crypto = require('crypto');
const { URL } = require('url');
const sdk = require('node-appwrite');
const { Client, Account } = sdk;

// â”€â”€â”€ SSRF protection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BLOCKED_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f][0-9a-f]:/i,
  /^fd/i,
  /^localhost$/i,
];

function isBlockedIp(ip) {
  return BLOCKED_RANGES.some(re => re.test(ip));
}

function isSafeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    return !isBlockedIp(host);
  } catch {
    return false;
  }
}

async function isSafeUrlDnsResolved(rawUrl) {
  if (!isSafeUrl(rawUrl)) return false;
  try {
    const { hostname } = new URL(rawUrl);
    const { address } = await dns.promises.lookup(hostname, { family: 4 });
    return !isBlockedIp(address);
  } catch {
    return false;
  }
}

async function authenticateRequest(body, req) {
  const embeddedHeaders = (body && typeof body.__headers === 'object' && body.__headers) || {};
  const authHeader =
    (typeof embeddedHeaders.Authorization === 'string' ? embeddedHeaders.Authorization : '') ||
    (typeof embeddedHeaders['X-Appwrite-JWT'] === 'string' ? `Bearer ${embeddedHeaders['X-Appwrite-JWT']}` : '') ||
    (typeof req.headers?.authorization === 'string' ? req.headers.authorization : '');
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return { ok: false };
  try {
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '';
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const user = await new Account(client).get();
    return { ok: true, userId: user.$id };
  } catch {
    return { ok: false };
  }
}

// â”€â”€â”€ Provider pool â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── AI credit accounting + rate limit + idempotency ──────────────────────────
// Ported from resume-section-ai so parse-job charges the same way the rest of
// the AI surface does. Without this, job-import called the LLM for free with no
// per-user throttle (credit/quota bypass). parse-job costs 1 credit (matches
// the ai-gateway FEATURE_CREDIT_COSTS['parse-job'] policy).

const DB_ID = 'main';
const AI_CREDITS_COLLECTION_ID = 'ai_credits';
const SUBSCRIPTIONS_COLLECTION_ID = 'subscriptions';
const IDEMPOTENCY_CACHE_COLLECTION_ID = 'idempotency_cache';
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const IDEMPOTENCY_RESULT_MAX_BYTES = 60_000;
const SERVER_RATE_LIMIT_WINDOW_MS = 60_000;
const SERVER_RATE_LIMIT_MAX_REQUESTS = 20;
const PARSE_JOB_CREDIT_COST = 1;
const PLAN_DAILY_LIMITS = { free: 5, pro: 50, premium: -1 };
const _serverRateLimits = new Map();
let _idempotencyCollectionMissing = false;

function getDbClient() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY);
  return new sdk.Databases(client);
}

function checkServerRateLimit(userId) {
  const now = Date.now();
  const key = `${userId}:parse-job`;
  const current = _serverRateLimits.get(key);
  if (!current || now > current.resetAt) {
    _serverRateLimits.set(key, { count: 1, resetAt: now + SERVER_RATE_LIMIT_WINDOW_MS });
    return { ok: true };
  }
  if (current.count >= SERVER_RATE_LIMIT_MAX_REQUESTS) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

function isTrialActive(subscription) {
  const expiresAt = subscription?.trial_expires_at;
  return !!(subscription?.trial_plan && expiresAt && new Date(expiresAt).getTime() > Date.now());
}

async function getEffectivePlan(db, userId) {
  try {
    const res = await db.listDocuments(DB_ID, SUBSCRIPTIONS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);
    const subscription = res.documents?.[0];
    const rawPlan = subscription?.effective_plan ||
      (isTrialActive(subscription) ? subscription.trial_plan : subscription?.plan) ||
      'free';
    const plan = String(rawPlan).toLowerCase();
    return Object.prototype.hasOwnProperty.call(PLAN_DAILY_LIMITS, plan) ? plan : 'free';
  } catch {
    return 'free';
  }
}

function userCreditPermissions(userId) {
  return [sdk.Permission.read(sdk.Role.user(userId))];
}

async function loadCreditState(db, userId, cost) {
  const today = new Date().toISOString().slice(0, 10);
  const plan = await getEffectivePlan(db, userId);
  const planLimit = PLAN_DAILY_LIMITS[plan] ?? PLAN_DAILY_LIMITS.free;

  let res;
  try {
    res = await db.listDocuments(DB_ID, AI_CREDITS_COLLECTION_ID, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.limit(1),
    ]);
  } catch (err) {
    return { blocked: true, status: 503, code: 'ai_credit_check_failed', message: 'AI credit tracking is not available.' };
  }

  let doc = res.documents?.[0];
  if (!doc) {
    doc = await db.createDocument(DB_ID, AI_CREDITS_COLLECTION_ID, sdk.ID.unique(), {
      user_id: userId,
      daily_usage: 0,
      daily_limit: planLimit,
      total_usage: 0,
      usage_date: today,
    }, userCreditPermissions(userId));
  }

  const dailyLimit = Number(doc.daily_limit ?? planLimit);
  const effectiveLimit = Number.isFinite(dailyLimit) ? dailyLimit : planLimit;
  const currentUsage = doc.usage_date === today ? Number(doc.daily_usage || 0) : 0;

  if (effectiveLimit !== -1 && currentUsage + cost > effectiveLimit) {
    return { blocked: true, status: 402, code: 'ai_credits_exhausted', message: 'Daily AI credit limit reached.', doc, dailyLimit: effectiveLimit, currentUsage, cost, today };
  }
  return { blocked: false, doc, dailyLimit: effectiveLimit, currentUsage, cost, today };
}

async function recordAiUsage(db, creditState) {
  if (!creditState || creditState.blocked || creditState.cost <= 0 || !creditState.doc) return;
  await db.updateDocument(DB_ID, AI_CREDITS_COLLECTION_ID, creditState.doc.$id, {
    daily_usage: creditState.currentUsage + creditState.cost,
    daily_limit: creditState.dailyLimit,
    total_usage: Number(creditState.doc.total_usage || 0) + creditState.cost,
    usage_date: creditState.today,
  });
}

function computeJobImportKey(userId, url) {
  return crypto.createHash('sha256').update(JSON.stringify({ userId, feature: 'parse-job', url })).digest('hex');
}

async function checkIdempotencyCache(db, key) {
  try {
    const res = await db.listDocuments(DB_ID, IDEMPOTENCY_CACHE_COLLECTION_ID, [
      sdk.Query.equal('key', [key]),
      sdk.Query.limit(1),
    ]);
    const doc = res.documents?.[0];
    if (!doc) return { hit: false };
    if (Date.now() > new Date(doc.expires_at).getTime()) {
      try { await db.deleteDocument(DB_ID, IDEMPOTENCY_CACHE_COLLECTION_ID, doc.$id); } catch {}
      return { hit: false };
    }
    if (doc.status === 'success' && doc.has_result && doc.cached_result) {
      return { hit: true, status: 'success', result: JSON.parse(doc.cached_result), docId: doc.$id };
    }
    return { hit: false, docId: doc.$id, status: doc.status };
  } catch (err) {
    if (!_idempotencyCollectionMissing) {
      _idempotencyCollectionMissing = true;
      console.warn(`[job-import][warn] idempotency_cache unavailable: ${err.message}`);
    }
    return { hit: false };
  }
}

async function createIdempotencyPending(db, key, userId) {
  const docId = `ji_${key.slice(0, 32)}`;
  try {
    await db.createDocument(DB_ID, IDEMPOTENCY_CACHE_COLLECTION_ID, docId, {
      key,
      user_id: userId,
      status: 'pending',
      expires_at: new Date(Date.now() + IDEMPOTENCY_TTL_MS).toISOString(),
      has_result: false,
      cached_result: null,
    });
    return docId;
  } catch {
    // Conflict (concurrent duplicate) or collection unavailable — best-effort.
    return docId;
  }
}

async function updateIdempotencySuccess(db, docId, resultPayload) {
  if (!docId) return;
  try {
    const resultStr = JSON.stringify(resultPayload);
    const hasResult = resultStr.length <= IDEMPOTENCY_RESULT_MAX_BYTES;
    await db.updateDocument(DB_ID, IDEMPOTENCY_CACHE_COLLECTION_ID, docId, {
      status: 'success',
      has_result: hasResult,
      cached_result: hasResult ? resultStr : null,
    });
  } catch {}
}

async function deleteIdempotencyDoc(db, docId) {
  if (!docId) return;
  try { await db.deleteDocument(DB_ID, IDEMPOTENCY_CACHE_COLLECTION_ID, docId); } catch {}
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';

function buildPool() {
  const pool = [];
  if (process.env.DEEPSEEK_KEY) {
    pool.push({ key: process.env.DEEPSEEK_KEY, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' });
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`GROQ_KEY_${i}`];
    if (k) pool.push({ key: k, url: GROQ_URL, model: 'llama-3.3-70b-versatile' });
  }
  for (let i = 1; i <= 3; i++) {
    const k = process.env[`OPENROUTER_KEY_${i}`];
    if (k) pool.push({ key: k, url: OPENROUTER_URL, model: 'meta-llama/llama-3.3-70b-instruct:free' });
  }
  return pool;
}

async function callLLM(messages, pool) {
  if (pool.length === 0) throw new Error('No AI provider keys configured');
  let lastError;
  for (const entry of pool) {
    try {
      const response = await axios.post(entry.url, {
        model: entry.model,
        messages,
        temperature: 0.2,
        max_tokens: 800,
      }, {
        headers: { 'Authorization': `Bearer ${entry.key}`, 'Content-Type': 'application/json' },
        timeout: 8000,
      });
      return response.data.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// â”€â”€â”€ HTML extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractOpenGraph(html) {
  const get = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
    return m ? m[1].trim() : null;
  };
  return { title: get('title'), description: get('description'), siteName: get('site_name') };
}

function extractJsonLd(html) {
  const findJobPosting = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (node['@type'] === 'JobPosting') return node;
    if (Array.isArray(node['@graph'])) {
      for (const item of node['@graph']) {
        const job = findJobPosting(item);
        if (job) return job;
      }
    }
    if (Array.isArray(node)) {
      for (const item of node) {
        const job = findJobPosting(item);
        if (job) return job;
      }
    }
    return null;
  };

  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const job = findJobPosting(JSON.parse(m[1]));
      if (job) return job;
    } catch { /* skip malformed */ }
  }
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractBodyText(html, maxChars = 3000) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

// --- Job page fetch (browser-like + safe redirects + reader fallback) ------------

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function hostnameOf(rawUrl) {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function buildFetchHeaders(rawUrl) {
  const host = hostnameOf(rawUrl);
  const headers = {
    'User-Agent': BROWSER_UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  };

  if (host.includes('linkedin.com')) {
    headers.Referer = 'https://www.linkedin.com/jobs/';
  } else if (host.includes('indeed.')) {
    headers.Referer = 'https://www.indeed.com/';
  } else if (host.includes('glassdoor.')) {
    headers.Referer = 'https://www.glassdoor.com/';
  } else if (host.includes('bayt.com')) {
    headers.Referer = 'https://www.bayt.com/';
  } else if (host.includes('wuzzuf.net')) {
    headers.Referer = 'https://wuzzuf.net/';
  } else if (host) {
    headers.Referer = `https://${host}/`;
  }

  return headers;
}

async function fetchWithSafeRedirects(rawUrl, log, maxRedirects = 5) {
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const safe = await isSafeUrlDnsResolved(current);
    if (!safe) throw new Error('Redirect target blocked');

    const response = await axios.get(current, {
      timeout: 12000,
      maxRedirects: 0,
      validateStatus: (status) => (status >= 200 && status < 300) || (status >= 300 && status < 400),
      headers: buildFetchHeaders(current),
      maxContentLength: 2 * 1024 * 1024,
      responseType: 'text',
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers?.location;
      if (!location) throw new Error('Redirect missing location header');
      current = new URL(location, current).href;
      log(`Following redirect → ${current}`);
      continue;
    }

    const html = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    if (!html || html.length < 200) {
      throw new Error('Empty or too-short response');
    }
    return html;
  }

  throw new Error('Too many redirects');
}

async function fetchViaReaderProxy(rawUrl, log) {
  const apiKey = process.env.JINA_READER_API_KEY || process.env.JINA_API_KEY;
  const readerUrl = `https://r.jina.ai/${rawUrl}`;
  const headers = {
    Accept: 'text/html,application/json,text/plain',
    'X-Return-Format': 'html',
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  log(`Direct fetch blocked — trying reader proxy for ${hostnameOf(rawUrl)}`);
  const response = await axios.get(readerUrl, {
    timeout: 18000,
    maxContentLength: 3 * 1024 * 1024,
    headers,
    responseType: 'text',
  });

  const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  if (!body || body.length < 100) {
    throw new Error('Reader proxy returned empty content');
  }
  return body;
}

async function fetchJobPageHtml(rawUrl, log) {
  try {
    return await fetchWithSafeRedirects(rawUrl, log);
  } catch (directErr) {
    log(`Direct fetch failed (${directErr.message}) — attempting reader proxy`);
    try {
      return await fetchViaReaderProxy(rawUrl, log);
    } catch (proxyErr) {
      throw new Error(`${directErr.message}; proxy: ${proxyErr.message}`);
    }
  }
}

// â”€â”€â”€ Appwrite document creation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function createJobDocument(userId, job, sourceUrl) {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!projectId || !apiKey || !userId) return null;

  const { randomUUID } = require('crypto');
  const docId = randomUUID();

  try {
    const response = await axios.post(
      `${endpoint}/databases/main/collections/jobs/documents`,
      {
        documentId: docId,
        data: {
          user_id: userId,
          title: job.title,
          company: job.company,
          company_logo: null,
          location: job.location || '',
          salary_range: job.salary_range || null,
          job_type: job.job_type || 'full-time',
          description: job.description || '',
          requirements: job.requirements || '',
          posted_date: new Date().toISOString(),
          source_url: sourceUrl,
          is_saved: true,
        },
        permissions: [
          `read("user:${userId}")`,
          `update("user:${userId}")`,
          `delete("user:${userId}")`,
        ],
      },
      {
        headers: {
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );
    return response.data;
  } catch (err) {
    return null;
  }
}

// â”€â”€â”€ Main handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

module.exports = async ({ req, res, log, error }) => {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ ok: false, error: 'Invalid request body' }, 400);
  }

  const auth = await authenticateRequest(body, req);
  if (!auth.ok) {
    return res.json({ ok: false, error: 'Authentication required.' }, 401);
  }

  const { url } = body || {};
  const userId = auth.userId;

  if (!url || typeof url !== 'string') {
    return res.json({ ok: false, error: 'url is required' }, 400);
  }

  const urlSafe = await isSafeUrlDnsResolved(url);
  if (!urlSafe) {
    return res.json({ ok: false, error: 'Invalid or blocked URL' }, 400);
  }

  // ── Per-user rate limit (parse-job) ──────────────────────────────────────────
  const rate = checkServerRateLimit(userId);
  if (!rate.ok) {
    return res.json({
      ok: false,
      code: 'rate_limited',
      error: 'Too many job imports in a short time. Please wait a moment and try again.',
      retryAfterSeconds: rate.retryAfterSeconds,
    }, 429);
  }

  const db = getDbClient();

  // ── Idempotency: a repeated import of the same URL within the TTL returns the
  // cached result without re-running the LLM or re-charging. ───────────────────
  const idemKey = computeJobImportKey(userId, url);
  const cached = await checkIdempotencyCache(db, idemKey);
  if (cached.hit && cached.status === 'success') {
    return res.json({ ...cached.result, cached: true });
  }

  // ── Credit check BEFORE the expensive fetch/LLM. Charged only on success. ────
  const creditState = await loadCreditState(db, userId, PARSE_JOB_CREDIT_COST);
  if (creditState.blocked) {
    return res.json({ ok: false, code: creditState.code, error: creditState.message }, creditState.status || 402);
  }
  const idemDocId = await createIdempotencyPending(db, idemKey, userId);

  // Fetch raw HTML (browser-like headers, redirects, reader proxy fallback)
  let html;
  try {
    html = await fetchJobPageHtml(url, log);
  } catch (err) {
    error(`Fetch failed for ${url}: ${err.message}`);
    await deleteIdempotencyDoc(db, idemDocId); // fetch failed → do not charge
    return res.json({
      ok: false,
      code: 'fetch_blocked',
      error: 'Could not fetch job page. The site may block automated access — try again or paste the job text in Tailoring Hub.',
    }, 422);
  }

  // Extract structured data
  const og = extractOpenGraph(html);
  const jsonLd = extractJsonLd(html);
  const pageTitle = extractTitle(html);
  const bodyText = extractBodyText(html);

  // Build context for AI
  const contextParts = [];
  if (jsonLd) contextParts.push(`JSON-LD JobPosting:\n${JSON.stringify(jsonLd, null, 2).slice(0, 2000)}`);
  if (og.title || og.description) contextParts.push(`OpenGraph: title="${og.title}" description="${og.description}" site="${og.siteName}"`);
  if (pageTitle) contextParts.push(`Page title: ${pageTitle}`);
  contextParts.push(`Page text excerpt:\n${bodyText}`);

  const context = contextParts.join('\n\n');

  // AI parse
  const pool = buildPool();
  let rawAI;
  try {
    rawAI = await callLLM([
      {
        role: 'system',
        content: 'You are a job posting parser. Extract structured information from job posting content and return ONLY valid JSON with no explanation.',
      },
      {
        role: 'user',
        content: `Extract the job details from this content and return JSON with these exact fields (use null for unknown values):
{
  "title": "Job title",
  "company": "Company name",
  "location": "City, Country or Remote",
  "salary_range": "e.g. $80k-$100k or null",
  "job_type": "full-time|part-time|contract|internship|freelance",
  "remote": true or false,
  "skills": ["skill1", "skill2"],
  "description": "2-3 sentence summary of the role",
  "requirements": "Key requirements as a comma-separated list"
}

Content:
${context}`,
      },
    ], pool);
  } catch (err) {
    error(`LLM call failed: ${err.message}`);
    await deleteIdempotencyDoc(db, idemDocId); // provider failure → do not charge
    return res.json({ ok: false, error: 'AI parsing failed. Please try again.' }, 500);
  }

  // Parse AI JSON response
  let parsed;
  try {
    const jsonMatch = rawAI.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    parsed = null;
  }

  if (!parsed || !parsed.title) {
    await deleteIdempotencyDoc(db, idemDocId); // no usable result → do not charge
    return res.json({ ok: false, error: 'Could not extract job details from this page.' }, 422);
  }

  const parsedJob = {
    title: parsed.title || 'Unknown Position',
    company: parsed.company || 'Unknown Company',
    location: parsed.location || '',
    salary_range: parsed.salary_range || null,
    job_type: parsed.job_type || 'full-time',
    remote: Boolean(parsed.remote),
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    description: parsed.description || '',
    requirements: Array.isArray(parsed.requirements)
      ? parsed.requirements.join(', ')
      : (parsed.requirements || ''),
  };

  log(`Parsed job: ${parsedJob.title} at ${parsedJob.company}`);

  // Create document server-side (bypasses collection permission issues)
  let savedDoc = null;
  try {
    savedDoc = await createJobDocument(userId, parsedJob, url);
    if (savedDoc) log(`Job document created: ${savedDoc.$id}`);
  } catch (err) {
    error(`DB write failed: ${err.message}`);
    // Still return ok:true with the parsed data â€” frontend will attempt its own write
  }

  // Successful parse → charge 1 credit and cache the result for idempotent retries.
  const responsePayload = {
    ok: true,
    jobId: savedDoc?.$id || null,
    job: parsedJob,
  };
  try { await recordAiUsage(db, creditState); } catch (err) { error(`Credit charge failed: ${err.message}`); }
  await updateIdempotencySuccess(db, idemDocId, responsePayload);

  return res.json(responsePayload);
};

// Exposed for hub regression tests (tests/hubs/job-import-credit.test.cjs).
module.exports.__test = {
  checkServerRateLimit,
  computeJobImportKey,
  loadCreditState,
  recordAiUsage,
  PARSE_JOB_CREDIT_COST,
  SERVER_RATE_LIMIT_MAX_REQUESTS,
};
