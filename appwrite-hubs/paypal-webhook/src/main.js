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

const SUPPORTED_SUBSCRIPTION_EVENTS = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED',
  'PAYMENT.SALE.COMPLETED',
  'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
  'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED',
  'BILLING.SUBSCRIPTION.UPDATED',
]);

const LEDGER_ONLY_EVENTS = new Set([
  'PAYMENT.SALE.REFUNDED',
  'PAYMENT.SALE.REVERSED',
]);

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

// HARD SANDBOX-ONLY RUNTIME GATE:
// During Phase 3, production PayPal is strictly disabled and fails closed.
function getPaypalApiBaseUrl(env = process.env) {
  const mode = normalizeProviderEnvironment(env.PAYPAL_ACCESS_ENVIRONMENT);
  if (mode === 'sandbox') return 'https://api-m.sandbox.paypal.com';
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
  const subscriptionId = String(resource.billing_agreement_id || resource.id || '').trim();
  const planId = String(resource.plan_id || '').trim();
  const customId = String(resource.custom_id || resource.custom || '').trim();
  const nextBillingTime = String(resource.billing_info?.next_billing_time || resource.next_billing_time || '').trim();

  return {
    id,
    type,
    createTime,
    eventTimestampMs,
    subscriptionId,
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
  if (!event.subscriptionId) {
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

function resolvePlanFromId(planId) {
  const mapped = PLAN_MAPPINGS[planId];
  return mapped && VALID_PAID_PLANS.has(mapped) ? mapped : null;
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
    if (existing.processing_status === 'processed' ||
        existing.processing_status === 'ignored' ||
        existing.processing_status === 'rejected') {
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
}) {
  const validation = validateEvent(event);
  if (!validation.ok) {
    return { outcome: 'rejected', code: validation.code, mutated: false };
  }

  // HARD SANDBOX-ONLY RUNTIME GATE (Section 4):
  // Phase 3 is strictly Sandbox. Missing, invalid, or production fail closed!
  const selectedEnvironment = normalizeProviderEnvironment(env.PAYPAL_ACCESS_ENVIRONMENT);
  if (selectedEnvironment !== 'sandbox') {
    return { outcome: 'rejected', code: 'sandbox_only_phase3_gate', mutated: false };
  }

  const ledgerDocId = ledgerDocumentId(event.id);
  const nowIso = new Date(nowMs).toISOString();

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
      if (existing.processing_status === 'processed' || existing.processing_status === 'ignored' || existing.processing_status === 'rejected') {
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
      } else if (existing.processing_status === 'failed') {
        // Recoverable retry after a previous processor crashed or experienced transient failure.
        // Conflict-aware conditional reclaim via Appwrite transaction.
        const reclaim = await reclaimLedgerReservation(databases, ledgerDocId, {
          event_id: event.id,
          event_type: event.type,
          user_id: existing.user_id || null,
          subscription_id: event.subscriptionId || null,
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
      } else {
        return { outcome: 'duplicate', code: 'already_recorded', mutated: false };
      }
    } else {
      throw err;
    }
  }

  // Ledger-only policy-pending events (refunds and reversals)
  if (LEDGER_ONLY_EVENTS.has(event.type)) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      processing_status: 'processed',
      outcome_code: 'ledger_only_policy_pending',
    }, serverOnlyPermissions());
    return { outcome: 'processed', code: 'ledger_only_policy_pending', mutated: false };
  }

  // Find previous state by subscription ID or user
  let previous = await findStateBySubscriptionId(databases, event.subscriptionId);

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
  // Phase 3 is Sandbox QA only. State mutation is permitted ONLY when the resolved
  // canonical user ID matches the non-empty BILLING_CHECKOUT_QA_USER_ID.
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

  // If previous wasn't found by subscription ID, check by resolved userId
  if (!previous) {
    previous = await findStateByUserId(databases, userId);
  }

  // STALE & EQUAL-TIMESTAMP ORDERING RULES (Section 5):
  const previousTimestamp = Number(previous?.latest_event_timestamp_ms || -1);
  if (previous) {
    // 1. Strictly older event -> stale
    if (event.eventTimestampMs < previousTimestamp) {
      await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
        user_id: userId,
        processing_status: 'ignored',
        outcome_code: 'stale_event',
      }, serverOnlyPermissions());
      return { outcome: 'ignored', code: 'stale_event', mutated: false };
    }

    // 2. Equal timestamp tie-break rule:
    // An equal-timestamp event that would regress or elevate entitlement without a verified payment must NOT mutate state.
    if (event.eventTimestampMs === previousTimestamp) {
      const isPaymentCompletion = event.type === 'PAYMENT.SALE.COMPLETED';
      const isPreviousNotActive = previous.status !== 'active';
      const allowEqualTimestampMutation = isPaymentCompletion && isPreviousNotActive;

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
  const resolvedPlan = resolvePlanFromId(effectivePlanId);

  // Validate plan for events with plan ID
  if ((event.type === 'BILLING.SUBSCRIPTION.ACTIVATED' || event.type === 'PAYMENT.SALE.COMPLETED') && !resolvedPlan) {
    await databases.updateDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, {
      user_id: userId,
      processing_status: 'rejected',
      outcome_code: 'unknown_plan_id',
    }, serverOnlyPermissions());
    return { outcome: 'rejected', code: 'unknown_plan_id', mutated: false };
  }

  if (event.type === 'BILLING.SUBSCRIPTION.UPDATED' && event.planId && !resolvePlanFromId(event.planId)) {
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
    latest_event_id: event.id,
    latest_event_type: event.type,
    latest_event_timestamp_ms: event.eventTimestampMs,
    updated_at: new Date(nowMs).toISOString(),
  };

  switch (event.type) {
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
      // CRITICAL: ACTIVATED alone grants NO paid entitlement.
      stateUpdate.status = 'pending_initial_payment';
      stateUpdate.will_renew = true;
      stateUpdate.grace_period_expires_at = null;
      stateUpdate.expires_at = null;
      break;

    case 'PAYMENT.SALE.COMPLETED': {
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
      break;
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
      if (hasActivePaidGrace(previous, event.eventTimestampMs)) {
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
        if ((previous?.status === 'active' || previous?.status === 'canceled') && previous?.expires_at) {
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
  findCheckoutSessionBySubscriptionId,
  findLedger,
  resolveCanonicalUser,
  resolvePlanFromId,
  resolveAuthoritativeExpiry,
  calculateExpiry,
  hasActivePaidGrace,
  reclaimLedgerReservation,
  atomicReclaimLedgerReservation: reclaimLedgerReservation,
  fetchSubscriptionDetails,
  upsertProviderState,
  processWebhookEvent,
  getPaypalApiBaseUrl,
};
