'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');
const { resolveEffectivePlan } = require('@wiseresume/subscription-resolver');

const DB_ID = 'main';
const SESSION_COLLECTION = 'billing_checkout_sessions';
const LOCK_COLLECTION = 'billing_checkout_locks';
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_CREATIONS_PER_USER = 3;
const MAX_BODY_BYTES = 8 * 1024;
const ALLOWED_PLANS = new Set(['pro', 'premium']);
const PLAN_RANK = Object.freeze({ free: 0, pro: 1, premium: 2 });
const SAFE_RETURN_PATH = '/subscription?billing=pending';
const SAFE_SOURCE = 'wiseresume-web';

class BillingCheckoutError extends Error {
  constructor(code, status, message) {
    super(message);
    this.name = 'BillingCheckoutError';
    this.code = code;
    this.status = status;
  }
}

function fail(code, status, message) {
  throw new BillingCheckoutError(code, status, message);
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value) {
  return typeof value === 'string' ? value : '';
}

function getHeader(headers, name) {
  if (!isRecord(headers)) return '';
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== wanted) continue;
    return Array.isArray(value) ? asString(value[0]) : asString(value);
  }
  return '';
}

function extractJwt(req, body) {
  const embeddedHeaders = isRecord(body?.__headers) ? body.__headers : {};
  const embeddedJwt = getHeader(embeddedHeaders, 'x-appwrite-jwt') || getHeader(embeddedHeaders, 'x-appwrite-user-jwt');
  const requestJwt = getHeader(req?.headers, 'x-appwrite-user-jwt') || getHeader(req?.headers, 'x-appwrite-jwt');
  const authorization = getHeader(req?.headers, 'authorization') || getHeader(embeddedHeaders, 'authorization');
  const bearer = authorization.replace(/^Bearer\s+/i, '').trim();
  return embeddedJwt || requestJwt || bearer;
}

function parseBody(req) {
  const candidate = req?.bodyJson ?? req?.bodyText ?? req?.body ?? {};
  if (typeof candidate === 'string') {
    if (Buffer.byteLength(candidate, 'utf8') > MAX_BODY_BYTES) fail('invalid_request', 400, 'Invalid checkout request.');
    try {
      return JSON.parse(candidate || '{}');
    } catch {
      fail('invalid_request', 400, 'Invalid checkout request.');
    }
  }
  if (!isRecord(candidate)) fail('invalid_request', 400, 'Invalid checkout request.');
  if (Buffer.byteLength(JSON.stringify(candidate), 'utf8') > MAX_BODY_BYTES) {
    fail('invalid_request', 400, 'Invalid checkout request.');
  }
  return candidate;
}

function validateRequest(body) {
  const logicalBody = { ...body };
  delete logicalBody.__headers;
  const allowedKeys = new Set(['action', 'plan', 'idempotency_key']);
  if (Object.keys(logicalBody).some(key => !allowedKeys.has(key))) {
    fail('invalid_request', 400, 'Invalid checkout request.');
  }
  if (logicalBody.action !== 'create-session') fail('invalid_request', 400, 'Invalid checkout request.');
  if (typeof logicalBody.plan !== 'string' || !ALLOWED_PLANS.has(logicalBody.plan)) {
    fail('invalid_plan', 400, 'This checkout plan is not available.');
  }
  if (logicalBody.idempotency_key !== undefined) {
    if (typeof logicalBody.idempotency_key !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(logicalBody.idempotency_key)) {
      fail('invalid_request', 400, 'Invalid checkout request.');
    }
  }
  return { plan: logicalBody.plan, idempotencyKey: logicalBody.idempotency_key || null };
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function opaqueReference(prefix = 'cs') {
  return `${prefix}_${crypto.randomBytes(18).toString('hex')}`;
}

function normalizeEnvironment(value) {
  return value === 'production' || value === 'sandbox' ? value : '';
}

function buildCatalog(env = process.env) {
  return {
    pro: {
      priceId: asString(env.BILLING_PRO_PRICE_ID).trim(),
      productId: asString(env.BILLING_PRO_PRODUCT_ID).trim(),
      entitlementId: 'pro',
    },
    premium: {
      priceId: asString(env.BILLING_PREMIUM_PRICE_ID).trim(),
      productId: asString(env.BILLING_PREMIUM_PRODUCT_ID).trim(),
      entitlementId: 'premium',
    },
  };
}

function readConfig(env = process.env, overrides = {}) {
  const config = {
    enabled: asString(env.BILLING_CHECKOUT_ENABLED).toLowerCase() === 'true',
    environment: normalizeEnvironment(asString(env.BILLING_CHECKOUT_ENVIRONMENT).trim().toLowerCase() || 'production'),
    providerReady: asString(env.BILLING_CHECKOUT_PROVIDER_READY).toLowerCase() === 'true',
    catalog: buildCatalog(env),
    ...overrides,
  };
  return config;
}

function validateCatalogEntry(entry) {
  return isRecord(entry) &&
    ALLOWED_PLANS.has(entry.entitlementId) &&
    typeof entry.priceId === 'string' && entry.priceId.length > 0 &&
    typeof entry.productId === 'string' && entry.productId.length > 0;
}

function assertRuntimeEnabled(config, plan) {
  if (!config.enabled) fail('payments_disabled', 403, 'Checkout is not available.');
  if (config.environment !== 'production') fail('environment_mismatch', 409, 'Checkout environment is unavailable.');
  if (!validateCatalogEntry(config.catalog?.[plan])) fail('catalog_mismatch', 409, 'Checkout catalog is unavailable.');
  if (!config.providerReady) fail('payments_disabled', 403, 'Checkout is not available.');
}

function normalizeEffectivePlan(value) {
  const plan = value === 'ultimate' ? 'premium' : value;
  return Object.prototype.hasOwnProperty.call(PLAN_RANK, plan) ? plan : 'free';
}

function assertNotAlreadyEntitled(currentPlan, requestedPlan) {
  const currentRank = PLAN_RANK[normalizeEffectivePlan(currentPlan)];
  const requestedRank = PLAN_RANK[requestedPlan];
  if (currentRank >= requestedRank) fail('already_entitled', 409, 'Your account already has this access or a stronger plan.');
}

function safeProviderResult(result, config) {
  if (!isRecord(result)) fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
  const reference = asString(result.checkoutReference);
  if (!reference || reference.length > 160) fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
  const providerEnvironment = asString(result.providerEnvironment);
  if (providerEnvironment !== config.environment) fail('environment_mismatch', 409, 'Checkout environment is unavailable.');
  if (asString(result.collectionMode) !== 'automatic') fail('catalog_mismatch', 409, 'Checkout catalog is unavailable.');
  const transactionId = asString(result.providerTransactionId);
  if (!transactionId || transactionId.length > 160) fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
  let checkoutUrl = null;
  if (result.checkoutUrl !== undefined) {
    const approvedOrigin = asString(config.approvedCheckoutOrigin).replace(/\/$/, '');
    try {
      const url = new URL(asString(result.checkoutUrl));
      if (!approvedOrigin || url.origin !== approvedOrigin || url.protocol !== 'https:') {
        fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
      }
      checkoutUrl = url.toString();
    } catch {
      fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
    }
  }
  return { checkoutReference: reference, providerTransactionId: transactionId, checkoutUrl };
}

function publicSessionResponse(session, providerResult) {
  const data = {
    session_reference: asString(session.publicReference || session.public_reference),
    plan: session.plan,
    state: 'created_or_reused',
    expires_at: asString(session.expiresAt || session.expires_at),
  };
  if (providerResult?.checkoutUrl) data.checkout_url = providerResult.checkoutUrl;
  return { status: 'success', data };
}

class AppwriteCheckoutStore {
  constructor(databases) {
    this.databases = databases;
  }

  async getDocument(collection, id, transactionId) {
    try {
      return await this.databases.getDocument(DB_ID, collection, id, [], transactionId);
    } catch (error) {
      if (error?.code === 404) return null;
      throw error;
    }
  }

  async findByRequestKey(userId, requestKeyFingerprint, transactionId) {
    const result = await this.databases.listDocuments(DB_ID, SESSION_COLLECTION, [
      sdk.Query.equal('user_id', userId),
      sdk.Query.equal('request_key_fingerprint', requestKeyFingerprint),
      sdk.Query.limit(20),
    ], transactionId);
    return (result.documents || []).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;
  }

  async reserve(input) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const transaction = await this.databases.createTransaction(20);
      let committed = false;
      try {
        const nowIso = new Date(input.nowMs).toISOString();
        const replayCandidate = await this.findByRequestKey(input.userId, input.requestKeyFingerprint, transaction.$id);
        if (replayCandidate) {
          const replayAge = input.nowMs - new Date(replayCandidate.created_at || 0).getTime();
          const sameInput = replayCandidate.plan === input.plan &&
            replayCandidate.environment === input.environment &&
            replayCandidate.price_id === input.priceId;
          if (replayAge >= 0 && replayAge <= IDEMPOTENCY_WINDOW_MS) {
            await this.databases.updateTransaction(transaction.$id, true, false);
            committed = true;
            if (!sameInput) fail('idempotency_conflict', 409, 'This checkout request key was already used.');
            if (['creating', 'created', 'opened', 'pending'].includes(replayCandidate.state) &&
                new Date(replayCandidate.expires_at || 0).getTime() > input.nowMs) {
              return { outcome: 'reused', session: replayCandidate };
            }
            fail('idempotency_conflict', 409, 'This checkout request key cannot be replayed.');
          }
        }
        const userLockId = `user_${hash(input.userId).slice(0, 28)}`;
        const planLockId = `plan_${hash(`${input.userId}:${input.plan}:${input.environment}`).slice(0, 28)}`;
        const userLock = await this.getDocument(LOCK_COLLECTION, userLockId, transaction.$id);
        const planLock = await this.getDocument(LOCK_COLLECTION, planLockId, transaction.$id);
        const planLockActive = planLock && new Date(planLock.expires_at).getTime() > input.nowMs &&
          ['creating', 'created', 'opened', 'pending'].includes(planLock.state);
        if (planLockActive) {
          const existing = await this.getDocument(SESSION_COLLECTION, planLock.session_id, transaction.$id);
          await this.databases.updateTransaction(transaction.$id, true, false);
          committed = true;
          if (!existing) throw new Error('Checkout session lock has no session record.');
          return { outcome: 'reused', session: existing };
        }
        const windowStart = userLock && new Date(userLock.window_started_at).getTime() > input.nowMs - RATE_LIMIT_WINDOW_MS
          ? userLock.window_started_at
          : nowIso;
        const attemptCount = userLock && windowStart === userLock.window_started_at ? Number(userLock.attempt_count || 0) : 0;
        if (attemptCount >= MAX_CREATIONS_PER_USER) {
          await this.databases.updateTransaction(transaction.$id, true, false);
          committed = true;
          fail('rate_limited', 429, 'Checkout attempts are temporarily limited.');
        }
        const sessionId = `session_${hash(input.sessionKey).slice(0, 28)}`;
        const lockPayload = {
          scope: 'plan', lock_key: planLockId, user_id: input.userId, plan: input.plan,
          environment: input.environment, price_id: input.priceId, session_id: sessionId,
          state: 'creating', request_key_fingerprint: input.requestKeyFingerprint,
          window_started_at: windowStart, attempt_count: attemptCount + 1,
          created_at: planLock?.created_at || nowIso, updated_at: nowIso, expires_at: input.expiresAt,
        };
        if (planLock) await this.databases.updateDocument(DB_ID, LOCK_COLLECTION, planLockId, lockPayload, [], transaction.$id);
        else await this.databases.createDocument(DB_ID, LOCK_COLLECTION, planLockId, lockPayload, [], transaction.$id);
        if (userLock) {
          await this.databases.updateDocument(DB_ID, LOCK_COLLECTION, userLockId, {
            scope: 'user', lock_key: userLockId, user_id: input.userId, plan: '*', state: 'active',
            window_started_at: windowStart, attempt_count: attemptCount + 1,
            created_at: userLock.created_at || nowIso, updated_at: nowIso, expires_at: input.rateLimitExpiresAt,
          }, [], transaction.$id);
        } else {
          await this.databases.createDocument(DB_ID, LOCK_COLLECTION, userLockId, {
            scope: 'user', lock_key: userLockId, user_id: input.userId, plan: '*', state: 'active',
            window_started_at: windowStart, attempt_count: attemptCount + 1,
            created_at: nowIso, updated_at: nowIso, expires_at: input.rateLimitExpiresAt,
          }, [], transaction.$id);
        }
        const session = {
          session_key: input.sessionKey, request_key_fingerprint: input.requestKeyFingerprint,
          user_id: input.userId, plan: input.plan, environment: input.environment,
          price_id: input.priceId, product_id: input.productId, entitlement_id: input.entitlementId,
          provider_transaction_id: '', checkout_reference: '', state: 'creating',
          correlation_id: input.correlationId, public_reference: input.publicReference,
          created_at: nowIso, updated_at: nowIso, expires_at: input.expiresAt, last_error_code: '',
        };
        await this.databases.createDocument(DB_ID, SESSION_COLLECTION, sessionId, session, [], transaction.$id);
        await this.databases.updateTransaction(transaction.$id, true, false);
        committed = true;
        return { outcome: 'created', session: { ...session, $id: sessionId } };
      } catch (error) {
        if (!committed) {
          try { await this.databases.updateTransaction(transaction.$id, false, true); } catch (_) {}
        }
        if (error?.code === 409 && attempt < 2) continue;
        if (error instanceof BillingCheckoutError) throw error;
        throw error;
      }
    }
    fail('checkout_in_progress', 409, 'A checkout is already in progress.');
  }

  async complete(session, providerResult, nowMs) {
    const nowIso = new Date(nowMs).toISOString();
    const transaction = await this.databases.createTransaction(20);
    let committed = false;
    try {
      await this.databases.updateDocument(DB_ID, SESSION_COLLECTION, session.$id, {
        provider_transaction_id: providerResult.providerTransactionId,
        checkout_reference: providerResult.checkoutReference,
        state: 'created', updated_at: nowIso, last_error_code: '',
      }, [], transaction.$id);
      await this.databases.updateDocument(DB_ID, LOCK_COLLECTION, `plan_${hash(`${session.user_id}:${session.plan}:${session.environment}`).slice(0, 28)}`, {
        state: 'created', updated_at: nowIso,
      }, [], transaction.$id);
      await this.databases.updateTransaction(transaction.$id, true, false);
      committed = true;
    } catch (error) {
      if (!committed) {
        try { await this.databases.updateTransaction(transaction.$id, false, true); } catch (_) {}
      }
      throw error;
    }
  }

  async fail(session, code, nowMs) {
    const nowIso = new Date(nowMs).toISOString();
    try {
      await this.databases.updateDocument(DB_ID, SESSION_COLLECTION, session.$id, {
        state: 'failed', updated_at: nowIso, last_error_code: code,
      }, []);
      await this.databases.updateDocument(DB_ID, LOCK_COLLECTION, `plan_${hash(`${session.user_id}:${session.plan}:${session.environment}`).slice(0, 28)}`, {
        state: 'failed', updated_at: nowIso,
      }, []);
    } catch (_) {
      // Provider failure remains fail-closed even if its safe session marker cannot be updated.
    }
  }

  async getEffectivePlan(userId) {
    const [subscription, providerState] = await Promise.all([
      this.findOptional('subscriptions', userId),
      this.findOptional('revenuecat_subscription_state', userId),
    ]);
    return resolveEffectivePlan({ subscription, providerState }).plan;
  }

  async findOptional(collection, userId) {
    try {
      const result = await this.databases.listDocuments(DB_ID, collection, [
        sdk.Query.equal('user_id', userId), sdk.Query.limit(1),
      ]);
      return result.documents?.[0] || null;
    } catch (_) {
      return null;
    }
  }
}

class UnconfiguredProvider {
  async createCheckout() {
    fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
  }
}

class BillingCheckoutService {
  constructor({ store, provider, config = readConfig(), now = () => Date.now() }) {
    this.store = store;
    this.provider = provider;
    this.config = config;
    this.now = now;
  }

  async create({ userId, plan, idempotencyKey }) {
    if (!userId) fail('unauthorized', 401, 'Authentication is required.');
    if (!ALLOWED_PLANS.has(plan)) fail('invalid_plan', 400, 'This checkout plan is not available.');
    assertRuntimeEnabled(this.config, plan);
    const currentPlan = await this.store.getEffectivePlan(userId);
    assertNotAlreadyEntitled(currentPlan, plan);
    const catalog = this.config.catalog[plan];
    const nowMs = this.now();
    const replayBucket = Math.floor(nowMs / IDEMPOTENCY_WINDOW_MS);
    const requestKey = idempotencyKey || `auto:${replayBucket}`;
    const requestKeyFingerprint = hash(requestKey);
    const sessionKey = hash(`${userId}:${plan}:${this.config.environment}:${catalog.priceId}:${requestKeyFingerprint}:${replayBucket}`);
    const sessionInput = {
      userId, plan, environment: this.config.environment, priceId: catalog.priceId,
      productId: catalog.productId, entitlementId: catalog.entitlementId, sessionKey,
      requestKeyFingerprint, correlationId: opaqueReference('corr'), publicReference: opaqueReference('sess'),
      nowMs, expiresAt: new Date(nowMs + ACTIVE_WINDOW_MS).toISOString(),
      rateLimitExpiresAt: new Date(nowMs + RATE_LIMIT_WINDOW_MS).toISOString(),
    };
    const reservation = await this.store.reserve(sessionInput);
    if (reservation.outcome === 'reused') return publicSessionResponse(reservation.session, null);
    const providerInput = {
      environment: this.config.environment,
      plan,
      priceId: catalog.priceId,
      productId: catalog.productId,
      entitlementId: catalog.entitlementId,
      collectionMode: 'automatic',
      customData: {
        app_user_id: userId,
        checkout_session_reference: reservation.session.public_reference,
        source: SAFE_SOURCE,
      },
      returnPath: SAFE_RETURN_PATH,
      correlationId: sessionInput.correlationId,
    };
    try {
      const result = safeProviderResult(await this.provider.createCheckout(providerInput), this.config);
      await this.store.complete(reservation.session, result, this.now());
      return publicSessionResponse({ ...reservation.session, expiresAt: sessionInput.expiresAt, plan }, result);
    } catch (error) {
      const safeCode = error instanceof BillingCheckoutError ? error.code : 'provider_unavailable';
      await this.store.fail(reservation.session, safeCode, this.now());
      if (error instanceof BillingCheckoutError) throw error;
      fail('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
    }
  }
}

function getClients(jwt) {
  const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const admin = new sdk.Client().setEndpoint(endpoint).setProject(projectId || '').setKey(apiKey || '');
  const user = new sdk.Client().setEndpoint(endpoint).setProject(projectId || '');
  if (jwt) user.setJWT(jwt);
  return { databases: new sdk.Databases(admin), account: new sdk.Account(user) };
}

async function resolveCanonicalUser(account) {
  try {
    const user = await account.get();
    return user && typeof user.$id === 'string' ? user : null;
  } catch (_) {
    return null;
  }
}

function safeErrorResponse(res, error) {
  if (error instanceof BillingCheckoutError) {
    return res.json({ status: 'error', error: error.code, message: error.message }, error.status);
  }
  return res.json({ status: 'error', error: 'checkout_unavailable', message: 'Checkout is temporarily unavailable.' }, 500);
}

async function handleBillingCheckout({ req, res, error }, dependencies = {}) {
  try {
    const body = parseBody(req);
    const jwt = extractJwt(req, body);
    const clients = dependencies.account ? { account: dependencies.account } : getClients(jwt);
    const user = dependencies.user || await resolveCanonicalUser(clients.account);
    if (!user || typeof user.$id !== 'string') fail('unauthorized', 401, 'Authentication is required.');
    const request = validateRequest(body);
    const config = dependencies.config || readConfig();
    const service = new BillingCheckoutService({
      store: dependencies.store || new AppwriteCheckoutStore(clients.databases),
      provider: dependencies.provider || new UnconfiguredProvider(),
      config,
      now: dependencies.now,
    });
    const response = await service.create({ userId: user.$id, ...request });
    return res.json(response, 200);
  } catch (caught) {
    if (typeof error === 'function') error(`billing-checkout ${caught instanceof BillingCheckoutError ? caught.code : 'checkout_unavailable'}`);
    return safeErrorResponse(res, caught);
  }
}

module.exports = handleBillingCheckout;

module.exports.__test = {
  ACTIVE_WINDOW_MS,
  ALLOWED_PLANS,
  IDEMPOTENCY_WINDOW_MS,
  LOCK_COLLECTION,
  MAX_BODY_BYTES,
  MAX_CREATIONS_PER_USER,
  PLAN_RANK,
  RATE_LIMIT_WINDOW_MS,
  SAFE_RETURN_PATH,
  SESSION_COLLECTION,
  BillingCheckoutError,
  BillingCheckoutService,
  UnconfiguredProvider,
  assertNotAlreadyEntitled,
  assertRuntimeEnabled,
  buildCatalog,
  hash,
  normalizeEffectivePlan,
  parseBody,
  publicSessionResponse,
  readConfig,
  handleBillingCheckout,
  extractJwt,
  resolveCanonicalUser,
  safeProviderResult,
  validateRequest,
};
