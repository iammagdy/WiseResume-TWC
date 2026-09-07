'use strict';

const crypto = require('crypto');
const sdk = require('node-appwrite');
const {
  VALID_PAID_PLANS,
  normalizePlan,
  normalizeProviderEnvironment,
  configuredPaypalProviderEnvironment,
  resolveEffectivePlan,
} = require('@wiseresume/subscription-resolver');

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'paypal_subscription_state';
const LEDGER_COLLECTION_ID = 'paypal_event_ledger';
const CHECKOUT_SESSION_COLLECTION_ID = 'billing_checkout_sessions';
const LEDGER_RETENTION_DAYS = 90;
const MAX_EVENT_TIMESTAMP_MS = 9999999999999;
const GRACE_PERIOD_HOURS = 48;
const GRACE_PERIOD_MS = GRACE_PERIOD_HOURS * 3600 * 1000;
const PROCESSING_RESERVATION_TTL_MS = 60 * 1000; // 60s lease for hard-crash / timeout recovery

// Verified Sandbox Plan IDs
const SANDBOX_PRO_PLAN_ID = 'P-62G07996SG1490118NKN6I3Q';
const SANDBOX_ULTIMATE_PLAN_ID = 'P-56D04005HN592501XNKN6I3Q';

const PLAN_MAPPINGS = Object.freeze({
  [SANDBOX_PRO_PLAN_ID]: 'pro',
  [SANDBOX_ULTIMATE_PLAN_ID]: 'premium',
});

const MAX_TRANSACTION_PAGE_FOLLOWS = 5;

const SUPPORTED_SUBSCRIPTION_EVENTS = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'PAYMENT.SALE.COMPLETED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.UPDATED',
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
]);

const LEDGER_ONLY_EVENTS = new Set([]);


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
    // Appwrite exposes bodyText as safe raw-body contract
  }

  try {
    if (typeof req?.body === 'string') return req.body;
    if (req?.body && typeof req.body === 'object') return JSON.stringify(req.body);
  } catch {
    // Legacy req.body fallback
  }

  return '';
}

function parseJsonBody(req) {
  const raw = rawBody(req);
  if (!raw || raw.length > 512 * 1024) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Provider API base resolver:
// Exactly 'sandbox' and 'production' are supported; missing/unknown fails closed.
function getPaypalApiBaseUrl(env = process.env) {
  const mode = normalizeProviderEnvironment(env?.PAYPAL_ACCESS_ENVIRONMENT);
  if (mode === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  if (mode === 'production') return 'https://api-m.paypal.com';
  return '';
}

function extractWebhookHeaders(req) {
  return {
    transmissionId: String(header(req, 'paypal-transmission-id') || '').trim(),
    transmissionTime: String(header(req, 'paypal-transmission-time') || '').trim(),
    certUrl: String(header(req, 'paypal-cert-url') || '').trim(),
    authAlgo: String(header(req, 'paypal-auth-algo') || '').trim(),
    transmissionSig: String(header(req, 'paypal-transmission-sig') || '').trim(),
  };
}

function validateWebhookHeaders(headers) {
  if (
    !headers.transmissionId ||
    !headers.transmissionTime ||
    !headers.certUrl ||
    !headers.authAlgo ||
    !headers.transmissionSig
  ) {
    return { ok: false, code: 'missing_webhook_headers' };
  }
  return { ok: true };
}

async function verifyWebhookSignatureWithPayPal(headers, eventBody, { env = process.env, customVerifier = null } = {}) {
  if (typeof customVerifier === 'function') {
    return customVerifier(headers, eventBody);
  }

  const baseUrl = getPaypalApiBaseUrl(env);
  if (!baseUrl) {
    return { ok: false, code: 'unconfigured_paypal_environment' };
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  const webhookId = String(env.PAYPAL_WEBHOOK_ID || '').trim();

  if (!clientId || !clientSecret || !webhookId) {
    return { ok: false, code: 'unconfigured_paypal_credentials' };
  }

  try {
    // 1. Obtain in-memory OAuth 2.0 access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      return { ok: false, code: 'oauth_token_failed' };
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) {
      return { ok: false, code: 'missing_access_token' };
    }

    // 2. Verify signature with PayPal verification endpoint
    const verifyRes = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: headers.transmissionId,
        transmission_time: headers.transmissionTime,
        cert_url: headers.certUrl,
        auth_algo: headers.authAlgo,
        transmission_sig: headers.transmissionSig,
        webhook_id: webhookId,
        webhook_event: eventBody,
      }),
    });

    if (!verifyRes.ok) {
      return { ok: false, code: 'verification_api_error' };
    }

    const verifyData = await verifyRes.json();
    if (verifyData?.verification_status === 'SUCCESS') {
      return { ok: true, status: 'SUCCESS' };
    }

    return { ok: false, code: 'signature_verification_failed', status: verifyData?.verification_status || 'FAILURE' };
  } catch {
    return { ok: false, code: 'verification_network_error' };
  }
}

function normalizeEvent(body) {
  const type = String(body?.event_type || '').trim().toUpperCase();
  const id = String(body?.id || '').trim();
  const createTime = String(body?.create_time || '').trim();
  const eventTimestampMs = Number(new Date(createTime || 0).getTime());
  const resource = body?.resource && typeof body.resource === 'object' ? body.resource : {};

  // For subscription events, resource.id is the subscription ID (I-...)
  // For payment/sale events, resource.billing_agreement_id is the subscription ID (I-...)
  let subscriptionId = '';
  if (type.startsWith('BILLING.SUBSCRIPTION.')) {
    subscriptionId = String(resource.id || '').trim();
  } else if (resource.billing_agreement_id) {
    subscriptionId = String(resource.billing_agreement_id).trim();
  }

  let paymentId = '';
  if (type === 'PAYMENT.SALE.COMPLETED') {
    paymentId = String(resource.id || '').trim();
  } else if (type === 'PAYMENT.SALE.REFUNDED') {
    // Strictly require resource.sale_id (the refunded sale transaction ID)
    paymentId = String(resource.sale_id || '').trim();
  } else if (type === 'PAYMENT.SALE.REVERSED') {
    // For PAYMENT.SALE.REVERSED, the resource is the Sale resource itself.
    // The reversed sale transaction ID is resource.id.
    paymentId = String(resource.id || '').trim();
  }

  const planId = String(resource.plan_id || '').trim();
  const customId = String(resource.custom_id || resource.custom || '').trim();
  const nextBillingTime = String(resource.billing_info?.next_billing_time || resource.next_billing_time || '').trim();
  const parentPaymentId = String(resource.parent_payment || '').trim();

  return {
    id,
    type,
    createTime,
    eventTimestampMs,
    subscriptionId,
    paymentId,
    parentPaymentId,
    planId,
    customId,
    nextBillingTime,
    resource,
    raw: body,
  };
}

function validateEvent(event) {
  if (!event.id) return { ok: false, code: 'missing_event_id' };
  if (!SUPPORTED_SUBSCRIPTION_EVENTS.has(event.type) && !LEDGER_ONLY_EVENTS.has(event.type)) {
    return { ok: false, code: 'unsupported_event_type' };
  }
  if (!Number.isSafeInteger(event.eventTimestampMs) || event.eventTimestampMs <= 0 || event.eventTimestampMs > MAX_EVENT_TIMESTAMP_MS) {
    return { ok: false, code: 'invalid_timestamp' };
  }
  if (event.type !== 'PAYMENT.SALE.REFUNDED' && event.type !== 'PAYMENT.SALE.REVERSED' && !event.subscriptionId) {
    return { ok: false, code: 'missing_subscription_id' };
  }
  return { ok: true };
}

function eventOrderingKey(event) {
  return `${String(event.eventTimestampMs).padStart(13, '0')}:${event.id}`;
}

function stateDocumentId(userId) {
  return `pps_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 29)}`;
}

function ledgerDocumentId(eventId) {
  return `ppe_${crypto.createHash('sha256').update(eventId).digest('hex').slice(0, 29)}`;
}

function retentionIso(nowMs) {
  return new Date(nowMs + LEDGER_RETENTION_DAYS * 86400000).toISOString();
}

function serverOnlyPermissions() { return []; }

async function findStateByUserId(databases, userId) {
  const result = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ]);
  return result.documents?.[0] || null;
}

async function findStateBySubscriptionId(databases, subscriptionId) {
  const result = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
    sdk.Query.equal('subscription_id', subscriptionId),
    sdk.Query.limit(1),
  ]);
  return result.documents?.[0] || null;
}

async function findLedger(databases, eventId) {
  try {
    return await databases.getDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocumentId(eventId));
  } catch (err) {
    if (err?.code === 404) return null;
    throw err;
  }
}

async function findStateByPaymentId(databases, paymentId) {
  if (!databases || !paymentId) return null;
  const result = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
    sdk.Query.equal('last_entitlement_payment_id', paymentId),
    sdk.Query.limit(2),
  ]);

  const docs = Array.isArray(result?.documents) ? result.documents : [];
  if (docs.length === 0) return null;
  if (docs.length > 1) {
    const err = new Error(`Ambiguous payment correlation: multiple states found for paymentId ${paymentId}`);
    err.code = 'ambiguous_payment_state_correlation';
    err.isTransient = false;
    err.status = 400;
    throw err;
  }

  const doc = docs[0];
  if (doc && doc.last_entitlement_payment_id === paymentId) return doc;
  return null;
}

async function findLedgerByPaymentId(databases, paymentId, eventType = null) {
  if (!databases || !paymentId) return null;
  const queries = [
    sdk.Query.equal('payment_id', paymentId),
    sdk.Query.limit(2),
  ];
  if (eventType) {
    queries.unshift(sdk.Query.equal('event_type', eventType));
  }
  const result = await databases.listDocuments(DB_ID, LEDGER_COLLECTION_ID, queries);

  const docs = Array.isArray(result?.documents) ? result.documents : [];
  if (docs.length === 0) return null;
  if (docs.length > 1) {
    const subs = new Set(docs.map(d => d.subscription_id).filter(Boolean));
    const users = new Set(docs.map(d => d.user_id).filter(Boolean));
    if (subs.size > 1 || users.size > 1) {
      const err = new Error(`Ambiguous payment correlation: multiple records found in ledger for paymentId ${paymentId}`);
      err.code = 'ambiguous_payment_ledger_correlation';
      err.isTransient = false;
      err.status = 400;
      throw err;
    }
  }

  const doc = docs[0];
  if (doc && doc.payment_id === paymentId && (!eventType || doc.event_type === eventType)) return doc;
  return null;
}

async function findRefundOrReversalTombstone(databases, paymentId, context = {}) {
  if (!databases || !paymentId) return null;
  const reversalDoc = await findLedgerByPaymentId(databases, paymentId, 'PAYMENT.SALE.REVERSED');
  const refundDoc = await findLedgerByPaymentId(databases, paymentId, 'PAYMENT.SALE.REFUNDED');

  const { subscriptionId, userId } = context;

  // Validate tombstone correlation identity against canonical context if provided:
  // Note: Environment isolation is enforced by the hard Sandbox runtime gate; paypal_event_ledger has no environment field.
  const validateTombstoneIdentity = (doc) => {
    if (!doc) return;
    if (subscriptionId && doc.subscription_id && doc.subscription_id !== subscriptionId) {
      const err = new Error(`Conflicting tombstone subscription identity for paymentId ${paymentId}: expected ${subscriptionId}, found ${doc.subscription_id}`);
      err.code = 'ambiguous_payment_ledger_correlation';
      err.isTransient = false;
      err.status = 400;
      throw err;
    }
    if (userId && doc.user_id && doc.user_id !== userId) {
      const err = new Error(`Conflicting tombstone user identity for paymentId ${paymentId}: expected ${userId}, found ${doc.user_id}`);
      err.code = 'ambiguous_payment_ledger_correlation';
      err.isTransient = false;
      err.status = 400;
      throw err;
    }
  };

  if (reversalDoc) validateTombstoneIdentity(reversalDoc);
  if (refundDoc) validateTombstoneIdentity(refundDoc);

  if (refundDoc && reversalDoc) {
    if ((refundDoc.subscription_id && reversalDoc.subscription_id && refundDoc.subscription_id !== reversalDoc.subscription_id) ||
        (refundDoc.user_id && reversalDoc.user_id && refundDoc.user_id !== reversalDoc.user_id)) {
      const err = new Error(`Ambiguous tombstone correlation: conflicting refund and reversal tombstones for paymentId ${paymentId}`);
      err.code = 'ambiguous_payment_ledger_correlation';
      err.isTransient = false;
      err.status = 400;
      throw err;
    }
  }

  const validReversal = (reversalDoc && reversalDoc.event_type === 'PAYMENT.SALE.REVERSED' && reversalDoc.payment_id === paymentId) ? reversalDoc : null;
  const validRefund = (refundDoc && refundDoc.event_type === 'PAYMENT.SALE.REFUNDED' && refundDoc.payment_id === paymentId) ? refundDoc : null;

  if (!validReversal && !validRefund) return null;

  return {
    reversal: validReversal,
    refund: validRefund,
  };
}

// Checkout session bridge for canonical correlation
async function findCheckoutSessionBySubscriptionId(databases, subscriptionId) {
  if (!databases || !subscriptionId) return null;
  const queriesToTry = [
    [sdk.Query.equal('provider_transaction_id', subscriptionId), sdk.Query.limit(1)],
    [sdk.Query.equal('checkout_reference', subscriptionId), sdk.Query.limit(1)],
    [sdk.Query.equal('session_key', subscriptionId), sdk.Query.limit(1)],
  ];
  for (const queries of queriesToTry) {
    try {
      const result = await databases.listDocuments(DB_ID, CHECKOUT_SESSION_COLLECTION_ID, queries);
      if (result?.documents?.[0]?.user_id) {
        return result.documents[0];
      }
    } catch {
      // Collection may not exist yet or index unavailable
    }
  }
  return null;
}

async function fetchSubscriptionDetails(subscriptionId, { env = process.env, customFetcher = null } = {}) {
  if (typeof customFetcher === 'function') {
    return customFetcher(subscriptionId);
  }

  const baseUrl = getPaypalApiBaseUrl(env);
  if (!baseUrl) return null;

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;

  try {
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      if (tokenRes.status >= 500 || tokenRes.status === 429) {
        const err = new Error(`PayPal OAuth token request failed transiently with status ${tokenRes.status}`);
        err.isTransient = true;
        err.status = tokenRes.status;
        throw err;
      }
      return null;
    }
    const tokenData = await tokenRes.json();
    const accessToken = tokenData?.access_token;
    if (!accessToken) return null;

    const subRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!subRes.ok) {
      if (subRes.status >= 500 || subRes.status === 429) {
        const err = new Error(`PayPal subscription GET failed transiently with status ${subRes.status}`);
        err.isTransient = true;
        err.status = subRes.status;
        throw err;
      }
      return null;
    }
    return await subRes.json();
  } catch (err) {
    if (err?.isTransient) throw err;
    if (err?.name === 'FetchError' || err?.name === 'TypeError' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
      const netErr = new Error(`PayPal API network failure: ${err.message}`);
      netErr.isTransient = true;
      throw netErr;
    }
    return null;
  }
}

async function fetchSubscriptionTransactions({
  subscriptionId,
  targetPaymentId,
  targetTimestampMs = null,
  startTimeMs = null,
  endTimeMs = null,
  nowMs = Date.now(),
  env = process.env,
  customTransactionsFetcher = null,
}) {
  if (typeof customTransactionsFetcher === 'function') {
    return customTransactionsFetcher({
      subscriptionId,
      targetPaymentId,
      targetTimestampMs,
      startTimeMs,
      endTimeMs,
      nowMs,
    });
  }

  if (!targetPaymentId) {
    const err = new Error('Missing target payment ID for Transactions API query');
    err.code = 'missing_target_payment_id';
    err.status = 400;
    throw err;
  }

  let startTime;
  let endTime;

  if (Number.isSafeInteger(startTimeMs) && startTimeMs > 0) {
    startTime = new Date(startTimeMs).toISOString();
    const resolvedEndMs = Number.isSafeInteger(endTimeMs) && endTimeMs > 0 ? endTimeMs : nowMs;
    endTime = new Date(resolvedEndMs).toISOString();
  } else {
    if (!Number.isSafeInteger(targetTimestampMs) || targetTimestampMs <= 0) {
      const err = new Error('Invalid target transaction timestamp for Transactions API query');
      err.code = 'invalid_target_timestamp';
      err.status = 400;
      throw err;
    }
    startTime = new Date(targetTimestampMs - 86400000).toISOString();
    endTime = new Date(nowMs).toISOString();
  }

  const baseUrl = getPaypalApiBaseUrl(env);
  if (!baseUrl) {
    const err = new Error('Unconfigured PayPal environment for Transactions API');
    err.code = 'unconfigured_paypal_environment';
    err.status = 500;
    throw err;
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const err = new Error('Unconfigured PayPal credentials for Transactions API');
    err.code = 'unconfigured_paypal_credentials';
    err.status = 500;
    throw err;
  }

  let accessToken;
  try {
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      const err = new Error(`PayPal OAuth token request failed transiently with status ${tokenRes.status}`);
      err.isTransient = tokenRes.status >= 500 || tokenRes.status === 429;
      err.status = tokenRes.status;
      throw err;
    }
    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token;
    if (!accessToken) {
      const err = new Error('Missing access token from PayPal OAuth response');
      err.code = 'missing_access_token';
      err.status = 502;
      err.isTransient = true;
      throw err;
    }
  } catch (err) {
    if (err?.isTransient) throw err;
    if (err?.name === 'FetchError' || err?.name === 'TypeError' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
      const netErr = new Error(`PayPal API network failure during OAuth: ${err.message}`);
      netErr.isTransient = true;
      throw netErr;
    }
    throw err;
  }

  let nextUrl = `${baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`;
  let pageFollows = 0;

  while (nextUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(nextUrl);
    } catch {
      const err = new Error('Invalid URL in PayPal Transactions API pagination');
      err.code = 'invalid_provider_pagination_link';
      err.status = 500;
      throw err;
    }

    if (parsedUrl.protocol !== 'https:') {
      const err = new Error('Insecure HTTP URL rejected in PayPal Transactions API pagination');
      err.code = 'invalid_provider_pagination_link';
      err.status = 500;
      throw err;
    }

    const expectedBaseUrl = new URL(baseUrl);
    if (parsedUrl.host !== expectedBaseUrl.host) {
      const err = new Error(`External host rejected in PayPal Transactions API pagination: ${parsedUrl.host}`);
      err.code = 'invalid_provider_pagination_link';
      err.status = 500;
      throw err;
    }

    const expectedPath = `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/transactions`;
    if (parsedUrl.pathname !== expectedPath) {
      const err = new Error(`Unexpected route in PayPal Transactions API pagination: ${parsedUrl.pathname}`);
      err.code = 'invalid_provider_pagination_link';
      err.status = 500;
      throw err;
    }

    let res;
    try {
      res = await fetch(nextUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      const netErr = new Error(`PayPal Transactions API network failure: ${err.message}`);
      netErr.isTransient = true;
      throw netErr;
    }

    if (!res.ok) {
      const err = new Error(`PayPal Transactions API failed with status ${res.status}`);
      err.isTransient = res.status >= 500 || res.status === 429;
      err.status = res.status;
      throw err;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      const err = new Error('Malformed JSON from PayPal Transactions API');
      err.code = 'malformed_transaction_response';
      err.status = 502;
      err.isTransient = true;
      throw err;
    }

    if (!data || typeof data !== 'object') {
      const err = new Error('Invalid response structure from PayPal Transactions API');
      err.code = 'malformed_transaction_response';
      err.status = 502;
      err.isTransient = true;
      throw err;
    }

    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const matched = transactions.find(t => String(t.id || '').trim() === String(targetPaymentId).trim());
    if (matched) {
      return { found: true, transaction: matched, raw: data };
    }

    const links = Array.isArray(data.links) ? data.links : [];
    const nextLink = links.find(l => l.rel === 'next' || l.rel === 'NEXT');

    if (!nextLink || !nextLink.href) {
      const totalPages = Number(data.total_pages);
      if (Number.isFinite(totalPages) && totalPages > 1 && (pageFollows + 1) < totalPages) {
        const err = new Error('Provider claims multiple transaction pages but omitted valid next link');
        err.code = 'missing_provider_pagination_link';
        err.status = 500;
        throw err;
      }
      return { found: false, transaction: null, raw: data };
    }

    pageFollows++;
    if (pageFollows >= MAX_TRANSACTION_PAGE_FOLLOWS) {
      const err = new Error(`Transactions API lookup reached safety bound of ${MAX_TRANSACTION_PAGE_FOLLOWS} page follows`);
      err.code = 'transaction_lookup_safety_limit_reached';
      err.status = 500;
      throw err;
    }

    nextUrl = nextLink.href;
  }

  return { found: false, transaction: null };
}

async function fetchSaleDetails(paymentId, {
  env = process.env,
  customFetcher = null,
} = {}) {
  if (typeof customFetcher === 'function') {
    return customFetcher(paymentId, { env });
  }

  if (!paymentId || typeof paymentId !== 'string' || !paymentId.trim()) {
    return null;
  }

  const cleanPaymentId = paymentId.trim();

  const baseUrl = getPaypalApiBaseUrl(env);
  if (!baseUrl) {
    const err = new Error('Unconfigured PayPal environment for Sale API');
    err.code = 'unconfigured_paypal_environment';
    err.status = 500;
    throw err;
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const err = new Error('Unconfigured PayPal credentials for Sale API');
    err.code = 'unconfigured_paypal_credentials';
    err.status = 500;
    throw err;
  }

  let accessToken;
  try {
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      if (tokenRes.status >= 500 || tokenRes.status === 429) {
        const err = new Error(`PayPal OAuth token request failed transiently with status ${tokenRes.status}`);
        err.isTransient = true;
        err.status = tokenRes.status;
        throw err;
      }
      return null;
    }
    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token;
    if (!accessToken) return null;
  } catch (err) {
    if (err?.isTransient) throw err;
    if (err?.name === 'FetchError' || err?.name === 'TypeError' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
      const netErr = new Error(`PayPal API network failure during OAuth: ${err.message}`);
      netErr.isTransient = true;
      throw netErr;
    }
    throw err;
  }

  let res;
  try {
    res = await fetch(`${baseUrl}/v1/payments/sale/${encodeURIComponent(cleanPaymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    const netErr = new Error(`PayPal Sale API network failure: ${err.message}`);
    netErr.isTransient = true;
    throw netErr;
  }

  if (!res.ok) {
    if (res.status >= 500 || res.status === 429) {
      const err = new Error(`PayPal Sale API failed transiently with status ${res.status}`);
      err.isTransient = true;
      err.status = res.status;
      throw err;
    }
    return null;
  }

  try {
    return await res.json();
  } catch {
    const err = new Error('Malformed JSON from PayPal Sale API');
    err.code = 'malformed_sale_response';
    err.status = 502;
    err.isTransient = true;
    throw err;
  }
}

async function cancelSubscriptionAtProvider(subscriptionId, {
  reason = 'Immediate refund closure',
  env = process.env,
  customCanceler = null,
} = {}) {
  if (typeof customCanceler === 'function') {
    return customCanceler(subscriptionId, { reason });
  }

  const baseUrl = getPaypalApiBaseUrl(env);
  if (!baseUrl) {
    const err = new Error('Unconfigured PayPal environment for subscription cancellation');
    err.code = 'unconfigured_paypal_environment';
    err.status = 500;
    throw err;
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    const err = new Error('Unconfigured PayPal credentials for subscription cancellation');
    err.code = 'unconfigured_paypal_credentials';
    err.status = 500;
    throw err;
  }

  let accessToken;
  try {
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenRes.ok) {
      const err = new Error(`PayPal OAuth token request failed transiently with status ${tokenRes.status}`);
      err.isTransient = tokenRes.status >= 500 || tokenRes.status === 429;
      err.status = tokenRes.status;
      throw err;
    }
    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token;
  } catch (err) {
    if (err?.isTransient) throw err;
    const netErr = new Error(`PayPal API network failure during cancel OAuth: ${err.message}`);
    netErr.isTransient = true;
    throw netErr;
  }

  try {
    const cancelRes = await fetch(`${baseUrl}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (cancelRes.ok || cancelRes.status === 204) {
      return { ok: true, status: 'canceled' };
    }

    if (cancelRes.status === 404 || cancelRes.status === 422) {
      const data = await cancelRes.json().catch(() => null);
      const isAlreadyCanceled = data?.name === 'SUBSCRIPTION_ALREADY_CANCELLED' ||
        /already cancelled|already canceled/i.test(data?.message || '');
      if (isAlreadyCanceled) {
        return { ok: true, status: 'already_canceled' };
      }
    }

    if (cancelRes.status >= 500 || cancelRes.status === 429) {
      const err = new Error(`PayPal cancel request failed transiently with status ${cancelRes.status}`);
      err.isTransient = true;
      err.status = cancelRes.status;
      throw err;
    }

    const data = await cancelRes.json().catch(() => null);
    const err = new Error(`PayPal cancel failed with status ${cancelRes.status}: ${data?.message || 'unknown'}`);
    err.code = 'cancel_request_failed';
    err.status = cancelRes.status;
    throw err;
  } catch (err) {
    if (err?.isTransient) throw err;
    if (err?.name === 'FetchError' || err?.name === 'TypeError' || err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT') {
      const netErr = new Error(`PayPal API network failure during cancel: ${err.message}`);
      netErr.isTransient = true;
      throw netErr;
    }
    throw err;
  }
}


async function resolveCanonicalUser({
  event,
  databases,
  users = null,
  previousState = null,
  env = process.env,
  subscriptionFetcher = null,
  getSubscriptionSnapshot = null,
}) {
  // 1. Existing paypal_subscription_state by subscription_id
  if (previousState?.user_id) {
    return previousState.user_id;
  }

  // 2. Existing server-owned billing checkout/session record
  try {
    const session = await findCheckoutSessionBySubscriptionId(databases, event.subscriptionId);
    if (session?.user_id) {
      if (users) {
        try {
          const user = await users.get(session.user_id);
          if (user?.$id) return user.$id;
        } catch {
          // Session points to non-existent Appwrite user
        }
      } else {
        return session.user_id;
      }
    }
  } catch {
    // Graceful fallback
  }

  // 3. Server-side PayPal GET /v1/billing/subscriptions/{subscriptionId}
  let subDetails = null;
  try {
    if (typeof getSubscriptionSnapshot === 'function') {
      subDetails = await getSubscriptionSnapshot();
    } else {
      subDetails = await fetchSubscriptionDetails(event.subscriptionId, { env, customFetcher: subscriptionFetcher });
    }
  } catch (err) {
    if (err?.isTransient) throw err;
  }
  const serverCustomId = String(subDetails?.custom_id || '').trim();
  if (serverCustomId) {
    if (users) {
      try {
        const user = await users.get(serverCustomId);
        if (user?.$id) return user.$id;
      } catch {
        // Not a valid Appwrite user
      }
    } else {
      return serverCustomId;
    }
  }

  // 4. Fallback: resource custom_id if present (validated with Appwrite users)
  if (event.customId) {
    if (users) {
      try {
        const user = await users.get(event.customId);
        if (user?.$id) return user.$id;
      } catch {
        // Not a valid Appwrite user
      }
    } else {
      return event.customId;
    }
  }

  // Never trust payer email or unverified identity
  return null;
}

function resolvePlanFromId(planId, env = process.env) {
  const rawId = String(planId || '').trim();
  if (!rawId) return null;

  const rawEnv = env?.PAYPAL_ACCESS_ENVIRONMENT !== undefined
    ? env.PAYPAL_ACCESS_ENVIRONMENT
    : (process.env.PAYPAL_ACCESS_ENVIRONMENT || 'sandbox');
  const environment = normalizeProviderEnvironment(rawEnv);
  if (!environment) return null;

  const sandboxPro = String(env?.BILLING_SANDBOX_PRO_PRICE_ID || SANDBOX_PRO_PLAN_ID).trim();
  const sandboxPremium = String(env?.BILLING_SANDBOX_PREMIUM_PRICE_ID || SANDBOX_ULTIMATE_PLAN_ID).trim();
  const prodPro = String(env?.BILLING_PRODUCTION_PRO_PRICE_ID || '').trim();
  const prodPremium = String(env?.BILLING_PRODUCTION_PREMIUM_PRICE_ID || '').trim();

  if (environment === 'production') {
    // Cross-environment isolation: reject Sandbox plan IDs in production
    if ((sandboxPro && rawId === sandboxPro) || (sandboxPremium && rawId === sandboxPremium)) {
      return null;
    }
    if (prodPro && rawId === prodPro) return 'pro';
    if (prodPremium && rawId === prodPremium) return 'premium';
    return null;
  }

  if (environment === 'sandbox') {
    // Cross-environment isolation: reject Production plan IDs in sandbox
    if ((prodPro && rawId === prodPro) || (prodPremium && rawId === prodPremium)) {
      return null;
    }
    if (sandboxPro && rawId === sandboxPro) return 'pro';
    if (sandboxPremium && rawId === sandboxPremium) return 'premium';
    return null;
  }

  return null;
}

function resolveAuthoritativeExpiry(event, subDetails) {
  // 1. Authoritative next_billing_time from trusted PayPal subscription snapshot
  const subBillingTime = subDetails?.billing_info?.next_billing_time;
  if (subBillingTime) {
    const parsed = new Date(subBillingTime).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return new Date(parsed).toISOString();
  }

  // 2. Authoritative nextBillingTime from event resource if present
  if (event.nextBillingTime) {
    const parsed = new Date(event.nextBillingTime).getTime();
    if (Number.isFinite(parsed) && parsed > 0) return new Date(parsed).toISOString();
  }

  // Under NO circumstances fabricate calendar durations (e.g. +30 days)
  return null;
}

function calculateExpiry(event, previousState, subDetails) {
  return resolveAuthoritativeExpiry(event, subDetails);
}

function hasActivePaidGrace(previousState, referenceTimeMs = Date.now()) {
  if (!previousState?.grace_period_expires_at) return false;
  const graceMs = new Date(previousState.grace_period_expires_at).getTime();
  return Number.isFinite(graceMs) && graceMs > referenceTimeMs;
}

// Conflict-aware reservation reclamation using Appwrite transactions:
// When an abandoned or failed reservation exists in `paypal_event_ledger`,
// competing recovery deliveries must NOT use deleteDocument + createDocument,
// because an interleaving processor could delete a newly-acquired lease.
// Conflict-aware reservation reclamation using Appwrite transactions:
// When an abandoned or failed reservation exists in `paypal_event_ledger`,
// competing recovery deliveries must NOT use un-versioned delete-create or non-transactional updates,
// because racing processors could overwrite or steal concurrent leases.
// Instead, reclamation strictly requires an Appwrite transaction (createTransaction):
// 1. Starts a database transaction with a 60-second TTL.
// 2. Reads the existing ledger document within transaction isolation.
// 3. Verifies the reservation is eligible for recovery (stale processing or failed).
// 4. Updates the ledger document in-place to 'processing' with fresh received_at inside the transaction.
// 5. Commits the transaction via updateTransaction(txId, true, false).
// If transaction primitives are unavailable or transaction creation fails, the processor
// fails closed with a retry-safe HTTP 503 infrastructure error without mutating ledger or provider state.
// If competing recovery deliveries race to reclaim the same reservation, Appwrite's transaction
// conflict detection guarantees that exactly ONE transaction can commit; the losing transaction
// receives HTTP 409 Conflict, rolls back, and halts safely without mutating state.
async function reclaimLedgerReservation(databases, ledgerDocId, payload, nowMs) {
  if (typeof databases?.createTransaction !== 'function') {
    const err = new Error('Database transaction primitive unavailable for concurrent reservation recovery');
    err.code = 'transaction_unavailable';
    err.status = 503;
    err.isTransient = true;
    throw err;
  }

  let transaction;
  try {
    transaction = await databases.createTransaction(60);
  } catch (err) {
    const txErr = new Error(`Database transaction creation failed: ${err?.message || 'unknown error'}`);
    txErr.code = 'transaction_creation_failed';
    txErr.status = 503;
    txErr.isTransient = true;
    throw txErr;
  }

  if (!transaction?.$id) {
    const txErr = new Error('Database transaction creation returned invalid transaction object');
    txErr.code = 'invalid_transaction';
    txErr.status = 503;
    txErr.isTransient = true;
    throw txErr;
  }

  let committed = false;
  try {
    const existing = await databases.getDocument(
      DB_ID,
      LEDGER_COLLECTION_ID,
      ledgerDocId,
      [],
      transaction.$id
    );

    if (!existing) {
      await databases.updateTransaction(transaction.$id, false, true);
      return { ok: false, reason: 'not_found' };
    }

    // Verify still eligible for reclamation inside the transaction
    const isReclaimableIgnored = existing.processing_status === 'ignored' &&
      (existing.outcome_code === 'different_subscription_ignored' || (existing.outcome_code === 'stale_event' && payload.event_type === 'PAYMENT.SALE.COMPLETED'));
    const isReclaimableRejectedCorrelation = existing.processing_status === 'rejected' &&
      existing.outcome_code === 'unresolved_subscription_correlation' &&
      (payload.event_type === 'PAYMENT.SALE.REFUNDED' || payload.event_type === 'PAYMENT.SALE.REVERSED') &&
      Boolean(payload.payment_id);
    if (existing.processing_status === 'processed' ||
        (existing.processing_status === 'ignored' && !isReclaimableIgnored) ||
        (existing.processing_status === 'rejected' && !isReclaimableRejectedCorrelation)) {
      await databases.updateTransaction(transaction.$id, false, true);
      return { ok: false, reason: 'already_recorded' };
    }

    if (existing.processing_status === 'processing') {
      const receivedAtMs = Date.parse(existing.received_at);
      const reservationAgeMs = Number.isFinite(receivedAtMs) ? Math.max(0, nowMs - receivedAtMs) : 0;
      if (reservationAgeMs < PROCESSING_RESERVATION_TTL_MS) {
        await databases.updateTransaction(transaction.$id, false, true);
        return { ok: false, reason: 'concurrent_processing' };
      }
    }

    await databases.updateDocument(
      DB_ID,
      LEDGER_COLLECTION_ID,
      ledgerDocId,
      payload,
      serverOnlyPermissions(),
      transaction.$id
    );

    await databases.updateTransaction(transaction.$id, true, false);
    committed = true;
    return { ok: true };
  } catch (err) {
    if (!committed) {
      try { await databases.updateTransaction(transaction.$id, false, true); } catch (_) {}
    }
    if (err?.code === 409 || /conflict/i.test(err?.message || '')) {
      return { ok: false, reason: 'conflict' };
    }
    throw err;
  }
}

async function upsertProviderState(databases, payload, previous) {
  const permissions = serverOnlyPermissions();
  if (previous) {
    return databases.updateDocument(DB_ID, STATE_COLLECTION_ID, previous.$id, payload, permissions);
  }
  return databases.createDocument(DB_ID, STATE_COLLECTION_ID, stateDocumentId(payload.user_id), payload, permissions);
}

async function processWebhookEvent({
  databases,
  users = null,
  event,
  nowMs = Date.now(),
  env = process.env,
  subscriptionFetcher = null,
  subscriptionTransactionsFetcher = null,
  subscriptionCanceler = null,
  saleFetcher = null,
}) {
  const validation = validateEvent(event);
  if (!validation.ok) {
    return { outcome: 'rejected', code: validation.code, mutated: false };
  }

  // Provider environment validation:
  // Exactly 'sandbox' and 'production' are supported. Missing or invalid environments fail closed!
  const selectedEnvironment = normalizeProviderEnvironment(env.PAYPAL_ACCESS_ENVIRONMENT);
  if (!selectedEnvironment || (selectedEnvironment !== 'sandbox' && selectedEnvironment !== 'production')) {
    return { outcome: 'rejected', code: 'unconfigured_paypal_environment', mutated: false };
  }

  const ledgerDocId = ledgerDocumentId(event.id);
  const nowIso = new Date(nowMs).toISOString();
  let wasReclaimedFromFailed = false;

  // Subscription snapshot cache (memoized: fetched at most once per webhook event)
  let cachedSubDetails = null;
  let cachedSubError = null;
  let subFetchAttempted = false;

  async function getSubscriptionSnapshot() {
    if (subFetchAttempted) {
      if (cachedSubError) throw cachedSubError;
      return cachedSubDetails;
    }
    subFetchAttempted = true;
    if (!event.subscriptionId) return null;
    try {
      cachedSubDetails = await fetchSubscriptionDetails(event.subscriptionId, {
        env,
        customFetcher: subscriptionFetcher,
      });
      return cachedSubDetails;
    } catch (err) {
      cachedSubError = err;
      throw err;
    }
  }

  // ATOMIC CONCURRENCY RESERVATION (Section 3):
  // Atomically claim the event identity in the ledger before state mutation.
  // The unique document ID and event_id index guarantee only ONE processor wins.
  try {
    await databases.createDocument(
      DB_ID,
      LEDGER_COLLECTION_ID,
      ledgerDocId,
      {
        event_id: event.id,
        event_type: event.type,
        user_id: null,
        subscription_id: event.subscriptionId || null,
        payment_id: event.paymentId || null,
        event_timestamp_ms: event.eventTimestampMs,
        received_at: nowIso,
        processing_status: 'processing',
        ordering_key: eventOrderingKey(event),
        outcome_code: 'in_progress',
        expires_at: retentionIso(nowMs),
      },
      serverOnlyPermissions()
    );
  } catch (err) {
    if (err?.code === 409 || /already exists/i.test(err?.message || '')) {
      // Document already exists! Determine status of existing reservation.
      const existing = await findLedger(databases, event.id);
      if (!existing) {
        return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
      }
      const isReclaimableIgnored = existing.processing_status === 'ignored' &&
        (existing.outcome_code === 'different_subscription_ignored' || (existing.outcome_code === 'stale_event' && event.type === 'PAYMENT.SALE.COMPLETED'));
      const isReclaimableRejectedCorrelation = existing.processing_status === 'rejected' &&
        existing.outcome_code === 'unresolved_subscription_correlation' &&
        (event.type === 'PAYMENT.SALE.REFUNDED' || event.type === 'PAYMENT.SALE.REVERSED') &&
        Boolean(event.paymentId);
      if (existing.processing_status === 'processed' ||
          (existing.processing_status === 'ignored' && !isReclaimableIgnored) ||
          (existing.processing_status === 'rejected' && !isReclaimableRejectedCorrelation)) {
        return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
      }
      if (existing.processing_status === 'processing') {
        const receivedAtMs = Date.parse(existing.received_at);
        const reservationAgeMs = Number.isFinite(receivedAtMs) ? Math.max(0, nowMs - receivedAtMs) : 0;
        if (reservationAgeMs < PROCESSING_RESERVATION_TTL_MS) {
          // Fresh reservation currently in-flight! Concurrent delivery must stop before state mutation.
          return { outcome: 'duplicate', code: 'concurrent_processing', mutated: false };
        }
        // Old abandoned processing reservation (hard process termination, timeout, or uncaught crash).
        // Conflict-aware conditional reclaim via Appwrite transaction.
        const reclaim = await reclaimLedgerReservation(databases, ledgerDocId, {
          event_id: event.id,
          event_type: event.type,
          user_id: existing.user_id || null,
          subscription_id: event.subscriptionId || null,
          payment_id: event.paymentId || existing.payment_id || null,
          event_timestamp_ms: event.eventTimestampMs,
          received_at: nowIso,
          processing_status: 'processing',
          ordering_key: eventOrderingKey(event),
          outcome_code: 'recovered_abandoned_reservation',
          expires_at: retentionIso(nowMs),
        }, nowMs);
        if (!reclaim.ok) {
          const code = reclaim.reason === 'already_recorded' ? 'already_recorded' : 'concurrent_processing';
          return { outcome: 'duplicate', code, mutated: false };
        }
      } else if (existing.processing_status === 'failed' || isReclaimableIgnored || isReclaimableRejectedCorrelation) {
        // Recoverable retry after a previous processor crashed or experienced transient failure,
        // or redelivery of an event that was previously ignored under different_subscription_ignored or stale_event.
        // Conflict-aware conditional reclaim via Appwrite transaction.
        const reclaim = await reclaimLedgerReservation(databases, ledgerDocId, {
          event_id: event.id,
          event_type: event.type,
          user_id: existing.user_id || null,
          subscription_id: event.subscriptionId || null,
          payment_id: event.paymentId || existing.payment_id || null,
          event_timestamp_ms: event.eventTimestampMs,
          received_at: nowIso,
          processing_status: 'processing',
          ordering_key: eventOrderingKey(event),
          outcome_code: 'in_progress_retry',
          expires_at: retentionIso(nowMs),
        }, nowMs);
        if (!reclaim.ok) {
          const code = reclaim.reason === 'already_recorded' ? 'already_recorded' : 'concurrent_processing';
          return { outcome: 'duplicate', code, mutated: false };
        }
        if (existing.processing_status === 'failed') {
          wasReclaimedFromFailed = true;
        }
      } else {
        return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
      }
    } else {
      throw err;
    }
  }

  // Strict payment ID normalization check (Blocker E):
  // PAYMENT.SALE.REFUNDED requires resource.sale_id and PAYMENT.SALE.REVERSED requires resource.id (sale transaction ID).
  // resource.parent_payment is captured as non-entitlement parent Payment reference metadata only.
  // If absent, do not attempt to guess or fall back to arbitrary IDs. Fail closed safely.
  if ((event.type === 'PAYMENT.SALE.REFUNDED' || event.type === 'PAYMENT.SALE.REVERSED') && !event.paymentId) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      processing_status: 'rejected',
      outcome_code: 'unresolved_payment_correlation',
    }, serverOnlyPermissions()).catch(() => {});
    return { outcome: 'rejected', code: 'unresolved_payment_correlation', mutated: false };
  }

  // Find previous state by subscription ID or user
  let previous = null;

  // For refunds and reversals, if subscriptionId was not in event, correlate from paymentId
  if ((event.type === 'PAYMENT.SALE.REFUNDED' || event.type === 'PAYMENT.SALE.REVERSED') && !event.subscriptionId) {
    let matchedState = null;
    try {
      matchedState = await findStateByPaymentId(databases, event.paymentId);
    } catch (err) {
      if (err?.code === 'ambiguous_payment_state_correlation') {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          processing_status: 'rejected',
          outcome_code: 'ambiguous_payment_state_correlation',
        }, serverOnlyPermissions()).catch(() => {});
        return { outcome: 'rejected', code: 'ambiguous_payment_state_correlation', mutated: false };
      }
      throw err;
    }

    if (matchedState?.subscription_id) {
      event.subscriptionId = matchedState.subscription_id;
      previous = matchedState;
    } else {
      let matchedLedger = null;
      try {
        matchedLedger = await findLedgerByPaymentId(databases, event.paymentId, 'PAYMENT.SALE.COMPLETED');
      } catch (err) {
        if (err?.code === 'ambiguous_payment_ledger_correlation') {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'rejected',
            outcome_code: 'ambiguous_payment_ledger_correlation',
          }, serverOnlyPermissions()).catch(() => {});
          return { outcome: 'rejected', code: 'ambiguous_payment_ledger_correlation', mutated: false };
        }
        throw err;
      }
      if (matchedLedger?.subscription_id) {
        event.subscriptionId = matchedLedger.subscription_id;
      }
    }

    // Step 3: If neither resolved the subscription, perform authoritative provider Sale lookup using event.paymentId
    if (!event.subscriptionId) {
      let sale = null;
      try {
        sale = await fetchSaleDetails(event.paymentId, {
          env,
          customFetcher: saleFetcher,
        });
      } catch (err) {
        if (err?.isTransient) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'failed',
            outcome_code: 'transient_paypal_fetch_failure',
          }, serverOnlyPermissions()).catch(() => {});
          throw err;
        }
        throw err;
      }

      if (sale) {
        const returnedSaleId = String(sale.id || '').trim();
        const saleSubId = String(sale.billing_agreement_id || '').trim();
        const saleCustom = String(sale.custom_id || sale.custom || '').trim();

        // 4. Validate sale.id === event.paymentId
        if (returnedSaleId !== event.paymentId) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'rejected',
            outcome_code: 'unresolved_subscription_correlation',
          }, serverOnlyPermissions()).catch(() => {});
          return { outcome: 'rejected', code: 'unresolved_subscription_correlation', mutated: false };
        }

        // 5. Extract and validate billing_agreement_id (must exist and match I-...)
        if (!saleSubId || !saleSubId.startsWith('I-')) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'rejected',
            outcome_code: 'unresolved_subscription_correlation',
          }, serverOnlyPermissions()).catch(() => {});
          return { outcome: 'rejected', code: 'unresolved_subscription_correlation', mutated: false };
        }

        // Phase D: Custom ID is cross-check only. If both exist and conflict: FAIL CLOSED
        if (event.customId && saleCustom && event.customId !== saleCustom) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'rejected',
            outcome_code: 'correlation_identity_conflict',
          }, serverOnlyPermissions()).catch(() => {});
          return { outcome: 'rejected', code: 'correlation_identity_conflict', mutated: false };
        }

        // 6. Assign event.subscriptionId
        event.subscriptionId = saleSubId;

        // 7. Load previous state
        previous = await findStateBySubscriptionId(databases, event.subscriptionId);

        // After state is found, if non-empty trusted custom conflicts with previous.user_id: FAIL CLOSED
        const trustedCustom = event.customId || saleCustom;
        if (previous?.user_id && trustedCustom && previous.user_id !== trustedCustom) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            processing_status: 'rejected',
            outcome_code: 'correlation_identity_conflict',
          }, serverOnlyPermissions()).catch(() => {});
          return { outcome: 'rejected', code: 'correlation_identity_conflict', mutated: false };
        }
      }
    }
  }

  if (!event.subscriptionId) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      processing_status: 'rejected',
      outcome_code: 'unresolved_subscription_correlation',
    }, serverOnlyPermissions()).catch(() => {});
    return { outcome: 'rejected', code: 'unresolved_subscription_correlation', mutated: false };
  }

  if (!previous) {
    previous = await findStateBySubscriptionId(databases, event.subscriptionId);
  }

  // Canonical user correlation (Section 1: state -> checkout session -> PayPal GET -> validate)
  let userId = null;
  try {
    userId = await resolveCanonicalUser({
      event,
      databases,
      users,
      previousState: previous,
      env,
      subscriptionFetcher,
      getSubscriptionSnapshot,
    });
  } catch (err) {
    if (err?.isTransient) {
      await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
        processing_status: 'failed',
        outcome_code: 'transient_paypal_fetch_failure',
      }, serverOnlyPermissions()).catch(() => {});
      throw err;
    }
    throw err;
  }

  if (!userId) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      processing_status: 'rejected',
      outcome_code: 'unresolved_user_correlation',
    }, serverOnlyPermissions());
    return { outcome: 'rejected', code: 'unresolved_user_correlation', mutated: false };
  }

  // SANDBOX QA MUTATION BOUNDARY:
  // State mutation is restricted to configured QA user ONLY in sandbox.
  // In production, BILLING_CHECKOUT_QA_USER_ID is strictly NOT required.
  if (selectedEnvironment === 'sandbox') {
    const qaUserId = String(env.BILLING_CHECKOUT_QA_USER_ID || getEnv('BILLING_CHECKOUT_QA_USER_ID') || '').trim();
    if (!qaUserId || userId !== qaUserId) {
      const outcomeCode = !qaUserId ? 'missing_qa_user_config' : 'sandbox_qa_boundary_rejected';
      await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
        user_id: userId,
        processing_status: 'ignored',
        outcome_code: outcomeCode,
      }, serverOnlyPermissions());
      return { outcome: 'ignored', code: outcomeCode, mutated: false };
    }
  }

  // Previous-state discovery:
  // A. findStateBySubscriptionId(event.subscriptionId) was attempted first.
  // B. If previous is still missing, attempt findStateByUserId(userId).
  // C. If still missing, attempt direct server-owned getDocument using stateDocumentId(userId).
  let candidateState = previous;
  if (!candidateState) {
    candidateState = await findStateByUserId(databases, userId);
    if (!candidateState) {
      try {
        candidateState = await databases.getDocument(DB_ID, STATE_COLLECTION_ID, stateDocumentId(userId));
      } catch (err) {
        if (err?.code !== 404 && !/not found/i.test(err?.message || '')) throw err;
      }
    }
  }

  // D. Subscription identity guard:
  // Require: user_id === canonical userId, subscription_id === event.subscriptionId, environment === selectedEnvironment
  if (candidateState) {
    const isSameUser = String(candidateState.user_id || '').trim() === String(userId).trim();
    const isSameSub = String(candidateState.subscription_id || '').trim() === String(event.subscriptionId).trim();
    const isSameEnv = normalizeProviderEnvironment(candidateState.environment) === selectedEnvironment;

    if (isSameUser && isSameSub && isSameEnv) {
      previous = candidateState;
    } else {
      previous = null;
      // If subscription IDs differ:
      // A new subscription is allowed to supersede a prior subscription ONLY if:
      // 1. The prior state is not active (e.g. canceled, expired, suspended), OR
      // 2. The user is transitioning environments (e.g. sandbox QA state replaced by production subscription)
      // AND the incoming event is a subscription start/payment event (ACTIVATED or PAYMENT.SALE.COMPLETED).
      if (!isSameSub) {
        const isActivationOrPayment = event.type === 'BILLING.SUBSCRIPTION.ACTIVATED' || event.type === 'PAYMENT.SALE.COMPLETED';
        const isPriorStateInactive = !candidateState.status || candidateState.status !== 'active';
        const canSupersede = isSameUser && isActivationOrPayment && (!isSameEnv || isPriorStateInactive);

        if (canSupersede) {
          // Valid new subscription superseding prior inactive state or migrating across environments.
          // Reuse candidateState.$id so upsertProviderState updates the existing user document,
          // but do NOT inherit the prior subscription's plan/status/grace period.
          previous = {
            $id: candidateState.$id,
            user_id: candidateState.user_id,
            latest_event_timestamp_ms: candidateState.latest_event_timestamp_ms,
          };
        } else {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'ignored',
            outcome_code: 'different_subscription_ignored',
          }, serverOnlyPermissions());
          return { outcome: 'ignored', code: 'different_subscription_ignored', mutated: false };
        }
      } else {
        // If user or environment mismatches, record state_identity_mismatch_ignored and do NOT mutate state
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'ignored',
          outcome_code: 'state_identity_mismatch_ignored',
        }, serverOnlyPermissions());
        return { outcome: 'ignored', code: 'state_identity_mismatch_ignored', mutated: false };
      }
    }
  } else {
    previous = null;
  }

  // STALE & EQUAL-TIMESTAMP ORDERING RULES (Section 5):
  const previousTimestamp = Number(previous?.latest_event_timestamp_ms || -1);
  if (previous) {
    // 1. Strictly older event -> stale
    if (event.eventTimestampMs < previousTimestamp) {
      // EXCEPTION: Initial payment on pending_initial_payment.
      // PayPal generates PAYMENT.SALE.COMPLETED slightly before (or concurrently with) ACTIVATED,
      // so if ACTIVATED is recorded first, the initial payment timestamp is slightly older.
      // This authoritative initial payment must be allowed to transition pending_initial_payment to active.
      const isInitialPaymentOnPending = event.type === 'PAYMENT.SALE.COMPLETED' && previous.status === 'pending_initial_payment';
      const isRefundOrReversal = event.type === 'PAYMENT.SALE.REFUNDED' || event.type === 'PAYMENT.SALE.REVERSED';
      if (!isInitialPaymentOnPending && !isRefundOrReversal) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'ignored',
          outcome_code: 'stale_event',
        }, serverOnlyPermissions());
        return { outcome: 'ignored', code: 'stale_event', mutated: false };
      }
    }

    // 2. Equal timestamp tie-break rule:
    // An equal-timestamp event that would regress or elevate entitlement without a verified payment must NOT mutate state.
    if (event.eventTimestampMs === previousTimestamp) {
      const isPaymentCompletion = event.type === 'PAYMENT.SALE.COMPLETED';
      const isPreviousNotActive = previous.status !== 'active';
      const isRefundCancellationRetry =
        event.type === 'PAYMENT.SALE.REFUNDED' &&
        previous.renewal_cancellation_pending === true &&
        (previous.expires_at === null || previous.expires_at === undefined) &&
        wasReclaimedFromFailed === true &&
        previous.latest_event_id === event.id;

      const allowEqualTimestampMutation = (isPaymentCompletion && isPreviousNotActive) || isRefundCancellationRetry;

      if (!allowEqualTimestampMutation) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'ignored',
          outcome_code: 'equal_timestamp_ignored',
        }, serverOnlyPermissions());
        return { outcome: 'ignored', code: 'equal_timestamp_ignored', mutated: false };
      }
    }
  }

  // For SALE.COMPLETED (or if plan is not in event or previous), obtain trusted subscription snapshot
  let subDetails = null;
  if (event.type === 'PAYMENT.SALE.COMPLETED' || (!event.planId && !previous?.plan_id)) {
    try {
      subDetails = await getSubscriptionSnapshot();
    } catch (err) {
      if (err?.isTransient) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'failed',
          outcome_code: 'transient_paypal_fetch_failure',
        }, serverOnlyPermissions()).catch(() => {});
        throw err;
      }
    }
  }

  // Plan ID resolution and validation:
  // Precedence: explicit event planId -> server-side PayPal snapshot plan_id -> previous state plan_id
  const effectivePlanId = event.planId || subDetails?.plan_id || previous?.plan_id;
  const resolvedPlan = resolvePlanFromId(effectivePlanId, env);

  // Validate plan for events with plan ID
  if ((event.type === 'BILLING.SUBSCRIPTION.ACTIVATED' || event.type === 'PAYMENT.SALE.COMPLETED') && !resolvedPlan) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      user_id: userId,
      processing_status: 'rejected',
      outcome_code: 'unknown_plan_id',
    }, serverOnlyPermissions());
    return { outcome: 'rejected', code: 'unknown_plan_id', mutated: false };
  }

  if (event.type === 'BILLING.SUBSCRIPTION.UPDATED' && event.planId && !resolvePlanFromId(event.planId, env)) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      user_id: userId,
      processing_status: 'rejected',
      outcome_code: 'unknown_plan_id',
    }, serverOnlyPermissions());
    return { outcome: 'rejected', code: 'unknown_plan_id', mutated: false };
  }

  const basePlan = resolvedPlan || previous?.plan || 'pro';
  const stateUpdate = {
    user_id: userId,
    plan: basePlan,
    subscription_id: event.subscriptionId,
    plan_id: effectivePlanId || previous?.plan_id || '',
    environment: selectedEnvironment,
    status: previous?.status || 'pending_initial_payment',
    expires_at: previous?.expires_at || null,
    will_renew: previous?.will_renew !== undefined ? previous.will_renew : true,
    grace_period_expires_at: previous?.grace_period_expires_at || null,
    last_entitlement_payment_id: previous?.last_entitlement_payment_id || null,
    last_entitlement_payment_ts_ms: previous?.last_entitlement_payment_ts_ms || null,
    renewal_cancellation_pending: Boolean(previous?.renewal_cancellation_pending),
    latest_event_id: event.id,
    latest_event_type: event.type,
    latest_event_timestamp_ms: Math.max(event.eventTimestampMs, previousTimestamp),
    updated_at: new Date(nowMs).toISOString(),
  };

  switch (event.type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      // CRITICAL: ACTIVATED alone grants NO paid entitlement.
      // If this same subscription was already verified active by payment, preserve active state.
      if (previous?.status === 'active' && previous.subscription_id === event.subscriptionId) {
        stateUpdate.status = previous.status;
        stateUpdate.will_renew = previous.will_renew !== undefined ? previous.will_renew : true;
        stateUpdate.expires_at = previous.expires_at;
      } else {
        stateUpdate.status = 'pending_initial_payment';
        stateUpdate.will_renew = true;
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.expires_at = null;
      }
      break;

    case 'PAYMENT.SALE.COMPLETED': {
      // 14. REFUND / REVERSAL BEFORE SALE (TOMBSTONE CHECK):
      if (event.paymentId) {
        let tombstones = null;
        try {
          tombstones = await findRefundOrReversalTombstone(databases, event.paymentId, {
            subscriptionId: event.subscriptionId,
            userId,
          });
        } catch (tombErr) {
          if (tombErr?.code === 'ambiguous_payment_ledger_correlation') {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'rejected',
              outcome_code: 'ambiguous_payment_ledger_correlation',
            }, serverOnlyPermissions()).catch(() => {});
            return { outcome: 'rejected', code: 'ambiguous_payment_ledger_correlation', mutated: false };
          }

          // Infrastructure, schema/index missing, or unexpected errors -> fail closed as retryable 503
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'failed',
            outcome_code: 'tombstone_lookup_failed',
          }, serverOnlyPermissions()).catch(() => {});
          tombErr.isTransient = true;
          tombErr.status = 503;
          throw tombErr;
        }

        if (tombstones) {
          // BLOCKER C: Reversal precedence over refund
          // If a verified PAYMENT.SALE.REVERSED tombstone exists in the ledger,
          // it is authoritative reversal evidence on its own without querying Transactions API.
          if (tombstones.reversal) {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'ignored',
              outcome_code: 'sale_already_refunded',
            }, serverOnlyPermissions());
            return { outcome: 'ignored', code: 'sale_already_refunded', mutated: false };
          }

          // BLOCKER B: Refund tombstone eventual consistency
          if (tombstones.refund) {
            let txResult;
            try {
              txResult = await fetchSubscriptionTransactions({
                subscriptionId: event.subscriptionId,
                targetPaymentId: event.paymentId,
                targetTimestampMs: event.eventTimestampMs,
                nowMs,
                env,
                customTransactionsFetcher: subscriptionTransactionsFetcher,
              });
            } catch (err) {
              if (err?.isTransient) {
                await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
                  user_id: userId,
                  processing_status: 'failed',
                  outcome_code: 'transient_paypal_fetch_failure',
                }, serverOnlyPermissions()).catch(() => {});
              }
              throw err;
            }

            if (!txResult || !txResult.found) {
              const err = new Error('Target transaction not found in Transactions API during tombstone verification');
              err.code = 'missing_transaction';
              err.status = 502;
              err.isTransient = true;
              await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
                user_id: userId,
                processing_status: 'failed',
                outcome_code: 'missing_transaction',
              }, serverOnlyPermissions()).catch(() => {});
              throw err;
            }

            const txStatus = String(txResult.transaction?.status || '').toUpperCase();
            if (txStatus === 'REFUNDED') {
              await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
                user_id: userId,
                processing_status: 'ignored',
                outcome_code: 'sale_already_refunded',
              }, serverOnlyPermissions());
              return { outcome: 'ignored', code: 'sale_already_refunded', mutated: false };
            }

            if (txStatus === 'PARTIALLY_REFUNDED') {
              // Partial refund preserves entitlement and renewals; proceed to normal sale activation
            } else if (txStatus === 'COMPLETED') {
              // Eventual consistency race: verified refund tombstone exists in ledger, but Transactions API has not converged yet.
              // Fail closed with retryable 503 to wait for provider status convergence.
              const err = new Error('Provider transaction status has not converged (reports COMPLETED despite refund tombstone)');
              err.code = 'provider_state_not_converged';
              err.status = 503;
              err.isTransient = true;
              await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
                user_id: userId,
                processing_status: 'failed',
                outcome_code: 'provider_state_not_converged',
              }, serverOnlyPermissions()).catch(() => {});
              throw err;
            } else {
              // PENDING / FAILED / DECLINED / malformed / unknown
              const err = new Error(`Provider transaction status unsupported or not ready for activation: ${txStatus}`);
              err.code = 'unsupported_provider_transaction_status';
              err.status = 502;
              err.isTransient = true;
              await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
                user_id: userId,
                processing_status: 'failed',
                outcome_code: 'unsupported_provider_transaction_status',
              }, serverOnlyPermissions()).catch(() => {});
              throw err;
            }
          }
        }
      }

      // 20. PAYMENT WHILE CANCELLATION PENDING:
      if (previous?.renewal_cancellation_pending === true) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'ignored',
          outcome_code: 'unexpected_payment_during_cancellation_pending',
        }, serverOnlyPermissions());
        return {
          outcome: 'ignored',
          code: 'unexpected_payment_during_cancellation_pending',
          mutated: false,
          flag: 'UNEXPECTED_PAYMENT_DURING_REFUND_CLOSURE = OWNER/OPERATIONS_REVIEW_REQUIRED',
        };
      }

      // Authoritative paid boundary must come from trusted PayPal state:
      const authoritativeExpiry = resolveAuthoritativeExpiry(event, subDetails);
      if (!authoritativeExpiry) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'rejected',
          outcome_code: 'missing_authoritative_expiry',
        }, serverOnlyPermissions());
        return { outcome: 'rejected', code: 'missing_authoritative_expiry', mutated: false };
      }
      // Verified successful payment grants/renews active entitlement
      stateUpdate.status = 'active';
      stateUpdate.will_renew = true;
      stateUpdate.grace_period_expires_at = null;
      stateUpdate.expires_at = authoritativeExpiry;
      stateUpdate.last_entitlement_payment_id = event.paymentId;
      stateUpdate.last_entitlement_payment_ts_ms = event.eventTimestampMs;
      stateUpdate.renewal_cancellation_pending = false;
      break;
    }

    case 'PAYMENT.SALE.REFUNDED': {
      // 1. RETRY / REDELIVERY FLOW (Blocker A):
      // If cancellation is already pending from a prior attempt of this full refund:
      if (previous?.renewal_cancellation_pending === true) {
        let currentSubDetails = null;
        try {
          currentSubDetails = await getSubscriptionSnapshot();
        } catch (err) {
          if (err?.isTransient) {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'failed',
              outcome_code: 'provider_cancellation_pending_retry',
            }, serverOnlyPermissions()).catch(() => {});
            err.status = 503;
            throw err;
          }
          throw err;
        }

        const isAlreadyCanceled = String(currentSubDetails?.status || '').toUpperCase() === 'CANCELLED';
        if (isAlreadyCanceled) {
          stateUpdate.status = 'canceled';
          stateUpdate.will_renew = false;
          stateUpdate.renewal_cancellation_pending = false;
          stateUpdate.expires_at = null;
          stateUpdate.grace_period_expires_at = null;
          await upsertProviderState(databases, stateUpdate, previous);
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'processed',
            outcome_code: 'refund_and_cancellation_settled',
          }, serverOnlyPermissions());
          return {
            outcome: 'processed',
            code: 'refund_and_cancellation_settled',
            mutated: true,
            plan: stateUpdate.plan,
            status: stateUpdate.status,
            effectivePlan: 'free',
          };
        }

        // If still active at provider, retry cancellation
        try {
          await cancelSubscriptionAtProvider(event.subscriptionId, {
            reason: 'Immediate refund closure retry',
            env,
            customCanceler: subscriptionCanceler,
          });
          stateUpdate.status = 'canceled';
          stateUpdate.will_renew = false;
          stateUpdate.renewal_cancellation_pending = false;
          stateUpdate.expires_at = null;
          stateUpdate.grace_period_expires_at = null;
          await upsertProviderState(databases, stateUpdate, previous);
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'processed',
            outcome_code: 'refund_and_cancellation_settled',
          }, serverOnlyPermissions());
          return {
            outcome: 'processed',
            code: 'refund_and_cancellation_settled',
            mutated: true,
            plan: stateUpdate.plan,
            status: stateUpdate.status,
            effectivePlan: 'free',
          };
        } catch (cancelErr) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'failed',
            outcome_code: 'provider_cancellation_pending_retry',
          }, serverOnlyPermissions()).catch(() => {});
          cancelErr.isTransient = true;
          cancelErr.status = 503;
          throw cancelErr;
        }
      }

      // 2. FIRST DELIVERY FLOW:
      // HISTORICAL REFUND QUERY WINDOW:
      let targetPaymentTimestamp = null;
      let isLegacyMigration = false;
      let legacyStartTimeMs = null;

      if (previous?.last_entitlement_payment_id && event.paymentId === previous.last_entitlement_payment_id) {
        // CASE A: Current entitlement payment
        targetPaymentTimestamp = Number(previous.last_entitlement_payment_ts_ms);
      } else {
        // CASE B: Historical payment or state lacking payment ID - lookup historical sale in ledger
        const historicalSale = await findLedgerByPaymentId(databases, event.paymentId, 'PAYMENT.SALE.COMPLETED');
        if (historicalSale && Number.isSafeInteger(Number(historicalSale.event_timestamp_ms))) {
          targetPaymentTimestamp = Number(historicalSale.event_timestamp_ms);
        }
      }

      // CASE C: True Legacy Migration-on-Touch
      // If previous state lacks payment identity and no historical sale ledger has payment_id:
      if ((!targetPaymentTimestamp || !Number.isSafeInteger(targetPaymentTimestamp) || targetPaymentTimestamp <= 0) && !previous?.last_entitlement_payment_id) {
        // 1. Require canonical subscription ID
        if (!event.subscriptionId) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'ignored',
            outcome_code: 'unresolved_legacy_payment_correlation',
          }, serverOnlyPermissions());
          return { outcome: 'ignored', code: 'unresolved_legacy_payment_correlation', mutated: false };
        }

        // 2 & 3. Fetch authoritative subscription snapshot and validate provider subscription
        let subSnapshot = null;
        try {
          subSnapshot = await getSubscriptionSnapshot();
        } catch (err) {
          if (err?.isTransient) {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'failed',
              outcome_code: 'transient_paypal_fetch_failure',
            }, serverOnlyPermissions()).catch(() => {});
          }
          throw err;
        }

        const providerSubId = String(subSnapshot?.id || '').trim();
        if (!providerSubId || providerSubId !== event.subscriptionId) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'ignored',
            outcome_code: 'unresolved_legacy_payment_correlation',
          }, serverOnlyPermissions());
          return { outcome: 'ignored', code: 'unresolved_legacy_payment_correlation', mutated: false };
        }

        // 4. Extract and validate provider start_time
        const rawStartTime = subSnapshot?.start_time;
        const parsedStartMs = Date.parse(rawStartTime || '');
        if (!Number.isSafeInteger(parsedStartMs) || parsedStartMs <= 0) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'ignored',
            outcome_code: 'unresolved_legacy_payment_correlation',
          }, serverOnlyPermissions());
          return { outcome: 'ignored', code: 'unresolved_legacy_payment_correlation', mutated: false };
        }

        isLegacyMigration = true;
        legacyStartTimeMs = parsedStartMs;
      }

      // CASE D: If still no authoritative payment timestamp and NOT a legacy migration -> FAIL CLOSED
      if (!isLegacyMigration && (!targetPaymentTimestamp || !Number.isSafeInteger(targetPaymentTimestamp) || targetPaymentTimestamp <= 0)) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'ignored',
          outcome_code: 'unresolved_historical_payment_timestamp',
        }, serverOnlyPermissions());
        return { outcome: 'ignored', code: 'unresolved_historical_payment_timestamp', mutated: false };
      }

      let txResult;
      try {
        txResult = await fetchSubscriptionTransactions({
          subscriptionId: event.subscriptionId,
          targetPaymentId: event.paymentId,
          targetTimestampMs: isLegacyMigration ? null : targetPaymentTimestamp,
          startTimeMs: isLegacyMigration ? legacyStartTimeMs : null,
          endTimeMs: isLegacyMigration ? nowMs : null,
          nowMs,
          env,
          customTransactionsFetcher: subscriptionTransactionsFetcher,
        });
      } catch (err) {
        if (err?.isTransient) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'failed',
            outcome_code: 'transient_paypal_fetch_failure',
          }, serverOnlyPermissions()).catch(() => {});
        }
        throw err;
      }

      if (!txResult || !txResult.found) {
        const err = new Error('Target transaction not found in PayPal Transactions API');
        err.code = 'missing_transaction';
        err.status = 502;
        err.isTransient = true;
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'failed',
          outcome_code: 'missing_transaction',
        }, serverOnlyPermissions()).catch(() => {});
        throw err;
      }

      const tx = txResult.transaction;
      const txStatus = String(tx?.status || '').toUpperCase();

      // BLOCKER B: Unconverged provider states (COMPLETED or PENDING) must fail closed as retryable 503
      if (txStatus === 'COMPLETED' || txStatus === 'PENDING') {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'failed',
          outcome_code: 'provider_state_not_converged',
        }, serverOnlyPermissions()).catch(() => {});
        const err = new Error(`Provider transaction status has not converged to REFUNDED (reports ${txStatus})`);
        err.code = 'provider_state_not_converged';
        err.isTransient = true;
        err.status = 503;
        throw err;
      }

      // PARTIALLY_REFUNDED: Preserve entitlement and renewal without local arithmetic
      if (txStatus === 'PARTIALLY_REFUNDED') {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'processed',
          outcome_code: 'partial_refund_recorded',
        }, serverOnlyPermissions());
        return { outcome: 'processed', code: 'partial_refund_recorded', mutated: false };
      }

      // BLOCKER B: Unexpected / unknown provider transaction status must FAIL CLOSED (retryable 502, not 2xx-ignored)
      if (txStatus !== 'REFUNDED') {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'failed',
          outcome_code: 'unsupported_provider_transaction_status',
        }, serverOnlyPermissions()).catch(() => {});
        const err = new Error(`Unsupported provider transaction status: ${txStatus}`);
        err.code = 'unsupported_provider_transaction_status';
        err.isTransient = true;
        err.status = 502;
        throw err;
      }

      // BLOCKER C: Historical refund check MUST NOT trust provider tx.time for historical ordering.
      // Use authoritative targetPaymentTimestamp from state or historical ledger.
      if (previous?.last_entitlement_payment_id && previous.last_entitlement_payment_id !== event.paymentId) {
        const prevPaymentMs = Number(previous.last_entitlement_payment_ts_ms || 0);
        if (Number.isSafeInteger(prevPaymentMs) && prevPaymentMs > 0 &&
            Number.isSafeInteger(targetPaymentTimestamp) && targetPaymentTimestamp > 0 &&
            prevPaymentMs > targetPaymentTimestamp) {
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'processed',
            outcome_code: 'historical_refund_ignored',
          }, serverOnlyPermissions());
          return { outcome: 'ignored', code: 'historical_refund_ignored', mutated: false };
        }
      }

      // Legacy migration-on-touch: resolve and validate payment timestamp from provider tx.time
      let resolvedPaymentTimestamp = targetPaymentTimestamp;
      if (isLegacyMigration) {
        const parsedTxTimeMs = Date.parse(tx?.time || '');
        if (!Number.isSafeInteger(parsedTxTimeMs) || parsedTxTimeMs <= 0 || String(tx?.id || '').trim() !== String(event.paymentId).trim()) {
          const err = new Error('Invalid or unparseable transaction time from provider during legacy migration-on-touch');
          err.code = 'invalid_provider_transaction_time';
          err.isTransient = true;
          err.status = 502;
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'failed',
            outcome_code: 'invalid_provider_transaction_time',
          }, serverOnlyPermissions()).catch(() => {});
          throw err;
        }
        resolvedPaymentTimestamp = parsedTxTimeMs;
        stateUpdate.last_entitlement_payment_id = event.paymentId;
        stateUpdate.last_entitlement_payment_ts_ms = resolvedPaymentTimestamp;
      } else if (!previous?.last_entitlement_payment_id) {
        stateUpdate.last_entitlement_payment_id = event.paymentId;
        stateUpdate.last_entitlement_payment_ts_ms = resolvedPaymentTimestamp;
      }

      // FULL CURRENT-CYCLE REFUND
      stateUpdate.expires_at = null;
      stateUpdate.grace_period_expires_at = null;
      stateUpdate.renewal_cancellation_pending = true;
      stateUpdate.last_entitlement_payment_id = previous?.last_entitlement_payment_id || event.paymentId;
      stateUpdate.last_entitlement_payment_ts_ms = previous?.last_entitlement_payment_ts_ms || resolvedPaymentTimestamp;
      stateUpdate.status = previous?.status || 'active';
      stateUpdate.will_renew = previous?.will_renew !== undefined ? previous.will_renew : true;

      // Check if provider is already canceled
      let currentSubDetails = null;
      try {
        currentSubDetails = await getSubscriptionSnapshot();
      } catch (err) {
        if (err?.isTransient) {
          await upsertProviderState(databases, stateUpdate, previous);
          await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
            user_id: userId,
            processing_status: 'failed',
            outcome_code: 'transient_paypal_fetch_failure',
          }, serverOnlyPermissions()).catch(() => {});
          throw err;
        }
      }

      const isAlreadyCanceled = String(currentSubDetails?.status || '').toUpperCase() === 'CANCELLED';
      if (isAlreadyCanceled) {
        stateUpdate.status = 'canceled';
        stateUpdate.will_renew = false;
        stateUpdate.renewal_cancellation_pending = false;
        stateUpdate.expires_at = null;
        await upsertProviderState(databases, stateUpdate, previous);
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'processed',
          outcome_code: 'refund_and_cancellation_settled',
        }, serverOnlyPermissions());
        return {
          outcome: 'processed',
          code: 'refund_and_cancellation_settled',
          mutated: true,
          plan: stateUpdate.plan,
          status: stateUpdate.status,
          effectivePlan: 'free',
        };
      }

      // Immediately write state with pending cancellation
      await upsertProviderState(databases, stateUpdate, previous);

      // Attempt cancellation at provider
      try {
        await cancelSubscriptionAtProvider(event.subscriptionId, {
          reason: 'Immediate refund closure',
          env,
          customCanceler: subscriptionCanceler,
        });
        stateUpdate.status = 'canceled';
        stateUpdate.will_renew = false;
        stateUpdate.renewal_cancellation_pending = false;
        stateUpdate.expires_at = null;
        await upsertProviderState(databases, stateUpdate, previous);
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'processed',
          outcome_code: 'refund_and_cancellation_settled',
        }, serverOnlyPermissions());
        return {
          outcome: 'processed',
          code: 'refund_and_cancellation_settled',
          mutated: true,
          plan: stateUpdate.plan,
          status: stateUpdate.status,
          effectivePlan: 'free',
        };
      } catch (cancelErr) {
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'failed',
          outcome_code: 'provider_cancellation_pending_retry',
        }, serverOnlyPermissions()).catch(() => {});
        cancelErr.isTransient = true;
        cancelErr.status = 503;
        throw cancelErr;
      }
    }

    case 'PAYMENT.SALE.REVERSED': {
      // CASE A — Current Payment Reversal:
      if (previous?.last_entitlement_payment_id && event.paymentId === previous.last_entitlement_payment_id) {
        stateUpdate.expires_at = null;
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.last_entitlement_payment_id = previous.last_entitlement_payment_id;
        stateUpdate.last_entitlement_payment_ts_ms = previous.last_entitlement_payment_ts_ms;
        stateUpdate.status = previous.status || 'active';
        stateUpdate.will_renew = previous.will_renew !== undefined ? previous.will_renew : true;

        await upsertProviderState(databases, stateUpdate, previous);
        await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
          user_id: userId,
          processing_status: 'processed',
          outcome_code: 'reversal_entitlement_revoked',
        }, serverOnlyPermissions());
        return {
          outcome: 'processed',
          code: 'reversal_entitlement_revoked',
          mutated: true,
          plan: stateUpdate.plan,
          status: stateUpdate.status,
          effectivePlan: 'free',
        };
      }

      // CASE B — Different Payment ID:
      if (previous?.last_entitlement_payment_id && event.paymentId !== previous.last_entitlement_payment_id) {
        const prevPaymentMs = Number(previous.last_entitlement_payment_ts_ms || 0);
        let historicalSale = null;
        try {
          historicalSale = await findLedgerByPaymentId(databases, event.paymentId, 'PAYMENT.SALE.COMPLETED');
        } catch (err) {
          if (err?.code === 'ambiguous_payment_ledger_correlation') {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'rejected',
              outcome_code: 'ambiguous_payment_ledger_correlation',
            }, serverOnlyPermissions()).catch(() => {});
            return { outcome: 'rejected', code: 'ambiguous_payment_ledger_correlation', mutated: false };
          }
          throw err;
        }

        const historicalSaleTimestamp = Number(historicalSale?.event_timestamp_ms);
        if (Number.isSafeInteger(historicalSaleTimestamp) && historicalSaleTimestamp > 0 &&
            Number.isSafeInteger(prevPaymentMs) && prevPaymentMs > 0) {
          if (prevPaymentMs > historicalSaleTimestamp) {
            await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
              user_id: userId,
              processing_status: 'processed',
              outcome_code: 'historical_reversal_ignored',
            }, serverOnlyPermissions());
            return { outcome: 'ignored', code: 'historical_reversal_ignored', mutated: false };
          }
        }
      }

      // CASE C — Unresolved / Ambiguous Historical Reversal -> FAIL CLOSED:
      await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
        user_id: userId,
        processing_status: 'ignored',
        outcome_code: 'unresolved_historical_reversal_correlation',
      }, serverOnlyPermissions());
      return { outcome: 'ignored', code: 'unresolved_historical_reversal_correlation', mutated: false };
    }

    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      stateUpdate.status = 'billing_issue';
      stateUpdate.will_renew = true;

      if (previous?.status === 'active') {
        // Renewal failure on an active, previously verified paid subscription:
        // Start an authoritative 48-hour app grace window.
        const graceExpiresAt = new Date(event.eventTimestampMs + GRACE_PERIOD_MS).toISOString();
        stateUpdate.grace_period_expires_at = graceExpiresAt;
        stateUpdate.expires_at = graceExpiresAt;
      } else if (hasActivePaidGrace(previous, event.eventTimestampMs)) {
        // Distinct or duplicate failure while already in an active 48-hour grace window:
        // Strictly preserve the original grace window; never extend it.
        stateUpdate.grace_period_expires_at = previous.grace_period_expires_at;
        stateUpdate.expires_at = previous.expires_at || previous.grace_period_expires_at;
      } else {
        // Initial payment failure (e.g. pending_initial_payment) or failure without prior verified paid access:
        // ZERO paid entitlement. Zero 48-hour paid grace. Zero future expires_at.
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.expires_at = null;
        stateUpdate.will_renew = false;
      }
      break;
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED':
      stateUpdate.will_renew = false;
      stateUpdate.renewal_cancellation_pending = false;
      if (previous?.renewal_cancellation_pending === true || previous?.expires_at === null) {
        stateUpdate.status = 'canceled';
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.expires_at = null;
      } else if (hasActivePaidGrace(previous, event.eventTimestampMs)) {
        // Provider status event must not shorten an existing 48-hour app grace from renewal failure.
        // Remain in billing_issue with the original grace until G expires.
        stateUpdate.status = 'billing_issue';
        stateUpdate.grace_period_expires_at = previous.grace_period_expires_at;
        stateUpdate.expires_at = previous.expires_at || previous.grace_period_expires_at;
      } else {
        // Normal cancellation outside grace:
        // Cancellation preserves paid access ONLY through already-paid period from verified prior active payment.
        // If user was never active with verified payment, expires_at remains null and outcome is Free.
        stateUpdate.status = 'canceled';
        stateUpdate.grace_period_expires_at = null;
        if ((previous?.status === 'active' || previous?.status === 'canceled' || previous?.status === 'billing_issue') && previous?.expires_at) {
          stateUpdate.expires_at = previous.expires_at;
        } else {
          stateUpdate.expires_at = null;
        }
      }
      break;

    case 'BILLING.SUBSCRIPTION.SUSPENDED':
      stateUpdate.will_renew = false;
      if (hasActivePaidGrace(previous, event.eventTimestampMs)) {
        // Provider status event must not shorten an existing 48-hour app grace from renewal failure.
        stateUpdate.status = 'billing_issue';
        stateUpdate.grace_period_expires_at = previous.grace_period_expires_at;
        stateUpdate.expires_at = previous.expires_at || previous.grace_period_expires_at;
      } else {
        stateUpdate.status = 'suspended';
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.expires_at = null;
      }
      break;

    case 'BILLING.SUBSCRIPTION.EXPIRED':
      stateUpdate.will_renew = false;
      if (hasActivePaidGrace(previous, event.eventTimestampMs)) {
        // Provider status event must not shorten an existing 48-hour app grace from renewal failure.
        stateUpdate.status = 'billing_issue';
        stateUpdate.grace_period_expires_at = previous.grace_period_expires_at;
        stateUpdate.expires_at = previous.expires_at || previous.grace_period_expires_at;
      } else {
        stateUpdate.status = 'expired';
        stateUpdate.grace_period_expires_at = null;
        stateUpdate.expires_at = null;
      }
      break;

    case 'BILLING.SUBSCRIPTION.UPDATED':
      // CRITICAL: UPDATED must never raise paid entitlement rank without a verified payment.
      // Preserve the currently paid plan:
      stateUpdate.plan = previous?.plan || 'pro';
      // Refresh non-entitlement metadata:
      if (event.planId) stateUpdate.plan_id = event.planId;
      // CRITICAL: UPDATED must NOT advance or manufacture paid entitlement duration:
      stateUpdate.expires_at = previous?.expires_at || null;
      // Preserve status (pending_initial_payment remains pending; active remains active):
      stateUpdate.status = previous?.status || 'pending_initial_payment';
      break;

    default:
      break;
  }

  // ENTITLEMENT MUTATION WITH CRASH/RETRY LEASE PROTECTION:
  try {
    await upsertProviderState(databases, stateUpdate, previous);
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      user_id: userId,
      processing_status: 'processed',
      outcome_code: 'state_updated',
    }, serverOnlyPermissions());
  } catch (err) {
    // If state mutation or ledger update fails, mark reservation as 'failed' so retry can recover
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      user_id: userId,
      processing_status: 'failed',
      outcome_code: 'mutation_failed',
    }, serverOnlyPermissions()).catch(() => {});
    throw err;
  }

  return {
    outcome: 'processed',
    code: 'state_updated',
    mutated: true,
    plan: stateUpdate.plan,
    status: stateUpdate.status,
    effectivePlan: resolveEffectivePlan({
      paypalProviderState: stateUpdate,
      paypalProviderEnvironment: selectedEnvironment,
      qaUserId: env.BILLING_CHECKOUT_QA_USER_ID || getEnv('BILLING_CHECKOUT_QA_USER_ID'),
      userId,
      nowMs,
    }).plan,
  };
}

function response(res, payload, status = 200) {
  return res.json(payload, status);
}

module.exports = async ({ req, res, log, error }) => {
  const testOpts = req?.__test || {};
  const currentEnv = testOpts.env || process.env;
  const verifier = testOpts.customVerifier || null;
  const requestId = header(req, 'x-appwrite-execution-id') || 'request';

  const headers = extractWebhookHeaders(req);
  const headerValidation = validateWebhookHeaders(headers);
  if (!headerValidation.ok) {
    log?.(`PayPal webhook ${requestId}: rejected missing headers`);
    return response(res, { status: 'error', code: 'missing_webhook_headers', message: 'Missing required PayPal webhook headers.' }, 400);
  }

  const body = parseJsonBody(req);
  if (!body) {
    log?.(`PayPal webhook ${requestId}: rejected malformed body`);
    return response(res, { status: 'error', code: 'malformed_body', message: 'Malformed request body.' }, 400);
  }

  const verification = await verifyWebhookSignatureWithPayPal(headers, body, { env: currentEnv, customVerifier: verifier });
  if (!verification.ok) {
    log?.(`PayPal webhook ${requestId}: signature verification failed (${verification.code})`);
    return response(res, { status: 'error', code: verification.code || 'unauthorized', message: 'Webhook signature verification failed.' }, 401);
  }

  const event = normalizeEvent(body);
  const validity = validateEvent(event);
  if (!validity.ok) {
    log?.(`PayPal webhook ${requestId}: rejected event (${validity.code})`);
    return response(res, { status: 'error', code: validity.code, message: 'Invalid webhook event.' }, 400);
  }

  try {
    const clients = (testOpts.databases && testOpts.users) ? { databases: testOpts.databases, users: testOpts.users } : getClients();
    const result = await processWebhookEvent({
      databases: clients.databases,
      users: clients.users,
      event,
      nowMs: testOpts.nowMs || Date.now(),
      env: currentEnv,
      subscriptionFetcher: testOpts.subscriptionFetcher || null,
      subscriptionTransactionsFetcher: testOpts.subscriptionTransactionsFetcher || null,
      subscriptionCanceler: testOpts.subscriptionCanceler || null,
      saleFetcher: testOpts.saleFetcher || null,
    });

    log?.(`PayPal webhook ${requestId}: ${event.type} -> ${result.outcome} (${result.code})`);
    return response(res, { status: 'success', data: { ok: true, ...result } }, 200);
  } catch (err) {
    const isTransient = err?.isTransient || err?.status >= 500;
    const statusCode = isTransient ? 503 : 500;
    const errCode = err?.code || (isTransient ? 'transient_paypal_fetch_failure' : 'processing_failed');
    error?.(`PayPal webhook ${requestId}: ${errCode} (${err.message})`);
    return response(res, { status: 'error', code: errCode, message: err.message || 'Webhook processing failed.' }, statusCode);
  }
};

module.exports.__test = {
  DB_ID,
  STATE_COLLECTION_ID,
  LEDGER_COLLECTION_ID,
  CHECKOUT_SESSION_COLLECTION_ID,
  LEDGER_RETENTION_DAYS,
  GRACE_PERIOD_HOURS,
  GRACE_PERIOD_MS,
  PROCESSING_RESERVATION_TTL_MS,
  MAX_TRANSACTION_PAGE_FOLLOWS,
  SANDBOX_PRO_PLAN_ID,
  SANDBOX_ULTIMATE_PLAN_ID,
  PLAN_MAPPINGS,
  SUPPORTED_SUBSCRIPTION_EVENTS,
  LEDGER_ONLY_EVENTS,
  extractWebhookHeaders,
  validateWebhookHeaders,
  verifyWebhookSignatureWithPayPal,
  normalizeEvent,
  validateEvent,
  eventOrderingKey,
  stateDocumentId,
  ledgerDocumentId,
  retentionIso,
  findStateByUserId,
  findStateBySubscriptionId,
  findStateByPaymentId,
  findCheckoutSessionBySubscriptionId,
  findLedger,
  findLedgerByPaymentId,
  findRefundOrReversalTombstone,
  resolveCanonicalUser,
  resolvePlanFromId,
  resolveAuthoritativeExpiry,
  calculateExpiry,
  hasActivePaidGrace,
  reclaimLedgerReservation,
  atomicReclaimLedgerReservation: reclaimLedgerReservation,
  fetchSubscriptionDetails,
  fetchSubscriptionTransactions,
  fetchSaleDetails,
  cancelSubscriptionAtProvider,
  upsertProviderState,
  processWebhookEvent,
  getPaypalApiBaseUrl,
};
