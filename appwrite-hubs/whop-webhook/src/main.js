'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'whop_subscription_state';
const LEDGER_COLLECTION_ID = 'whop_event_ledger';
const SESSION_COLLECTION_ID = 'billing_checkout_sessions';
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
  if (!secret.startsWith('ws_')) return false;
  const key = Buffer.from(secret, 'utf8');
  if (!key.length) return false;
  const expected = crypto.createHmac('sha256', key).update(`${webhookId}.${timestamp}.${raw}`).digest('base64');
  return signatureHeader.split(/\s+/).some(value => {
    const match = /^v1,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return false;
    const a = Buffer.from(match[1], 'base64');
    const b = Buffer.from(expected, 'base64');
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
    planId: String(data.plan?.id || data.plan_id || '').trim(),
    productId: String(data.product?.id || data.product_id || '').trim(),
    membershipId: String(data.membership?.id || data.id || '').trim(),
    checkoutConfigurationId: String(data.checkout_configuration_id || data.checkout_configuration?.id || '').trim(),
    metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata : {},
    periodEnd: data.renewal_period_end || data.current_period_end || null,
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    raw: data,
  };
}
function validateEvent(event, catalog = configuredCatalog()) {
  if (!event.id || !SUPPORTED_EVENTS.has(event.type)) return 'invalid_event';
  if (!event.timestampMs || !Number.isSafeInteger(event.timestampMs)) return 'invalid_timestamp';
  if (!catalog.companyId || event.companyId !== catalog.companyId) return 'company_mismatch';
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
    checkout_reference: String(event.checkoutConfigurationId || event.metadata.checkout_reference || previous?.checkout_reference || '').slice(0, 160),
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
async function updateLedger(databases, eventId, status, outcomeCode) {
  return databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(eventId), {
    processing_status: status,
    outcome_code: outcomeCode,
  }, []);
}

async function resolveUserFromSession(databases, event, catalog, accessEnvironment) {
  const checkoutRef = event.checkoutConfigurationId;
  if (!checkoutRef) return null;
  let session = null;
  try {
    const res = await databases.listDocuments(DB_ID, SESSION_COLLECTION_ID, [
      sdk.Query.equal('checkout_reference', checkoutRef),
      sdk.Query.limit(1),
    ]);
    if (res.documents?.length > 0) session = res.documents[0];
  } catch (_) {}
  if (!session) {
    try {
      const res = await databases.listDocuments(DB_ID, SESSION_COLLECTION_ID, [
        sdk.Query.equal('provider_transaction_id', checkoutRef),
        sdk.Query.limit(1),
      ]);
      if (res.documents?.length > 0) session = res.documents[0];
    } catch (_) {}
  }
  if (!session) return null;

  const sessionUser = String(session.user_id || '').trim();
  if (!sessionUser || sessionUser.length > 64) return null;

  // Validate provider where stored
  if (session.provider && String(session.provider).trim().toLowerCase() !== 'whop') {
    return null;
  }

  // Validate environment matches validated webhook environment
  if (String(session.environment || '').trim().toLowerCase() !== accessEnvironment) {
    return null;
  }

  // Validate plan matches real Whop plan mapping
  const expectedPlan = catalog.planToEntitlement[event.planId];
  if (!expectedPlan || session.plan !== expectedPlan) {
    return null;
  }

  // Validate product/price identifiers where available in session
  if (session.price_id && event.planId && session.price_id !== event.planId) {
    return null;
  }
  if (session.product_id && catalog.productId && session.product_id !== catalog.productId) {
    return null;
  }

  return sessionUser;
}

async function resolveUserFromExistingState(databases, event, accessEnvironment) {
  const membershipId = event.membershipId;
  if (!membershipId) return null;
  try {
    const res = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
      sdk.Query.equal('membership_id', membershipId),
      sdk.Query.limit(1),
    ]);
    const doc = res.documents?.[0] || null;
    if (!doc) return null;
    if (String(doc.environment || '').trim().toLowerCase() !== accessEnvironment) return null;
    const userId = String(doc.user_id || '').trim();
    return userId && userId.length <= 64 ? userId : null;
  } catch (_) {
    return null;
  }
}

async function processEvent(databases, users, event, nowMs = Date.now()) {
  const catalog = configuredCatalog();
  const invalid = validateEvent(event, catalog);
  if (invalid) return { outcome: 'rejected', code: invalid, mutated: false };

  const accessEnvironment = env('WHOP_ACCESS_ENVIRONMENT').toLowerCase();
  if (!['sandbox', 'production'].includes(accessEnvironment)) {
    throw new Error('WHOP_ACCESS_ENVIRONMENT must be sandbox or production');
  }

  // Check ledger for duplicates / reclaim
  const existingLedger = await findLedger(databases, event.id);
  if (existingLedger) {
    const isReclaimable = existingLedger.processing_status === 'rejected' &&
      event.type.startsWith('membership.') &&
      (existingLedger.outcome_code === 'missing_metadata_user' || existingLedger.outcome_code === 'unresolved_checkout_correlation');
    if (!isReclaimable) {
      return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
    }
  }

  // Resolve user identity for membership events
  if (event.type.startsWith('membership.')) {
    if (!event.userId) {
      const sessionUser = await resolveUserFromSession(databases, event, catalog, accessEnvironment);
      if (sessionUser) {
        event.userId = sessionUser;
      } else if (event.type !== 'membership.activated') {
        const stateUser = await resolveUserFromExistingState(databases, event, accessEnvironment);
        if (stateUser) {
          event.userId = stateUser;
        }
      }
    }
    if (!event.userId || event.userId.length > 64) {
      return { outcome: 'rejected', code: 'unresolved_checkout_correlation', mutated: false };
    }
  }

  // Non-state events (payment.succeeded, etc.)
  if (!STATE_EVENTS.has(event.type)) {
    if (existingLedger) {
      await updateLedger(databases, event.id, 'processed', 'observed_without_entitlement_mutation');
    } else {
      await recordLedger(databases, event, nowMs, 'processed', 'observed_without_entitlement_mutation');
    }
    return { outcome: 'processed', code: 'observed_without_entitlement_mutation', mutated: false };
  }

  // Verify Appwrite user exists
  if (users) {
    try { await users.get(event.userId); } catch { return { outcome: 'rejected', code: 'unknown_identity', mutated: false }; }
  }

  // Multi-membership safety guard & ordering check
  const previous = await findState(databases, event.userId);
  if (previous) {
    const isDifferentMembership = Boolean(previous.membership_id && event.membershipId && previous.membership_id !== event.membershipId);
    if (isDifferentMembership && event.type !== 'membership.activated') {
      // Deactivation or cancellation for a non-current membership must NOT remove current active entitlement
      if (existingLedger) {
        await updateLedger(databases, event.id, 'ignored', 'non_current_membership');
      } else {
        await recordLedger(databases, event, nowMs, 'ignored', 'non_current_membership');
      }
      return { outcome: 'ignored', code: 'non_current_membership', mutated: false };
    }

    if (event.timestampMs < Number(previous.latest_event_timestamp_ms || -1)) {
      if (existingLedger) {
        await updateLedger(databases, event.id, 'ignored', 'stale_event');
      } else {
        await recordLedger(databases, event, nowMs, 'ignored', 'stale_event');
      }
      return { outcome: 'ignored', code: 'stale_event', mutated: false };
    }
  }

  // State patch and write
  const patch = statePatch(event, nowMs, previous);
  if (previous) await databases.updateDocument(DB_ID, STATE_COLLECTION_ID, previous.$id, patch, []);
  else await databases.createDocument(DB_ID, STATE_COLLECTION_ID, stateDocumentId(event.userId), patch, []);

  if (existingLedger) {
    await updateLedger(databases, event.id, 'processed', 'state_updated');
  } else {
    await recordLedger(databases, event, nowMs, 'processed', 'state_updated');
  }

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
  DB_ID, STATE_COLLECTION_ID, LEDGER_COLLECTION_ID, SESSION_COLLECTION_ID,
  COMPANY_ID: DEFAULT_COMPANY_ID, PRODUCT_ID: DEFAULT_PRODUCT_ID,
  PLAN_TO_ENTITLEMENT: DEFAULT_PLAN_TO_ENTITLEMENT, configuredCatalog,
  SUPPORTED_EVENTS, STATE_EVENTS, verifySignature,
  rawBody, parseBody, eventData, validateEvent, statePatch, processEvent,
  resolveUserFromSession, resolveUserFromExistingState,
  stateDocumentId, ledgerDocumentId,
};
