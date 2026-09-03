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

      for (const q of queries) {
        if (typeof q === 'string') {
          const match = q.match(/equal\("([^"]+)",\s*\[?"?([^"\]]+)"?\]?\)/);
          if (match) {
            const [, key, val] = match;
            docs = docs.filter(d => d[key] === val);
          }
        }
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
test('Environment: sandbox allowed, missing/invalid/production fail closed', async () => {
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
  assert.equal(resMissing.code, 'sandbox_only_phase3_gate');

  // Invalid -> rejected
  const resInvalid = await processWebhookEvent({ databases: db, users, event, nowMs, env: { ...TEST_ENV, PAYPAL_ACCESS_ENVIRONMENT: 'staging' } });
  assert.equal(resInvalid.outcome, 'rejected');
  assert.equal(resInvalid.code, 'sandbox_only_phase3_gate');

  // Production -> rejected in Phase 3
  const resProd = await processWebhookEvent({ databases: db, users, event, nowMs, env: { ...TEST_ENV, PAYPAL_ACCESS_ENVIRONMENT: 'production' } });
  assert.equal(resProd.outcome, 'rejected');
  assert.equal(resProd.code, 'sandbox_only_phase3_gate');

  // Base URL returns empty for production in Phase 3
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'production' }), '');
  assert.equal(paypalWebhook.__test.getPaypalApiBaseUrl({ PAYPAL_ACCESS_ENVIRONMENT: 'sandbox' }), 'https://api-m.sandbox.paypal.com');
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

test('Ledger-only: PAYMENT.SALE.REFUNDED and PAYMENT.SALE.REVERSED are recorded without state mutation', async () => {
  const db = createMockDatabases();
  const nowMs = Date.parse('2026-09-03T12:00:00.000Z');

  const refundEvent = normalizeEvent({
    id: 'EVT-REFUND-001',
    event_type: 'PAYMENT.SALE.REFUNDED',
    create_time: '2026-09-03T12:00:00Z',
    resource: { id: 'TX-REFUND-001', billing_agreement_id: 'I-SUB-REF' },
  });
  const refundResult = await processWebhookEvent({ databases: db, event: refundEvent, nowMs, env: TEST_ENV });
  assert.equal(refundResult.outcome, 'processed');
  assert.equal(refundResult.code, 'ledger_only_policy_pending');
  assert.equal(refundResult.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);

  const reverseEvent = normalizeEvent({
    id: 'EVT-REVERSE-001',
    event_type: 'PAYMENT.SALE.REVERSED',
    create_time: '2026-09-03T12:00:00Z',
    resource: { id: 'TX-REV-001', billing_agreement_id: 'I-SUB-REV' },
  });
  const reverseResult = await processWebhookEvent({ databases: db, event: reverseEvent, nowMs, env: TEST_ENV });
  assert.equal(reverseResult.outcome, 'processed');
  assert.equal(reverseResult.code, 'ledger_only_policy_pending');
  assert.equal(reverseResult.mutated, false);
  assert.equal(db.collections.paypal_subscription_state.size, 0);
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

test('Bootstrap: Production environment remains strictly rejected even with valid credentials and webhook ID', async () => {
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
        PAYPAL_ACCESS_ENVIRONMENT: 'production',
        PAYPAL_CLIENT_ID: 'mock_prod_client_id',
        PAYPAL_CLIENT_SECRET: 'mock_prod_client_secret',
        PAYPAL_WEBHOOK_ID: 'WH-PROD-UNAUTHORIZED',
        BILLING_CHECKOUT_QA_USER_ID: QA_USER_ID,
      },
    },
  };

  await paypalWebhook({ req, res, log: () => {}, error: () => {} });
  // Signature verification fails closed because getPaypalApiBaseUrl returns empty string for production!
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
