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
const CHECKOUT_TRANSACTION_TTL_SECONDS = 60;
const MAX_BODY_BYTES = 8 * 1024;
const ALLOWED_PLANS = new Set(['pro', 'premium']);
const PLAN_RANK = Object.freeze({ free: 0, pro: 1, premium: 2 });
const SAFE_RETURN_PATH = '/subscription?billing=pending';
const SAFE_SOURCE = 'wiseresume-web';
const RESERVE_DIAGNOSTIC_STAGES = new Set([
  'reserve.create_transaction',
  'reserve.find_request_key',
  'reserve.get_user_lock',
  'reserve.get_plan_lock',
  'reserve.get_existing_session',
  'reserve.commit_existing',
  'reserve.write_plan_lock',
  'reserve.write_user_lock',
  'reserve.write_session',
  'reserve.commit',
  'reserve.rollback',
]);
const reserveDiagnosticStages = new WeakMap();
const PROVIDER_DIAGNOSTIC_STAGES = new Set([
  'provider.runtime_configuration', 'provider.transport', 'provider.http_response', 'provider.response_json',
  'provider.transaction_validation', 'provider.safe_result_validation', 'provider.persist_complete', 'provider.create_checkout',
]);
const providerDiagnosticStages = new WeakMap();
const TRANSPORT_ERROR_NAMES = new Set(['AbortError', 'FetchError', 'NetworkError', 'TimeoutError', 'TypeError']);
const TRANSPORT_ERROR_CODES = new Set(['ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'ENETUNREACH', 'ENOTFOUND', 'ETIMEDOUT']);

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

function reserveDiagnosticStage(error) {
  return error && (typeof error === 'object' || typeof error === 'function')
    ? reserveDiagnosticStages.get(error)?.stage || ''
    : '';
}

function numericErrorStatus(error) {
  const status = Number(error?.code);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : null;
}

function classifyCreateTransactionFailure(error) {
  const status = numericErrorStatus(error);
  if (status === 401) return { category: 'authentication_failure', status };
  if (status === 403) return { category: 'permission_denied', status };
  if (status === 404 || status === 405) return { category: 'unsupported_or_not_found', status };
  if (status === 409) return { category: 'conflict', status };
  if (status === 429) return { category: 'rate_limited', status };
  if (status !== null && status >= 500) return { category: 'appwrite_platform_error', status };
  if (status !== null) return { category: 'appwrite_client_error', status };

  const name = typeof error?.name === 'string' ? error.name : '';
  const code = typeof error?.code === 'string' ? error.code : '';
  if (TRANSPORT_ERROR_NAMES.has(name) || TRANSPORT_ERROR_CODES.has(code)) {
    return { category: 'transport_failure', status: null };
  }
  return { category: 'unknown', status: null };
}

function reserveDiagnostic(error) {
  return error && (typeof error === 'object' || typeof error === 'function')
    ? reserveDiagnosticStages.get(error) || null
    : null;
}

function providerDiagnostic(error) {
  return error && (typeof error === 'object' || typeof error === 'function')
    ? providerDiagnosticStages.get(error) || null
    : null;
}

function annotateReserveFailure(error, stage, classification = null) {
  if (error instanceof BillingCheckoutError || !RESERVE_DIAGNOSTIC_STAGES.has(stage)) return error;
  const diagnostic = { stage, ...(classification || {}) };
  if (error && (typeof error === 'object' || typeof error === 'function')) {
    reserveDiagnosticStages.set(error, diagnostic);
    return error;
  }
  const sanitizedError = new Error('Reserve operation failed.');
  reserveDiagnosticStages.set(sanitizedError, diagnostic);
  return sanitizedError;
}

function annotateProviderFailure(error, stage, category, status = null) {
  if (!PROVIDER_DIAGNOSTIC_STAGES.has(stage) || typeof category !== 'string' || !category) return error;
  if (error && (typeof error === 'object' || typeof error === 'function')) {
    if (!providerDiagnosticStages.has(error)) providerDiagnosticStages.set(error, { stage, category, ...(Number.isInteger(status) ? { status } : {}) });
    return error;
  }
  const sanitizedError = new Error('Provider operation failed.');
  providerDiagnosticStages.set(sanitizedError, { stage, category, ...(Number.isInteger(status) ? { status } : {}) });
  return sanitizedError;
}

function failProviderDiagnostic(stage, category, { code = 'provider_unavailable', status = 502, message = 'Checkout provider is temporarily unavailable.', diagnosticStatus = null } = {}) {
  const error = new BillingCheckoutError(code, status, message);
  throw annotateProviderFailure(error, stage, category, diagnosticStatus);
}

function isAmbiguousProviderError(error) {
  const diagnostic = providerDiagnostic(error);
  if (!diagnostic) return false;
  if (diagnostic.stage === 'provider.transport') return true;
  if (diagnostic.stage === 'provider.persist_complete') return true;
  if (diagnostic.category === 'transport_failure') return true;
  if (diagnostic.category === 'persistence_failure') return true;
  if (diagnostic.category === 'provider_upstream_error') return true;
  if (diagnostic.category === 'provider_rate_limited') return true;
  if (Number.isInteger(diagnostic.status) && diagnostic.status >= 500 && diagnostic.status <= 599) return true;
  return false;
}

async function providerOperation(stage, fallbackCategory, operation) {
  try { return await operation(); } catch (error) { throw annotateProviderFailure(error, stage, fallbackCategory); }
}

async function reserveOperation(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    const classification = stage === 'reserve.create_transaction'
      ? classifyCreateTransactionFailure(error)
      : null;
    throw annotateReserveFailure(error, stage, classification);
  }
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
  const logicalBody = { ...(isRecord(body?.data) ? body.data : body) };
  delete logicalBody.__headers;
  if (logicalBody.action === 'cancel-subscription') {
    const allowedKeys = new Set(['action', 'reason', 'subscription_id', 'subscriptionId']);
    if (Object.keys(logicalBody).some(key => !allowedKeys.has(key))) {
      fail('invalid_request', 400, 'Invalid checkout request.');
    }
    return {
      action: 'cancel-subscription',
      reason: asString(logicalBody.reason).slice(0, 128),
    };
  }
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
  return { action: 'create-session', plan: logicalBody.plan, idempotencyKey: logicalBody.idempotency_key || null };
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function opaqueReference(prefix = 'cs') {
  return `${prefix}_${crypto.randomBytes(18).toString('hex')}`;
}

const PAYPAL_APPROVED_ORIGINS = Object.freeze({
  sandbox: 'https://www.sandbox.paypal.com',
  production: 'https://www.paypal.com',
});

function normalizeEnvironment(value) {
  return value === 'production' || value === 'sandbox' ? value : '';
}

function catalogVariablePrefix(environment) {
  return environment === 'sandbox' ? 'BILLING_SANDBOX' : environment === 'production' ? 'BILLING_PRODUCTION' : '';
}

function buildCatalog(env = process.env, environment = normalizeEnvironment(env.BILLING_CHECKOUT_ENVIRONMENT)) {
  const prefix = catalogVariablePrefix(environment);
  return {
    pro: {
      priceId: prefix ? asString(env[`${prefix}_PRO_PRICE_ID`]).trim() : '',
      productId: prefix ? asString(env[`${prefix}_PRO_PRODUCT_ID`]).trim() : '',
      entitlementId: 'pro',
    },
    premium: {
      priceId: prefix ? asString(env[`${prefix}_PREMIUM_PRICE_ID`]).trim() : '',
      productId: prefix ? asString(env[`${prefix}_PREMIUM_PRODUCT_ID`]).trim() : '',
      entitlementId: 'premium',
    },
  };
}

function readConfig(env = process.env, overrides = {}) {
  const environment = normalizeEnvironment(asString(env.BILLING_CHECKOUT_ENVIRONMENT).trim().toLowerCase());
  const provider = asString(env.BILLING_CHECKOUT_PROVIDER).trim().toLowerCase();
  const defaultApprovedOrigin = provider === 'paypal'
    ? (PAYPAL_APPROVED_ORIGINS[environment] || '')
    : asString(env.BILLING_CHECKOUT_APPROVED_ORIGIN).trim().replace(/\/$/, '');

  const config = {
    enabled: asString(env.BILLING_CHECKOUT_ENABLED).toLowerCase() === 'true',
    environment,
    provider,
    providerReady: asString(env.BILLING_CHECKOUT_PROVIDER_READY).toLowerCase() === 'true',
    approvedCheckoutOrigin: defaultApprovedOrigin,
    approvedAppUrl: asString(env.BILLING_CHECKOUT_APPROVED_APP_URL || 'https://wiseresume.app').trim().replace(/\/$/, ''),
    qaUserId: asString(env.BILLING_CHECKOUT_QA_USER_ID).trim(),
    catalogEnvironment: environment,
    catalog: buildCatalog(env, environment),
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

function assertRuntimeEnabled(config, plan, userId) {
  if (!config.enabled) fail('payments_disabled', 403, 'Checkout is not available.');
  if (!normalizeEnvironment(config.environment)) fail('environment_mismatch', 409, 'Checkout environment is unavailable.');
  if (config.catalogEnvironment !== config.environment) fail('catalog_mismatch', 409, 'Checkout catalog is unavailable.');
  if (!validateCatalogEntry(config.catalog?.[plan])) fail('catalog_mismatch', 409, 'Checkout catalog is unavailable.');
  if (!config.approvedCheckoutOrigin || !/^https:\/\//i.test(config.approvedCheckoutOrigin)) {
    fail('catalog_mismatch', 409, 'Checkout catalog is unavailable.');
  }
  if (!config.providerReady) fail('payments_disabled', 403, 'Checkout is not available.');

  // Sandbox QA gate: restrict checkout creation to configured QA user; missing QA user ID or non-matching user fails closed
  if (config.environment === 'sandbox') {
    if (!config.qaUserId || userId !== config.qaUserId) {
      fail('payments_disabled', 403, 'Checkout is not available.');
    }
  }
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
  if (!isRecord(result)) failProviderDiagnostic('provider.safe_result_validation', 'checkout_reference_invalid');
  const reference = asString(result.checkoutReference);
  if (!reference || reference.length > 160) failProviderDiagnostic('provider.safe_result_validation', 'checkout_reference_invalid');
  const providerEnvironment = asString(result.providerEnvironment);
  if (providerEnvironment !== config.environment) failProviderDiagnostic('provider.safe_result_validation', 'provider_environment_mismatch', { code: 'environment_mismatch', status: 409, message: 'Checkout environment is unavailable.' });
  if (asString(result.collectionMode) !== 'automatic') failProviderDiagnostic('provider.safe_result_validation', 'collection_mode_mismatch', { code: 'catalog_mismatch', status: 409, message: 'Checkout catalog is unavailable.' });
  const transactionId = asString(result.providerTransactionId);
  if (!transactionId || transactionId.length > 160) failProviderDiagnostic('provider.safe_result_validation', 'provider_transaction_reference_invalid');
  let checkoutUrl = null;
  if (result.checkoutUrl !== undefined) {
    const approvedOrigin = asString(config.approvedCheckoutOrigin).replace(/\/$/, '');
    let url;
    try {
      url = new URL(asString(result.checkoutUrl));
    } catch {
      failProviderDiagnostic('provider.safe_result_validation', 'checkout_url_invalid');
    }
    if (!approvedOrigin || url.origin !== approvedOrigin || url.protocol !== 'https:') {
      failProviderDiagnostic('provider.safe_result_validation', 'checkout_origin_mismatch');
    }
    checkoutUrl = url.toString();
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
  const checkoutReference = asString(providerResult?.checkoutReference || session.checkout_reference);
  if (checkoutReference && checkoutReference.length <= 160) data.checkout_reference = checkoutReference;
  const checkoutUrl = asString(providerResult?.checkoutUrl || session.checkout_url);
  if (checkoutUrl && checkoutUrl.length <= 2048) data.checkout_url = checkoutUrl;
  return { status: 'success', data };
}

function buildUserLockPayload({ lockKey, userId, windowStartedAt, attemptCount, nowIso, rateLimitExpiresAt, existing }) {
  return {
    scope: 'user', lock_key: lockKey, user_id: userId, plan: '*', state: 'active',
    window_started_at: windowStartedAt, attempt_count: attemptCount,
    created_at: existing?.created_at || nowIso, updated_at: nowIso, expires_at: rateLimitExpiresAt,
  };
}

function buildPlanLockPayload({ lockKey, userId, plan, environment, priceId, sessionId, requestKeyFingerprint, windowStartedAt, attemptCount, nowIso, expiresAt, existing }) {
  return {
    scope: 'plan', lock_key: lockKey, user_id: userId, plan, environment, price_id: priceId,
    session_id: sessionId, state: 'creating', request_key_fingerprint: requestKeyFingerprint,
    window_started_at: windowStartedAt, attempt_count: attemptCount,
    created_at: existing?.created_at || nowIso, updated_at: nowIso, expires_at: expiresAt,
  };
}

function validateLockPayload(payload) {
  if (!isRecord(payload) || !['user', 'plan'].includes(payload.scope)) throw new Error('Invalid checkout lock scope.');
  const commonFields = ['scope', 'lock_key', 'user_id', 'plan', 'state', 'window_started_at', 'attempt_count', 'created_at', 'updated_at', 'expires_at'];
  if (commonFields.some(field => payload[field] === undefined || payload[field] === null)) throw new Error('Invalid checkout lock payload.');
  if (payload.scope === 'plan') {
    const planFields = ['environment', 'price_id', 'session_id', 'request_key_fingerprint'];
    if (planFields.some(field => typeof payload[field] !== 'string' || payload[field].length === 0)) throw new Error('Invalid plan checkout lock payload.');
  }
  return payload;
}

class AppwriteCheckoutStore {
  constructor(databases, providerEnvironment = '', options = {}) {
    this.databases = databases;
    this.providerEnvironment = providerEnvironment;
    this.paypalProviderEnvironment = options.paypalProviderEnvironment || providerEnvironment;
    this.qaUserId = options.qaUserId || '';
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
      const transaction = await reserveOperation('reserve.create_transaction', () => this.databases.createTransaction(CHECKOUT_TRANSACTION_TTL_SECONDS));
      let committed = false;
      try {
        const nowIso = new Date(input.nowMs).toISOString();
        const replayCandidate = await reserveOperation('reserve.find_request_key', () => this.findByRequestKey(input.userId, input.requestKeyFingerprint, transaction.$id));
        if (replayCandidate) {
          const replayAge = input.nowMs - new Date(replayCandidate.created_at || 0).getTime();
          const sameInput = replayCandidate.plan === input.plan &&
            replayCandidate.environment === input.environment &&
            replayCandidate.price_id === input.priceId;
          if (replayAge >= 0 && replayAge <= IDEMPOTENCY_WINDOW_MS) {
            await reserveOperation('reserve.commit_existing', () => this.databases.updateTransaction(transaction.$id, true, false));
            committed = true;
            if (!sameInput) fail('idempotency_conflict', 409, 'This checkout request key was already used.');
            if (replayCandidate.state === 'uncertain' && new Date(replayCandidate.expires_at || 0).getTime() > input.nowMs) {
              return { outcome: 'resume_provider', session: replayCandidate };
            }
            if (['creating', 'created', 'opened', 'pending'].includes(replayCandidate.state) &&
                new Date(replayCandidate.expires_at || 0).getTime() > input.nowMs) {
              if (replayCandidate.state === 'creating' || !replayCandidate.checkout_reference) {
                fail('checkout_in_progress', 409, 'A checkout is already being prepared.');
              }
              return { outcome: 'reused', session: replayCandidate };
            }
            fail('idempotency_conflict', 409, 'This checkout request key cannot be replayed.');
          }
        }
        const userLockId = `user_${hash(input.userId).slice(0, 28)}`;
        const planLockId = `plan_${hash(`${input.userId}:${input.plan}:${input.environment}`).slice(0, 28)}`;
        const userLock = await reserveOperation('reserve.get_user_lock', () => this.getDocument(LOCK_COLLECTION, userLockId, transaction.$id));
        const planLock = await reserveOperation('reserve.get_plan_lock', () => this.getDocument(LOCK_COLLECTION, planLockId, transaction.$id));
        const planLockActive = planLock && new Date(planLock.expires_at).getTime() > input.nowMs &&
          ['creating', 'created', 'opened', 'pending', 'uncertain'].includes(planLock.state);
        if (planLockActive) {
          const existing = await reserveOperation('reserve.get_existing_session', () => this.getDocument(SESSION_COLLECTION, planLock.session_id, transaction.$id));
          await reserveOperation('reserve.commit_existing', () => this.databases.updateTransaction(transaction.$id, true, false));
          committed = true;
          if (!existing) throw new Error('Checkout session lock has no session record.');
          if (existing.state === 'uncertain' && existing.session_key === input.sessionKey && new Date(existing.expires_at || 0).getTime() > input.nowMs) {
            return { outcome: 'resume_provider', session: existing };
          }
          const canResume = ['created', 'opened', 'pending'].includes(existing.state) &&
            typeof existing.checkout_reference === 'string' && existing.checkout_reference.length > 0;
          if (canResume) return { outcome: 'reused', session: existing };
          fail('checkout_in_progress', 409, 'A checkout is already being prepared.');
        }
        const windowStart = userLock && new Date(userLock.window_started_at).getTime() > input.nowMs - RATE_LIMIT_WINDOW_MS
          ? userLock.window_started_at
          : nowIso;
        const attemptCount = userLock && windowStart === userLock.window_started_at ? Number(userLock.attempt_count || 0) : 0;
        if (attemptCount >= MAX_CREATIONS_PER_USER) {
          await reserveOperation('reserve.commit_existing', () => this.databases.updateTransaction(transaction.$id, true, false));
          committed = true;
          fail('rate_limited', 429, 'Checkout attempts are temporarily limited.');
        }
        const sessionId = `session_${hash(input.sessionKey).slice(0, 28)}`;
        const lockPayload = validateLockPayload(buildPlanLockPayload({
          lockKey: planLockId, userId: input.userId, plan: input.plan, environment: input.environment,
          priceId: input.priceId, sessionId, requestKeyFingerprint: input.requestKeyFingerprint,
          windowStartedAt: windowStart, attemptCount: attemptCount + 1,
          nowIso, expiresAt: input.expiresAt, existing: planLock,
        }));
        if (planLock) await reserveOperation('reserve.write_plan_lock', () => this.databases.updateDocument(DB_ID, LOCK_COLLECTION, planLockId, lockPayload, [], transaction.$id));
        else await reserveOperation('reserve.write_plan_lock', () => this.databases.createDocument(DB_ID, LOCK_COLLECTION, planLockId, lockPayload, [], transaction.$id));
        if (userLock) {
          await reserveOperation('reserve.write_user_lock', () => this.databases.updateDocument(DB_ID, LOCK_COLLECTION, userLockId, validateLockPayload(buildUserLockPayload({
            lockKey: userLockId, userId: input.userId, windowStartedAt: windowStart,
            attemptCount: attemptCount + 1, nowIso, rateLimitExpiresAt: input.rateLimitExpiresAt, existing: userLock,
          })), [], transaction.$id));
        } else {
          await reserveOperation('reserve.write_user_lock', () => this.databases.createDocument(DB_ID, LOCK_COLLECTION, userLockId, validateLockPayload(buildUserLockPayload({
            lockKey: userLockId, userId: input.userId, windowStartedAt: windowStart,
            attemptCount: attemptCount + 1, nowIso, rateLimitExpiresAt: input.rateLimitExpiresAt,
          })), [], transaction.$id));
        }
        const session = {
          session_key: input.sessionKey, request_key_fingerprint: input.requestKeyFingerprint,
          user_id: input.userId, plan: input.plan, environment: input.environment,
          price_id: input.priceId, product_id: input.productId, entitlement_id: input.entitlementId,
          provider_transaction_id: '', checkout_reference: '', checkout_url: '', state: 'creating',
          correlation_id: input.correlationId, public_reference: input.publicReference,
          created_at: nowIso, updated_at: nowIso, expires_at: input.expiresAt, last_error_code: '',
        };
        await reserveOperation('reserve.write_session', () => this.databases.createDocument(DB_ID, SESSION_COLLECTION, sessionId, session, [], transaction.$id));
        await reserveOperation('reserve.commit', () => this.databases.updateTransaction(transaction.$id, true, false));
        committed = true;
        return { outcome: 'created', session: { ...session, $id: sessionId } };
      } catch (error) {
        if (!committed) {
          try {
            await reserveOperation('reserve.rollback', () => this.databases.updateTransaction(transaction.$id, false, true));
          } catch (rollbackError) {
            if (!reserveDiagnosticStage(error)) error = rollbackError;
          }
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
    const transaction = await this.databases.createTransaction(CHECKOUT_TRANSACTION_TTL_SECONDS);
    let committed = false;
    try {
      await this.databases.updateDocument(DB_ID, SESSION_COLLECTION, session.$id, {
        provider_transaction_id: providerResult.providerTransactionId,
        checkout_reference: providerResult.checkoutReference,
        checkout_url: providerResult.checkoutUrl || '',
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

  async markUncertain(session, code, nowMs) {
    const nowIso = new Date(nowMs).toISOString();
    try {
      await this.databases.updateDocument(DB_ID, SESSION_COLLECTION, session.$id, {
        state: 'uncertain', updated_at: nowIso, last_error_code: code,
      }, []);
      await this.databases.updateDocument(DB_ID, LOCK_COLLECTION, `plan_${hash(`${session.user_id}:${session.plan}:${session.environment}`).slice(0, 28)}`, {
        state: 'uncertain', updated_at: nowIso,
      }, []);
    } catch (_) {
      // Ambiguous outcome remains fail-closed even if safe session marker cannot be updated.
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
    const [subscription, providerState, paypalProviderState] = await Promise.all([
      this.findOptional('subscriptions', userId),
      this.findOptional('revenuecat_subscription_state', userId),
      this.findOptional('paypal_subscription_state', userId),
    ]);
    return resolveEffectivePlan({
      subscription,
      providerState,
      paypalProviderState,
      providerEnvironment: this.providerEnvironment,
      paypalProviderEnvironment: this.paypalProviderEnvironment,
      qaUserId: this.qaUserId,
      userId,
    }).plan;
  }

  async findOptional(collection, userId) {
    try {
      const result = await this.databases.listDocuments(DB_ID, collection, [
        sdk.Query.equal('user_id', userId), sdk.Query.limit(1),
      ]);
      return result.documents?.[0] || null;
    } catch (_) {
      fail('state_unavailable', 503, 'Subscription state is temporarily unavailable.');
    }
  }
}

class UnconfiguredProvider {
  async createCheckout() {
    failProviderDiagnostic('provider.runtime_configuration', 'missing_runtime_credential');
  }
}

const PADDLE_API_ORIGINS = Object.freeze({
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
});

function providerKeyVariable(environment) {
  return environment === 'sandbox' ? 'BILLING_SANDBOX_PADDLE_API_KEY' : 'BILLING_PRODUCTION_PADDLE_API_KEY';
}

function safeProviderString(value, maxLength = 160) {
  const result = asString(value).trim();
  return result && result.length <= maxLength ? result : '';
}

function parsePaddleTransaction(payload, input) {
  const transaction = isRecord(payload?.data) ? payload.data : null;
  if (!transaction) failProviderDiagnostic('provider.transaction_validation', 'missing_transaction');
  const transactionId = safeProviderString(transaction.id);
  if (!transactionId || !transactionId.startsWith('txn_')) failProviderDiagnostic('provider.transaction_validation', 'invalid_transaction_id');
  const collectionMode = asString(transaction.collection_mode);
  if (collectionMode !== 'automatic') failProviderDiagnostic('provider.transaction_validation', 'collection_mode_mismatch');
  const items = Array.isArray(transaction.items) ? transaction.items : [];
  const itemMatches = items.length === 1 &&
    asString(items[0]?.price?.id || items[0]?.price_id) === input.priceId &&
    asString(items[0]?.price?.product_id || items[0]?.price?.product?.id || items[0]?.product_id) === input.productId &&
    Number(items[0]?.quantity || 0) === 1;
  if (!itemMatches) failProviderDiagnostic('provider.transaction_validation', 'item_mismatch');
  const customData = isRecord(transaction.custom_data) ? transaction.custom_data : null;
  if (!customData || asString(customData.app_user_id) !== input.customData.app_user_id) failProviderDiagnostic('provider.transaction_validation', 'user_mapping_mismatch');
  const responseEnvironment = normalizeEnvironment(transaction.environment || transaction.paddle_environment);
  if (responseEnvironment && responseEnvironment !== input.environment) {
    failProviderDiagnostic('provider.transaction_validation', 'environment_mismatch', { code: 'environment_mismatch', status: 409, message: 'Checkout environment is unavailable.' });
  }
  let checkoutUrl = '';
  if (isRecord(transaction.checkout) && transaction.checkout.url !== undefined) {
    checkoutUrl = safeProviderString(transaction.checkout.url, 2048);
    if (!checkoutUrl) failProviderDiagnostic('provider.transaction_validation', 'invalid_checkout_url');
  }
  return {
    providerTransactionId: transactionId,
    providerEnvironment: input.environment,
    collectionMode,
    checkoutReference: opaqueReference('paddle'),
    checkoutUrl: checkoutUrl || undefined,
  };
}

class PaddleAutomaticProvider {
  constructor({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
    this.env = env;
    this.fetchImpl = fetchImpl;
  }

  async createCheckout(input) {
    const endpoint = PADDLE_API_ORIGINS[input.environment];
    const key = asString(this.env[providerKeyVariable(input.environment)]).trim();
    if (!endpoint) failProviderDiagnostic('provider.runtime_configuration', 'missing_provider_endpoint');
    if (!key) failProviderDiagnostic('provider.runtime_configuration', 'missing_runtime_credential');
    if (typeof this.fetchImpl !== 'function') failProviderDiagnostic('provider.runtime_configuration', 'fetch_unavailable');
    let response;
    try {
      response = await this.fetchImpl(`${endpoint}/transactions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          items: [{ price_id: input.priceId, quantity: 1 }],
          collection_mode: 'automatic',
          custom_data: input.customData,
        }),
      });
    } catch (_) {
      failProviderDiagnostic('provider.transport', 'transport_failure');
    }
    if (!response?.ok) {
      const status = Number(response?.status);
      const category = status === 401 || status === 403 ? 'provider_auth_rejected'
        : status === 400 || status === 422 ? 'provider_request_rejected'
          : status === 404 ? 'provider_not_found'
            : status === 409 ? 'provider_conflict'
              : status === 429 ? 'provider_rate_limited'
                : Number.isInteger(status) && status >= 500 && status <= 599 ? 'provider_upstream_error'
                  : 'provider_http_other';
      failProviderDiagnostic('provider.http_response', category, { diagnosticStatus: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null });
    }
    let payload;
    try { payload = await response.json(); } catch (_) { failProviderDiagnostic('provider.response_json', 'invalid_json'); }
    return parsePaddleTransaction(payload, input);
  }
}

const PAYPAL_API_ORIGINS = Object.freeze({
  sandbox: 'https://api-m.sandbox.paypal.com',
  production: 'https://api-m.paypal.com',
});

function paypalClientVariable(name) {
  return name === 'CLIENT_ID' ? 'PAYPAL_CLIENT_ID' : 'PAYPAL_CLIENT_SECRET';
}

class PayPalSubscriptionProvider {
  constructor({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
    this.env = env;
    this.fetchImpl = fetchImpl;
  }

  async getAccessToken(environment) {
    const apiOrigin = PAYPAL_API_ORIGINS[environment];
    const clientId = asString(this.env[paypalClientVariable('CLIENT_ID')]).trim();
    const clientSecret = asString(this.env[paypalClientVariable('CLIENT_SECRET')]).trim();

    if (!apiOrigin) failProviderDiagnostic('provider.runtime_configuration', 'missing_provider_endpoint');
    if (!clientId || !clientSecret) failProviderDiagnostic('provider.runtime_configuration', 'missing_runtime_credential');
    if (typeof this.fetchImpl !== 'function') failProviderDiagnostic('provider.runtime_configuration', 'fetch_unavailable');

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    let response;
    try {
      response = await this.fetchImpl(`${apiOrigin}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
    } catch (_) {
      failProviderDiagnostic('provider.transport', 'transport_failure');
    }

    if (!response?.ok) {
      const status = Number(response?.status);
      failProviderDiagnostic('provider.http_response', 'provider_auth_rejected', {
        diagnosticStatus: Number.isInteger(status) ? status : null,
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (_) {
      failProviderDiagnostic('provider.response_json', 'invalid_json');
    }

    if (!payload?.access_token) failProviderDiagnostic('provider.response_json', 'invalid_json');
    return payload.access_token;
  }

  async createCheckout(input) {
    const apiOrigin = PAYPAL_API_ORIGINS[input.environment];
    if (!apiOrigin) failProviderDiagnostic('provider.runtime_configuration', 'missing_provider_endpoint');

    const accessToken = await this.getAccessToken(input.environment);

    const planId = asString(input.priceId).trim();
    if (!planId || !planId.startsWith('P-')) {
      failProviderDiagnostic('provider.runtime_configuration', 'invalid_plan_id');
    }

    const appOrigin = asString(input.appOrigin || this.env.BILLING_CHECKOUT_APPROVED_APP_URL || 'https://wiseresume.app').trim().replace(/\/$/, '');
    const returnUrl = `${appOrigin}${input.returnPath || SAFE_RETURN_PATH}`;
    const cancelUrl = `${appOrigin}/subscription?billing=canceled`;

    const requestBody = {
      plan_id: planId,
      custom_id: asString(input.customData?.app_user_id || input.userId).trim(),
      application_context: {
        brand_name: 'WiseResume',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (input.providerRequestId) {
      headers['PayPal-Request-Id'] = String(input.providerRequestId).trim();
    }

    let response;
    try {
      response = await this.fetchImpl(`${apiOrigin}/v1/billing/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (_) {
      failProviderDiagnostic('provider.transport', 'transport_failure');
    }

    if (!response?.ok) {
      const status = Number(response?.status);
      const category = status === 401 || status === 403 ? 'provider_auth_rejected'
        : status === 400 || status === 422 ? 'provider_request_rejected'
          : status === 404 ? 'provider_not_found'
            : status === 409 ? 'provider_conflict'
              : status === 429 ? 'provider_rate_limited'
                : Number.isInteger(status) && status >= 500 && status <= 599 ? 'provider_upstream_error'
                  : 'provider_http_other';
      failProviderDiagnostic('provider.http_response', category, {
        diagnosticStatus: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch (_) {
      failProviderDiagnostic('provider.response_json', 'invalid_json');
    }

    const subscriptionId = asString(payload?.id).trim();
    if (!subscriptionId || !subscriptionId.startsWith('I-')) {
      failProviderDiagnostic('provider.transaction_validation', 'invalid_subscription_id');
    }

    const approveLink = (Array.isArray(payload?.links) ? payload.links : []).find(link => link?.rel === 'approve');
    const checkoutUrl = asString(approveLink?.href).trim();
    if (!checkoutUrl) {
      failProviderDiagnostic('provider.transaction_validation', 'missing_approval_url');
    }

    const approvedOrigin = PAYPAL_APPROVED_ORIGINS[input.environment];
    let parsedUrl;
    try {
      parsedUrl = new URL(checkoutUrl);
    } catch {
      failProviderDiagnostic('provider.transaction_validation', 'invalid_approval_url');
    }

    if (parsedUrl.origin !== approvedOrigin || parsedUrl.protocol !== 'https:') {
      failProviderDiagnostic('provider.safe_result_validation', 'checkout_origin_mismatch');
    }

    return {
      providerTransactionId: subscriptionId,
      providerEnvironment: input.environment,
      collectionMode: 'automatic',
      checkoutReference: opaqueReference('paypal'),
      checkoutUrl,
    };
  }

  async cancelSubscription({ subscriptionId, reason, environment }) {
    const env = normalizeEnvironment(environment) || 'sandbox';
    const apiOrigin = PAYPAL_API_ORIGINS[env];
    if (!apiOrigin) failProviderDiagnostic('provider.runtime_configuration', 'missing_provider_endpoint');

    const cleanSubId = asString(subscriptionId).trim();
    if (!cleanSubId || !cleanSubId.startsWith('I-')) {
      fail('bad_request', 400, 'Invalid subscription ID.');
    }

    const accessToken = await this.getAccessToken(env);
    const cancelReason = asString(reason).trim().slice(0, 128) || 'Canceled by user in WiseResume settings';

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'PayPal-Request-Id': `wr_cancel_${hash(cleanSubId).slice(0, 24)}`,
    };

    let response;
    try {
      response = await this.fetchImpl(`${apiOrigin}/v1/billing/subscriptions/${encodeURIComponent(cleanSubId)}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: cancelReason }),
      });
    } catch (_) {
      failProviderDiagnostic('provider.transport', 'transport_failure');
    }

    if (response?.status === 204) {
      return { status: 'success', canceled: true, subscription_id: cleanSubId };
    }

    if (response?.status === 400 || response?.status === 422) {
      let verifyResponse;
      try {
        verifyResponse = await this.fetchImpl(`${apiOrigin}/v1/billing/subscriptions/${encodeURIComponent(cleanSubId)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        });
      } catch (_) {
        failProviderDiagnostic('provider.transport', 'transport_failure');
      }

      if (verifyResponse?.ok) {
        let subData;
        try {
          subData = await verifyResponse.json();
        } catch (_) {
          failProviderDiagnostic('provider.response_json', 'invalid_json');
        }
        if (asString(subData?.status).toUpperCase() === 'CANCELLED') {
          return { status: 'success', canceled: true, subscription_id: cleanSubId };
        }
      }
      fail('cancellation_failed', 400, 'Unable to cancel subscription. Please verify your subscription status.');
    }

    if (response?.status === 404) {
      fail('not_found', 404, 'Subscription not found at provider.');
    }

    const status = Number(response?.status);
    failProviderDiagnostic('provider.http_response', 'provider_upstream_error', {
      diagnosticStatus: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    });
  }
}

function selectProvider(config, dependencies) {
  if (dependencies.provider) return dependencies.provider;
  const providerType = asString(config.provider || process.env.BILLING_CHECKOUT_PROVIDER).trim().toLowerCase();
  if (providerType === 'paypal') {
    return new PayPalSubscriptionProvider({ env: dependencies.env || process.env, fetchImpl: dependencies.fetchImpl });
  }
  if (providerType === 'paddle') {
    fail('payments_disabled', 403, 'Requested checkout provider is retired.');
  }
  if (!providerType) {
    fail('configuration_error', 500, 'Checkout provider is unconfigured.');
  }
  fail('configuration_error', 500, 'Unsupported checkout provider configuration.');
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
    assertRuntimeEnabled(this.config, plan, userId);
    const currentPlan = await this.store.getEffectivePlan(userId);
    assertNotAlreadyEntitled(currentPlan, plan);
    const catalog = this.config.catalog[plan];
    const nowMs = this.now();
    const replayBucket = Math.floor(nowMs / IDEMPOTENCY_WINDOW_MS);
    // Explicit keys provide replay/recovery semantics. Without one, each request
    // gets a unique server-generated attempt key; the plan lock still coalesces
    // concurrent/simultaneous sessions without cross-plan collision or stale retry blocking.
    const requestKey = idempotencyKey || opaqueReference('attempt');
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
    const providerRequestId = `wr_sub_${hash(reservation.session.session_key).slice(0, 32)}`;
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
      providerRequestId,
    };
    try {
      const providerResult = await providerOperation('provider.create_checkout', 'provider_operation_failure', () => this.provider.createCheckout(providerInput));
      const result = await providerOperation('provider.safe_result_validation', 'safe_result_validation_failure', () => safeProviderResult(providerResult, this.config));
      await providerOperation('provider.persist_complete', 'persistence_failure', () => this.store.complete(reservation.session, result, this.now()));
      return publicSessionResponse({ ...reservation.session, expiresAt: sessionInput.expiresAt, plan }, result);
    } catch (error) {
      const safeCode = error instanceof BillingCheckoutError ? error.code : 'provider_unavailable';
      if (isAmbiguousProviderError(error) && typeof this.store.markUncertain === 'function') {
        try { await this.store.markUncertain(reservation.session, safeCode, this.now()); } catch (_) {}
      } else {
        try { await this.store.fail(reservation.session, safeCode, this.now()); } catch (_) {}
      }
      if (error instanceof BillingCheckoutError) throw error;
      const sanitizedError = new BillingCheckoutError('provider_unavailable', 502, 'Checkout provider is temporarily unavailable.');
      const diagnostic = providerDiagnostic(error);
      if (diagnostic) throw annotateProviderFailure(sanitizedError, diagnostic.stage, diagnostic.category, diagnostic.status);
      throw sanitizedError;
    }
  }

  async cancel({ userId, reason }) {
    if (!userId) fail('unauthorized', 401, 'Authentication is required.');
    let targetSubId = '';
    if (typeof this.store.findOptional === 'function') {
      const [sub, paypalState] = await Promise.all([
        this.store.findOptional('subscriptions', userId),
        this.store.findOptional('paypal_subscription_state', userId),
      ]);
      if (paypalState && (!paypalState.user_id || paypalState.user_id === userId)) {
        targetSubId = paypalState.subscription_id || '';
      } else if (sub && (!sub.user_id || sub.user_id === userId)) {
        targetSubId = sub.subscription_id || '';
      }
    }
    if (!targetSubId) {
      fail('not_found', 404, 'No active subscription found to cancel.');
    }
    if (typeof this.provider.cancelSubscription !== 'function') {
      fail('configuration_error', 500, 'Cancellation is not supported by current checkout provider.');
    }
    await this.provider.cancelSubscription({
      subscriptionId: targetSubId,
      reason,
      environment: this.config.environment,
      userId,
    });
    return {
      status: 'success',
      canceled: true,
      message: 'Cancellation request accepted.',
    };
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
    const store = dependencies.store || new AppwriteCheckoutStore(clients.databases, config.environment, {
      paypalProviderEnvironment: config.environment,
      qaUserId: config.qaUserId,
    });
    const provider = selectProvider(config, dependencies);
    const service = new BillingCheckoutService({
      store,
      provider,
      config,
      now: dependencies.now,
    });
    if (request.action === 'cancel-subscription') {
      const response = await service.cancel({
        userId: user.$id,
        reason: request.reason,
      });
      return res.json(response, 200);
    }
    const response = await service.create({ userId: user.$id, ...request });
    return res.json(response, 200);
  } catch (caught) {
    if (typeof error === 'function') {
      const diagnostic = providerDiagnostic(caught) || reserveDiagnostic(caught);
      const stage = diagnostic?.stage || '';
      const category = diagnostic?.category
        ? ` category=${diagnostic.category}`
        : '';
      const status = Number.isInteger(diagnostic?.status) ? ` status=${diagnostic.status}` : '';
      error(`billing-checkout ${caught instanceof BillingCheckoutError ? caught.code : 'checkout_unavailable'}${stage ? ` stage=${stage}` : ''}${category}${status}`);
    }
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
  PROVIDER_DIAGNOSTIC_STAGES,
  RATE_LIMIT_WINDOW_MS,
  RESERVE_DIAGNOSTIC_STAGES,
  SAFE_RETURN_PATH,
  SESSION_COLLECTION,
  BillingCheckoutError,
  BillingCheckoutService,
  AppwriteCheckoutStore,
  UnconfiguredProvider,
  PaddleAutomaticProvider,
  PADDLE_API_ORIGINS,
  PAYPAL_API_ORIGINS,
  PAYPAL_APPROVED_ORIGINS,
  PayPalSubscriptionProvider,
  selectProvider,
  isAmbiguousProviderError,
  parsePaddleTransaction,
  providerDiagnostic,
  providerKeyVariable,
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
  reserveDiagnosticStage,
  classifyCreateTransactionFailure,
  validateRequest,
  buildUserLockPayload,
  buildPlanLockPayload,
  validateLockPayload,
};
