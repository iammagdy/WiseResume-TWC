'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const paypalWebhook = require('../../appwrite-hubs/paypal-webhook/src/main.js');
const { resolveEffectivePlan } = require('../../appwrite-hubs/shared-subscription-resolver/index.js');
const {
  SANDBOX_PRO_PLAN_ID,
  SANDBOX_ULTIMATE_PLAN_ID,
  GRACE_PERIOD_MS,
  validateWebhookHeaders,
  extractWebhookHeaders,
  normalizeEvent,
  validateEvent,
  processWebhookEvent,
  resolvePlanFromId,
  MAX_TRANSACTION_PAGE_FOLLOWS,
  fetchSubscriptionTransactions,
  cancelSubscriptionAtProvider,
  findStateByPaymentId,
  findLedgerByPaymentId,
  findRefundOrReversalTombstone,
  fetchSaleDetails,
} = paypalWebhook.__test;

const QA_USER_ID = 'user_qa_paypal_123';
const OTHER_USER_ID = 'user_other_999';
const TEST_ENV = {
  PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
  BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
  PAYPAL_CLIENT_ID: 'mock_client_id',
  PAYPAL_CLIENT_SECRET: 'mock_client_secret',
  PAYPAL_WEBHOOK_ID: 'mock_webhook_id',
};
// Ensure unit tests never attempt real external network calls to PayPal API:
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  const urlStr = String(url || '');
  if (urlStr.includes('api-m.sandbox.paypal.com') || urlStr.includes('api-m.paypal.com')) {
    if (urlStr.includes('/v1/oauth2/token')) {
      await new Promise(r => setTimeout(r, 25));
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: 'invalid_client', error_description: 'Client Authentication failed in test environment' }),
      };
    }
    return {
      ok: false,
      status: 404,
      json: async () => ({ name: 'RESOURCE_NOT_FOUND', message: 'Resource not found in test environment' }),
    };
  }
  return realFetch ? realFetch(url, opts) : Promise.reject(new Error(`Unhandled network request: ${urlStr}`));
};
function createMockDatabases() {
  const collections = {
    paypal_subscription_state: new Map(),
    paypal_event_ledger: new Map(),
    billing_checkout_sessions: new Map(),
  };

  const docVersions = new Map();
  const transactions = new Map();
  let nextTxId = 1;

  function docKey(collId, docId) {
    return `${collId}:${docId}`;
  }

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  return {
    collections,
    docVersions,
    transactions,
    async createTransaction(ttl = 60) {
      const id = `tx_${nextTxId++}`;
      transactions.set(id, {
        id,
        ttl,
        readVersions: new Map(),
        stagedUpdates: new Map(),
      });
      return { $id: id };
    },
    async updateTransaction(transactionId, commit, rollback) {
      const tx = transactions.get(transactionId);
      if (!tx) return {};
      if (rollback) {
        transactions.delete(transactionId);
        return {};
      }
      if (commit) {
        // Conflict detection: verify none of the read documents were modified since read
        for (const [key, readVer] of tx.readVersions.entries()) {
          const currentVer = docVersions.get(key) || 0;
          if (currentVer !== readVer) {
            transactions.delete(transactionId);
            const err = new Error('Transaction conflict: document was modified by another transaction');
            err.code = 409;
            throw err;
          }
        }

        // Apply staged updates
        for (const [key, update] of tx.stagedUpdates.entries()) {
          const col = collections[update.collId];
          const existing = col.get(update.docId);
          const updated = { ...existing, ...update.data };
          col.set(update.docId, updated);
          const nextVer = (docVersions.get(key) || 0) + 1;
          docVersions.set(key, nextVer);
        }

        transactions.delete(transactionId);
        return { status: 'committed' };
      }
      return {};
    },
    async listDocuments(_dbId, collectionId, queries = [], _transactionId = null) {
      const col = collections[collectionId];
      if (!col) return { documents: [], total: 0 };
      let docs = Array.from(col.values());
      let limit = null;

      for (const q of queries) {
        if (typeof q === 'string') {
          let key, val;
          try {
            const parsed = JSON.parse(q);
            if (parsed.method === 'equal') {
              key = parsed.attribute;
              val = Array.isArray(parsed.values) ? parsed.values[0] : parsed.values;
            } else if (parsed.method === 'limit') {
              limit = Array.isArray(parsed.values) ? parsed.values[0] : parsed.values;
            }
          } catch {
            const match = q.match(/equal\("([^"]+)",\s*\[?"?([^"\]]+)"?\]?\)/);
            if (match) {
              [, key, val] = match;
            }
            const limitMatch = q.match(/limit\((\d+)\)/);
            if (limitMatch) {
              limit = Number(limitMatch[1]);
            }
          }
          if (key !== undefined) {
            docs = docs.filter(d => d[key] === val);
          }
        }
      }
      if (typeof limit === 'number' && limit >= 0) {
        docs = docs.slice(0, limit);
      }
      return { documents: docs.map(clone), total: docs.length };
    },
    async getDocument(_dbId, collectionId, docId, _queries = [], transactionId = null) {
      const col = collections[collectionId];
      const doc = col?.get(docId);
      if (!doc) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      if (transactionId) {
        const tx = transactions.get(transactionId);
        if (tx) {
          const key = docKey(collectionId, docId);
          tx.readVersions.set(key, docVersions.get(key) || 0);
        }
      }
      return clone(doc);
    },
    async createDocument(_dbId, collectionId, docId, data, _permissions, _transactionId = null) {
      const col = collections[collectionId];
      if (col.has(docId)) {
        const err = new Error('Document already exists');
        err.code = 409;
        throw err;
      }
      if (collectionId === 'paypal_subscription_state') {
        for (const existing of col.values()) {
          if (existing.user_id === data.user_id) {
            const err = new Error('Unique constraint violated');
            err.code = 409;
            throw err;
          }
        }
      }
      const created = { $id: docId, ...clone(data) };
      col.set(docId, created);
      docVersions.set(docKey(collectionId, docId), 1);
      return clone(created);
    },
    async deleteDocument(_dbId, collectionId, docId, _transactionId = null) {
      const col = collections[collectionId];
      if (!col || !col.has(docId)) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      col.delete(docId);
      docVersions.delete(docKey(collectionId, docId));
      return { ok: true };
    },
    async updateDocument(_dbId, collectionId, docId, data, _permissions, transactionId = null) {
      if (transactionId) {
        const tx = transactions.get(transactionId);
        if (tx) {
          const key = docKey(collectionId, docId);
          tx.stagedUpdates.set(key, { collId: collectionId, docId, data: clone(data) });
          return { $id: docId, ...clone(data) };
        }
      }
      const col = collections[collectionId];
      const existing = col.get(docId);
      if (!existing) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      const updated = { ...existing, ...clone(data) };
      col.set(docId, updated);
      const key = docKey(collectionId, docId);
      docVersions.set(key, (docVersions.get(key) || 0) + 1);
      return clone(updated);
    },
  };
}

function createMockUsers(validUsers = [QA_USER_ID, OTHER_USER_ID]) {
  return {
    async get(userId) {
      if (validUsers.includes(userId)) {
        return { $id: userId, email: `${userId}@example.com` };
      }
      const err = new Error('User not found');
      err.code = 404;
      throw err;
    },
  };
}

// ==================================================
// 1. Signature & Header Verification Tests
// ==================================================
test('Signature: valid headers pass validation, missing headers fail validation', () => {
  const validHeaders = {
    transmissionId: 'tx-12345',
    transmissionTime: '2026-09-03T12:00:00Z',
    certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
    authAlgo: 'SHA256withRSA',
    transmissionSig: 'base64sig==',
  };
  assert.equal(validateWebhookHeaders(validHeaders).ok, true);

  const missingSig = { ...validHeaders, transmissionSig: '' };
  assert.equal(validateWebhookHeaders(missingSig).ok, false);
  assert.equal(validateWebhookHeaders(missingSig).code, 'missing_webhook_headers');

  const missingCert = { ...validHeaders, certUrl: '' };
  assert.equal(validateWebhookHeaders(missingCert).ok, false);
});

test('Signature: extractWebhookHeaders safely normalizes lowercase and uppercase headers', () => {
  const req = {
    headers: {
      'paypal-transmission-id': 'id-1',
      'paypal-transmission-time': 'time-1',
      'paypal-cert-url': 'url-1',
      'paypal-auth-algo': 'algo-1',
      'paypal-transmission-sig': 'sig-1',
    },
  };
  const extracted = extractWebhookHeaders(req);
  assert.equal(extracted.transmissionId, 'id-1');
  assert.equal(extracted.transmissionTime, 'time-1');
  assert.equal(extracted.certUrl, 'url-1');
  assert.equal(extracted.authAlgo, 'algo-1');
  assert.equal(extracted.transmissionSig, 'sig-1');
});

test('Signature: verifyWebhookSignatureWithPayPal fails closed when credentials or environment are unconfigured', async () => {
  const headers = {
    transmissionId: 'tx', transmissionTime: 'time', certUrl: 'url', authAlgo: 'algo', transmissionSig: 'sig',
  };
  const unconfiguredEnv = await paypalWebhook.__test.verifyWebhookSignatureWithPayPal(headers, {}, { env: {} });
  assert.equal(unconfiguredEnv.ok, false);
  assert.equal(unconfiguredEnv.code, 'unconfigured_paypal_environment');

  const missingCreds = await paypalWebhook.__test.verifyWebhookSignatureWithPayPal(headers, {}, { env: { PAYPAL_ACCESS_ENVIRONMENT: 'sandbox' } });
  assert.equal(missingCreds.ok, false);
  assert.equal(missingCreds.code, 'unconfigured_paypal_credentials');
});

test('Signature: customVerifier allows verifying SUCCESS vs FAILURE in tests', async () => {
  const headers = {
    transmissionId: 'tx', transmissionTime: 'time', certUrl: 'url', authAlgo: 'algo', transmissionSig: 'sig',
  };
  const success = await paypalWebhook.__test.verifyWebhookSignatureWithPayPal(headers, {}, {
    customVerifier: () => ({ ok: true, status: 'SUCCESS' }),
  });
  assert.equal(success.ok, true);

  const failed = await paypalWebhook.__test.verifyWebhookSignatureWithPayPal(headers, {}, {
    customVerifier: () => ({ ok: false, code: 'signature_verification_failed' }),
  });
  assert.equal(failed.ok, false);
});

// ==================================================
// 2. Catalog & Plan Mapping Tests
// ==================================================
test('Catalog: maps Sandbox Pro and Ultimate plan IDs strictly to internal pro and premium', () => {
  assert.equal(resolvePlanFromId(SANDBOX_PRO_PLAN_ID), 'pro');
  assert.equal(resolvePlanFromId(SANDBOX_ULTIMATE_PLAN_ID), 'premium');
  assert.equal(resolvePlanFromId('UNKNOWN_PLAN_ID'), null);
  assert.notEqual(resolvePlanFromId(SANDBOX_ULTIMATE_PLAN_ID), 'ultimate');
});

// ==================================================
// 3. Section 1: Canonical Correlation Bridge Tests
// ==================================================
test('Correlation: first SALE.COMPLETED with no state resolves canonical user via local checkout session', async () => {
  const db = createMockDatabases();
  const users = createMockUsers([QA_USER_ID]);
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Seed existing checkout session with provider_transaction_id matching subscription ID
  db.collections.billing_checkout_sessions.set('session_doc_1', {
    $id: 'session_doc_1',
    user_id: QA_USER_ID,
    provider_transaction_id: 'I-SUB-SESSION-1',
    plan: 'pro',
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-BRIDGE-1',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-SALE-BRIDGE-1',
      billing_agreement_id: 'I-SUB-SESSION-1',
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'active');
  assert.equal(result.plan, 'pro');
  assert.equal(result.effectivePlan, 'pro');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.ok(state);
  assert.equal(state.user_id, QA_USER_ID);
});

test('Correlation: checkout session belonging to another non-QA user grants no paid entitlement', async () => {
  const db = createMockDatabases();
  const users = createMockUsers([QA_USER_ID, OTHER_USER_ID]);
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  db.collections.billing_checkout_sessions.set('session_other', {
    $id: 'session_other',
    user_id: OTHER_USER_ID,
    provider_transaction_id: 'I-SUB-OTHER-SESSION',
    plan: 'premium',
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-OTHER',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-SALE-OTHER',
      billing_agreement_id: 'I-SUB-OTHER-SESSION',
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'sandbox_qa_boundary_rejected');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0); // No state mutation for non-QA user!
});

test('Correlation: unresolved local session falls back to server PayPal GET custom_id', async () => {
  const db = createMockDatabases();
  const users = createMockUsers([QA_USER_ID]);
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-GET-FALLBACK',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-SALE-GET-FALLBACK',
      billing_agreement_id: 'I-SUB-REMOTE',
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: async (subId) => {
      assert.equal(subId, 'I-SUB-REMOTE');
      return {
        id: subId,
        custom_id: QA_USER_ID,
        billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
      };
    },
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.effectivePlan, 'pro');
  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.user_id, QA_USER_ID);
});

test('Correlation: no trusted correlation results in ledger rejection without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers([QA_USER_ID]);
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-UNRESOLVED',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-UNRESOLVED',
      billing_agreement_id: 'I-SUB-ORPHAN',
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: async () => null,
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'unresolved_user_correlation');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);

  const ledger = db.collections.paypal_event_ledger.get(paypalWebhook.__test.ledgerDocumentId('EVT-SALE-UNRESOLVED'));
  assert.ok(ledger);
  assert.equal(ledger.processing_status, 'rejected');
  assert.equal(ledger.outcome_code, 'unresolved_user_correlation');
});

// ==================================================
// 4. Section 2: UPDATED Non-Elevation Policy Tests
// ==================================================
test('UPDATED: Pro + UPDATED to Ultimate remains Pro without verified PAYMENT.SALE.COMPLETED', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Pre-seed Pro active state
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-UPGRADE-SAFE',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: new Date(nowMs + 30 * 86400000).toISOString(),
    latest_event_timestamp_ms: nowMs,
  });

  const updatedEvent = normalizeEvent({
    id: 'EVT-UPD-TO-ULTIMATE',
    event_type: 'BILLING.SUBSCRIPTION.UPDATED',
    create_time: new Date(nowMs + 10000).toISOString(),
    resource: {
      id: 'I-SUB-UPGRADE-SAFE',
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: updatedEvent, nowMs: nowMs + 10000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  // Plan MUST REMAIN pro!
  assert.equal(result.plan, 'pro');
  assert.equal(result.effectivePlan, 'pro');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.plan, 'pro');
  assert.equal(state.plan_id, SANDBOX_ULTIMATE_PLAN_ID); // metadata updated, but plan preserved!
});

test('UPDATED: pending_initial_payment + UPDATED still grants no paid entitlement', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Pre-seed pending state
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-PENDING-UPD',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'pending_initial_payment',
    latest_event_timestamp_ms: nowMs,
  });

  const updatedEvent = normalizeEvent({
    id: 'EVT-UPD-PENDING',
    event_type: 'BILLING.SUBSCRIPTION.UPDATED',
    create_time: new Date(nowMs + 5000).toISOString(),
    resource: {
      id: 'I-SUB-PENDING-UPD',
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: updatedEvent, nowMs: nowMs + 5000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'pending_initial_payment');
  assert.equal(result.effectivePlan, 'free'); // ZERO paid access!
});

test('UPDATED: SALE.COMPLETED for Ultimate after UPDATED activates premium', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Pre-seed state that was updated to Ultimate metadata but still Pro paid
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-STEP-UPGRADE',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    latest_event_timestamp_ms: nowMs,
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-AFTER-UPD',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: {
      id: 'TX-AFTER-UPD',
      billing_agreement_id: 'I-SUB-STEP-UPGRADE',
      amount: { total: '10.00', currency: 'USD' },
      billing_info: { next_billing_time: new Date(nowMs + 30 * 86400000).toISOString() },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'active');
  assert.equal(result.plan, 'premium');
  assert.equal(result.effectivePlan, 'premium'); // Elevation confirmed by payment!
});

test('UPDATED: unknown plan on UPDATED is safely rejected', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-UNKNOWN-UPD',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    latest_event_timestamp_ms: nowMs,
  });

  const badUpdatedEvent = normalizeEvent({
    id: 'EVT-UPD-BAD-PLAN',
    event_type: 'BILLING.SUBSCRIPTION.UPDATED',
    create_time: new Date(nowMs + 10000).toISOString(),
    resource: {
      id: 'I-SUB-UNKNOWN-UPD',
      plan_id: 'P-FOREIGN-MALFORMED',
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: badUpdatedEvent, nowMs: nowMs + 10000, env: TEST_ENV });
  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'unknown_plan_id');
  assert.equal(result.mutated, false);
});

// ==================================================
// 5. Section 3: Idempotency, Concurrency & Crash/Retry Tests
// ==================================================
// 5. Section 4: Hard Crash & Timeout Recovery Tests
// ==================================================
test('Recovery: fresh processing reservation -> second delivery stops before mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-CONCURRENT-FRESH',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-CONCURRENT-1',
      billing_agreement_id: 'I-SUB-CONC',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  // Pre-seed a fresh in-flight reservation (e.g. 5 seconds old < 60s lease)
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(event.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: event.id,
    received_at: new Date(nowMs - 5000).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  // Second concurrent processor arrives while first is active
  const secondResult = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(secondResult.outcome, 'duplicate');
  assert.equal(secondResult.code, 'concurrent_processing');
  assert.equal(secondResult.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0); // Stopped before state mutation!
});

test('Recovery: stale abandoned processing reservation -> retry can recover', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-STALE-ABANDONED',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T11:58:00Z',
    resource: {
      id: 'TX-ABANDONED-1',
      billing_agreement_id: 'I-SUB-ABANDONED',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
    },
  });

  // Pre-seed a stale in-flight reservation from an abandoned/crashed process (120 seconds old > 60s lease)
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(event.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: event.id,
    received_at: new Date(nowMs - 120000).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  // Retry delivery arrives after hard crash
  const retryResult = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(retryResult.outcome, 'processed');
  assert.equal(retryResult.code, 'state_updated');
  assert.equal(retryResult.mutated, true);

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.ok(state);
  assert.equal(state.status, 'active');

  const ledgerAfter = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledgerAfter.processing_status, 'processed');
});

test('Recovery: completed reservation -> retry remains duplicate', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-COMPLETED-DUP',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-COMPLETED-1',
      billing_agreement_id: 'I-SUB-COMPLETED',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  // Pre-seed an already completed event
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(event.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: event.id,
    received_at: new Date(nowMs - 30000).toISOString(),
    processing_status: 'processed',
    outcome_code: 'state_updated',
  });

  // Retry arrives
  const result = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'duplicate');
  assert.equal(result.code, 'already_recorded');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);
});

test('Recovery: recovered PAYMENT.FAILED -> exactly one 48-hour grace calculation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 180000; // 3 minutes later retry

  const failEvent = normalizeEvent({
    id: 'EVT-RECOVER-FAIL',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: { id: 'I-SUB-RECOVER-FAIL', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  // Pre-seed verified active state (renewal failure requires prior active paid subscription)
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-RECOVER-FAIL',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: new Date(eventTimeMs).toISOString(),
    latest_event_timestamp_ms: eventTimeMs - 1000,
  });

  // Pre-seed abandoned processing reservation (from crash)
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(failEvent.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: failEvent.id,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  // First retry recovers and calculates grace from original eventTimestampMs
  const recoveryResult = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs, env: TEST_ENV });
  assert.equal(recoveryResult.outcome, 'processed');
  assert.equal(recoveryResult.mutated, true);

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'billing_issue');
  const expectedGraceIso = new Date(eventTimeMs + 48 * 3600 * 1000).toISOString();
  assert.equal(state.grace_period_expires_at, expectedGraceIso);

  // Subsequent duplicate delivery arrives later
  const dupResult = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(dupResult.outcome, 'duplicate');
  assert.equal(dupResult.mutated, false);
  const stateAfterDup = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(stateAfterDup.grace_period_expires_at, expectedGraceIso); // Still exactly original grace!
});

test('Recovery: recovered SALE.COMPLETED -> exactly one active-state transition', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 180000;

  const saleEvent = normalizeEvent({
    id: 'EVT-RECOVER-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-RECOVER-SALE',
      billing_agreement_id: 'I-SUB-RECOVER-SALE',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
    },
  });

  // Pre-seed abandoned processing reservation
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(saleEvent.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: saleEvent.id,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  // First recovery succeeds
  const recResult = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  assert.equal(recResult.outcome, 'processed');
  assert.equal(recResult.mutated, true);
  assert.equal(recResult.status, 'active');

  // Second delivery remains duplicate
  const dupResult = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: nowMs + 10000, env: TEST_ENV });
  assert.equal(dupResult.outcome, 'duplicate');
  assert.equal(dupResult.mutated, false);
});

// ==================================================
// Section 5: Sandbox QA Mutation Boundary Tests
// ==================================================
test('Sandbox QA: matching QA user is eligible for state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-QA-MATCH',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-QA-MATCH',
      billing_agreement_id: 'I-SUB-QA-MATCH',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.mutated, true);
  assert.equal(db.collections.paypal_subscription_state.size, 1);
});

test('Sandbox QA: non-QA canonical user is rejected from state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-QA-NON-QA',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-QA-NON-QA',
      billing_agreement_id: 'I-SUB-NON-QA',
      custom_id: OTHER_USER_ID, // Non-QA user!
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'sandbox_qa_boundary_rejected');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0); // No state mutation!
});

test('Sandbox QA: missing QA user config fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-QA-MISSING-CFG',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-QA-MISSING',
      billing_agreement_id: 'I-SUB-MISSING',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event,
    nowMs,
    env: { ...TEST_ENV, BILLING_CHECKOUT_QA_USER_ID: '' }, // Missing config!
  });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'missing_qa_user_config');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0); // Fails closed!
});

test('Sandbox QA: forged or cross-user correlation is rejected from state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Pre-seed checkout session belonging to OTHER_USER_ID
  db.collections.billing_checkout_sessions.set('sess_forged', {
    $id: 'sess_forged',
    user_id: OTHER_USER_ID,
    provider_transaction_id: 'I-SUB-FORGED',
  });

  const event = normalizeEvent({
    id: 'EVT-QA-FORGED',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-FORGED',
      billing_agreement_id: 'I-SUB-FORGED',
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'sandbox_qa_boundary_rejected');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);
});


test('Idempotency: Duplicate delivery never mutates twice; duplicate PAYMENT.FAILED does not extend grace', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const failEvent = normalizeEvent({
    id: 'EVT-FAIL-IDEMP',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(nowMs).toISOString(),
    resource: { id: 'I-SUB-FAIL-IDEMP', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  const run1 = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs, env: TEST_ENV });
  assert.equal(run1.outcome, 'processed');
  const state1 = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  const grace1 = state1.grace_period_expires_at;

  const run2 = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(run2.outcome, 'duplicate');
  assert.equal(run2.mutated, false);
  const state2 = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state2.grace_period_expires_at, grace1); // NOT extended!
});

// ==================================================
// 6. Section 4: Hard Sandbox-Only Runtime Gate Tests
// ==================================================
test('Environment: sandbox and production allowed, missing/invalid fail closed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-GATE-TEST',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: '2026-09-03T12:00:00Z',
    resource: { id: 'I-SUB-GATE', plan_id: SANDBOX_PRO_PLAN_ID, custom_id: QA_USER_ID },
  });

  // Missing -> rejected
  const resMissing = await processWebhookEvent({ databases: db, users, event, nowMs, env: { ...TEST_ENV, PAYPAL_ACCESS_ENVIRONMENT: '' } });
  assert.equal(resMissing.outcome, 'rejected');
  assert.equal(resMissing.code, 'unconfigured_paypal_environment');

  // Invalid -> rejected
  const resInvalid = await processWebhookEvent({ databases: db, users, event, nowMs, env: { ...TEST_ENV, PAYPAL_ACCESS_ENVIRONMENT: 'staging' } });
  assert.equal(resInvalid.outcome, 'rejected');
  assert.equal(resInvalid.code, 'unconfigured_paypal_environment');

  // Base URL returns empty for missing/invalid
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: '' }), '');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'staging' }), '');

  // Base URL returns valid endpoints for sandbox and production
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'sandbox' }), 'https://api-m.sandbox.paypal.com');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'production' }), 'https://api-m.paypal.com');
});

// ==================================================
// 7. Section 5: Equal-Timestamp Event Ordering Tests
// ==================================================
test('Ordering: equal-timestamp non-payment event arriving on active state does not regress active state', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');

  // State is already active at 12:00:00.000Z
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-EQUAL-ORDER',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    latest_event_timestamp_ms: eventTimeMs,
  });

  // Equal timestamp failure arrives (different event ID, same millisecond)
  const equalFail = normalizeEvent({
    id: 'EVT-FAIL-EQUAL',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: { id: 'I-SUB-EQUAL-ORDER' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: equalFail, nowMs: eventTimeMs + 5000, env: TEST_ENV });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'equal_timestamp_ignored');
  assert.equal(result.mutated, false);

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'active'); // NOT regressed!
});

test('Ordering: equal-timestamp UPDATED arriving on pending state does not elevate entitlement', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');

  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-EQUAL-PEND',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'pending_initial_payment',
    latest_event_timestamp_ms: eventTimeMs,
  });

  const equalUpdated = normalizeEvent({
    id: 'EVT-UPD-EQUAL',
    event_type: 'BILLING.SUBSCRIPTION.UPDATED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: { id: 'I-SUB-EQUAL-PEND', plan_id: SANDBOX_ULTIMATE_PLAN_ID },
  });

  const result = await processWebhookEvent({ databases: db, users, event: equalUpdated, nowMs: eventTimeMs + 1000, env: TEST_ENV });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'equal_timestamp_ignored');
  assert.equal(result.mutated, false);
});

test('Ordering: equal-timestamp PAYMENT.SALE.COMPLETED on pending state is allowed to confirm payment', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');

  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-EQUAL-CONFIRM',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'pending_initial_payment',
    latest_event_timestamp_ms: eventTimeMs,
  });

  const equalSale = normalizeEvent({
    id: 'EVT-SALE-EQUAL-CONFIRM',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-CONFIRM-1',
      billing_agreement_id: 'I-SUB-EQUAL-CONFIRM',
      amount: { total: '5.00', currency: 'USD' },
      billing_info: { next_billing_time: new Date(eventTimeMs + 30 * 86400000).toISOString() },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: equalSale, nowMs: eventTimeMs + 2000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'active');
  assert.equal(result.effectivePlan, 'pro');
});

// ==================================================
// 8. Lifecycle: ACTIVATED alone grants NO paid entitlement
// ==================================================
test('Lifecycle: ACTIVATED alone sets status pending_initial_payment and grants zero paid access', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-ACT-001',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'I-SUB-001',
      plan_id: SANDBOX_PRO_PLAN_ID,
      custom_id: QA_USER_ID,
      status: 'ACTIVE',
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'pending_initial_payment');
  assert.equal(result.plan, 'pro');
  assert.equal(result.effectivePlan, 'free');
});

// ==================================================
// 9. Lifecycle: CANCELLED, SUSPENDED, EXPIRED, REFUNDED
// ==================================================
test('Lifecycle: CANCELLED sets will_renew=false and preserves current expiration', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paidExpiry = new Date(nowMs + 20 * 86400000).toISOString();

  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-CANCEL',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: paidExpiry,
    will_renew: true,
    latest_event_timestamp_ms: nowMs,
  });

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-001',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(nowMs + 5000).toISOString(),
    resource: { id: 'I-SUB-CANCEL' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: cancelEvent, nowMs: nowMs + 5000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'canceled');

  const stateDoc = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(stateDoc.status, 'canceled');
  assert.equal(stateDoc.will_renew, false);
  assert.equal(stateDoc.expires_at, paidExpiry);
  assert.equal(result.effectivePlan, 'pro');
});

test('Lifecycle: SUSPENDED and EXPIRED remove paid access', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-SUSP',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    latest_event_timestamp_ms: nowMs,
  });

  const suspEvent = normalizeEvent({
    id: 'EVT-SUSP-001',
    event_type: 'BILLING.SUBSCRIPTION.SUSPENDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: { id: 'I-SUB-SUSP' },
  });
  const suspResult = await processWebhookEvent({ databases: db, users, event: suspEvent, nowMs: nowMs + 1000, env: TEST_ENV });
  assert.equal(suspResult.status, 'suspended');
  assert.equal(suspResult.effectivePlan, 'free');

  const expEvent = normalizeEvent({
    id: 'EVT-EXP-001',
    event_type: 'BILLING.SUBSCRIPTION.EXPIRED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: { id: 'I-SUB-SUSP' },
  });
  const expResult = await processWebhookEvent({ databases: db, users, event: expEvent, nowMs: nowMs + 2000, env: TEST_ENV });
  assert.equal(expResult.status, 'expired');
  assert.equal(expResult.effectivePlan, 'free');
});

// ==================================================
// 9. Refund & Reversal Policy Tests (Option B: 38-Test Matrix)
// ==================================================

test('Option B 01: normal SALE.COMPLETED persists payment ID + timestamp', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-01',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-01',
      billing_agreement_id: 'I-SUB-01',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: expiryIso },
    },
  });

  const res = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  assert.equal(res.outcome, 'processed');
  assert.equal(res.status, 'active');
  assert.equal(res.effectivePlan, 'premium');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-01');
  assert.equal(state.last_entitlement_payment_ts_ms, nowMs);
  assert.equal(state.renewal_cancellation_pending, false);

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-01');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.payment_id, 'TX-PAY-01');
});

test('Option B 02: payment identity retained after full refund', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-02',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-02',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-02',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-02',
      sale_id: 'TX-PAY-02',
      billing_agreement_id: 'I-SUB-02',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-02', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'refund_and_cancellation_settled');
  assert.equal(res.effectivePlan, 'free');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.expires_at, null);
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-02');
  assert.equal(state.last_entitlement_payment_ts_ms, nowMs);
});

test('Option B 03: later valid payment replaces identity', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-03-OLD',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'canceled',
    expires_at: null,
    will_renew: false,
    last_entitlement_payment_id: 'TX-PAY-03-OLD',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs + 1000,
  });

  const newSaleTime = nowMs + 20000;
  const newExpiry = '2026-11-03T12:00:00.000Z';
  const newSaleEvent = normalizeEvent({
    id: 'EVT-SALE-03-NEW',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(newSaleTime).toISOString(),
    resource: {
      id: 'TX-PAY-03-NEW',
      billing_agreement_id: 'I-SUB-03-NEW',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: newExpiry },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: newSaleEvent,
    nowMs: newSaleTime,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.status, 'active');
  assert.equal(res.effectivePlan, 'pro');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.subscription_id, 'I-SUB-03-NEW');
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-03-NEW');
  assert.equal(state.last_entitlement_payment_ts_ms, newSaleTime);
  assert.equal(state.expires_at, newExpiry);
});

test('Option B 04: current full refund revokes entitlement immediately and cancels renewal', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-04',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-04',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;
  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-04',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'TX-REF-04',
      sale_id: 'TX-PAY-04',
      billing_agreement_id: 'I-SUB-04',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-04', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async (subId) => {
      cancelerCalled = true;
      assert.equal(subId, 'I-SUB-04');
      return { ok: true, status: 'canceled' };
    },
  });

  assert.equal(cancelerCalled, true);
  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'refund_and_cancellation_settled');
  assert.equal(res.effectivePlan, 'free');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'canceled');
  assert.equal(state.will_renew, false);
  assert.equal(state.renewal_cancellation_pending, false);
  assert.equal(state.expires_at, null);
  assert.equal(state.grace_period_expires_at, null);
});

test('Option B 05: current partial refund preserves entitlement and renewal', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-05',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-05',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;
  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-05',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'TX-REF-05',
      sale_id: 'TX-PAY-05',
      billing_agreement_id: 'I-SUB-05',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: {
        id: 'TX-PAY-05',
        status: 'PARTIALLY_REFUNDED',
        amount: { value: '15.00' },
      },
    }),
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(cancelerCalled, false);
  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'partial_refund_recorded');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.will_renew, true);
});

test('Option B 06: unexpected provider transaction status fails closed with zero entitlement mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-06',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-06',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;
  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-06',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'TX-REF-06',
      sale_id: 'TX-PAY-06',
      billing_agreement_id: 'I-SUB-06',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs: nowMs + 2000,
        env: TEST_ENV,
        subscriptionTransactionsFetcher: async () => ({
          found: true,
          transaction: {
            id: 'TX-PAY-06',
            status: 'DENIED',
          },
        }),
        subscriptionCanceler: async () => {
          cancelerCalled = true;
          return { ok: true, status: 'canceled' };
        },
      });
    },
    (err) => {
      assert.equal(err.code, 'unsupported_provider_transaction_status');
      assert.equal(err.status, 502);
      assert.equal(err.isTransient, true);
      return true;
    }
  );

  assert.equal(cancelerCalled, false);
  const ledger = db.collections.paypal_event_ledger.get(paypalWebhook.__test.ledgerDocumentId('EVT-REFUND-06'));
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'unsupported_provider_transaction_status');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.will_renew, true);
});

test('Option B 07: historical refund does not mutate active state', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const oldPaymentMs = Date.parse('2026-07-20T12:00:00.000Z'); // >30 days before
  const newPaymentMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-07',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-07-NEW',
    last_entitlement_payment_ts_ms: newPaymentMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: newPaymentMs,
  });

  // Ledger contains authoritative historical sale with old timestamp
  const saleDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-07-OLD');
  db.collections.paypal_event_ledger.set(saleDocId, {
    $id: saleDocId,
    event_id: 'EVT-SALE-07-OLD',
    event_type: 'PAYMENT.SALE.COMPLETED',
    subscription_id: 'I-SUB-07',
    payment_id: 'TX-PAY-07-OLD',
    event_timestamp_ms: oldPaymentMs,
    processing_status: 'processed',
    outcome_code: 'sale_activated',
  });

  let fetchedTargetTimestampMs = null;
  let cancelerCalled = false;

  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-07',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(newPaymentMs + 5000).toISOString(),
    resource: {
      id: 'TX-REF-07-OLD',
      sale_id: 'TX-PAY-07-OLD',
      billing_agreement_id: 'I-SUB-07',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: newPaymentMs + 5000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async ({ targetTimestampMs }) => {
      fetchedTargetTimestampMs = targetTimestampMs;
      return {
        found: true,
        transaction: { id: 'TX-PAY-07-OLD', status: 'REFUNDED', time: new Date(oldPaymentMs).toISOString() },
      };
    },
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(fetchedTargetTimestampMs, oldPaymentMs, 'Transactions fetcher must receive OLD_TIMESTAMP, NOT NEW_TIMESTAMP');
  assert.equal(cancelerCalled, false);
  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'historical_refund_ignored');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
});

test('Option B 07b: historical refund with missing old sale ledger timestamp fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const newPaymentMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-07B',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-07B-NEW',
    last_entitlement_payment_ts_ms: newPaymentMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: newPaymentMs,
  });

  // No historical sale ledger entry present
  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-07B',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(newPaymentMs + 5000).toISOString(),
    resource: {
      id: 'TX-REF-07B-OLD',
      sale_id: 'TX-PAY-07B-OLD',
      billing_agreement_id: 'I-SUB-07B',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: newPaymentMs + 5000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'unresolved_historical_payment_timestamp');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
});

test('Option B 08: current reversal revokes entitlement while retaining truthful provider status', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-08',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-08',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const reverseEvent = normalizeEvent({
    id: 'EVT-REV-08',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-PAY-08',
      parent_payment: 'PAYID-PARENT-08',
      billing_agreement_id: 'I-SUB-08',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: reverseEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'reversal_entitlement_revoked');
  assert.equal(res.mutated, true);
  assert.equal(res.effectivePlan, 'free');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.expires_at, null);
  assert.equal(state.grace_period_expires_at, null);
  assert.equal(state.status, 'active');
  assert.equal(state.will_renew, true);
});

test('Option B 09: historical reversal does not mutate active state', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-09',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-09-NEW',
    last_entitlement_payment_ts_ms: nowMs + 10000,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs + 10000,
  });

  // Seed historical sale in ledger
  const oldSaleDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-09-OLD');
  db.collections.paypal_event_ledger.set(oldSaleDocId, {
    $id: oldSaleDocId,
    event_id: 'EVT-SALE-09-OLD',
    event_type: 'PAYMENT.SALE.COMPLETED',
    subscription_id: 'I-SUB-09',
    payment_id: 'TX-PAY-09-OLD',
    event_timestamp_ms: nowMs,
    processing_status: 'processed',
    outcome_code: 'sale_activated',
  });

  const reverseEvent = normalizeEvent({
    id: 'EVT-REV-09',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-09-OLD',
      parent_payment: 'PAYID-PARENT-09-OLD',
      billing_agreement_id: 'I-SUB-09',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: reverseEvent,
    nowMs: nowMs + 11000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'historical_reversal_ignored');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
});

test('Option B 09b: delayed historical reversal arriving after newer payment timestamp ignores reversal and preserves entitlement (Blocker 1)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const oldPaymentMs = Date.parse('2026-07-20T12:00:00.000Z');
  const newPaymentMs = Date.parse('2026-09-03T12:00:00.000Z'); // >30 days later
  const reversalArrivalMs = Date.parse('2026-10-15T12:00:00.000Z'); // Arrives AFTER new payment timestamp!
  const expiryIso = '2026-11-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-09B',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-09B-NEW',
    last_entitlement_payment_ts_ms: newPaymentMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: newPaymentMs,
  });

  // Ledger contains authoritative historical sale for OLD_PAYMENT
  const oldSaleDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-09B-OLD');
  db.collections.paypal_event_ledger.set(oldSaleDocId, {
    $id: oldSaleDocId,
    event_id: 'EVT-SALE-09B-OLD',
    event_type: 'PAYMENT.SALE.COMPLETED',
    subscription_id: 'I-SUB-09B',
    payment_id: 'TX-PAY-09B-OLD',
    event_timestamp_ms: oldPaymentMs,
    processing_status: 'processed',
    outcome_code: 'sale_activated',
  });

  let cancelerCalled = false;
  const reverseEvent = normalizeEvent({
    id: 'EVT-REV-09B',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(reversalArrivalMs).toISOString(), // > newPaymentMs
    resource: {
      id: 'TX-PAY-09B-OLD',
      parent_payment: 'PAYID-PARENT-09B-OLD',
      billing_agreement_id: 'I-SUB-09B',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: reverseEvent,
    nowMs: reversalArrivalMs + 1000,
    env: TEST_ENV,
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(cancelerCalled, false, 'Provider cancellation must be ZERO');
  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'historical_reversal_ignored');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-09B-NEW');
  assert.equal(state.last_entitlement_payment_ts_ms, newPaymentMs);
});

test('Option B 09c: historical reversal with missing historical sale evidence fails closed with zero mutation (Blocker 1)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const newPaymentMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-09C',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-09C-NEW',
    last_entitlement_payment_ts_ms: newPaymentMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: newPaymentMs,
  });

  // NO historical sale record in ledger!
  const reverseEvent = normalizeEvent({
    id: 'EVT-REV-09C',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(newPaymentMs + 1000).toISOString(),
    resource: {
      id: 'TX-PAY-09C-UNKNOWN',
      parent_payment: 'PAYID-PARENT-09C',
      billing_agreement_id: 'I-SUB-09C',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: reverseEvent,
    nowMs: newPaymentMs + 2000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'unresolved_historical_reversal_correlation');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-09C-NEW');
});

test('Option B 10: refund before delayed SALE records tombstone and prevents activation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_10';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-10',
    user_id: QA_USER_ID,
  });

  // 1. Refund arrives out of order
  const refundEvent = normalizeEvent({
    id: 'EVT-REF-10',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-10',
      sale_id: 'TX-PAY-10',
      billing_agreement_id: 'I-SUB-10',
    },
  });

  await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-10', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  // 2. Delayed PAYMENT.SALE.COMPLETED arrives
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-10',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs - 5000).toISOString(),
    resource: {
      id: 'TX-PAY-10',
      billing_agreement_id: 'I-SUB-10',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const saleRes = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-10', status: 'REFUNDED' },
    }),
  });

  assert.equal(saleRes.outcome, 'ignored');
  assert.equal(saleRes.code, 'sale_already_refunded');
  assert.equal(saleRes.mutated, false);
});

test('Option B 11: reversal before delayed SALE records tombstone and prevents activation (Blocker 2)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_11';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-11',
    user_id: QA_USER_ID,
  });

  // 1. Reversal arrives out of order
  const revEvent = normalizeEvent({
    id: 'EVT-REV-11',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-11',
      parent_payment: 'PAYID-PARENT-11',
      billing_agreement_id: 'I-SUB-11',
    },
  });

  await processWebhookEvent({
    databases: db,
    users,
    event: revEvent,
    nowMs,
    env: TEST_ENV,
  });

  // 2. Delayed PAYMENT.SALE.COMPLETED arrives
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-11',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs - 5000).toISOString(),
    resource: {
      id: 'TX-PAY-11',
      billing_agreement_id: 'I-SUB-11',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  let fetcherCalled = false;
  const saleRes = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => {
      fetcherCalled = true;
      throw new Error('Transactions API must NOT be called for reversal tombstone');
    },
  });

  assert.equal(fetcherCalled, false, 'Transactions API must NOT be called for reversal tombstone');
  assert.equal(saleRes.outcome, 'ignored');
  assert.equal(saleRes.code, 'sale_already_refunded');
  assert.equal(saleRes.mutated, false);

  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state?.expires_at || null, null, 'expires_at must remain null');
  assert.notEqual(state?.status, 'active', 'paid plan must NOT be restored');
});

test('Option B 12: normal SALE has no unnecessary Transactions API call', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  let fetcherCallCount = 0;
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-12',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-12',
      billing_agreement_id: 'I-SUB-12',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => {
      fetcherCallCount++;
      return { found: false };
    },
  });

  assert.equal(fetcherCallCount, 0, 'Transactions API must NOT be called for normal sale');
  assert.equal(res.outcome, 'processed');
  assert.equal(res.status, 'active');
});

test('Option B 13: provider transaction not converged triggers retryable 503 error', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-13',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-13',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-13',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-13',
      sale_id: 'TX-PAY-13',
      billing_agreement_id: 'I-SUB-13',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
        subscriptionTransactionsFetcher: async () => ({
          found: true,
          transaction: { id: 'TX-PAY-13', status: 'COMPLETED' },
        }),
      });
    },
    (err) => {
      assert.equal(err.code, 'provider_state_not_converged');
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );
});

test('Option B 13b: provider transaction PENDING triggers retryable 503 error', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-13B',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-13B',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-13B',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-13B',
      sale_id: 'TX-PAY-13B',
      billing_agreement_id: 'I-SUB-13B',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
        subscriptionTransactionsFetcher: async () => {
          return {
            found: true,
            transaction: {
              id: 'TX-PAY-13B',
              status: 'PENDING',
            },
          };
        },
      });
    },
    (err) => {
      assert.equal(err.code, 'provider_state_not_converged');
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );

  // Assert state mutation is ZERO (paid entitlement preserved)
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, '2026-10-03T12:00:00.000Z');
  assert.equal(state.will_renew, true);

  // Assert ledger records retryable failure
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REFUND-13B');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'provider_state_not_converged');
});

test('Option B 14: fetchSubscriptionTransactions returns found: false when transaction missing', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ transactions: [{ id: 'TX-OTHER' }], total_pages: 1, links: [] }),
      };
    };

    const res = await fetchSubscriptionTransactions({
      subscriptionId: 'I-SUB-14',
      targetPaymentId: 'TX-MISSING',
      targetTimestampMs: 100000,
      nowMs: 200000,
      env: TEST_ENV,
    });
    assert.equal(res.found, false);
    assert.equal(res.transaction, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 15: fetchSubscriptionTransactions throws malformed_transaction_response on non-JSON', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => { throw new Error('Unexpected token <'); },
      };
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-15',
          targetPaymentId: 'TX-TARGET',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.code, 'malformed_transaction_response');
        assert.equal(err.isTransient, true);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 16: fetchSubscriptionTransactions marks network timeout as transient', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      const err = new Error('connect ETIMEDOUT');
      err.code = 'ETIMEDOUT';
      throw err;
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-16',
          targetPaymentId: 'TX-TARGET',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.isTransient, true);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 17: fetchSubscriptionTransactions traverses HATEOAS next link to find transaction', async () => {
  const originalFetch = global.fetch;
  try {
    let callCount = 0;
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            transactions: [{ id: 'TX-PAGE1' }],
            total_pages: 2,
            links: [{
              rel: 'next',
              href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-17/transactions?start_time=2026-09-01T00%3A00%3A00.000Z&end_time=2026-09-03T00%3A00%3A00.000Z&page=2',
            }],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [{ id: 'TX-TARGET-17', status: 'REFUNDED' }],
          total_pages: 2,
          links: [],
        }),
      };
    };

    const res = await fetchSubscriptionTransactions({
      subscriptionId: 'I-SUB-17',
      targetPaymentId: 'TX-TARGET-17',
      targetTimestampMs: 100000,
      nowMs: 200000,
      env: TEST_ENV,
    });

    assert.equal(res.found, true);
    assert.equal(res.transaction.id, 'TX-TARGET-17');
    assert.equal(callCount, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 18: fetchSubscriptionTransactions rejects invalid external next URL', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [{ id: 'TX-PAGE1' }],
          total_pages: 2,
          links: [{
            rel: 'next',
            href: 'https://attacker.evil.com/v1/billing/subscriptions/I-SUB-18/transactions',
          }],
        }),
      };
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-18',
          targetPaymentId: 'TX-TARGET-18',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.code, 'invalid_provider_pagination_link');
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 19: fetchSubscriptionTransactions rejects wrong-subscription next URL', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [{ id: 'TX-PAGE1' }],
          total_pages: 2,
          links: [{
            rel: 'next',
            href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-OTHER-SUB/transactions',
          }],
        }),
      };
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-19',
          targetPaymentId: 'TX-TARGET-19',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.code, 'invalid_provider_pagination_link');
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 20: fetchSubscriptionTransactions throws when multiple pages claimed but next link missing', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [{ id: 'TX-PAGE1' }],
          total_pages: 3,
          links: [],
        }),
      };
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-20',
          targetPaymentId: 'TX-TARGET-20',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.code, 'missing_provider_pagination_link');
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 21: fetchSubscriptionTransactions throws when internal safety limit reached', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          transactions: [{ id: 'TX-LOOP' }],
          total_pages: 100,
          links: [{
            rel: 'next',
            href: 'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-21/transactions?page=next',
          }],
        }),
      };
    };

    await assert.rejects(
      async () => {
        await fetchSubscriptionTransactions({
          subscriptionId: 'I-SUB-21',
          targetPaymentId: 'TX-TARGET-21',
          targetTimestampMs: 100000,
          nowMs: 200000,
          env: TEST_ENV,
        });
      },
      (err) => {
        assert.equal(err.code, 'transaction_lookup_safety_limit_reached');
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('Option B 22: true legacy migration-on-touch populates payment identity without ledger payment_id (Blocker A)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-22-LEGACY',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: null,
    last_entitlement_payment_ts_ms: null,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  // True legacy SALE ledger: pre-PR#301 documents had NO payment_id attribute!
  const saleDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-22');
  db.collections.paypal_event_ledger.set(saleDocId, {
    $id: saleDocId,
    event_id: 'EVT-SALE-22',
    event_type: 'PAYMENT.SALE.COMPLETED',
    subscription_id: 'I-SUB-22-LEGACY',
    event_timestamp_ms: nowMs,
    processing_status: 'processed',
    outcome_code: 'state_updated',
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-22',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-22',
      sale_id: 'TX-LEGACY-22',
      billing_agreement_id: 'I-SUB-22-LEGACY',
    },
  });

  let transactionsQueryRan = false;
  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionFetcher: async () => ({
      id: 'I-SUB-22-LEGACY',
      start_time: new Date(nowMs - 86400000).toISOString(),
    }),
    subscriptionTransactionsFetcher: async ({ subscriptionId, targetPaymentId, startTimeMs, endTimeMs }) => {
      transactionsQueryRan = true;
      assert.equal(subscriptionId, 'I-SUB-22-LEGACY');
      assert.equal(targetPaymentId, 'TX-LEGACY-22');
      assert.equal(startTimeMs, nowMs - 86400000);
      assert.equal(endTimeMs, nowMs + 1000);
      return {
        found: true,
        transaction: { id: 'TX-LEGACY-22', status: 'REFUNDED', time: new Date(nowMs).toISOString() },
      };
    },
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  assert.equal(transactionsQueryRan, true);
  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'refund_and_cancellation_settled');
  assert.equal(res.mutated, true);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.last_entitlement_payment_id, 'TX-LEGACY-22');
  assert.equal(state.last_entitlement_payment_ts_ms, nowMs);
  assert.equal(state.expires_at, null);
  assert.equal(state.status, 'canceled');
  assert.equal(state.will_renew, false);
});

test('Option B 22b: legacy state with missing/invalid provider start_time fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-22B-LEGACY',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: null,
    last_entitlement_payment_ts_ms: null,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-22B',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-22B',
      sale_id: 'TX-LEGACY-22B',
      billing_agreement_id: 'I-SUB-22B-LEGACY',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionFetcher: async () => ({
      id: 'I-SUB-22B-LEGACY',
      start_time: 'invalid-not-a-date',
    }),
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'unresolved_legacy_payment_correlation');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.last_entitlement_payment_id, null);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, '2026-10-03T12:00:00.000Z');
});

test('Option B 23: ambiguous legacy correlation fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-23',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-23',
      sale_id: 'TX-UNKNOWN-23',
      billing_agreement_id: null,
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'unresolved_subscription_correlation');
  assert.equal(res.mutated, false);
});

test('Option B 23b: ambiguous payment correlation across multiple states fails closed without state mutation (Blocker C)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Create two distinct user states that share the same last_entitlement_payment_id
  const stateDocId1 = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const stateDocId2 = paypalWebhook.__test.stateDocumentId(OTHER_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId1, {
    $id: stateDocId1,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-AMBIGUOUS-1',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-SHARED',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  db.collections.paypal_subscription_state.set(stateDocId2, {
    $id: stateDocId2,
    user_id: OTHER_USER_ID,
    subscription_id: 'I-SUB-AMBIGUOUS-2',
    plan: 'pro',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-SHARED',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;

  // Direct test of findStateByPaymentId: must throw ambiguous_payment_state_correlation
  await assert.rejects(
    async () => {
      await findStateByPaymentId(db, 'TX-PAY-SHARED');
    },
    (err) => {
      assert.equal(err.code, 'ambiguous_payment_state_correlation');
      return true;
    }
  );

  // Refund arrives for TX-PAY-SHARED with no billing_agreement_id
  const refundEvent = normalizeEvent({
    id: 'EVT-REF-AMBIGUOUS',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-AMB',
      sale_id: 'TX-PAY-SHARED',
      billing_agreement_id: null,
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(cancelerCalled, false, 'Must not call cancel on ambiguous correlation');
  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'ambiguous_payment_state_correlation');
  assert.equal(res.mutated, false);

  // Assert neither state was mutated
  const state1 = db.collections.paypal_subscription_state.get(stateDocId1);
  const state2 = db.collections.paypal_subscription_state.get(stateDocId2);
  assert.equal(state1.status, 'active');
  assert.equal(state1.expires_at, '2026-10-03T12:00:00.000Z');
  assert.equal(state1.renewal_cancellation_pending, false);
  assert.equal(state2.status, 'active');
  assert.equal(state2.expires_at, '2026-10-03T12:00:00.000Z');
  assert.equal(state2.renewal_cancellation_pending, false);
});

test('Option B 24: full refund sets cancellation pending before provider cancellation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-24',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-24',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-24',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-24',
      sale_id: 'TX-PAY-24',
      billing_agreement_id: 'I-SUB-24',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
        subscriptionTransactionsFetcher: async () => ({
          found: true,
          transaction: { id: 'TX-PAY-24', status: 'REFUNDED' },
        }),
        subscriptionCanceler: async () => {
          const err = new Error('Transient cancel timeout');
          err.isTransient = true;
          err.status = 504;
          throw err;
        },
      });
    },
    (err) => {
      assert.equal(err.status, 503);
      return true;
    }
  );

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.renewal_cancellation_pending, true);
  assert.equal(state.expires_at, null);
});

test('Option B 25: cancellation success clears renewal_cancellation_pending', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-25',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-25',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-25',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-25',
      sale_id: 'TX-PAY-25',
      billing_agreement_id: 'I-SUB-25',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-25', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  assert.equal(res.outcome, 'processed');
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.renewal_cancellation_pending, false);
  assert.equal(state.status, 'canceled');
  assert.equal(state.will_renew, false);
});

test('Option B 26: cancellation timeout preserves pending flag and null expires_at', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-26',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-26',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-26',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-26',
      sale_id: 'TX-PAY-26',
      billing_agreement_id: 'I-SUB-26',
    },
  });

  await assert.rejects(async () => {
    await processWebhookEvent({
      databases: db,
      users,
      event: refundEvent,
      nowMs: nowMs + 1000,
      env: TEST_ENV,
      subscriptionTransactionsFetcher: async () => ({
        found: true,
        transaction: { id: 'TX-PAY-26', status: 'REFUNDED' },
      }),
      subscriptionCanceler: async () => {
        const err = new Error('Timeout contacting PayPal cancel endpoint');
        err.isTransient = true;
        throw err;
      },
    });
  });

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.renewal_cancellation_pending, true);
  assert.equal(state.expires_at, null);
});

test('Option B 26b: same refund event redelivery retries cancellation and settles (Blocker A)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-26B',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-26B',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const eventPayload = {
    id: 'EVT-REF-26B',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-26B',
      sale_id: 'TX-PAY-26B',
      billing_agreement_id: 'I-SUB-26B',
    },
  };

  // FIRST DELIVERY: cancel call throws transient timeout
  await assert.rejects(async () => {
    await processWebhookEvent({
      databases: db,
      users,
      event: normalizeEvent(eventPayload),
      nowMs: nowMs + 1000,
      env: TEST_ENV,
      subscriptionTransactionsFetcher: async () => ({
        found: true,
        transaction: { id: 'TX-PAY-26B', status: 'REFUNDED' },
      }),
      subscriptionCanceler: async () => {
        const err = new Error('Timeout contacting PayPal cancel endpoint');
        err.isTransient = true;
        throw err;
      },
    });
  });

  // Assert after first delivery:
  const state1 = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state1.expires_at, null);
  assert.equal(state1.renewal_cancellation_pending, true);
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REF-26B');
  const ledger1 = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger1.processing_status, 'failed');
  assert.equal(ledger1.outcome_code, 'provider_cancellation_pending_retry');

  // SECOND DELIVERY OF EXACT SAME REFUND EVENT:
  let cancelerCalledOnRetry = false;
  const res2 = await processWebhookEvent({
    databases: db,
    users,
    event: normalizeEvent(eventPayload),
    nowMs: nowMs + 2000,
    env: TEST_ENV,
    subscriptionFetcher: async () => ({
      id: 'I-SUB-26B',
      status: 'ACTIVE',
    }),
    subscriptionCanceler: async () => {
      cancelerCalledOnRetry = true;
      return { ok: true, status: 'canceled' };
    },
  });

  assert.notEqual(res2.code, 'equal_timestamp_ignored');
  assert.equal(cancelerCalledOnRetry, true, 'Cancellation retry must be called');
  assert.equal(res2.outcome, 'processed');
  assert.equal(res2.code, 'refund_and_cancellation_settled');
  assert.equal(res2.status, 'canceled');
  assert.equal(res2.effectivePlan, 'free');

  const state2 = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state2.status, 'canceled');
  assert.equal(state2.will_renew, false);
  assert.equal(state2.renewal_cancellation_pending, false);
  assert.equal(state2.expires_at, null);

  const ledger2 = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger2.processing_status, 'processed');
  assert.equal(ledger2.outcome_code, 'refund_and_cancellation_settled');
});

test('Option B 26c: same refund event redelivery when provider already canceled settles without calling cancel', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-26C',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-26C',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const eventPayload = {
    id: 'EVT-REF-26C',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-26C',
      sale_id: 'TX-PAY-26C',
      billing_agreement_id: 'I-SUB-26C',
    },
  };

  // First delivery fails cancellation
  await assert.rejects(async () => {
    await processWebhookEvent({
      databases: db,
      users,
      event: normalizeEvent(eventPayload),
      nowMs: nowMs + 1000,
      env: TEST_ENV,
      subscriptionTransactionsFetcher: async () => ({
        found: true,
        transaction: { id: 'TX-PAY-26C', status: 'REFUNDED' },
      }),
      subscriptionCanceler: async () => {
        const err = new Error('503 Service Unavailable');
        err.isTransient = true;
        throw err;
      },
    });
  });

  // Second delivery: provider already report CANCELLED
  let cancelerCalledOnRetry = false;
  const res2 = await processWebhookEvent({
    databases: db,
    users,
    event: normalizeEvent(eventPayload),
    nowMs: nowMs + 2000,
    env: TEST_ENV,
    subscriptionFetcher: async () => ({
      id: 'I-SUB-26C',
      status: 'CANCELLED',
    }),
    subscriptionCanceler: async () => {
      cancelerCalledOnRetry = true;
      return { ok: true, status: 'canceled' };
    },
  });

  assert.equal(cancelerCalledOnRetry, false, 'Should not call cancel if provider already CANCELLED');
  assert.equal(res2.outcome, 'processed');
  assert.equal(res2.code, 'refund_and_cancellation_settled');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'canceled');
  assert.equal(state.will_renew, false);
  assert.equal(state.renewal_cancellation_pending, false);
  assert.equal(state.expires_at, null);
});

test('Option B 27: ambiguous cancellation result preserves pending flag', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-27',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-27',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-27',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-27',
      sale_id: 'TX-PAY-27',
      billing_agreement_id: 'I-SUB-27',
    },
  });

  await assert.rejects(async () => {
    await processWebhookEvent({
      databases: db,
      users,
      event: refundEvent,
      nowMs: nowMs + 1000,
      env: TEST_ENV,
      subscriptionTransactionsFetcher: async () => ({
        found: true,
        transaction: { id: 'TX-PAY-27', status: 'REFUNDED' },
      }),
      subscriptionCanceler: async () => {
        const err = new Error('500 Internal Server Error from PayPal');
        err.status = 500;
        throw err;
      },
    });
  });

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.renewal_cancellation_pending, true);
  assert.equal(state.expires_at, null);
});

test('Option B 28: already-canceled provider settles idempotently without calling cancel', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-28',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-28',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;
  const refundEvent = normalizeEvent({
    id: 'EVT-REF-28',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-28',
      sale_id: 'TX-PAY-28',
      billing_agreement_id: 'I-SUB-28',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionFetcher: async () => ({ status: 'CANCELLED', plan_id: SANDBOX_ULTIMATE_PLAN_ID }),
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-28', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(cancelerCalled, false, 'Should not call cancel if provider already CANCELLED');
  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'refund_and_cancellation_settled');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'canceled');
  assert.equal(state.will_renew, false);
  assert.equal(state.renewal_cancellation_pending, false);
});

test('Option B 29: CANCELLED webhook clears renewal_cancellation_pending and maintains null expires_at', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-29',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: null,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-29',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: true,
    latest_event_timestamp_ms: nowMs + 1000,
  });

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-29',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'I-SUB-29',
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.status, 'canceled');
  assert.equal(res.effectivePlan, 'free');

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.renewal_cancellation_pending, false);
  assert.equal(state.expires_at, null);
  assert.equal(state.will_renew, false);
});

test('Option B 30: SALE.COMPLETED during cancellation pending does NOT activate entitlement', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-30',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: null,
    will_renew: true,
    last_entitlement_payment_id: 'TX-ORIG-30',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: true,
    latest_event_timestamp_ms: nowMs + 1000,
  });

  const unexpectedSaleEvent = normalizeEvent({
    id: 'EVT-SALE-30-UNEXPECTED',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'TX-SALE-30-UNEXPECTED',
      billing_agreement_id: 'I-SUB-30',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: unexpectedSaleEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'unexpected_payment_during_cancellation_pending');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.expires_at, null);
  assert.equal(state.renewal_cancellation_pending, true);
});

test('Option B 31: payment during cancellation pending does NOT replace current entitlement identity', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-31',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: null,
    will_renew: true,
    last_entitlement_payment_id: 'TX-ORIG-31',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: true,
    latest_event_timestamp_ms: nowMs + 1000,
  });

  const unexpectedSaleEvent = normalizeEvent({
    id: 'EVT-SALE-31-UNEXPECTED',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs + 2000).toISOString(),
    resource: {
      id: 'TX-SALE-31-UNEXPECTED',
      billing_agreement_id: 'I-SUB-31',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  await processWebhookEvent({
    databases: db,
    users,
    event: unexpectedSaleEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
  });

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.last_entitlement_payment_id, 'TX-ORIG-31');
  assert.equal(state.last_entitlement_payment_ts_ms, nowMs);
});

test('Option B 32: duplicate refund event is ignored idempotently', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-32',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-32',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-32',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-32',
      sale_id: 'TX-PAY-32',
      billing_agreement_id: 'I-SUB-32',
    },
  });

  const res1 = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: { id: 'TX-PAY-32', status: 'REFUNDED' },
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });
  assert.equal(res1.outcome, 'processed');

  const res2 = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
  });
  assert.equal(res2.outcome, 'duplicate');
  assert.equal(res2.code, 'already_recorded');
  assert.equal(res2.mutated, false);
});

test('Option B 33: duplicate reversal event is ignored idempotently', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-33',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-33',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const revEvent = normalizeEvent({
    id: 'EVT-REV-33',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-PAY-33',
      parent_payment: 'PAYID-PARENT-33',
      billing_agreement_id: 'I-SUB-33',
    },
  });

  const res1 = await processWebhookEvent({
    databases: db,
    users,
    event: revEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
  });
  assert.equal(res1.outcome, 'processed');

  const res2 = await processWebhookEvent({
    databases: db,
    users,
    event: revEvent,
    nowMs: nowMs + 2000,
    env: TEST_ENV,
  });
  assert.equal(res2.outcome, 'duplicate');
  assert.equal(res2.code, 'already_recorded');
  assert.equal(res2.mutated, false);
});

test('Option B 34: RevenueCat fallback remains valid when PayPal entitlement revoked', () => {
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paypalState = {
    plan: 'premium',
    environment: 'sandbox',
    status: 'canceled',
    expires_at: null,
    renewal_cancellation_pending: false,
    user_id: QA_USER_ID,
  };

  const rcSubscription = {
    plan: 'premium',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
  };

  const resolved = resolveEffectivePlan({
    subscription: rcSubscription,
    providerState: paypalState,
    providerEnvironment: 'sandbox',
    nowMs,
    currentUserId: QA_USER_ID,
    billingCheckoutQaUserId: QA_USER_ID,
  });

  assert.equal(resolved.plan, 'premium');
});

test('Option B 35: manual/admin fallback remains valid when PayPal entitlement revoked', () => {
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paypalState = {
    plan: 'premium',
    environment: 'sandbox',
    status: 'canceled',
    expires_at: null,
    renewal_cancellation_pending: false,
    user_id: QA_USER_ID,
  };

  const manualSubscription = {
    plan: 'pro',
  };

  const resolved = resolveEffectivePlan({
    subscription: manualSubscription,
    providerState: paypalState,
    providerEnvironment: 'sandbox',
    nowMs,
    currentUserId: QA_USER_ID,
    billingCheckoutQaUserId: QA_USER_ID,
  });

  assert.equal(resolved.plan, 'pro');
  assert.equal(resolved.source, 'manual/admin');
});

test('Option B 36: coupon/trial fallback remains valid when PayPal entitlement revoked', () => {
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paypalState = {
    plan: 'premium',
    environment: 'sandbox',
    status: 'canceled',
    expires_at: null,
    renewal_cancellation_pending: false,
    user_id: QA_USER_ID,
  };

  const couponSubscription = {
    plan: 'premium',
    coupon_code: 'SPECIAL_COUPON',
  };

  const resolved = resolveEffectivePlan({
    subscription: couponSubscription,
    providerState: paypalState,
    providerEnvironment: 'sandbox',
    nowMs,
    currentUserId: QA_USER_ID,
    billingCheckoutQaUserId: QA_USER_ID,
  });

  assert.equal(resolved.plan, 'premium');
  assert.equal(resolved.source, 'coupon');
});

test('Option B 37: Sandbox QA/environment isolation allows QA user and enforces sandbox rules', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const nonQaEvent = normalizeEvent({
    id: 'EVT-NON-QA',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-NON-QA',
      billing_agreement_id: 'I-SUB-NONQA',
      custom_id: OTHER_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: nonQaEvent,
    nowMs,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'sandbox_qa_boundary_rejected');
  assert.equal(res.mutated, false);
});

test('Option B 38: invalid environment fails closed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const refundEvent = normalizeEvent({
    id: 'EVT-PROD-GATE',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PROD-REF',
      sale_id: 'TX-PROD-PAY',
      billing_agreement_id: 'I-SUB-PROD',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: { ...TEST_ENV, PAYPAL_ACCESS_ENVIRONMENT: 'staging' },
  });

  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'unconfigured_paypal_environment');
  assert.equal(res.mutated, false);
});

test('Option B 39: normalizeEvent for PAYMENT.SALE.REFUNDED requires sale_id and does not fall back to resource.id', () => {
  const eventWithSaleId = normalizeEvent({
    id: 'EVT-NORM-REF-1',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-REFUND-ID',
      sale_id: 'TX-SALE-ID',
      billing_agreement_id: 'I-SUB-NORM-1',
    },
  });
  assert.equal(eventWithSaleId.paymentId, 'TX-SALE-ID');

  const eventWithoutSaleId = normalizeEvent({
    id: 'EVT-NORM-REF-2',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-REFUND-ID-ONLY',
      billing_agreement_id: 'I-SUB-NORM-2',
    },
  });
  assert.equal(eventWithoutSaleId.paymentId, '');
});

test('Option B 40: PAYMENT.SALE.REFUNDED missing sale_id fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-40',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-40',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  let cancelerCalled = false;
  const refundEventWithoutSaleId = normalizeEvent({
    id: 'EVT-REFUND-40',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-40',
      billing_agreement_id: 'I-SUB-40',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEventWithoutSaleId,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionCanceler: async () => {
      cancelerCalled = true;
    },
  });

  assert.equal(cancelerCalled, false);
  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'unresolved_payment_correlation');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.will_renew, true);
});

test('Option B 41: normalizeEvent for PAYMENT.SALE.REVERSED requires resource.id as sale paymentId and does not compare parent_payment to sale identity', () => {
  const event = normalizeEvent({
    id: 'EVT-NORM-REV-1',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      id: 'TX-ORIGINAL-SALE-ID',
      parent_payment: 'PAYID-SEPARATE-PAYMENT-ID',
      billing_agreement_id: 'I-SUB-NORM-3',
    },
  });
  assert.equal(event.paymentId, 'TX-ORIGINAL-SALE-ID');
  assert.equal(event.parentPaymentId, 'PAYID-SEPARATE-PAYMENT-ID');
  assert.notEqual(event.paymentId, event.parentPaymentId);

  const eventWithoutId = normalizeEvent({
    id: 'EVT-NORM-REV-2',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: '2026-09-03T12:00:00Z',
    resource: {
      parent_payment: 'PAYID-ONLY',
      billing_agreement_id: 'I-SUB-NORM-4',
    },
  });
  assert.equal(eventWithoutId.paymentId, '');
});

test('Option B 42: PAYMENT.SALE.REVERSED missing resource.id fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expiryIso = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-42',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: expiryIso,
    will_renew: true,
    last_entitlement_payment_id: 'TX-PAY-42',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const reverseEventWithoutId = normalizeEvent({
    id: 'EVT-REV-42',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      parent_payment: 'PAYID-PARENT-42',
      billing_agreement_id: 'I-SUB-42',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: reverseEventWithoutId,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'unresolved_payment_correlation');
  assert.equal(res.mutated, false);

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, expiryIso);
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-42');
});

test('Option B 43: tombstone lookup DB/infrastructure failure fails closed without entitlement activation (Blocker 3 Test A)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_43';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-43',
    user_id: QA_USER_ID,
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-43',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-43',
      billing_agreement_id: 'I-SUB-43',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  // Mock listDocuments to simulate infrastructure failure during tombstone query
  const originalListDocuments = db.listDocuments.bind(db);
  db.listDocuments = async (dbId, colId, queries) => {
    if (colId === 'paypal_event_ledger') {
      const err = new Error('Database cluster connection timeout during tombstone query');
      err.code = 'db_timeout';
      err.status = 500;
      throw err;
    }
    return originalListDocuments(dbId, colId, queries);
  };

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: saleEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
      });
    },
    (err) => {
      assert.equal(err.code, 'db_timeout');
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );

  // Assert state mutation is ZERO
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state mutation must be ZERO on tombstone DB failure');

  // Assert ledger records retryable failure
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-43');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'tombstone_lookup_failed');
});

test('Option B 44: ambiguous matching tombstone correlation fails closed without entitlement activation (Blocker 3 Test B)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_44';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-44',
    user_id: QA_USER_ID,
  });

  // Pre-seed two conflicting tombstones for the same payment_id under different subscriptions
  const tombDoc1 = paypalWebhook.__test.ledgerDocumentId('EVT-TOMB-44-1');
  db.collections.paypal_event_ledger.set(tombDoc1, {
    $id: tombDoc1,
    event_id: 'EVT-TOMB-44-1',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-44-A',
    payment_id: 'TX-PAY-44',
    event_timestamp_ms: nowMs - 2000,
    processing_status: 'processed',
    outcome_code: 'refund_and_cancellation_settled',
  });

  const tombDoc2 = paypalWebhook.__test.ledgerDocumentId('EVT-TOMB-44-2');
  db.collections.paypal_event_ledger.set(tombDoc2, {
    $id: tombDoc2,
    event_id: 'EVT-TOMB-44-2',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-44-B',
    payment_id: 'TX-PAY-44',
    event_timestamp_ms: nowMs - 1000,
    processing_status: 'processed',
    outcome_code: 'refund_and_cancellation_settled',
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-44',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-44',
      billing_agreement_id: 'I-SUB-44',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'ambiguous_payment_ledger_correlation');
  assert.equal(res.mutated, false);

  // Assert state mutation is ZERO
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state mutation must be ZERO on ambiguous tombstone');

  // Assert ledger records rejected status
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-44');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'rejected');
  assert.equal(ledger.outcome_code, 'ambiguous_payment_ledger_correlation');
});

test('Option B 45: verified refund tombstone + delayed SALE + Transactions API COMPLETED fails closed as provider_state_not_converged (Blocker B Test A)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_45';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-45',
    user_id: QA_USER_ID,
  });

  // 1. Seed verified refund tombstone in ledger
  const tombDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REFUND-45');
  db.collections.paypal_event_ledger.set(tombDocId, {
    $id: tombDocId,
    event_id: 'EVT-REFUND-45',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-45',
    user_id: QA_USER_ID,
    payment_id: 'TX-PAY-45',
    event_timestamp_ms: nowMs,
    processing_status: 'processed',
    outcome_code: 'refund_and_cancellation_settled',
  });

  // 2. Delayed PAYMENT.SALE.COMPLETED arrives
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-45',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs - 5000).toISOString(),
    resource: {
      id: 'TX-PAY-45',
      billing_agreement_id: 'I-SUB-45',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  // Transactions API has not converged yet and reports COMPLETED
  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: saleEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
        subscriptionTransactionsFetcher: async () => {
          return {
            found: true,
            transaction: {
              id: 'TX-PAY-45',
              status: 'COMPLETED',
            },
          };
        },
      });
    },
    (err) => {
      assert.equal(err.code, 'provider_state_not_converged');
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );

  // Assert state mutation is ZERO (no paid entitlement granted)
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state must NOT be activated when provider transaction status has not converged');

  // Assert ledger records retryable failure
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-45');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'provider_state_not_converged');
});

test('Option B 46: verified refund tombstone + delayed SALE + Transactions API PARTIALLY_REFUNDED allows normal sale activation (Blocker B Test B)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_46';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-46',
    user_id: QA_USER_ID,
  });

  // 1. Seed verified refund tombstone in ledger
  const tombDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REFUND-46');
  db.collections.paypal_event_ledger.set(tombDocId, {
    $id: tombDocId,
    event_id: 'EVT-REFUND-46',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-46',
    user_id: QA_USER_ID,
    payment_id: 'TX-PAY-46',
    event_timestamp_ms: nowMs,
    processing_status: 'processed',
    outcome_code: 'partial_refund_recorded',
  });

  // 2. Delayed PAYMENT.SALE.COMPLETED arrives
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-46',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs - 5000).toISOString(),
    resource: {
      id: 'TX-PAY-46',
      billing_agreement_id: 'I-SUB-46',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => {
      return {
        found: true,
        transaction: {
          id: 'TX-PAY-46',
          status: 'PARTIALLY_REFUNDED',
        },
      };
    },
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'state_updated');
  assert.equal(res.mutated, true);

  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, '2026-10-03T12:00:00.000Z');
  assert.equal(state.last_entitlement_payment_id, 'TX-PAY-46');
});

test('Option B 47: reversal tombstone takes strict precedence over refund tombstone (reversal > refund) (Blocker C)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_47';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-47',
    user_id: QA_USER_ID,
  });

  // Seed BOTH a refund tombstone AND a reversal tombstone for the same payment
  const refundDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REF-47');
  db.collections.paypal_event_ledger.set(refundDocId, {
    $id: refundDocId,
    event_id: 'EVT-REF-47',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-47',
    user_id: QA_USER_ID,
    payment_id: 'TX-PAY-47',
    event_timestamp_ms: nowMs - 2000,
    processing_status: 'processed',
    outcome_code: 'partial_refund_recorded',
  });

  const revDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REV-47');
  db.collections.paypal_event_ledger.set(revDocId, {
    $id: revDocId,
    event_id: 'EVT-REV-47',
    event_type: 'PAYMENT.SALE.REVERSED',
    subscription_id: 'I-SUB-47',
    user_id: QA_USER_ID,
    payment_id: 'TX-PAY-47',
    event_timestamp_ms: nowMs - 1000,
    processing_status: 'processed',
    outcome_code: 'reversal_entitlement_revoked',
  });

  // Delayed PAYMENT.SALE.COMPLETED arrives
  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-47',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs - 5000).toISOString(),
    resource: {
      id: 'TX-PAY-47',
      billing_agreement_id: 'I-SUB-47',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  let fetcherCalled = false;
  const res = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => {
      fetcherCalled = true;
      return { found: true, transaction: { id: 'TX-PAY-47', status: 'PARTIALLY_REFUNDED' } };
    },
  });

  // Reversal tombstone MUST win immediately without calling Transactions API
  assert.equal(fetcherCalled, false, 'Transactions API must NOT be called when reversal tombstone exists');
  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'sale_already_refunded');
  assert.equal(res.mutated, false);

  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state mutation must be ZERO');
});

test('Option B 48: missing schema attribute or index during tombstone lookup fails closed as retryable 503 (Blocker D)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_48';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-48',
    user_id: QA_USER_ID,
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-48',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-48',
      billing_agreement_id: 'I-SUB-48',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  // Simulate Appwrite throwing attribute or index not found error during tombstone lookup
  const originalListDocuments = db.listDocuments.bind(db);
  db.listDocuments = async (dbId, colId, queries) => {
    if (colId === 'paypal_event_ledger') {
      const err = new Error('Index not found: payment_idx on attribute payment_id');
      err.code = 404;
      throw err;
    }
    return originalListDocuments(dbId, colId, queries);
  };

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: saleEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
      });
    },
    (err) => {
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );

  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state mutation must be ZERO when tombstone index is unavailable');

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-48');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'tombstone_lookup_failed');
});

test('Option B 49: tombstone with mismatched canonical subscription identity fails closed (Section 10)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const sessDocId = 'sess_sub_49';
  db.collections.billing_checkout_sessions.set(sessDocId, {
    $id: sessDocId,
    subscription_id: 'I-SUB-49',
    user_id: QA_USER_ID,
  });

  // Seed tombstone under a different subscription ID
  const tombDocId = paypalWebhook.__test.ledgerDocumentId('EVT-REF-49');
  db.collections.paypal_event_ledger.set(tombDocId, {
    $id: tombDocId,
    event_id: 'EVT-REF-49',
    event_type: 'PAYMENT.SALE.REFUNDED',
    subscription_id: 'I-SUB-OTHER-CONFLICTING',
    user_id: QA_USER_ID,
    payment_id: 'TX-PAY-49',
    event_timestamp_ms: nowMs - 1000,
    processing_status: 'processed',
    outcome_code: 'sale_already_refunded',
  });

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-49',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PAY-49',
      billing_agreement_id: 'I-SUB-49',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
  });

  assert.equal(res.outcome, 'rejected');
  assert.equal(res.code, 'ambiguous_payment_ledger_correlation');
  assert.equal(res.mutated, false);

  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state, undefined, 'Provider state mutation must be ZERO on mismatched tombstone identity');
});

test('Option B 50: historical refund with malformed provider tx.time does not revoke current entitlement (Blocker C)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const oldSaleMs = nowMs - 86400000 * 30; // 30 days prior
  const currentExpiry = '2026-10-03T12:00:00.000Z';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  // Current state has a NEWER payment
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-50',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: currentExpiry,
    will_renew: true,
    last_entitlement_payment_id: 'TX-NEW-50',
    last_entitlement_payment_ts_ms: nowMs,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  // Historical ledger gives authoritative timestamp for older payment
  const oldSaleDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-OLD-50');
  db.collections.paypal_event_ledger.set(oldSaleDocId, {
    $id: oldSaleDocId,
    event_id: 'EVT-SALE-OLD-50',
    event_type: 'PAYMENT.SALE.COMPLETED',
    subscription_id: 'I-SUB-50',
    payment_id: 'TX-OLD-50',
    event_timestamp_ms: oldSaleMs,
    processing_status: 'processed',
    outcome_code: 'state_updated',
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-50',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-50',
      sale_id: 'TX-OLD-50',
      billing_agreement_id: 'I-SUB-50',
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs: nowMs + 1000,
    env: TEST_ENV,
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: {
        id: 'TX-OLD-50',
        status: 'REFUNDED',
        time: 'not-a-valid-date-format', // Malformed provider time
      },
    }),
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'historical_refund_ignored');
  assert.equal(res.mutated, false);

  // Assert current entitlement is NOT revoked
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, currentExpiry);
  assert.equal(state.last_entitlement_payment_id, 'TX-NEW-50');
  assert.equal(state.last_entitlement_payment_ts_ms, nowMs);
});

test('Option B 51: legacy state with malformed provider tx.time fails closed without state mutation (Blocker C)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: 'I-SUB-51-LEGACY',
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: null,
    last_entitlement_payment_ts_ms: null,
    renewal_cancellation_pending: false,
    latest_event_timestamp_ms: nowMs,
  });

  const refundEvent = normalizeEvent({
    id: 'EVT-REF-51',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs + 1000).toISOString(),
    resource: {
      id: 'TX-REF-51',
      sale_id: 'TX-LEGACY-51',
      billing_agreement_id: 'I-SUB-51-LEGACY',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs: nowMs + 1000,
        env: TEST_ENV,
        subscriptionFetcher: async () => ({
          id: 'I-SUB-51-LEGACY',
          start_time: new Date(nowMs - 86400000).toISOString(),
        }),
        subscriptionTransactionsFetcher: async () => ({
          found: true,
          transaction: {
            id: 'TX-LEGACY-51',
            status: 'REFUNDED',
            time: 'malformed-date',
          },
        }),
      });
    },
    (err) => {
      assert.equal(err.code, 'invalid_provider_transaction_time');
      assert.equal(err.status, 502);
      assert.equal(err.isTransient, true);
      return true;
    }
  );

  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(state.last_entitlement_payment_id, null);
  assert.equal(state.status, 'active');
  assert.equal(state.expires_at, '2026-10-03T12:00:00.000Z');
});

// ==================================================
// 10. HTTP Interface Tests
// ==================================================
test('HTTP Handler: Missing PayPal headers returns HTTP 400', async () => {
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };
  const req = { headers: {}, bodyText: '{}' };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  assert.equal(responseStatus, 400);
  assert.equal(responseData?.code, 'missing_webhook_headers');
});

test('HTTP Handler: Malformed JSON body returns HTTP 400', async () => {
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };
  const req = {
    headers: {
      'paypal-transmission-id': 'id',
      'paypal-transmission-time': 'time',
      'paypal-cert-url': 'url',
      'paypal-auth-algo': 'algo',
      'paypal-transmission-sig': 'sig',
    },
    bodyText: 'invalid json{',
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  assert.equal(responseStatus, 400);
  assert.equal(responseData?.code, 'malformed_body');
});

test('Bootstrap: Sandbox + valid credentials + missing PAYPAL_WEBHOOK_ID fails closed (HTTP 401, zero mutation, zero paid entitlement)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };

  const req = {
    headers: {
      'paypal-transmission-id': 'trans_bootstrap_001',
      'paypal-transmission-time': '2026-09-03T12:00:00Z',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'mock_sig',
    },
    bodyText: JSON.stringify({
      id: 'EVT-BOOTSTRAP-SALE',
      event_type: 'PAYMENT.SALE.COMPLETED',
      create_time: '2026-09-03T12:00:00Z',
      resource: {
        id: 'TX-BOOTSTRAP-1',
        billing_agreement_id: 'I-SUB-BOOTSTRAP',
        custom_id: QA_USER_ID,
        plan_id: SANDBOX_PRO_PLAN_ID,
      },
    }),
    __test: {
      databases: db,
      users,
      // Stage A configuration: credentials present, but PAYPAL_WEBHOOK_ID missing!
      env: {
        PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
        PAYPAL_CLIENT_ID: 'mock_sandbox_client_id',
        PAYPAL_CLIENT_SECRET: 'mock_sandbox_client_secret',
        BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
        PAYPAL_WEBHOOK_ID: '', // Absent in Stage A
      },
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  // Signature verification must fail closed immediately
  assert.equal(responseStatus, 401);
  assert.equal(responseData?.code, 'unconfigured_paypal_credentials');
  // Zero state mutation!
  assert.equal(db.collections.paypal_subscription_state.size, 0);
  // Zero event ledger mutation!
  assert.equal(db.collections.paypal_event_ledger.size, 0);
});

test('Bootstrap: valid PAYPAL_WEBHOOK_ID enables verified SUCCESS path to proceed to state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };

  const req = {
    headers: {
      'paypal-transmission-id': 'trans_activated_001',
      'paypal-transmission-time': '2026-09-03T12:00:00Z',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'mock_sig',
    },
    bodyText: JSON.stringify({
      id: 'EVT-ACTIVATED-STAGE-B',
      event_type: 'PAYMENT.SALE.COMPLETED',
      create_time: '2026-09-03T12:00:00Z',
      resource: {
        id: 'TX-ACTIVATED-1',
        billing_agreement_id: 'I-SUB-ACTIVATED',
        custom_id: QA_USER_ID,
        plan_id: SANDBOX_PRO_PLAN_ID,
        billing_info: { next_billing_time: '2026-10-03T12:00:00Z' },
      },
    }),
    __test: {
      databases: db,
      users,
      // Stage B configuration: PAYPAL_WEBHOOK_ID present!
      env: {
        PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
        PAYPAL_CLIENT_ID: 'mock_sandbox_client_id',
        PAYPAL_CLIENT_SECRET: 'mock_sandbox_client_secret',
        PAYPAL_WEBHOOK_ID: 'WH-SANDBOX-VERIFIED-123',
        BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
      },
      // Successful verification
      customVerifier: () => ({ ok: true, code: 'signature_valid' }),
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  assert.equal(responseStatus, 200);
  assert.equal(responseData?.status, 'success');
  assert.equal(responseData?.data?.ok, true);
  assert.equal(responseData?.data?.outcome, 'processed');

  // Provider state successfully mutated to active!
  assert.equal(db.collections.paypal_subscription_state.size, 1);
  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'active');
  assert.equal(state.plan, 'pro');
});

test('Bootstrap: Invalid environment remains strictly rejected and fails closed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };

  const req = {
    headers: {
      'paypal-transmission-id': 'trans_prod_001',
      'paypal-transmission-time': '2026-09-03T12:00:00Z',
      'paypal-cert-url': 'https://api.paypal.com/cert.pem',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'mock_sig',
    },
    bodyText: JSON.stringify({
      id: 'EVT-PROD-BLOCKED',
      event_type: 'PAYMENT.SALE.COMPLETED',
      create_time: '2026-09-03T12:00:00Z',
      resource: {
        id: 'TX-PROD-1',
        billing_agreement_id: 'I-SUB-PROD',
        custom_id: QA_USER_ID,
        plan_id: SANDBOX_PRO_PLAN_ID,
      },
    }),
    __test: {
      databases: db,
      users,
      env: {
        PAYPAL_ACCESS_ENVIRONMENT: 'staging',
        PAYPAL_CLIENT_ID: 'mock_prod_client_id',
        PAYPAL_CLIENT_SECRET: 'mock_prod_client_secret',
        PAYPAL_WEBHOOK_ID: 'WH-PROD-UNAUTHORIZED',
        BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
      },
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  // Signature verification fails closed because getPaypalApiBaseUrl returns empty string for staging!
  assert.equal(responseStatus, 401);
  assert.equal(responseData?.code, 'unconfigured_paypal_environment');
  assert.equal(db.collections.paypal_subscription_state.size, 0);
});

// ==================================================
// Section 10: Pre-Merge Real Lifecycle & Authority Regression Tests
// ==================================================

test('Lifecycle: ACTIVATED -> pending_initial_payment -> CANCELLED before payment results in zero paid entitlement (Free)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Step 1: ACTIVATED arrives
  const activatedEvent = normalizeEvent({
    id: 'EVT-ACT-THEN-CANCEL',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'I-SUB-ACT-CANCEL',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const actResult = await processWebhookEvent({ databases: db, users, event: activatedEvent, nowMs, env: TEST_ENV });
  assert.equal(actResult.outcome, 'processed');
  assert.equal(actResult.status, 'pending_initial_payment');
  assert.equal(actResult.effectivePlan, 'free'); // No paid entitlement!

  const stateAfterAct = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(stateAfterAct.status, 'pending_initial_payment');
  assert.equal(stateAfterAct.expires_at, null); // Zero fabricated expiry!

  // Step 2: CANCELLED arrives before any PAYMENT.SALE.COMPLETED
  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-BEFORE-PAY',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: {
      id: 'I-SUB-ACT-CANCEL',
    },
  });

  const cancelResult = await processWebhookEvent({ databases: db, users, event: cancelEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(cancelResult.outcome, 'processed');
  assert.equal(cancelResult.status, 'canceled');
  assert.equal(cancelResult.effectivePlan, 'free'); // STRICT REQUIREMENT: No paid entitlement!

  const stateAfterCancel = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(stateAfterCancel.status, 'canceled');
  assert.equal(stateAfterCancel.expires_at, null); // No fabricated future date!
});

test('UPDATED: active Pro with expires_at X + UPDATED reporting later next_billing_time Y leaves expires_at at X', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const existingExpiry = '2026-09-20T00:00:00.000Z';

  // Seed active Pro state
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-UPD-EXPIRY-FREEZE',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: existingExpiry,
    latest_event_timestamp_ms: nowMs,
  });

  // UPDATED arrives attempting to report a later next_billing_time
  const updatedEvent = normalizeEvent({
    id: 'EVT-UPD-LATER-EXPIRY',
    event_type: 'BILLING.SUBSCRIPTION.UPDATED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: {
      id: 'I-SUB-UPD-EXPIRY-FREEZE',
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-20T00:00:00.000Z' },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: updatedEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  // STRICT REQUIREMENT: expires_at remains strictly X, never advanced by UPDATED
  assert.equal(state.expires_at, existingExpiry);
});

test('Realistic SALE.COMPLETED shape (no plan_id/custom_id/next_billing_time in event) resolves via PayPal GET', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expectedBillingTime = '2026-10-03T12:00:00.000Z';

  // Realistic SALE.COMPLETED webhook payload: only transaction ID, subscription agreement ID, amount
  const realisticEvent = normalizeEvent({
    id: 'EVT-SALE-REALISTIC-SHAPE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REAL-99999',
      billing_agreement_id: 'I-SUB-REALISTIC-PRO',
      amount: { total: '5.00', currency: 'USD' },
    },
  });

  let fetcherCallCount = 0;
  const mockFetcher = async (subId) => {
    fetcherCallCount++;
    assert.equal(subId, 'I-SUB-REALISTIC-PRO');
    return {
      id: subId,
      status: 'ACTIVE',
      plan_id: SANDBOX_PRO_PLAN_ID,
      custom_id: QA_USER_ID,
      billing_info: { next_billing_time: expectedBillingTime },
    };
  };

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: realisticEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: mockFetcher,
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'active');
  assert.equal(result.plan, 'pro');
  assert.equal(result.effectivePlan, 'pro');
  assert.equal(fetcherCallCount, 1); // Memoized: exactly ONE fetch for correlation + plan + expiry!

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.user_id, QA_USER_ID);
  assert.equal(state.plan, 'pro');
  assert.equal(state.expires_at, new Date(expectedBillingTime).toISOString());
});

test('Realistic SALE.COMPLETED shape for Ultimate plan resolves strictly to premium', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const expectedBillingTime = '2026-10-03T12:00:00.000Z';

  const realisticEvent = normalizeEvent({
    id: 'EVT-SALE-REALISTIC-ULT',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REAL-ULT-1',
      billing_agreement_id: 'I-SUB-REALISTIC-ULT',
      amount: { total: '10.00', currency: 'USD' },
    },
  });

  const mockFetcher = async (subId) => {
    return {
      id: subId,
      status: 'ACTIVE',
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      custom_id: QA_USER_ID,
      billing_info: { next_billing_time: expectedBillingTime },
    };
  };

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: realisticEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: mockFetcher,
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.plan, 'premium');
  assert.equal(result.effectivePlan, 'premium');
  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.plan, 'premium'); // Never persists 'ultimate'!
});

test('Realistic SALE.COMPLETED where PayPal GET returns unknown plan fails closed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const saleEvent = normalizeEvent({
    id: 'EVT-SALE-UNKNOWN-PLAN',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-SALE-UNKNOWN',
      billing_agreement_id: 'I-SUB-UNKNOWN-PLAN',
      amount: { total: '99.00', currency: 'USD' },
    },
  });

  const mockFetcher = async (subId) => {
    return {
      id: subId,
      status: 'ACTIVE',
      plan_id: 'P-FOREIGN-UNMAPPED-PLAN',
      custom_id: QA_USER_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    };
  };

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: mockFetcher,
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'unknown_plan_id');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0); // No state mutation!
});

test('Realistic SALE.COMPLETED where PayPal GET fails transiently throws retry-safe 503 and marks ledger failed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  let responseData = null;
  let responseStatus = null;
  const res = {
    json(data, status = 200) {
      responseData = data;
      responseStatus = status;
      return { data, status };
    },
  };

  const req = {
    headers: {
      'paypal-transmission-id': 'trans_transient_001',
      'paypal-transmission-time': '2026-09-03T12:00:00Z',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'mock_sig',
    },
    bodyText: JSON.stringify({
      id: 'EVT-SALE-TRANSIENT-FAIL',
      event_type: 'PAYMENT.SALE.COMPLETED',
      create_time: '2026-09-03T12:00:00Z',
      resource: {
        id: 'TX-SALE-TRANSIENT',
        billing_agreement_id: 'I-SUB-TRANSIENT',
        amount: { total: '5.00', currency: 'USD' },
      },
    }),
    __test: {
      databases: db,
      users,
      env: {
        PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
        PAYPAL_CLIENT_ID: 'mock_client_id',
        PAYPAL_CLIENT_SECRET: 'mock_client_secret',
        PAYPAL_WEBHOOK_ID: 'WH-SANDBOX-123',
        BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
      },
      customVerifier: () => ({ ok: true }),
      subscriptionFetcher: async () => {
        const err = new Error('PayPal upstream 503 Service Unavailable');
        err.isTransient = true;
        err.status = 503;
        throw err;
      },
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });

  // STRICT REQUIREMENT: HTTP 503 returned to PayPal to prompt retry
  assert.equal(responseStatus, 503);
  assert.equal(responseData?.code, 'transient_paypal_fetch_failure');
  assert.equal(db.collections.paypal_subscription_state.size, 0); // No state mutation!

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-SALE-TRANSIENT-FAIL');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'transient_paypal_fetch_failure');

  // Next retry arrives with PayPal service recovered
  const retryReq = {
    ...req,
    __test: {
      ...req.__test,
      subscriptionFetcher: async (subId) => ({
        id: subId,
        status: 'ACTIVE',
        plan_id: SANDBOX_PRO_PLAN_ID,
        custom_id: QA_USER_ID,
        billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
      }),
    },
  };

  await paypalWebhook({ req: retryReq, res, log: () => {}, error: () => {} });
  assert.equal(responseStatus, 200);
  assert.equal(responseData?.data?.outcome, 'processed');
  assert.equal(db.collections.paypal_subscription_state.size, 1);
});

test('Concurrency: two simultaneous stale recovery deliveries have exactly one mutation winner', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 120000; // 120s later (> 60s lease)

  const event = normalizeEvent({
    id: 'EVT-STALE-CONCURRENT-RACE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-RACE-1',
      billing_agreement_id: 'I-SUB-RACE',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  // Pre-seed stale processing reservation
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(event.id);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: event.id,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  let stateMutationCount = 0;
  const originalUpdate = db.updateDocument.bind(db);
  const originalCreate = db.createDocument.bind(db);
  db.updateDocument = async (...args) => {
    if (args[1] === 'paypal_subscription_state') stateMutationCount++;
    return originalUpdate(...args);
  };
  db.createDocument = async (...args) => {
    if (args[1] === 'paypal_subscription_state') stateMutationCount++;
    return originalCreate(...args);
  };

  // Two simultaneous delivery executions race to recover
  const [res1, res2] = await Promise.all([
    processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV }),
    processWebhookEvent({ databases: db, users, event, nowMs, env: TEST_ENV }),
  ]);

  const outcomes = [res1.outcome, res2.outcome].sort();
  assert.deepEqual(outcomes, ['duplicate', 'processed']);

  const winner = res1.outcome === 'processed' ? res1 : res2;
  const loser = res1.outcome === 'processed' ? res2 : res1;

  assert.equal(winner.mutated, true);
  assert.equal(loser.mutated, false);
  assert.equal(loser.code, 'concurrent_processing');

  // STRICT REQUIREMENT: exactly ONE provider state mutation occurred
  assert.equal(stateMutationCount, 1);
  assert.equal(db.collections.paypal_subscription_state.size, 1);
});

test('Expiry Authority: SALE.COMPLETED without authoritative next_billing_time fails closed (no 30-day fabrication)', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const saleEvent = normalizeEvent({
    id: 'EVT-NO-AUTHORITATIVE-EXPIRY',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-NO-EXPIRY',
      billing_agreement_id: 'I-SUB-NO-EXPIRY',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      // Absolutely no next_billing_time in resource!
    },
  });

  const mockFetcher = async (subId) => ({
    id: subId,
    status: 'ACTIVE',
    plan_id: SANDBOX_PRO_PLAN_ID,
    custom_id: QA_USER_ID,
    // Upstream PayPal response omits billing_info
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: saleEvent,
    nowMs,
    env: TEST_ENV,
    subscriptionFetcher: mockFetcher,
  });

  // STRICT REQUIREMENT: Fail closed! No fabricated +30 days!
  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'missing_authoritative_expiry');
  assert.equal(result.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);
});

// ==================================================
// Section 11: Failed-Payment Grace Invariant & Terminal Event Preservation Regression Matrix
// ==================================================

test('Invariant 1: ACTIVATED -> PAYMENT.FAILED results in Free and zero future paid expires_at', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // Step 1: ACTIVATED
  const actEvent = normalizeEvent({
    id: 'EVT-INV1-ACT',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(nowMs).toISOString(),
    resource: { id: 'I-SUB-INV1', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });
  await processWebhookEvent({ databases: db, users, event: actEvent, nowMs, env: TEST_ENV });

  // Step 2: Initial payment fails
  const failEvent = normalizeEvent({
    id: 'EVT-INV1-FAIL',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: { id: 'I-SUB-INV1', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  const result = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'billing_issue');
  assert.equal(result.effectivePlan, 'free'); // STRICT REQUIREMENT: Free entitlement!

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'billing_issue');
  assert.equal(state.expires_at, null); // Zero future paid expires_at!
  assert.equal(state.grace_period_expires_at, null); // Zero 48-hour paid grace!
  assert.equal(state.will_renew, false);
});

test('Invariant 2: SALE.COMPLETED -> active -> PAYMENT.FAILED starts exactly 48-hour grace', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paidBillingTime = '2026-10-03T12:00:00.000Z';

  // Step 1: Verified initial payment creates active Pro
  const saleEvent = normalizeEvent({
    id: 'EVT-INV2-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-INV2-1',
      billing_agreement_id: 'I-SUB-INV2',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: paidBillingTime },
    },
  });
  await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });

  // Step 2: Renewal payment fails at next renewal cycle
  const failTimeMs = Date.parse(paidBillingTime);
  const failEvent = normalizeEvent({
    id: 'EVT-INV2-FAIL',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(failTimeMs).toISOString(),
    resource: { id: 'I-SUB-INV2', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  const failResult = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: failTimeMs, env: TEST_ENV });
  assert.equal(failResult.outcome, 'processed');
  assert.equal(failResult.status, 'billing_issue');
  assert.equal(failResult.effectivePlan, 'pro'); // Preserves Pro during grace!

  const expectedGraceIso = new Date(failTimeMs + 48 * 3600 * 1000).toISOString();
  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.grace_period_expires_at, expectedGraceIso);
  assert.equal(state.expires_at, expectedGraceIso);
});

test('Invariant 3: duplicate same PAYMENT.FAILED leaves grace unchanged', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const failTimeMs = Date.parse('2026-10-03T12:00:00.000Z');
  const expectedGraceIso = new Date(failTimeMs + 48 * 3600 * 1000).toISOString();

  // Seed active Pro prior to failure
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV3',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    latest_event_timestamp_ms: failTimeMs - 1000,
  });

  const failEvent = normalizeEvent({
    id: 'EVT-INV3-FAIL',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(failTimeMs).toISOString(),
    resource: { id: 'I-SUB-INV3', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: failTimeMs, env: TEST_ENV });

  // Duplicate arrives 10 minutes later
  const dupResult = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: failTimeMs + 600000, env: TEST_ENV });
  assert.equal(dupResult.outcome, 'duplicate');
  assert.equal(dupResult.mutated, false);

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.grace_period_expires_at, expectedGraceIso); // STRICT: Unchanged!
});

test('Invariant 4: distinct later PAYMENT.FAILED while already in grace leaves grace unchanged', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const originalGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();

  // Seed active Pro state
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV4',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: '2026-10-03T12:00:00.000Z',
    latest_event_timestamp_ms: t0Ms - 1000,
  });

  // First failure at t0 starts 48h grace
  const fail1 = normalizeEvent({
    id: 'EVT-INV4-FAIL-1',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(t0Ms).toISOString(),
    resource: { id: 'I-SUB-INV4', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });
  await processWebhookEvent({ databases: db, users, event: fail1, nowMs: t0Ms, env: TEST_ENV });

  // Distinct second failure arrives 12 hours later (while still in grace)
  const t12hMs = t0Ms + 12 * 3600 * 1000;
  const fail2 = normalizeEvent({
    id: 'EVT-INV4-FAIL-2',
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(t12hMs).toISOString(),
    resource: { id: 'I-SUB-INV4', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });

  const res2 = await processWebhookEvent({ databases: db, users, event: fail2, nowMs: t12hMs, env: TEST_ENV });
  assert.equal(res2.outcome, 'processed');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  // STRICT: Original grace is preserved; NOT extended to t12h + 48h!
  assert.equal(state.grace_period_expires_at, originalGraceIso);
  assert.equal(state.expires_at, originalGraceIso);
});

test('Invariant 5: billing_issue -> SUSPENDED during grace preserves original grace window', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const originalGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();

  // Pre-seed billing_issue state in active grace
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV5',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'billing_issue',
    grace_period_expires_at: originalGraceIso,
    expires_at: originalGraceIso,
    latest_event_timestamp_ms: t0Ms,
  });

  // SUSPENDED event arrives 10 hours into grace
  const t10hMs = t0Ms + 10 * 3600 * 1000;
  const suspEvent = normalizeEvent({
    id: 'EVT-INV5-SUSP',
    event_type: 'BILLING.SUBSCRIPTION.SUSPENDED',
    create_time: new Date(t10hMs).toISOString(),
    resource: { id: 'I-SUB-INV5' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: suspEvent, nowMs: t10hMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.effectivePlan, 'pro'); // STRICT: Still Pro during active grace!

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'billing_issue'); // Preserves billing_issue for resolver
  assert.equal(state.grace_period_expires_at, originalGraceIso); // Preserved G
  assert.equal(state.expires_at, originalGraceIso); // Preserved G
  assert.equal(state.latest_event_type, 'BILLING.SUBSCRIPTION.SUSPENDED');
});

test('Invariant 6: billing_issue -> CANCELLED during grace preserves original grace window', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const originalGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();

  // Pre-seed billing_issue state in active grace
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV6',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'billing_issue',
    grace_period_expires_at: originalGraceIso,
    expires_at: originalGraceIso,
    latest_event_timestamp_ms: t0Ms,
  });

  // CANCELLED arrives 10 hours into grace
  const t10hMs = t0Ms + 10 * 3600 * 1000;
  const cancelEvent = normalizeEvent({
    id: 'EVT-INV6-CANCEL',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(t10hMs).toISOString(),
    resource: { id: 'I-SUB-INV6' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: cancelEvent, nowMs: t10hMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.effectivePlan, 'pro'); // STRICT: Still Pro during active grace!

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'billing_issue');
  assert.equal(state.grace_period_expires_at, originalGraceIso);
  assert.equal(state.expires_at, originalGraceIso);
  assert.equal(state.latest_event_type, 'BILLING.SUBSCRIPTION.CANCELLED');
});

test('Invariant 7: billing_issue -> EXPIRED during grace preserves original grace window', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const originalGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();

  // Pre-seed billing_issue state in active grace
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV7',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'billing_issue',
    grace_period_expires_at: originalGraceIso,
    expires_at: originalGraceIso,
    latest_event_timestamp_ms: t0Ms,
  });

  // EXPIRED arrives 10 hours into grace
  const t10hMs = t0Ms + 10 * 3600 * 1000;
  const expEvent = normalizeEvent({
    id: 'EVT-INV7-EXP',
    event_type: 'BILLING.SUBSCRIPTION.EXPIRED',
    create_time: new Date(t10hMs).toISOString(),
    resource: { id: 'I-SUB-INV7' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: expEvent, nowMs: t10hMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.effectivePlan, 'pro');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'billing_issue');
  assert.equal(state.grace_period_expires_at, originalGraceIso);
  assert.equal(state.expires_at, originalGraceIso);
  assert.equal(state.latest_event_type, 'BILLING.SUBSCRIPTION.EXPIRED');
});

test('Invariant 8: after grace timestamp passes resolver naturally yields Free', async () => {
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const graceExpiresMs = t0Ms + 48 * 3600 * 1000;
  const graceExpiresIso = new Date(graceExpiresMs).toISOString();

  const state = {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV8',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'billing_issue',
    grace_period_expires_at: graceExpiresIso,
    expires_at: graceExpiresIso,
  };

  // 1 minute after grace has expired
  const afterGraceMs = graceExpiresMs + 60000;
  const planAfter = resolveEffectivePlan({
    paypalProviderState: state,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: afterGraceMs,
  });

  // STRICT REQUIREMENT: Resolver naturally returns Free after grace passes!
  assert.equal(planAfter.plan, 'free');
});

test('Invariant 9: pending_initial_payment -> CANCELLED yields Free with null expires_at', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  // ACTIVATED sets pending_initial_payment
  const actEvent = normalizeEvent({
    id: 'EVT-INV9-ACT',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(nowMs).toISOString(),
    resource: { id: 'I-SUB-INV9', custom_id: QA_USER_ID, plan_id: SANDBOX_PRO_PLAN_ID },
  });
  await processWebhookEvent({ databases: db, users, event: actEvent, nowMs, env: TEST_ENV });

  // CANCELLED arrives before payment
  const cancelEvent = normalizeEvent({
    id: 'EVT-INV9-CANCEL',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: { id: 'I-SUB-INV9' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: cancelEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'canceled');
  assert.equal(result.effectivePlan, 'free');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'canceled');
  assert.equal(state.expires_at, null);
  assert.equal(state.grace_period_expires_at, null);
});

test('Invariant 10: active -> CANCELLED without billing issue preserves existing paid expiry only', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
  const paidExpiryIso = '2026-09-28T12:00:00.000Z'; // 25 days paid remaining

  // Pre-seed active state with 25 days remaining
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV10',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: paidExpiryIso,
    latest_event_timestamp_ms: nowMs,
  });

  // Normal cancellation
  const cancelEvent = normalizeEvent({
    id: 'EVT-INV10-CANCEL',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(nowMs + 60000).toISOString(),
    resource: { id: 'I-SUB-INV10' },
  });

  const result = await processWebhookEvent({ databases: db, users, event: cancelEvent, nowMs: nowMs + 60000, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'canceled');
  assert.equal(result.effectivePlan, 'pro'); // Still Pro while within paidExpiry!

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'canceled');
  assert.equal(state.expires_at, paidExpiryIso);
  assert.equal(state.will_renew, false);
  assert.equal(state.grace_period_expires_at, null);

  // After paidExpiry passes -> Free
  const afterPaidExpiryMs = Date.parse(paidExpiryIso) + 60000;
  const planAfter = resolveEffectivePlan({
    paypalProviderState: state,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: afterPaidExpiryMs,
  });
  assert.equal(planAfter.plan, 'free');
});

test('Invariant 11: PAYMENT.SALE.COMPLETED recovery during grace restores active, clears grace, requires authoritative expiry', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const originalGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();
  const newCycleExpiryIso = '2026-11-03T12:00:00.000Z';

  // In active grace following renewal failure
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-INV11',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'billing_issue',
    grace_period_expires_at: originalGraceIso,
    expires_at: originalGraceIso,
    latest_event_timestamp_ms: t0Ms,
  });

  // Successful payment recovery arrives 24 hours into grace
  const t24hMs = t0Ms + 24 * 3600 * 1000;
  const recoverySale = normalizeEvent({
    id: 'EVT-INV11-RECOVERY-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(t24hMs).toISOString(),
    resource: {
      id: 'TX-INV11-REC',
      billing_agreement_id: 'I-SUB-INV11',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: newCycleExpiryIso },
    },
  });

  const result = await processWebhookEvent({ databases: db, users, event: recoverySale, nowMs: t24hMs, env: TEST_ENV });
  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'active');
  assert.equal(result.effectivePlan, 'pro');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(state.status, 'active');
  assert.equal(state.grace_period_expires_at, null); // Grace cleared!
  assert.equal(state.expires_at, newCycleExpiryIso); // Authoritative new expiry from PayPal!
  assert.equal(state.will_renew, true);
});

// =========================================================================
// Section 12: Stale Recovery Concurrency, Conflict Detection & Barrier Tests
// =========================================================================

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('Concurrency 1: adversarial A-create-then-B-delete race demonstrates why un-versioned delete-create is unsafe', async () => {
  // Proves that under the un-versioned delete-then-create interleaving:
  // A reads stale, B reads stale, A deletes old and creates new lease A,
  // B's un-versioned delete deletes A's new lease and creates lease B,
  // causing BOTH to believe they won and both mutating state.
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-ADV-RACE-PROOF';

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  const collections = {
    paypal_subscription_state: new Map([[paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
      $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
      user_id: QA_USER_ID,
      plan: 'pro',
      subscription_id: 'I-SUB-ADV-RACE',
      plan_id: SANDBOX_PRO_PLAN_ID,
      environment: 'sandbox',
      status: 'pending_initial_payment',
      expires_at: null,
      latest_event_timestamp_ms: eventTimeMs - 1000,
    }]]),
    paypal_event_ledger: new Map([[ledgerDocId, {
      $id: ledgerDocId,
      event_id: eventId,
      received_at: new Date(eventTimeMs).toISOString(),
      processing_status: 'processing',
      outcome_code: 'in_progress',
    }]]),
    billing_checkout_sessions: new Map(),
  };

  function createUnsafeClient() {
    return {
      async getDocument(_db, collId, docId) {
        const doc = collections[collId]?.get(docId);
        if (!doc) throw Object.assign(new Error('Not found'), { code: 404 });
        return JSON.parse(JSON.stringify(doc));
      },
      async deleteDocument(_db, collId, docId) {
        if (!collections[collId]?.has(docId)) throw Object.assign(new Error('Not found'), { code: 404 });
        collections[collId].delete(docId);
        return { ok: true };
      },
      async createDocument(_db, collId, docId, data) {
        if (collections[collId]?.has(docId)) throw Object.assign(new Error('Document already exists'), { code: 409 });
        const doc = { $id: docId, ...JSON.parse(JSON.stringify(data)) };
        collections[collId].set(docId, doc);
        return doc;
      },
    };
  }

  // Under the old un-versioned delete-then-create pattern:
  async function unsafeReclaim(db, docId, payload) {
    await db.deleteDocument('main', 'paypal_event_ledger', docId);
    await db.createDocument('main', 'paypal_event_ledger', docId, payload);
    return true;
  }

  const clientA = createUnsafeClient();
  const clientB = createUnsafeClient();

  // Step 1: Processor A reads stale reservation
  const staleA = await clientA.getDocument('main', 'paypal_event_ledger', ledgerDocId);
  assert.equal(staleA.processing_status, 'processing');

  // Step 2: Processor B reads stale reservation
  const staleB = await clientB.getDocument('main', 'paypal_event_ledger', ledgerDocId);
  assert.equal(staleB.processing_status, 'processing');

  // Step 3: Processor A deletes stale reservation and creates replacement reservation A
  const wonA = await unsafeReclaim(clientA, ledgerDocId, {
    processing_status: 'processing',
    received_at: new Date(nowMs).toISOString(),
    outcome_code: 'lease_A',
  });
  assert.equal(wonA, true);
  assert.equal(collections.paypal_event_ledger.get(ledgerDocId).outcome_code, 'lease_A');

  // Step 4: Processor B (which already decided to reclaim in step 2) deletes ledgerDocId!
  // In the old un-versioned delete, this DELETES Processor A's newly created lease_A!
  // And creates replacement reservation B!
  const wonB = await unsafeReclaim(clientB, ledgerDocId, {
    processing_status: 'processing',
    received_at: new Date(nowMs).toISOString(),
    outcome_code: 'lease_B',
  });
  assert.equal(wonB, true);
  assert.equal(collections.paypal_event_ledger.get(ledgerDocId).outcome_code, 'lease_B');

  // Both processors believe they successfully reclaimed the lease, causing dual mutation!
});

test('Concurrency 2: safe transaction implementation yields exactly one winner under barrier synchronization', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-BARRIER-RACE-WINNER';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-BARRIER-RACE',
      billing_agreement_id: 'I-SUB-BARRIER-RACE',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  const bARead = deferred();
  const bBRead = deferred();

  const clientA = {
    ...db,
    async getDocument(dbId, collId, docId, queries, txId) {
      const doc = await db.getDocument(dbId, collId, docId, queries, txId);
      if (collId === 'paypal_event_ledger' && docId === ledgerDocId) {
        bARead.resolve();
        await bBRead.promise;
      }
      return doc;
    },
  };

  const clientB = {
    ...db,
    async getDocument(dbId, collId, docId, queries, txId) {
      await bARead.promise;
      const doc = await db.getDocument(dbId, collId, docId, queries, txId);
      if (collId === 'paypal_event_ledger' && docId === ledgerDocId) {
        bBRead.resolve();
        await new Promise(r => setTimeout(r, 10));
      }
      return doc;
    },
  };

  const [resA, resB] = await Promise.all([
    processWebhookEvent({ databases: clientA, users, event: saleEvent, nowMs, env: TEST_ENV }),
    processWebhookEvent({ databases: clientB, users, event: saleEvent, nowMs, env: TEST_ENV }),
  ]);

  const winner = resA.mutated ? resA : resB;
  const loser = resA.mutated ? resB : resA;

  assert.equal(winner.mutated, true);
  assert.equal(winner.outcome, 'processed');
  assert.equal(winner.status, 'active');

  assert.equal(loser.mutated, false);
  assert.equal(loser.outcome, 'duplicate');
  assert.equal(loser.code, 'concurrent_processing');
});

test('Concurrency 3: loser never reaches provider state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-LOSER-NO-MUTATE';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-LOSER-NO-MUTATE',
      billing_agreement_id: 'I-SUB-LOSER',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  let stateMutations = 0;
  const origCreate = db.createDocument.bind(db);
  const origUpdate = db.updateDocument.bind(db);
  db.createDocument = async (dbId, collId, docId, data, perms, txId) => {
    if (collId === 'paypal_subscription_state') stateMutations++;
    return origCreate(dbId, collId, docId, data, perms, txId);
  };
  db.updateDocument = async (dbId, collId, docId, data, perms, txId) => {
    if (collId === 'paypal_subscription_state') stateMutations++;
    return origUpdate(dbId, collId, docId, data, perms, txId);
  };

  const bARead = deferred();
  const bBRead = deferred();

  const clientA = {
    ...db,
    async getDocument(dbId, collId, docId, queries, txId) {
      const doc = await db.getDocument(dbId, collId, docId, queries, txId);
      if (collId === 'paypal_event_ledger' && docId === ledgerDocId) {
        bARead.resolve();
        await bBRead.promise;
      }
      return doc;
    },
  };

  const clientB = {
    ...db,
    async getDocument(dbId, collId, docId, queries, txId) {
      await bARead.promise;
      const doc = await db.getDocument(dbId, collId, docId, queries, txId);
      if (collId === 'paypal_event_ledger' && docId === ledgerDocId) {
        bBRead.resolve();
        await new Promise(r => setTimeout(r, 10));
      }
      return doc;
    },
  };

  const [resA, resB] = await Promise.all([
    processWebhookEvent({ databases: clientA, users, event: saleEvent, nowMs, env: TEST_ENV }),
    processWebhookEvent({ databases: clientB, users, event: saleEvent, nowMs, env: TEST_ENV }),
  ]);

  // Provider state was mutated EXACTLY ONCE
  assert.equal(stateMutations, 1);
  const loser = resA.mutated ? resB : resA;
  assert.equal(loser.mutated, false);
  assert.equal(loser.code, 'concurrent_processing');
});

test('Concurrency 4: winner crash still permits a later generation recovery', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-09-03T12:00:00.000Z');
  const eventId = 'EVT-CRASH-LATER-RECOVER';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(t0Ms).toISOString(),
    resource: {
      id: 'TX-CRASH-LATER',
      billing_agreement_id: 'I-SUB-CRASH',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);

  // Winner 1 crashes after acquiring lease (stuck in 'processing' at t0Ms)
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(t0Ms).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  // 100 seconds later (> 60s TTL), delivery 2 arrives and recovers
  const t100Ms = t0Ms + 100000;
  const res2 = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: t100Ms, env: TEST_ENV });
  assert.equal(res2.outcome, 'processed');
  assert.equal(res2.mutated, true);
  assert.equal(res2.status, 'active');

  const ledgerAfter = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledgerAfter.processing_status, 'processed');
});

test('Concurrency 5: fresh lease cannot be stolen', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-09-03T12:00:00.000Z');
  const eventId = 'EVT-FRESH-NO-STEAL';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(t0Ms).toISOString(),
    resource: {
      id: 'TX-FRESH-NO-STEAL',
      billing_agreement_id: 'I-SUB-FRESH',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(t0Ms).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  // Delivery arrives 10 seconds later (< 60s TTL)
  const t10Ms = t0Ms + 10000;
  const res = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: t10Ms, env: TEST_ENV });
  assert.equal(res.outcome, 'duplicate');
  assert.equal(res.code, 'concurrent_processing');
  assert.equal(res.mutated, false);

  // Original fresh lease was not modified
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.received_at, new Date(t0Ms).toISOString());
  assert.equal(ledger.outcome_code, 'in_progress');
});

test('Concurrency 6: completed event cannot be reclaimed', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-09-03T12:00:00.000Z');
  const eventId = 'EVT-COMPLETED-NO-RECLAIM';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(t0Ms).toISOString(),
    resource: {
      id: 'TX-COMPLETED',
      billing_agreement_id: 'I-SUB-DONE',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(t0Ms).toISOString(),
    processing_status: 'processed',
    outcome_code: 'state_updated',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  // Even 1 hour later, completed event is permanently idempotent
  const t1hMs = t0Ms + 3600000;
  const res = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: t1hMs, env: TEST_ENV });
  assert.equal(res.outcome, 'duplicate');
  assert.equal(res.code, 'already_recorded');
  assert.equal(res.mutated, false);
});

test('Concurrency 7: failed event can safely recover', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-09-03T12:00:00.000Z');
  const eventId = 'EVT-FAILED-CAN-RECOVER';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(t0Ms).toISOString(),
    resource: {
      id: 'TX-FAILED-RECOVER',
      billing_agreement_id: 'I-SUB-RECOVER',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  // Marked failed from a previous transient fetch failure
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(t0Ms).toISOString(),
    processing_status: 'failed',
    outcome_code: 'transient_paypal_fetch_failure',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  // Retry delivery arrives 30 seconds later (no need to wait for 60s TTL on failed events)
  const t30Ms = t0Ms + 30000;
  const res = await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs: t30Ms, env: TEST_ENV });
  assert.equal(res.outcome, 'processed');
  assert.equal(res.mutated, true);
  assert.equal(res.status, 'active');

  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'processed');
});

test('Concurrency 8: PAYMENT.FAILED recovered exactly once does not extend grace', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const t0Ms = Date.parse('2026-10-03T12:00:00.000Z');
  const eventId = 'EVT-FAILED-GRACE-ONCE';

  // Subscription was active
  db.collections.paypal_subscription_state.set(paypalWebhook.__test.stateDocumentId(QA_USER_ID), {
    $id: paypalWebhook.__test.stateDocumentId(QA_USER_ID),
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-SUB-GRACE-ONCE',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: new Date(t0Ms).toISOString(),
    latest_event_timestamp_ms: t0Ms - 1000,
  });

  const failEvent = normalizeEvent({
    id: eventId,
    event_type: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    create_time: new Date(t0Ms).toISOString(),
    resource: {
      id: 'I-SUB-GRACE-ONCE',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  // Stale abandoned reservation for this failure
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(t0Ms - 120000).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });
  db.docVersions.set(`paypal_event_ledger:${ledgerDocId}`, 1);

  // Recover the event
  const recRes = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: t0Ms, env: TEST_ENV });
  assert.equal(recRes.outcome, 'processed');
  assert.equal(recRes.mutated, true);
  assert.equal(recRes.status, 'billing_issue');

  const state = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  const expectedGraceIso = new Date(t0Ms + 48 * 3600 * 1000).toISOString();
  assert.equal(state.grace_period_expires_at, expectedGraceIso);

  // Subsequent duplicate delivery arrives 1 hour later -> does NOT extend grace!
  const dupRes = await processWebhookEvent({ databases: db, users, event: failEvent, nowMs: t0Ms + 3600000, env: TEST_ENV });
  assert.equal(dupRes.outcome, 'duplicate');
  assert.equal(dupRes.mutated, false);

  const stateAfter = db.collections.paypal_subscription_state.get(paypalWebhook.__test.stateDocumentId(QA_USER_ID));
  assert.equal(stateAfter.grace_period_expires_at, expectedGraceIso); // Still original G!
});

test('Concurrency 9: createTransaction unavailable fails closed with zero provider-state mutation', async () => {
  const db = createMockDatabases();
  delete db.createTransaction; // simulate client without createTransaction
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-TX-UNAVAIL-FAILCLOSED';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-TX-UNAVAIL',
      billing_agreement_id: 'I-SUB-TX-UNAVAIL',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  let threw = false;
  try {
    await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  } catch (err) {
    threw = true;
    assert.equal(err.code, 'transaction_unavailable');
    assert.equal(err.status, 503);
    assert.equal(err.isTransient, true);
  }
  assert.equal(threw, true, 'Must throw when transaction primitive is unavailable');
  assert.equal(db.collections.paypal_subscription_state.size, 0, 'Zero provider state mutation');
  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'processing');
  assert.equal(ledger.outcome_code, 'in_progress');
});

test('Concurrency 10: createTransaction throws transient error yielding zero state mutation and retry-safe HTTP 503', async () => {
  const db = createMockDatabases();
  db.createTransaction = async () => {
    throw new Error('Database connection pool exhausted');
  };
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-TX-FAIL-503';

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  let resBody = null;
  let resStatus = null;
  const res = {
    json(payload, status) {
      resBody = payload;
      resStatus = status;
      return { payload, status };
    },
  };
  const rawEvent = {
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-TX-FAIL-503',
      billing_agreement_id: 'I-SUB-TX-FAIL-503',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  };

  const req = {
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
      'paypal-transmission-id': 'trans_123',
      'paypal-transmission-sig': 'sig_123',
      'paypal-transmission-time': new Date().toISOString(),
    },
    body: JSON.stringify(rawEvent),
    __test: {
      databases: db,
      users,
      nowMs,
      env: TEST_ENV,
      customVerifier: async () => ({ ok: true }),
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  assert.equal(resStatus, 503, 'Must return HTTP 503 for transient transaction creation failure');
  assert.equal(resBody.status, 'error');
  assert.equal(resBody.code, 'transaction_creation_failed');
  assert.equal(db.collections.paypal_subscription_state.size, 0, 'Zero provider state mutation');
});

test('Concurrency 11: createTransaction returning invalid transaction ID throws with zero state mutation', async () => {
  const db = createMockDatabases();
  db.createTransaction = async () => ({ $id: null });
  const users = createMockUsers();
  const eventTimeMs = Date.parse('2026-09-03T12:00:00.000Z');
  const nowMs = eventTimeMs + 300000;
  const eventId = 'EVT-TX-INVALID-ID';

  const saleEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(eventTimeMs).toISOString(),
    resource: {
      id: 'TX-INVALID-ID',
      billing_agreement_id: 'I-SUB-TX-INVALID',
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_PRO_PLAN_ID,
      billing_info: { next_billing_time: '2026-10-03T12:00:00.000Z' },
    },
  });

  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    received_at: new Date(eventTimeMs).toISOString(),
    processing_status: 'processing',
    outcome_code: 'in_progress',
  });

  let threw = false;
  try {
    await processWebhookEvent({ databases: db, users, event: saleEvent, nowMs, env: TEST_ENV });
  } catch (err) {
    threw = true;
    assert.equal(err.code, 'invalid_transaction');
    assert.equal(err.status, 503);
    assert.equal(err.isTransient, true);
  }
  assert.equal(threw, true, 'Must throw when transaction ID is invalid');
  assert.equal(db.collections.paypal_subscription_state.size, 0, 'Zero provider state mutation');
});

test('E2E Lifecycle: ACTIVATED -> PAYMENT.SALE.COMPLETED -> CANCELLED preserves paid-through access until expiry', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-E2E-LIFECYCLE-ULTIMATE';
  const subExpiryIso = '2026-10-06T08:38:00.000Z';
  const subExpiryMs = Date.parse(subExpiryIso);

  // Step 1: BILLING.SUBSCRIPTION.ACTIVATED
  const actTimeMs = Date.parse('2026-09-06T08:35:00.000Z');
  const actEvent = normalizeEvent({
    id: 'EVT-ACT-001',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(actTimeMs).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      status: 'ACTIVE',
    },
  });

  const actResult = await processWebhookEvent({
    databases: db,
    users,
    event: actEvent,
    nowMs: actTimeMs,
    env: TEST_ENV,
  });

  assert.equal(actResult.outcome, 'processed');
  assert.equal(actResult.status, 'pending_initial_payment');
  assert.equal(actResult.effectivePlan, 'free', 'ACTIVATED alone must result in Free effective plan');

  // Step 2: PAYMENT.SALE.COMPLETED
  const payTimeMs = Date.parse('2026-09-06T08:38:00.000Z');
  const payEvent = normalizeEvent({
    id: 'EVT-PAY-001',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(payTimeMs).toISOString(),
    resource: {
      id: 'TX-PAY-001',
      billing_agreement_id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: subExpiryIso },
    },
  });

  const payResult = await processWebhookEvent({
    databases: db,
    users,
    event: payEvent,
    nowMs: payTimeMs,
    env: TEST_ENV,
  });

  assert.equal(payResult.outcome, 'processed');
  assert.equal(payResult.status, 'active');
  assert.equal(payResult.plan, 'premium');
  assert.equal(payResult.effectivePlan, 'premium', 'Payment completion grants Premium effective plan');

  // Verify DB state after payment
  const stateAfterPay = Array.from(db.collections.paypal_subscription_state.values())[0];
  assert.equal(stateAfterPay.status, 'active');
  assert.equal(stateAfterPay.will_renew, true);
  assert.equal(stateAfterPay.expires_at, subExpiryIso);
  assert.equal(stateAfterPay.plan, 'premium');

  // Step 3: BILLING.SUBSCRIPTION.CANCELLED (PayPal clears billing_info.next_billing_time)
  const cancelTimeMs = Date.parse('2026-09-06T12:00:00.000Z');
  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-001',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(cancelTimeMs).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      status: 'CANCELLED',
      billing_info: {}, // PayPal clears next_billing_time to null on cancellation
    },
  });

  const cancelResult = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: cancelTimeMs,
    env: TEST_ENV,
  });

  assert.equal(cancelResult.outcome, 'processed');
  assert.equal(cancelResult.status, 'canceled');
  assert.equal(cancelResult.plan, 'premium');

  // Verify DB state after cancellation
  const stateAfterCancel = Array.from(db.collections.paypal_subscription_state.values())[0];
  assert.equal(stateAfterCancel.status, 'canceled');
  assert.equal(stateAfterCancel.will_renew, false);
  assert.equal(stateAfterCancel.expires_at, subExpiryIso, 'CRITICAL: Must preserve authoritative expires_at from verified active payment');
  assert.equal(stateAfterCancel.plan, 'premium');

  // Verify Effective Plan before expiry (paid-through access preserved)
  const effectiveBeforeExpiry = resolveEffectivePlan({
    paypalProviderState: stateAfterCancel,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: cancelTimeMs,
  });
  assert.equal(effectiveBeforeExpiry.plan, 'premium', 'Must preserve Premium access before expiration date');

  // Verify Effective Plan at expiry midpoint
  const effectiveMidpoint = resolveEffectivePlan({
    paypalProviderState: stateAfterCancel,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: subExpiryMs - 1000,
  });
  assert.equal(effectiveMidpoint.plan, 'premium', 'Must preserve Premium access right before expiration');

  // Verify Effective Plan after expiry (automatically drops to Free)
  const effectiveAfterExpiry = resolveEffectivePlan({
    paypalProviderState: stateAfterCancel,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: subExpiryMs + 1000,
  });
  assert.equal(effectiveAfterExpiry.plan, 'free', 'Must drop to Free after expiration date has passed');
});

test('Lifecycle: CANCELLED on pending_initial_payment (never paid) drops immediately to Free with null expires_at', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-UNPAID-CANCEL';

  // Seed pending initial payment state
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: subId,
    status: 'pending_initial_payment',
    will_renew: true,
    expires_at: null,
    plan: 'pro',
    environment: 'sandbox',
    latest_event_timestamp_ms: 1700000000000,
  });

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-UNPAID',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000100000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: 1700000100000,
    env: TEST_ENV,
  });

  assert.equal(result.status, 'canceled');
  assert.equal(result.effectivePlan, 'free', 'Unpaid subscription cancellation must have Free effective plan');
  const finalState = Array.from(db.collections.paypal_subscription_state.values())[0];
  assert.equal(finalState.expires_at, null);
});

test('Regression: missing-previous index lag recovers via direct deterministic document lookup and preserves paid expiry', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-SUB-RECOVER-DIRECT';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const futureExpiryIso = '2026-10-06T12:00:00.000Z';

  // Seed state in direct document location
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: subId,
    status: 'active',
    will_renew: true,
    expires_at: futureExpiryIso,
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    latest_event_timestamp_ms: 1700000000000,
  });

  // Simulate index lag by intercepting listDocuments on STATE_COLLECTION_ID to return empty array
  const origList = db.listDocuments.bind(db);
  db.listDocuments = async (dbId, collId, queries) => {
    if (collId === 'paypal_subscription_state') {
      return { total: 0, documents: [] };
    }
    return origList(dbId, collId, queries);
  };

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-INDEX-LAG',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000100000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
      billing_info: {}, // PayPal clears next_billing_time on cancellation
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: 1700000100000,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'canceled');
  assert.equal(result.effectivePlan, 'premium', 'Must recover previous state and preserve Premium effective plan');

  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(finalState.status, 'canceled');
  assert.equal(finalState.will_renew, false);
  assert.equal(finalState.expires_at, futureExpiryIso, 'Authoritative future expiry must be preserved despite index lag');
});

test('Regression: old subscription CANCELLED event does NOT mutate or overwrite newer active subscription state', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const oldSubId = 'I-OLD-SUB-111';
  const newSubId = 'I-NEW-SUB-999';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const newExpiryIso = '2026-11-01T12:00:00.000Z';

  // User has active newer subscription in state
  const initialNewState = {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: newSubId,
    status: 'active',
    will_renew: true,
    expires_at: newExpiryIso,
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    latest_event_timestamp_ms: 1700000500000,
  };
  db.collections.paypal_subscription_state.set(stateDocId, { ...initialNewState });

  // Webhook arrives for old subscription cancellation
  const oldCancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-OLD-SUB',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000600000).toISOString(),
    resource: {
      id: oldSubId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: oldCancelEvent,
    nowMs: 1700000600000,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'different_subscription_ignored');
  assert.equal(result.mutated, false);

  // Assert user's current newer subscription state is COMPLETELY UNTOUCHED
  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(finalState.subscription_id, newSubId, 'subscription_id must remain newer subscription');
  assert.equal(finalState.status, 'active', 'status must remain active');
  assert.equal(finalState.will_renew, true, 'will_renew must remain true');
  assert.equal(finalState.expires_at, newExpiryIso, 'expires_at must remain newer expiry');
  assert.equal(finalState.plan, 'premium');
});

test('State Identity Guard A: same subscription, wrong environment -> state_identity_mismatch_ignored and zero state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-SUB-ENV-MISMATCH';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const futureExpiryIso = '2026-10-06T12:00:00.000Z';

  // Seed state with environment = 'production' while test environment is 'sandbox'
  const initialDoc = {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: subId,
    status: 'active',
    will_renew: true,
    expires_at: futureExpiryIso,
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'production', // Mismatch against sandbox
    latest_event_timestamp_ms: 1700000000000,
  };
  db.collections.paypal_subscription_state.set(stateDocId, { ...initialDoc });

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-ENV-MISMATCH',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000100000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: 1700000100000,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'state_identity_mismatch_ignored');
  assert.equal(result.mutated, false);

  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.deepEqual(finalState, initialDoc, 'State must remain completely untouched when environment mismatches');
});

test('State Identity Guard B: same subscription, wrong user -> state_identity_mismatch_ignored and zero state mutation', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-SUB-USER-MISMATCH';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const futureExpiryIso = '2026-10-06T12:00:00.000Z';

  // Seed state at QA user's deterministic document ID with mismatched user_id
  const mismatchedDoc = {
    $id: stateDocId,
    user_id: 'mismatched_other_user',
    subscription_id: subId,
    status: 'active',
    will_renew: true,
    expires_at: futureExpiryIso,
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    latest_event_timestamp_ms: 1700000000000,
  };
  db.collections.paypal_subscription_state.set(stateDocId, { ...mismatchedDoc });

  // Simulate subscription index returning empty so resolveCanonicalUser resolves QA_USER_ID via custom_id
  const origList = db.listDocuments.bind(db);
  db.listDocuments = async (dbId, collId, queries) => {
    if (collId === 'paypal_subscription_state') {
      return { total: 0, documents: [] };
    }
    return origList(dbId, collId, queries);
  };

  // Event resolves canonical user as QA_USER_ID (from custom_id)
  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-USER-MISMATCH',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000100000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: 1700000100000,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'ignored');
  assert.equal(result.code, 'state_identity_mismatch_ignored');
  assert.equal(result.mutated, false);

  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.deepEqual(finalState, mismatchedDoc, 'Mismatched user state must remain completely untouched on user mismatch');
});

test('State Identity Guard C: correct user + subscription + environment preserves existing paid expiry', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const subId = 'I-SUB-MATCH-VALID';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const futureExpiryIso = '2026-10-06T12:00:00.000Z';

  const validDoc = {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: subId,
    status: 'active',
    will_renew: true,
    expires_at: futureExpiryIso,
    plan: 'premium',
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    environment: 'sandbox',
    latest_event_timestamp_ms: 1700000000000,
  };
  db.collections.paypal_subscription_state.set(stateDocId, { ...validDoc });

  const cancelEvent = normalizeEvent({
    id: 'EVT-CANCEL-MATCH-VALID',
    event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: new Date(1700000100000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      status: 'CANCELLED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: cancelEvent,
    nowMs: 1700000100000,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.status, 'canceled');
  assert.equal(result.effectivePlan, 'premium');

  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(finalState.status, 'canceled');
  assert.equal(finalState.will_renew, false);
  assert.equal(finalState.expires_at, futureExpiryIso, 'Authoritative future expiry must be preserved');
});

test('State Identity Guard D: new subscription ACTIVATED and SALE.COMPLETED supersedes prior canceled subscription in state', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const oldSubId = 'I-OLD-CANCELED-SUB';
  const newSubId = 'I-NEW-ACTIVE-SUB';
  const newExpiryIso = '2026-11-06T10:00:00.000Z';

  // Seed state with old canceled subscription
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    subscription_id: oldSubId,
    status: 'canceled',
    will_renew: false,
    expires_at: null,
    plan: 'free',
    plan_id: '',
    environment: 'sandbox',
    latest_event_timestamp_ms: 1000000,
  });

  // 1. BILLING.SUBSCRIPTION.ACTIVATED for newSubId arrives
  const activateEvent = normalizeEvent({
    id: 'EVT-NEW-SUB-ACTIVATED',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(2000000).toISOString(),
    resource: {
      id: newSubId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      status: 'ACTIVE',
    },
  });

  const actResult = await processWebhookEvent({
    databases: db,
    users,
    event: activateEvent,
    nowMs: 2000000,
    env: TEST_ENV,
  });

  assert.equal(actResult.outcome, 'processed');
  assert.equal(actResult.status, 'pending_initial_payment');
  assert.equal(actResult.mutated, true);

  let currentState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(currentState.subscription_id, newSubId, 'State must be updated to new subscription ID');
  assert.equal(currentState.status, 'pending_initial_payment');

  // 2. PAYMENT.SALE.COMPLETED for newSubId arrives
  const payEvent = normalizeEvent({
    id: 'EVT-NEW-SUB-PAID',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(3000000).toISOString(),
    resource: {
      id: 'TX-NEW-SUB-PAY',
      billing_agreement_id: newSubId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: newExpiryIso },
    },
  });

  const payResult = await processWebhookEvent({
    databases: db,
    users,
    event: payEvent,
    nowMs: 3000000,
    env: TEST_ENV,
  });

  assert.equal(payResult.outcome, 'processed');
  assert.equal(payResult.status, 'active');
  assert.equal(payResult.effectivePlan, 'premium');

  currentState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(currentState.subscription_id, newSubId);
  assert.equal(currentState.status, 'active');
  assert.equal(currentState.expires_at, newExpiryIso);
});

test('State Identity Guard E: ACTIVATED event arriving after SALE.COMPLETED does not regress active status back to pending_initial_payment', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const subId = 'I-ORDER-INVERTED-SUB';
  const expiryIso = '2026-11-10T12:00:00.000Z';

  // 1. PAYMENT.SALE.COMPLETED arrives first
  const payEvent = normalizeEvent({
    id: 'EVT-INVERT-PAY',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(1000000).toISOString(),
    resource: {
      id: 'TX-INVERT-PAY',
      billing_agreement_id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: expiryIso },
    },
  });

  const payResult = await processWebhookEvent({
    databases: db,
    users,
    event: payEvent,
    nowMs: 1000000,
    env: TEST_ENV,
  });

  assert.equal(payResult.outcome, 'processed');
  assert.equal(payResult.status, 'active');

  // 2. BILLING.SUBSCRIPTION.ACTIVATED arrives later with higher timestamp
  const actEvent = normalizeEvent({
    id: 'EVT-INVERT-ACT',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(1001000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      status: 'ACTIVE',
    },
  });

  const actResult = await processWebhookEvent({
    databases: db,
    users,
    event: actEvent,
    nowMs: 1001000,
    env: TEST_ENV,
  });

  assert.equal(actResult.outcome, 'processed');

  // Must remain active and retain authoritative expiry
  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(finalState.status, 'active', 'Status must not regress to pending_initial_payment');
  assert.equal(finalState.expires_at, expiryIso, 'Authoritative expiry must not be wiped out');
  assert.equal(finalState.will_renew, true);
});

test('State Identity Guard F: PAYMENT.SALE.COMPLETED with older timestamp than ACTIVATED on pending_initial_payment successfully transitions to active', async () => {
  const db = createMockDatabases();
  const users = createMockUsers();
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const subId = 'I-OLDER-PAY-TEST';
  const expiryIso = '2026-11-15T12:00:00.000Z';

  // 1. ACTIVATED arrives first with higher timestamp (e.g. 2000ms)
  const actEvent = normalizeEvent({
    id: 'EVT-OLDER-PAY-ACT',
    event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
    create_time: new Date(2000).toISOString(),
    resource: {
      id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      status: 'ACTIVE',
    },
  });

  const actResult = await processWebhookEvent({
    databases: db,
    users,
    event: actEvent,
    nowMs: 2000,
    env: TEST_ENV,
  });

  assert.equal(actResult.outcome, 'processed');
  assert.equal(actResult.status, 'pending_initial_payment');

  // Pre-seed payment ledger doc as stale_event (simulating prior delivery before fix)
  const payLedgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-OLDER-PAY-SALE');
  db.collections.paypal_event_ledger.set(payLedgerDocId, {
    $id: payLedgerDocId,
    event_id: 'EVT-OLDER-PAY-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    user_id: QA_USER_ID,
    subscription_id: subId,
    processing_status: 'ignored',
    outcome_code: 'stale_event',
  });

  // 2. PAYMENT.SALE.COMPLETED arrives with older timestamp (e.g. 1000ms, as in real PayPal!)
  const payEvent = normalizeEvent({
    id: 'EVT-OLDER-PAY-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(1000).toISOString(),
    resource: {
      id: 'TX-OLDER-PAY-SALE',
      billing_agreement_id: subId,
      custom_id: QA_USER_ID,
      plan_id: SANDBOX_ULTIMATE_PLAN_ID,
      billing_info: { next_billing_time: expiryIso },
    },
  });

  const payResult = await processWebhookEvent({
    databases: db,
    users,
    event: payEvent,
    nowMs: 3000,
    env: TEST_ENV,
  });

  assert.equal(payResult.outcome, 'processed');
  assert.equal(payResult.status, 'active');
  assert.equal(payResult.effectivePlan, 'premium');

  const finalState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(finalState.status, 'active');
  assert.equal(finalState.expires_at, expiryIso);
  assert.equal(finalState.latest_event_timestamp_ms, 2000, 'Timestamp must not regress');
});

// ============================================================================
// Provider Sale Fallback Correlation & Reclaim Tests (Option B Legacy Recovery)
// ============================================================================

test('fetchSaleDetails: successful sale fetch returns parsed sale object', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      assert.match(url, /\/v1\/payments\/sale\/TX-SALE-01$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'TX-SALE-01',
          billing_agreement_id: 'I-SUB-01',
          state: 'completed',
        }),
      };
    };

    const sale = await fetchSaleDetails('TX-SALE-01', { env: TEST_ENV });
    assert.deepEqual(sale, {
      id: 'TX-SALE-01',
      billing_agreement_id: 'I-SUB-01',
      state: 'completed',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchSaleDetails: 404 or non-transient 4xx returns null', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ name: 'NOT_FOUND' }),
      };
    };

    const sale = await fetchSaleDetails('TX-NONEXISTENT', { env: TEST_ENV });
    assert.equal(sale, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchSaleDetails: 5xx and 429 throw transient retryable error', async () => {
  const originalFetch = global.fetch;
  try {
    for (const status of [500, 502, 503, 504, 429]) {
      global.fetch = async (url) => {
        if (url.includes('/v1/oauth2/token')) {
          return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
        }
        return {
          ok: false,
          status,
          json: async () => ({ message: 'Server error' }),
        };
      };

      await assert.rejects(
        async () => {
          await fetchSaleDetails('TX-SALE-ERR', { env: TEST_ENV });
        },
        (err) => {
          assert.equal(err.isTransient, true);
          assert.equal(err.status, status);
          return true;
        }
      );
    }
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchSaleDetails: network failure throws transient error', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      throw new Error('ECONNRESET');
    };

    await assert.rejects(
      async () => {
        await fetchSaleDetails('TX-NET-ERR', { env: TEST_ENV });
      },
      (err) => {
        assert.equal(err.isTransient, true);
        assert.match(err.message, /PayPal Sale API network failure/);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchSaleDetails: malformed JSON response throws transient error', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return { ok: true, status: 200, json: async () => ({ access_token: 'tok_mock' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token');
        },
      };
    };

    await assert.rejects(
      async () => {
        await fetchSaleDetails('TX-BAD-JSON', { env: TEST_ENV });
      },
      (err) => {
        assert.equal(err.isTransient, true);
        assert.equal(err.code, 'malformed_sale_response');
        assert.equal(err.status, 502);
        return true;
      }
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('fetchSaleDetails: customFetcher override is used when provided', async () => {
  let customCalled = false;
  const sale = await fetchSaleDetails('TX-CUSTOM', {
    env: TEST_ENV,
    customFetcher: async (id) => {
      customCalled = true;
      return { id, billing_agreement_id: 'I-CUSTOM-SUB' };
    },
  });
  assert.equal(customCalled, true);
  assert.equal(sale.id, 'TX-CUSTOM');
  assert.equal(sale.billing_agreement_id, 'I-CUSTOM-SUB');
});

test('Legacy Refund Correlation: real-world PAYMENT.SALE.REFUNDED without billing_agreement_id correlates via fetchSaleDetails and settles refund', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const legacySubId = 'I-58K84FGAFFHL';
  const legacySaleId = '0B9419070U158972P';
  const refundId = '1H603208GJ834104W';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  // Pre-seed legacy state (predates PR #299: no last_entitlement_payment_id)
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    environment: 'sandbox',
    subscription_id: legacySubId,
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    status: 'canceled',
    expires_at: '2026-10-06T10:00:00.000Z',
    will_renew: false,
    last_entitlement_payment_id: null,
    last_entitlement_payment_ts_ms: null,
    latest_event_timestamp_ms: nowMs - 100000,
  });

  // Pre-seed legacy ledger doc for original sale (has payment_id = null)
  const saleLedgerDocId = paypalWebhook.__test.ledgerDocumentId('EVT-ORIGINAL-SALE');
  db.collections.paypal_event_ledger.set(saleLedgerDocId, {
    $id: saleLedgerDocId,
    event_id: 'EVT-ORIGINAL-SALE',
    event_type: 'PAYMENT.SALE.COMPLETED',
    user_id: QA_USER_ID,
    subscription_id: legacySubId,
    payment_id: null,
    processing_status: 'processed',
    outcome_code: 'state_updated',
  });

  // Authentic PayPal PAYMENT.SALE.REFUNDED payload (only has sale_id, NO billing_agreement_id)
  const refundEvent = normalizeEvent({
    id: 'WH-39D23786BJ747394G-6NV67311UF312770M',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: refundId,
      sale_id: legacySaleId,
      amount: { total: '10.00', currency: 'USD' },
      state: 'completed',
    },
  });

  let saleFetcherCalled = false;
  let transactionsFetcherCalled = false;
  let cancelerCalled = false;

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async (paymentId) => {
      saleFetcherCalled = true;
      assert.equal(paymentId, legacySaleId);
      return {
        id: legacySaleId,
        billing_agreement_id: legacySubId,
        state: 'refunded',
        custom: QA_USER_ID,
      };
    },
    subscriptionFetcher: async (subId) => {
      assert.equal(subId, legacySubId);
      return {
        id: legacySubId,
        status: 'ACTIVE',
        start_time: new Date(nowMs - 30 * 86400000).toISOString(),
      };
    },
    subscriptionTransactionsFetcher: async ({ subscriptionId, targetPaymentId }) => {
      transactionsFetcherCalled = true;
      assert.equal(subscriptionId, legacySubId);
      assert.equal(targetPaymentId, legacySaleId);
      return {
        found: true,
        transaction: {
          id: legacySaleId,
          status: 'REFUNDED',
          time: new Date(nowMs - 86400000).toISOString(),
        },
      };
    },
    subscriptionCanceler: async () => {
      cancelerCalled = true;
      return { ok: true, status: 'canceled' };
    },
  });

  assert.equal(saleFetcherCalled, true, 'Provider Sale fallback must be called');
  assert.equal(transactionsFetcherCalled, true, 'Legacy migration must verify transaction via Transactions API');
  assert.equal(cancelerCalled, true, 'Must attempt provider cancellation');
  assert.equal(result.outcome, 'processed');
  assert.equal(result.code, 'refund_and_cancellation_settled');
  assert.equal(result.effectivePlan, 'free');

  const updatedState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(updatedState.status, 'canceled');
  assert.equal(updatedState.expires_at, null);
  assert.equal(resolveEffectivePlan(updatedState).plan, 'free');
  assert.equal(updatedState.last_entitlement_payment_id, legacySaleId);

  const refundLedger = db.collections.paypal_event_ledger.get(
    paypalWebhook.__test.ledgerDocumentId('WH-39D23786BJ747394G-6NV67311UF312770M')
  );
  assert.equal(refundLedger.processing_status, 'processed');
  assert.equal(refundLedger.outcome_code, 'refund_and_cancellation_settled');
});

test('Legacy Refund Correlation: redelivery reclaims previously rejected unresolved_subscription_correlation event', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const legacySubId = 'I-58K84FGAFFHL';
  const legacySaleId = '0B9419070U158972P';
  const eventId = 'WH-39D23786BJ747394G-6NV67311UF312770M';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);

  // Pre-seed state
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    environment: 'sandbox',
    subscription_id: legacySubId,
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    status: 'canceled',
    expires_at: '2026-10-06T10:00:00.000Z',
    will_renew: false,
    last_entitlement_payment_id: null,
    latest_event_timestamp_ms: nowMs - 100000,
  });

  // Pre-seed ledger as REJECTED with unresolved_subscription_correlation (as currently exists in Sandbox!)
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    event_type: 'PAYMENT.SALE.REFUNDED',
    payment_id: legacySaleId,
    processing_status: 'rejected',
    outcome_code: 'unresolved_subscription_correlation',
    created_at_ms: nowMs - 50000,
  });

  const refundEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: '1H603208GJ834104W',
      sale_id: legacySaleId,
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async (paymentId) => ({
      id: paymentId,
      billing_agreement_id: legacySubId,
    }),
    subscriptionFetcher: async () => ({
      id: legacySubId,
      start_time: new Date(nowMs - 30 * 86400000).toISOString(),
    }),
    subscriptionTransactionsFetcher: async () => ({
      found: true,
      transaction: {
        id: legacySaleId,
        status: 'REFUNDED',
        time: new Date(nowMs - 86400000).toISOString(),
      },
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  // Must not return duplicate already_recorded, must reclaim and process!
  assert.equal(result.outcome, 'processed');
  assert.equal(result.code, 'refund_and_cancellation_settled');

  const updatedLedger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(updatedLedger.processing_status, 'processed');
  assert.equal(updatedLedger.outcome_code, 'refund_and_cancellation_settled');
});

test('Legacy Refund Correlation: rejected event with different outcome code is NOT reclaimed', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const eventId = 'WH-NON-RECLAIMABLE-REJECTED';
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);

  // Pre-seed ledger as REJECTED with malformed_event_resource
  db.collections.paypal_event_ledger.set(ledgerDocId, {
    $id: ledgerDocId,
    event_id: eventId,
    event_type: 'PAYMENT.SALE.REFUNDED',
    payment_id: 'TX-123',
    processing_status: 'rejected',
    outcome_code: 'malformed_event_resource',
    created_at_ms: nowMs - 50000,
  });

  const refundEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-NONREC',
      sale_id: 'TX-123',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
  });

  assert.equal(result.outcome, 'duplicate');
  assert.equal(result.code, 'already_recorded');
});

test('Legacy Refund Correlation: provider sale ID mismatch fails closed without state mutation', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const refundEvent = normalizeEvent({
    id: 'WH-MISMATCH-SALE-ID',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-MISMATCH',
      sale_id: 'TX-SALE-EXPECTED',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async () => ({
      id: 'TX-SALE-DIFFERENT',
      billing_agreement_id: 'I-SUB-MISMATCH',
    }),
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'unresolved_subscription_correlation');
});

test('Legacy Refund Correlation: provider sale missing or invalid billing_agreement_id fails closed', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const refundEvent = normalizeEvent({
    id: 'WH-INVALID-AGREEMENT',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-INVALID',
      sale_id: 'TX-SALE-INVALID',
    },
  });

  for (const badAgreement of [null, undefined, '', 'NOT-AN-I-ID', 'B-12345']) {
    const result = await processWebhookEvent({
      databases: db,
      users,
      event: refundEvent,
      nowMs,
      env: TEST_ENV,
      saleFetcher: async (paymentId) => ({
        id: paymentId,
        billing_agreement_id: badAgreement,
      }),
    });

    assert.equal(result.outcome, 'rejected');
    assert.equal(result.code, 'unresolved_subscription_correlation');
  }
});

test('Legacy Refund Correlation: conflicting customId fails closed with correlation_identity_conflict', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const refundEvent = normalizeEvent({
    id: 'WH-CONFLICTING-CUSTOM',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-CONFLICT',
      sale_id: 'TX-SALE-CONFLICT',
      custom_id: 'user_a',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async (paymentId) => ({
      id: paymentId,
      billing_agreement_id: 'I-SUB-CONFLICT',
      custom: 'user_b',
    }),
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'correlation_identity_conflict');
});

test('Legacy Refund Correlation: conflicting user between state and sale fails closed with correlation_identity_conflict', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const subId = 'I-SUB-CONFLICT-USER';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    environment: 'sandbox',
    subscription_id: subId,
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    status: 'active',
    effective_plan: 'premium',
    expires_at: '2026-10-06T10:00:00.000Z',
    latest_event_timestamp_ms: nowMs - 10000,
  });

  const refundEvent = normalizeEvent({
    id: 'WH-CONFLICT-STATE-USER',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-CONFLICT-2',
      sale_id: 'TX-SALE-CONFLICT-2',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: refundEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async (paymentId) => ({
      id: paymentId,
      billing_agreement_id: subId,
      custom: OTHER_USER_ID,
    }),
  });

  assert.equal(result.outcome, 'rejected');
  assert.equal(result.code, 'correlation_identity_conflict');
});

test('Legacy Refund Correlation: transient failure during fetchSaleDetails marks ledger failed and throws for retry', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const eventId = 'WH-TRANSIENT-FETCH-FAIL';
  const ledgerDocId = paypalWebhook.__test.ledgerDocumentId(eventId);

  const refundEvent = normalizeEvent({
    id: eventId,
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-REF-TRANSIENT',
      sale_id: 'TX-SALE-TRANSIENT',
    },
  });

  await assert.rejects(
    async () => {
      await processWebhookEvent({
        databases: db,
        users,
        event: refundEvent,
        nowMs,
        env: TEST_ENV,
        saleFetcher: async () => {
          const err = new Error('Service Unavailable');
          err.isTransient = true;
          err.status = 503;
          throw err;
        },
      });
    },
    (err) => {
      assert.equal(err.isTransient, true);
      assert.equal(err.status, 503);
      return true;
    }
  );

  const ledger = db.collections.paypal_event_ledger.get(ledgerDocId);
  assert.equal(ledger.processing_status, 'failed');
  assert.equal(ledger.outcome_code, 'transient_paypal_fetch_failure');
});

test('Legacy Reversal Correlation: PAYMENT.SALE.REVERSED without billing_agreement_id correlates via fetchSaleDetails and settles reversal', async () => {
  const db = createMockDatabases();
  const users = {
    async get(id) {
      return { $id: id, email: 'qa@test.wiseresume.app' };
    },
  };

  const nowMs = 1757243000000;
  const legacySubId = 'I-REV-SUB-01';
  const legacySaleId = 'TX-REV-SALE-01';
  const stateDocId = paypalWebhook.__test.stateDocumentId(QA_USER_ID);

  // Pre-seed state with matching last_entitlement_payment_id
  db.collections.paypal_subscription_state.set(stateDocId, {
    $id: stateDocId,
    user_id: QA_USER_ID,
    environment: 'sandbox',
    subscription_id: legacySubId,
    plan_id: SANDBOX_ULTIMATE_PLAN_ID,
    status: 'active',
    expires_at: '2026-10-06T10:00:00.000Z',
    will_renew: true,
    last_entitlement_payment_id: legacySaleId,
    last_entitlement_payment_ts_ms: nowMs - 100000,
    latest_event_timestamp_ms: nowMs - 100000,
  });

  const reversedEvent = normalizeEvent({
    id: 'WH-REV-EVENT-01',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: legacySaleId, // For REVERSED, resource.id is the Sale ID
      amount: { total: '10.00', currency: 'USD' },
      state: 'reversed',
    },
  });

  const result = await processWebhookEvent({
    databases: db,
    users,
    event: reversedEvent,
    nowMs,
    env: TEST_ENV,
    saleFetcher: async (paymentId) => ({
      id: paymentId,
      billing_agreement_id: legacySubId,
      state: 'reversed',
      custom: QA_USER_ID,
    }),
    subscriptionFetcher: async () => ({
      id: legacySubId,
      status: 'ACTIVE',
      start_time: new Date(nowMs - 30 * 86400000).toISOString(),
    }),
    subscriptionCanceler: async () => ({ ok: true, status: 'canceled' }),
  });

  assert.equal(result.outcome, 'processed');
  assert.equal(result.code, 'reversal_entitlement_revoked');
  assert.equal(result.effectivePlan, 'free');

  const updatedState = db.collections.paypal_subscription_state.get(stateDocId);
  assert.equal(updatedState.expires_at, null);
  assert.equal(resolveEffectivePlan(updatedState).plan, 'free');
});

// ==================================================
// Section 16: Phase I - Production Activation & Routing Tests
// ==================================================

test('Phase I - 4: paypal-webhook Production API routing base URLs', () => {
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'sandbox' }), 'https://api-m.sandbox.paypal.com');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'production' }), 'https://api-m.paypal.com');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: '' }), '');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'staging' }), '');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'test' }), '');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({}), '');
});

test('Phase I - 5: Production webhook signature verification routes to live PayPal OAuth', async () => {
  let requestedUrl = null;
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      json: async () => ({ access_token: 'mock_token' }),
    };
  };

  try {
    const headers = {
      transmissionId: 'tx_1',
      transmissionTime: '2026-09-07T12:00:00Z',
      certUrl: 'https://api.paypal.com/cert.pem',
      authAlgo: 'SHA256withRSA',
      transmissionSig: 'sig_1',
    };
    const prodEnv = {
      PAYPAL_ACCESS_ENVIRONMENT: 'production',
      PAYPAL_CLIENT_ID: 'prod_client',
      PAYPAL_CLIENT_SECRET: 'prod_secret',
      PAYPAL_WEBHOOK_ID: 'WH-PROD-LIVE',
    };

    // OAuth call goes to production base
    await paypalWebhook.__test.verifyWebhookSignatureWithPayPal(headers, {}, { env: prodEnv });
    assert.ok(requestedUrl.startsWith('https://api-m.paypal.com/v1/'), `Expected Live URL but got ${requestedUrl}`);
  } finally {
    global.fetch = originalFetch;
  }
});

test('Phase I - 6 & 7: Production plan mapping and strict cross-environment isolation', () => {
  const PROD_PRO_PLAN = 'P-PROD-PRO-PRICE-ID';
  const PROD_PREMIUM_PLAN = 'P-PROD-PREMIUM-PRICE-ID';

  const prodEnv = {
    PAYPAL_ACCESS_ENVIRONMENT: 'production',
    BILLING_PRODUCTION_PRO_PRICE_ID: PROD_PRO_PLAN,
    BILLING_PRODUCTION_PREMIUM_PRICE_ID: PROD_PREMIUM_PLAN,
    BILLING_SANDBOX_PRO_PRICE_ID: SANDBOX_PRO_PLAN_ID,
    BILLING_SANDBOX_PREMIUM_PRICE_ID: SANDBOX_ULTIMATE_PLAN_ID,
  };

  const sandboxEnv = {
    PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
    BILLING_PRODUCTION_PRO_PRICE_ID: PROD_PRO_PLAN,
    BILLING_PRODUCTION_PREMIUM_PRICE_ID: PROD_PREMIUM_PLAN,
    BILLING_SANDBOX_PRO_PRICE_ID: SANDBOX_PRO_PLAN_ID,
    BILLING_SANDBOX_PREMIUM_PRICE_ID: SANDBOX_ULTIMATE_PLAN_ID,
  };

  // Production environment + Production plans
  assert.equal(resolvePlanFromId(PROD_PRO_PLAN, prodEnv), 'pro');
  assert.equal(resolvePlanFromId(PROD_PREMIUM_PLAN, prodEnv), 'premium');
  assert.notEqual(resolvePlanFromId(PROD_PREMIUM_PLAN, prodEnv), 'ultimate', 'Must never map to internal ultimate');

  // Production environment + Sandbox plans -> REJECT (cross-environment leakage blocked)
  assert.equal(resolvePlanFromId(SANDBOX_PRO_PLAN_ID, prodEnv), null);
  assert.equal(resolvePlanFromId(SANDBOX_ULTIMATE_PLAN_ID, prodEnv), null);

  // Sandbox environment + Sandbox plans -> PASS
  assert.equal(resolvePlanFromId(SANDBOX_PRO_PLAN_ID, sandboxEnv), 'pro');
  assert.equal(resolvePlanFromId(SANDBOX_ULTIMATE_PLAN_ID, sandboxEnv), 'premium');

  // Sandbox environment + Production plans -> REJECT (cross-environment leakage blocked)
  assert.equal(resolvePlanFromId(PROD_PRO_PLAN, sandboxEnv), null);
  assert.equal(resolvePlanFromId(PROD_PREMIUM_PLAN, sandboxEnv), null);

  // Unknown plans -> REJECT
  assert.equal(resolvePlanFromId('UNKNOWN_PLAN', prodEnv), null);
  assert.equal(resolvePlanFromId('UNKNOWN_PLAN', sandboxEnv), null);
});

test('Phase I - 2 & 13: Production webhook admits normal user without requiring Sandbox QA user', async () => {
  const db = createMockDatabases();
  const normalUserId = 'user_normal_prod_777';
  const users = createMockUsers([normalUserId]);
  const nowMs = Date.parse('2026-09-07T12:00:00.000Z');
  const PROD_PRO_PLAN = 'P-PROD-PRO-777';

  const prodEnv = {
    PAYPAL_ACCESS_ENVIRONMENT: 'production',
    BILLING_PRODUCTION_PRO_PRICE_ID: PROD_PRO_PLAN,
    BILLING_PRODUCTION_PREMIUM_PRICE_ID: 'P-PROD-PREM-777',
    PAYPAL_CLIENT_ID: 'prod_client_id',
    PAYPAL_CLIENT_SECRET: 'prod_client_secret',
    PAYPAL_WEBHOOK_ID: 'WH-PROD-777',
    // Note: BILLING_CHECKOUT_QA_USER_ID is intentionally omitted
  };

  const nextBilling = new Date(nowMs + 30 * 86400000).toISOString();
  const event = normalizeEvent({
    id: 'EVT-PROD-SALE-1',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-PROD-SALE-1',
      billing_agreement_id: 'I-SUB-PROD-777',
      custom: normalUserId,
      amount: { total: '5.00', currency: 'USD' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event,
    nowMs,
    env: prodEnv,
    subscriptionFetcher: async () => ({
      id: 'I-SUB-PROD-777',
      plan_id: PROD_PRO_PLAN,
      status: 'ACTIVE',
      billing_info: { next_billing_time: nextBilling },
      custom_id: normalUserId,
    }),
  });

  assert.equal(res.outcome, 'processed');
  assert.equal(res.code, 'state_updated');
  assert.equal(res.mutated, true);
  assert.equal(res.plan, 'pro');
  assert.equal(res.effectivePlan, 'pro');

  const stateDocId = paypalWebhook.__test.stateDocumentId(normalUserId);
  const state = db.collections.paypal_subscription_state.get(stateDocId);
  assert.ok(state, 'State document must be created for normal production user');
  assert.equal(state.user_id, normalUserId);
  assert.equal(state.environment, 'production');
  assert.equal(state.plan, 'pro');
  assert.equal(state.status, 'active');
});

test('Phase I - 3 & 10: Sandbox webhook strictly maintains QA user restriction', async () => {
  const db = createMockDatabases();
  const nonQaUserId = 'user_intruder_999';
  const users = createMockUsers([nonQaUserId]);
  const nowMs = Date.parse('2026-09-07T12:00:00.000Z');

  const event = normalizeEvent({
    id: 'EVT-SANDBOX-NONQA',
    event_type: 'PAYMENT.SALE.COMPLETED',
    create_time: new Date(nowMs).toISOString(),
    resource: {
      id: 'TX-SANDBOX-SALE-999',
      billing_agreement_id: 'I-SUB-SANDBOX-999',
      custom: nonQaUserId,
      amount: { total: '5.00', currency: 'USD' },
    },
  });

  const res = await processWebhookEvent({
    databases: db,
    users,
    event,
    nowMs,
    env: TEST_ENV, // TEST_ENV has QA_USER_ID = 'user_qa_paypal_123'
    subscriptionFetcher: async () => ({
      id: 'I-SUB-SANDBOX-999',
      plan_id: SANDBOX_PRO_PLAN_ID,
      status: 'ACTIVE',
      custom_id: nonQaUserId,
    }),
  });

  assert.equal(res.outcome, 'ignored');
  assert.equal(res.code, 'sandbox_qa_boundary_rejected');
  assert.equal(res.mutated, false);
});
