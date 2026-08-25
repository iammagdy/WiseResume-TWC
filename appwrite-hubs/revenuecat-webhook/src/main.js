'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');
const {
  VALID_PAID_PLANS,
  normalizePlan,
  resolveEffectivePlan,
} = require('@wiseresume/subscription-resolver');

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'revenuecat_subscription_state';
const LEDGER_COLLECTION_ID = 'revenuecat_event_ledger';
const SUPPORTED_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'CANCELLATION',
  'UNCANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'PRODUCT_CHANGE',
]);
const PRODUCT_TO_PLAN = Object.freeze({
  // Paddle Sandbox catalog identifiers. Keep internal values pro|premium.
  pri_01m0fnjspex6yqqf6w9v9apaxg: 'pro',
  pri_01m0fnq9hetwdwm9e1sa49n08s: 'premium',
});
const ENTITLEMENT_TO_PLAN = Object.freeze({ pro: 'pro', premium: 'premium' });
const LEDGER_RETENTION_DAYS = 90;
const MAX_EVENT_TIMESTAMP_MS = 9999999999999;

function getEnv(name) { return process.env[name] || ''; }

function getClients() {
  const endpoint = getEnv('APPWRITE_FUNCTION_API_ENDPOINT') || getEnv('APPWRITE_ENDPOINT') || 'https://fra.cloud.appwrite.io/v1';
  const projectId = getEnv('APPWRITE_FUNCTION_PROJECT_ID') || getEnv('APPWRITE_PROJECT_ID');
  const apiKey = getEnv('APPWRITE_API_KEY') || getEnv('APPWRITE_FUNCTION_API_KEY');
  if (!projectId || !apiKey) throw new Error('Appwrite server configuration is incomplete');
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { databases: new sdk.Databases(client), users: new sdk.Users(client) };
}

function header(req, name) {
  const headers = req?.headers || req?.__headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function rawBody(req) {
  try {
    if (typeof req?.bodyText === 'string') return req.bodyText;
  } catch {
    // Appwrite exposes bodyText as the safe raw-body contract; keep parsing fail-closed.
  }

  try {
    if (typeof req?.body === 'string') return req.body;
    if (req?.body && typeof req.body === 'object') return JSON.stringify(req.body);
  } catch {
    // Legacy req.body can be a throwing JSON getter for malformed application/json.
  }

  return '';
}

function parseJsonBody(req) {
  const raw = rawBody(req);
  if (!raw || raw.length > 256 * 1024) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function timingSafeSecretMatches(provided, expected) {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(String(provided));
  const expectedBuffer = Buffer.from(String(expected));
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

function authenticated(req) {
  const configured = getEnv('REVENUECAT_WEBHOOK_AUTH_SECRET');
  const provided = header(req, 'Authorization');
  const token = String(provided).replace(/^Bearer\s+/i, '').trim();
  return timingSafeSecretMatches(token, configured);
}

function eventFromBody(body) {
  return body?.event && typeof body.event === 'object' ? body.event : body;
}

function normalizeEvent(body) {
  const event = eventFromBody(body);
  const type = String(event?.type || '').trim().toUpperCase();
  const id = String(event?.id || '').trim();
  const appUserId = String(event?.app_user_id || '').trim();
  const eventTimestampMs = Number(event?.event_timestamp_ms);
  const environment = String(event?.environment || '').trim().toUpperCase();
  const productId = String(event?.product_id || event?.new_product_id || '').trim();
  const entitlementId = String(
    event?.entitlement_id ||
    event?.entitlement_ids?.[0] ||
    event?.entitlements?.[0]?.id ||
    '',
  ).trim().toLowerCase();
  const expirationAtMs = Number(event?.expiration_at_ms);
  const eventData = {
    type,
    id,
    appUserId,
    eventTimestampMs,
    environment,
    productId,
    entitlementId,
    expirationAtMs,
    originalPurchaseDateMs: Number(event?.purchased_at_ms || event?.original_purchase_date_ms || 0),
    raw: event,
  };
  return eventData;
}

function validateEvent(event) {
  if (!event.id || !SUPPORTED_EVENTS.has(event.type)) return { ok: false, code: 'invalid_event' };
  if (!event.appUserId || event.appUserId.length > 64) return { ok: false, code: 'invalid_identity' };
  if (!Number.isSafeInteger(event.eventTimestampMs) || event.eventTimestampMs < 0 || event.eventTimestampMs > MAX_EVENT_TIMESTAMP_MS) {
    return { ok: false, code: 'invalid_timestamp' };
  }
  if (!['SANDBOX', 'PRODUCTION'].includes(event.environment)) return { ok: false, code: 'invalid_environment' };
  if (event.type !== 'EXPIRATION' && (!event.productId || !event.entitlementId)) return { ok: false, code: 'missing_product_entitlement' };
  return { ok: true };
}

function resolvePlanForEvent(event, previous = null) {
  const productId = event.type === 'EXPIRATION' && previous ? previous.product_id : (event.productId || previous?.product_id);
  const entitlementId = event.type === 'EXPIRATION' && previous ? previous.entitlement_id : (event.entitlementId || previous?.entitlement_id);
  const byProduct = PRODUCT_TO_PLAN[productId];
  const byEntitlement = ENTITLEMENT_TO_PLAN[entitlementId];
  if (!byProduct || !byEntitlement || byProduct !== byEntitlement || !VALID_PAID_PLANS.has(byProduct)) return null;
  return byProduct;
}

function eventOrderingKey(event) {
  return `${String(event.eventTimestampMs).padStart(13, '0')}:${event.id}`;
}

function stateDocumentId(userId) {
  return `rcs_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 29)}`;
}

function ledgerDocumentId(eventId) {
  return `rce_${crypto.createHash('sha256').update(eventId).digest('hex').slice(0, 29)}`;
}

function isoFromMs(value, fallbackMs) {
  const ms = Number(value) > 0 ? Number(value) : fallbackMs;
  return new Date(ms).toISOString();
}

function retentionIso(nowMs) {
  return new Date(nowMs + LEDGER_RETENTION_DAYS * 86400000).toISOString();
}

async function findDocument(databases, collectionId, queries) {
  const result = await databases.listDocuments(DB_ID, collectionId, queries);
  return result.documents?.[0] || null;
}

async function findState(databases, userId) {
  return findDocument(databases, STATE_COLLECTION_ID, [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
}

async function findLedger(databases, eventId) {
  try {
    return await databases.getDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(eventId));
  } catch (err) {
    if (err?.code === 404) return null;
    throw err;
  }
}

function serverOnlyPermissions() { return []; }

function providerStatePatch(event, plan, nowMs, previous = null) {
  const isExpiration = event.type === 'EXPIRATION';
  const isCancellation = event.type === 'CANCELLATION' || event.type === 'BILLING_ISSUE';
  const eventExpiry = event.expirationAtMs > 0 ? isoFromMs(event.expirationAtMs, event.eventTimestampMs) : null;
  const previousExpiry = eventExpiry || previous?.expires_at || isoFromMs(event.expirationAtMs, event.eventTimestampMs);
  return {
    user_id: event.appUserId,
    plan,
    entitlement_id: event.type === 'EXPIRATION' && previous ? previous.entitlement_id : (event.entitlementId || previous?.entitlement_id),
    product_id: event.type === 'EXPIRATION' && previous ? previous.product_id : (event.productId || previous?.product_id),
    environment: event.environment || previous?.environment,
    status: isExpiration ? 'expired' : (isCancellation ? (event.type === 'CANCELLATION' ? 'canceled' : 'billing_issue') : 'active'),
    expires_at: previousExpiry,
    will_renew: isExpiration || isCancellation ? false : true,
    latest_event_id: event.id,
    latest_event_type: event.type,
    latest_event_timestamp_ms: event.eventTimestampMs,
    updated_at: new Date(nowMs).toISOString(),
  };
}

async function upsertState(databases, event, plan, nowMs, previous) {
  const payload = providerStatePatch(event, plan, nowMs, previous);
  const permissions = serverOnlyPermissions();
  const documentId = stateDocumentId(event.appUserId);
  if (previous) {
    return databases.updateDocument(DB_ID, STATE_COLLECTION_ID, previous.$id, payload, permissions);
  }
  return databases.createDocument(DB_ID, STATE_COLLECTION_ID, documentId, payload, permissions);
}

async function recordLedger(databases, event, nowMs, status, outcomeCode) {
  const payload = {
    event_id: event.id,
    event_type: event.type,
    user_id: event.appUserId || null,
    event_timestamp_ms: event.eventTimestampMs,
    received_at: new Date(nowMs).toISOString(),
    processing_status: status,
    ordering_key: eventOrderingKey(event),
    outcome_code: outcomeCode,
    expires_at: retentionIso(nowMs),
  };
  return databases.createDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(event.id), payload, serverOnlyPermissions());
}

async function processEvent(databases, event, nowMs = Date.now(), users = null) {
  const validity = validateEvent(event);
  if (!validity.ok) return { outcome: 'rejected', code: validity.code, mutated: false };

  const existingLedger = await findLedger(databases, event.id);
  if (existingLedger) return { outcome: 'duplicate', code: 'already_recorded', mutated: false };

  const previous = await findState(databases, event.appUserId);
  const plan = resolvePlanForEvent(event, previous);
  if (!plan) return { outcome: 'rejected', code: 'unknown_product_or_entitlement', mutated: false };

  if (users) {
    try { await users.get(event.appUserId); }
    catch { return { outcome: 'rejected', code: 'unknown_identity', mutated: false }; }
  }

  const previousTimestamp = Number(previous?.latest_event_timestamp_ms || -1);
  if (previous && event.eventTimestampMs < previousTimestamp) {
    await recordLedger(databases, event, nowMs, 'ignored', 'stale_event');
    return { outcome: 'ignored', code: 'stale_event', mutated: true };
  }

  // Every supported lifecycle event updates only the isolated provider state.
  // The shared resolver later decides whether this candidate affects effective_plan.
  await upsertState(databases, event, plan, nowMs, previous);
  await recordLedger(databases, event, nowMs, 'processed', 'state_updated');
  return {
    outcome: 'processed',
    code: 'state_updated',
    mutated: true,
    plan,
    effectivePlan: resolveEffectivePlan({ providerState: providerStatePatch(event, plan, nowMs, previous), nowMs }).plan,
  };
}

function response(res, payload, status = 200) { return res.json(payload, status); }

module.exports = async ({ req, res, log, error }) => {
  const requestId = header(req, 'x-appwrite-execution-id') || 'request';
  if (!authenticated(req)) {
    log?.(`RevenueCat webhook ${requestId}: rejected authentication`);
    return response(res, { status: 'error', code: 'unauthorized', message: 'Unauthorized.' }, 401);
  }

  const body = parseJsonBody(req);
  if (!body) {
    log?.(`RevenueCat webhook ${requestId}: rejected malformed body`);
    return response(res, { status: 'error', code: 'malformed_body', message: 'Malformed request.' }, 400);
  }

  const event = normalizeEvent(body);
  const validity = validateEvent(event);
  if (!validity.ok) {
    log?.(`RevenueCat webhook ${requestId}: rejected ${event.type || 'unknown'} (${validity.code || 'unknown_product_or_entitlement'})`);
    return response(res, { status: 'error', code: validity.code || 'unknown_product_or_entitlement', message: 'Event rejected.' }, 400);
  }

  try {
    const { databases, users } = getClients();
    const result = await processEvent(databases, event, Date.now(), users);
    log?.(`RevenueCat webhook ${requestId}: ${event.type} -> ${result.outcome}`);
    return response(res, { status: 'success', data: { ok: true, ...result } }, 200);
  } catch (err) {
    error?.(`RevenueCat webhook ${requestId}: processing failure`);
    return response(res, { status: 'error', code: 'processing_failed', message: 'Webhook processing failed.' }, 500);
  }
};

module.exports.__test = {
  DB_ID,
  STATE_COLLECTION_ID,
  LEDGER_COLLECTION_ID,
  SUPPORTED_EVENTS,
  PRODUCT_TO_PLAN,
  ENTITLEMENT_TO_PLAN,
  LEDGER_RETENTION_DAYS,
  parseJsonBody,
  timingSafeSecretMatches,
  authenticated,
  normalizeEvent,
  validateEvent,
  resolvePlanForEvent,
  eventOrderingKey,
  stateDocumentId,
  ledgerDocumentId,
  providerStatePatch,
  processEvent,
  resolveEffectivePlan,
};
