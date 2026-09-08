'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'whop_subscription_state';
const LEDGER_COLLECTION_ID = 'whop_event_ledger';
const DEFAULT_COMPANY_ID = 'biz_B7fMXLLj18wv8J';
const DEFAULT_PRODUCT_ID = 'prod_WrbEGZdSaG2af';
const DEFAULT_PLAN_TO_ENTITLEMENT = Object.freeze({
  plan_4JJSQLj5zEKVn: 'pro',
  plan_kt5MScAplbCuN: 'premium',
});
const SUPPORTED_EVENTS = new Set([
  'membership.activated',
  'membership.deactivated',
  'membership.cancel_at_period_end_changed',
  'payment.succeeded',
  'payment.failed',
  'payment.pending',
  'invoice.paid',
  'invoice.past_due',
  'refund.created',
  'refund.updated',
  'dispute.created',
  'dispute.updated',
]);
const STATE_EVENTS = new Set([
  'membership.activated',
  'membership.deactivated',
  'membership.cancel_at_period_end_changed',
]);
const MAX_BODY_BYTES = 256 * 1024;
const SIGNATURE_TOLERANCE_SECONDS = 300;
const LEDGER_RETENTION_DAYS = 90;

function env(name) { return String(process.env[name] || '').trim(); }
function configuredCatalog(environment = env('WHOP_ACCESS_ENVIRONMENT').toLowerCase()) {
  const prefix = environment === 'sandbox' ? 'WHOP_SANDBOX' : environment === 'production' ? 'WHOP_PRODUCTION' : '';
  if (!prefix) return { companyId: '', productId: '', planToEntitlement: {} };
  const planToEntitlement = {
    [env(`${prefix}_PRO_PLAN_ID`)]: 'pro',
    [env(`${prefix}_PREMIUM_PLAN_ID`)]: 'premium',
  };
  return {
    companyId: env(`${prefix}_COMPANY_ID`),
    productId: env(`${prefix}_PRODUCT_ID`),
    planToEntitlement: Object.fromEntries(Object.entries(planToEntitlement).filter(([id]) => id)),
  };
}
function header(req, name) {
  const headers = req?.headers || {};
  const wanted = name.toLowerCase();
  const key = Object.keys(headers).find(item => item.toLowerCase() === wanted);
  return key ? String(headers[key] || '').trim() : '';
}
function rawBody(req) {
  if (typeof req?.bodyText === 'string') return req.bodyText;
  if (typeof req?.body === 'string') return req.body;
  return '';
}
function parseBody(raw) {
  if (!raw || Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch { return null; }
}
function verifySignature(raw, req, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  const webhookId = header(req, 'webhook-id');
  const timestamp = header(req, 'webhook-timestamp');
  const signatureHeader = header(req, 'webhook-signature');
  const timestampSeconds = Number(timestamp);
  if (!webhookId || !timestamp || !Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS) return false;
  if (!secret || !signatureHeader) return false;
  const encodedSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key;
  try { key = Buffer.from(encodedSecret, 'base64'); } catch { return false; }
  if (!key.length) return false;
  const expected = crypto.createHmac('sha256', key).update(`${webhookId}.${timestamp}.${raw}`).digest('base64');
  return signatureHeader.split(/\s+/).some(value => {
    const provided = value.replace(/^v\d+,/, '');
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
function getClients() {
  const endpoint = env('APPWRITE_FUNCTION_API_ENDPOINT') || env('APPWRITE_ENDPOINT') || 'https://fra.cloud.appwrite.io/v1';
  const projectId = env('APPWRITE_FUNCTION_PROJECT_ID') || env('APPWRITE_PROJECT_ID');
  const apiKey = env('APPWRITE_API_KEY') || env('APPWRITE_FUNCTION_API_KEY');
  if (!projectId || !apiKey) throw new Error('Appwrite server configuration is incomplete');
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return { databases: new sdk.Databases(client), users: new sdk.Users(client) };
}
function stateDocumentId(userId) { return `whs_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 29)}`; }
function ledgerDocumentId(eventId) { return `whe_${crypto.createHash('sha256').update(eventId).digest('hex').slice(0, 29)}`; }
function eventData(body, requestId) {
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  return {
    id: String(body.id || requestId || '').trim(),
    type: String(body.type || '').trim(),
    timestampMs: Date.parse(body.timestamp || '') || 0,
    companyId: String(body.account_id || body.company_id || data.account?.id || data.company?.id || '').trim(),
    userId: String(data.metadata?.wiseresume_user_id || '').trim(),
    planId: String(data.plan?.id || '').trim(),
    productId: String(data.product?.id || '').trim(),
    membershipId: String(data.membership?.id || data.id || '').trim(),
    metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    periodEnd: data.renewal_period_end || null,
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    raw: data,
  };
}
function validateEvent(event, catalog = configuredCatalog()) {
  if (!event.id || !SUPPORTED_EVENTS.has(event.type)) return 'invalid_event';
  if (!event.timestampMs || !Number.isSafeInteger(event.timestampMs)) return 'invalid_timestamp';
  if (!catalog.companyId || event.companyId !== catalog.companyId) return 'company_mismatch';
  if (event.type.startsWith('membership.') && (!event.userId || event.userId.length > 64)) return 'missing_metadata_user';
  if (STATE_EVENTS.has(event.type) && (event.productId !== catalog.productId || !catalog.planToEntitlement[event.planId])) return 'unknown_product_or_plan';
  return null;
}
function statusFor(event) {
  if (event.type === 'membership.activated') return 'active';
  if (event.type === 'membership.cancel_at_period_end_changed') return event.cancelAtPeriodEnd ? 'canceled' : 'active';
  return 'expired';
}
function statePatch(event, nowMs, previous) {
  const accessEnvironment = env('WHOP_ACCESS_ENVIRONMENT').toLowerCase();
  if (!['sandbox', 'production'].includes(accessEnvironment)) {
    throw new Error('WHOP_ACCESS_ENVIRONMENT must be sandbox or production');
  }
  const plan = configuredCatalog().planToEntitlement[event.planId] || previous?.plan;
  const expiry = event.periodEnd || previous?.expires_at || null;
  return {
    user_id: event.userId || previous?.user_id,
    plan,
    membership_id: event.membershipId || previous?.membership_id,
    plan_id: event.planId || previous?.plan_id,
    product_id: event.productId || previous?.product_id,
    environment: accessEnvironment,
    status: statusFor(event),
    expires_at: expiry,
    will_renew: event.type === 'membership.activated' ? !event.cancelAtPeriodEnd : !event.cancelAtPeriodEnd,
    latest_event_id: event.id,
    latest_event_type: event.type,
    latest_event_timestamp_ms: event.timestampMs,
    checkout_reference: String(event.metadata.checkout_reference || previous?.checkout_reference || '').slice(0, 160),
    updated_at: new Date(nowMs).toISOString(),
  };
}
async function findState(databases, userId) {
  const res = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [sdk.Query.equal('user_id', userId), sdk.Query.limit(1)]);
  return res.documents?.[0] || null;
}
async function findLedger(databases, id) {
  try { return await databases.getDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(id)); }
  catch (error) { if (error?.code === 404) return null; throw error; }
}
async function recordLedger(databases, event, nowMs, status, outcomeCode) {
  return databases.createDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(event.id), {
    event_id: event.id, event_type: event.type, user_id: event.userId || null,
    membership_id: event.membershipId || null, event_timestamp_ms: event.timestampMs,
    received_at: new Date(nowMs).toISOString(), processing_status: status,
    ordering_key: `${String(event.timestampMs).padStart(13, '0')}:${event.id}`,
    outcome_code: outcomeCode,
    expires_at: new Date(nowMs + LEDGER_RETENTION_DAYS * 86400000).toISOString(),
  }, []);
}
async function processEvent(databases, users, event, nowMs = Date.now()) {
  const invalid = validateEvent(event);
  if (invalid) return { outcome: 'rejected', code: invalid, mutated: false };
  if (await findLedger(databases, event.id)) return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
  if (!STATE_EVENTS.has(event.type)) {
    await recordLedger(databases, event, nowMs, 'processed', 'observed_without_entitlement_mutation');
    return { outcome: 'processed', code: 'observed_without_entitlement_mutation', mutated: false };
  }
  if (users) {
    try { await users.get(event.userId); } catch { return { outcome: 'rejected', code: 'unknown_identity', mutated: false }; }
  }
  const previous = await findState(databases, event.userId);
  if (previous && event.timestampMs < Number(previous.latest_event_timestamp_ms || -1)) {
    await recordLedger(databases, event, nowMs, 'ignored', 'stale_event');
    return { outcome: 'ignored', code: 'stale_event', mutated: true };
  }
  const patch = statePatch(event, nowMs, previous);
  if (previous) await databases.updateDocument(DB_ID, STATE_COLLECTION_ID, previous.$id, patch, []);
  else await databases.createDocument(DB_ID, STATE_COLLECTION_ID, stateDocumentId(event.userId), patch, []);
  await recordLedger(databases, event, nowMs, 'processed', 'state_updated');
  return { outcome: 'processed', code: 'state_updated', mutated: true, plan: patch.plan };
}
function respond(res, body, status = 200) { return res.json(body, status); }

module.exports = async ({ req, res, log, error }) => {
  const raw = rawBody(req);
  const secret = env('WHOP_WEBHOOK_SECRET');
  if (!verifySignature(raw, req, secret)) return respond(res, { status: 'error', code: 'unauthorized' }, 401);
  const body = parseBody(raw);
  if (!body) return respond(res, { status: 'error', code: 'malformed_body' }, 400);
  const event = eventData(body, header(req, 'webhook-id'));
  try {
    const { databases, users } = getClients();
    const result = await processEvent(databases, users, event);
    log?.(`Whop webhook ${event.type || 'unknown'} -> ${result.outcome}`);
    return respond(res, { status: result.outcome === 'rejected' ? 'error' : 'success', data: result }, result.outcome === 'rejected' ? 400 : 200);
  } catch (_) {
    error?.(`Whop webhook ${event.type || 'unknown'} processing failure`);
    return respond(res, { status: 'error', code: 'processing_failed' }, 500);
  }
};

module.exports.__test = {
  DB_ID, STATE_COLLECTION_ID, LEDGER_COLLECTION_ID,
  COMPANY_ID: DEFAULT_COMPANY_ID, PRODUCT_ID: DEFAULT_PRODUCT_ID,
  PLAN_TO_ENTITLEMENT: DEFAULT_PLAN_TO_ENTITLEMENT, configuredCatalog,
  SUPPORTED_EVENTS, STATE_EVENTS, verifySignature,
  rawBody, parseBody, eventData, validateEvent, statePatch, processEvent,
  stateDocumentId, ledgerDocumentId,
};
