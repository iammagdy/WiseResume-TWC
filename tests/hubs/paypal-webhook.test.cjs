'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const paypalWebhook = require('../../appwrite-hubs/paypal-webhook/src/main.js');
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

  return {
    collections,
    async listDocuments(_dbId, collectionId, queries = []) {
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
      return { documents: docs, total: docs.length };
    },
    async getDocument(_dbId, collectionId, docId) {
      const col = collections[collectionId];
      const doc = col?.get(docId);
      if (!doc) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      return doc;
    },
    async createDocument(_dbId, collectionId, docId, data, _permissions) {
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
      const created = { $id: docId, ...data };
      col.set(docId, created);
      return created;
    },
    async deleteDocument(_dbId, collectionId, docId) {
      const col = collections[collectionId];
      if (!col || !col.has(docId)) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      col.delete(docId);
      return { ok: true };
    },
    async updateDocument(_dbId, collectionId, docId, data, _permissions) {
      const col = collections[collectionId];
      const existing = col.get(docId);
      if (!existing) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      const updated = { ...existing, ...data };
      col.set(docId, updated);
      return updated;
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
