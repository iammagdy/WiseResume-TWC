'use strict';

const assert = require('assert');
const crypto = require('crypto');
process.env.WHOP_ACCESS_ENVIRONMENT = 'sandbox';
process.env.WHOP_SANDBOX_COMPANY_ID = 'biz_test_sandbox';
process.env.WHOP_SANDBOX_PRODUCT_ID = 'prod_test_sandbox';
process.env.WHOP_SANDBOX_PRO_PLAN_ID = 'plan_test_pro';
process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID = 'plan_test_premium';
const webhook = require('../../appwrite-hubs/whop-webhook/src/main.js');
const { __test: t } = webhook;

function signed(raw, secret, id = 'msg_test', timestamp = Math.floor(Date.now() / 1000)) {
  const key = Buffer.from(secret, 'utf8');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

function signedWithKey(raw, key, id = 'msg_test', timestamp = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

const secret = `ws_${'a'.repeat(64)}`;
const wrongSecret = `ws_${'b'.repeat(64)}`;
const raw = JSON.stringify({
  id: 'msg_1', api_version: 'v1', type: 'membership.activated',
  timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
  data: {
    id: 'mem_1', user: { id: 'whop_user' },
    plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
    renewal_period_end: new Date(Date.now() + 86400000).toISOString(),
    cancel_at_period_end: false,
    metadata: { wiseresume_user_id: 'appwrite_user', checkout_reference: 'sess_1' },
  },
});

assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1') }, secret), true);
assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1') }, wrongSecret), false);
assert.equal(t.verifySignature(raw, { headers: signedWithKey(raw, Buffer.from(secret.slice(3), 'hex'), 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: signedWithKey(raw, Buffer.from(secret.slice(3), 'base64'), 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: { ...signed(raw, secret, 'msg_1'), 'webhook-signature': `v2,${signed(raw, secret, 'msg_1')['webhook-signature'].slice(3)}` } }, secret), false);
assert.equal(t.verifySignature(raw, { headers: { ...signed(raw, secret, 'msg_1'), 'webhook-signature': `v2,invalid ${signed(raw, secret, 'msg_1')['webhook-signature']}` } }, secret), true);
assert.equal(t.verifySignature(`${raw}x`, { headers: signed(raw, secret, 'msg_1') }, secret), false);
assert.equal(t.verifySignature(JSON.stringify(JSON.parse(raw), null, 2), { headers: signed(raw, secret, 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1', 1) }, secret), false);
assert.equal(t.verifySignature(raw, { headers: {} }, secret), false);

const event = t.eventData(JSON.parse(raw), 'msg_1');
assert.equal(t.validateEvent(event), null);
assert.equal(t.statePatch(event, Date.now(), null).plan, 'pro');
assert.equal(t.validateEvent({ ...event, planId: 'plan_unknown' }), 'unknown_product_or_plan');
assert.equal(t.validateEvent({ ...event, companyId: 'biz_wrong' }), 'company_mismatch');

// Mock databases and users factory
function createMockDatabases() {
  const store = {
    whop_subscription_state: new Map(),
    whop_event_ledger: new Map(),
    billing_checkout_sessions: new Map(),
  };

  return {
    store,
    async listDocuments(dbId, collectionId, queries = []) {
      const col = store[collectionId] || new Map();
      let docs = Array.from(col.values());
      for (const q of queries) {
        let parsed = q;
        if (typeof q === 'string') {
          try { parsed = JSON.parse(q); } catch (_) {}
        }
        if (parsed?.method === 'equal' && parsed?.attribute) {
          const val = parsed.values?.[0];
          docs = docs.filter(d => d[parsed.attribute] === val);
        }
      }
      return { documents: docs, total: docs.length };
    },
    async getDocument(dbId, collectionId, docId) {
      const col = store[collectionId] || new Map();
      const doc = col.get(docId);
      if (!doc) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      return doc;
    },
    async createDocument(dbId, collectionId, docId, data) {
      const col = store[collectionId] || new Map();
      if (col.has(docId)) {
        const err = new Error('Document already exists');
        err.code = 409;
        throw err;
      }
      const doc = { ...data, $id: docId, $createdAt: new Date().toISOString() };
      col.set(docId, doc);
      return doc;
    },
    async updateDocument(dbId, collectionId, docId, data) {
      const col = store[collectionId] || new Map();
      const existing = col.get(docId) || {};
      const updated = { ...existing, ...data, $id: docId, $updatedAt: new Date().toISOString() };
      col.set(docId, updated);
      return updated;
    },
  };
}

function createMockUsers(validUserIds = []) {
  const userSet = new Set(validUserIds);
  return {
    async get(userId) {
      if (!userSet.has(userId)) {
        const err = new Error('User not found');
        err.code = 404;
        throw err;
      }
      return { $id: userId };
    },
  };
}

(async () => {
  const QA_USER = 'qa_user_123';
  const users = createMockUsers([QA_USER]);

  // Scenario A: membership.activated with metadata user absent, checkout_configuration_id present, valid session -> active Pro state created
  {
    const db = createMockDatabases();
    db.store.billing_checkout_sessions.set('sess_doc_1', {
      $id: 'sess_doc_1',
      checkout_reference: 'ch_conf_1',
      provider_transaction_id: 'ch_conf_1',
      user_id: QA_USER,
      plan: 'pro',
      environment: 'sandbox',
      price_id: process.env.WHOP_SANDBOX_PRO_PLAN_ID,
      product_id: process.env.WHOP_SANDBOX_PRODUCT_ID,
    });

    const actPayload = {
      id: 'msg_act_1', api_version: 'v1', type: 'membership.activated',
      timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_1', checkout_configuration_id: 'ch_conf_1',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
        renewal_period_end: new Date(Date.now() + 86400000).toISOString(),
        cancel_at_period_end: false,
        metadata: {},
      },
    };

    const res = await t.processEvent(db, users, t.eventData(actPayload, 'msg_act_1'));
    assert.equal(res.outcome, 'processed', 'Scenario A should be processed');
    assert.equal(res.code, 'state_updated');
    assert.equal(res.mutated, true);
    assert.equal(res.plan, 'pro');

    const state = await db.store.whop_subscription_state.get(t.stateDocumentId(QA_USER));
    assert.ok(state, 'Subscription state document must be created');
    assert.equal(state.status, 'active');
    assert.equal(state.plan, 'pro');
    assert.equal(state.membership_id, 'mem_1');
    assert.equal(state.checkout_reference, 'ch_conf_1');
  }

  // Scenario B: invalid/missing correlation -> fail closed
  {
    const db = createMockDatabases();
    const actPayload = {
      id: 'msg_act_2', api_version: 'v1', type: 'membership.activated',
      timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_2', checkout_configuration_id: 'ch_unmatched_999',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
        metadata: {},
      },
    };

    const res = await t.processEvent(db, users, t.eventData(actPayload, 'msg_act_2'));
    assert.equal(res.outcome, 'rejected', 'Scenario B must reject unmapped session');
    assert.equal(res.code, 'unresolved_checkout_correlation');
    assert.equal(res.mutated, false);
    assert.equal(db.store.whop_subscription_state.size, 0, 'No state should be created');
  }

  // Scenario C: mismatched environment / provider / plan / product session -> fail closed
  {
    const db = createMockDatabases();
    // Mismatched environment
    db.store.billing_checkout_sessions.set('sess_env', {
      checkout_reference: 'ch_env', user_id: QA_USER, plan: 'pro', environment: 'production',
    });
    const resEnv = await t.processEvent(db, users, t.eventData({
      id: 'msg_env', type: 'membership.activated', timestamp: new Date().toISOString(),
      account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: { id: 'mem_c1', checkout_configuration_id: 'ch_env', plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID } },
    }));
    assert.equal(resEnv.outcome, 'rejected');

    // Mismatched plan
    db.store.billing_checkout_sessions.set('sess_plan', {
      checkout_reference: 'ch_plan', user_id: QA_USER, plan: 'premium', environment: 'sandbox',
    });
    const resPlan = await t.processEvent(db, users, t.eventData({
      id: 'msg_plan', type: 'membership.activated', timestamp: new Date().toISOString(),
      account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: { id: 'mem_c2', checkout_configuration_id: 'ch_plan', plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID } },
    }));
    assert.equal(resPlan.outcome, 'rejected');

    // Mismatched provider
    db.store.billing_checkout_sessions.set('sess_prov', {
      checkout_reference: 'ch_prov', user_id: QA_USER, plan: 'pro', environment: 'sandbox', provider: 'paypal',
    });
    const resProv = await t.processEvent(db, users, t.eventData({
      id: 'msg_prov', type: 'membership.activated', timestamp: new Date().toISOString(),
      account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: { id: 'mem_c3', checkout_configuration_id: 'ch_prov', plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID } },
    }));
    assert.equal(resProv.outcome, 'rejected');
  }

  // Scenario D: subsequent cancellation/deactivation resolves via membership_id when checkout_configuration_id is unavailable
  {
    const db = createMockDatabases();
    // Seed existing active state
    db.store.whop_subscription_state.set(t.stateDocumentId(QA_USER), {
      $id: t.stateDocumentId(QA_USER),
      user_id: QA_USER, plan: 'pro', membership_id: 'mem_d1',
      plan_id: process.env.WHOP_SANDBOX_PRO_PLAN_ID, product_id: process.env.WHOP_SANDBOX_PRODUCT_ID,
      environment: 'sandbox', status: 'active', will_renew: true,
      latest_event_timestamp_ms: 1000,
    });

    // Cancellation without checkout_configuration_id
    const cancelPayload = {
      id: 'msg_cancel_1', api_version: 'v1', type: 'membership.cancel_at_period_end_changed',
      timestamp: new Date(2000).toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_d1',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
        cancel_at_period_end: true,
      },
    };
    const resCancel = await t.processEvent(db, users, t.eventData(cancelPayload, 'msg_cancel_1'));
    assert.equal(resCancel.outcome, 'processed');
    const stateAfterCancel = db.store.whop_subscription_state.get(t.stateDocumentId(QA_USER));
    assert.equal(stateAfterCancel.status, 'canceled');
    assert.equal(stateAfterCancel.will_renew, false);

    // Deactivation without checkout_configuration_id
    const deactPayload = {
      id: 'msg_deact_1', api_version: 'v1', type: 'membership.deactivated',
      timestamp: new Date(3000).toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_d1',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
      },
    };
    const resDeact = await t.processEvent(db, users, t.eventData(deactPayload, 'msg_deact_1'));
    assert.equal(resDeact.outcome, 'processed');
    const stateAfterDeact = db.store.whop_subscription_state.get(t.stateDocumentId(QA_USER));
    assert.equal(stateAfterDeact.status, 'expired');
  }

  // Scenario E: non-current duplicate membership deactivation must NOT deactivate current active membership
  {
    const db = createMockDatabases();
    // User has active state owned by membership A
    db.store.whop_subscription_state.set(t.stateDocumentId(QA_USER), {
      $id: t.stateDocumentId(QA_USER),
      user_id: QA_USER, plan: 'pro', membership_id: 'mem_A',
      plan_id: process.env.WHOP_SANDBOX_PRO_PLAN_ID, product_id: process.env.WHOP_SANDBOX_PRODUCT_ID,
      environment: 'sandbox', status: 'active', will_renew: true,
      latest_event_timestamp_ms: 5000,
    });

    // Session exists for membership B
    db.store.billing_checkout_sessions.set('sess_B', {
      checkout_reference: 'ch_B', user_id: QA_USER, plan: 'pro', environment: 'sandbox',
    });

    // Deactivation event arrives for membership B
    const deactB = {
      id: 'msg_deact_B', api_version: 'v1', type: 'membership.deactivated',
      timestamp: new Date(6000).toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_B', checkout_configuration_id: 'ch_B',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
      },
    };

    const res = await t.processEvent(db, users, t.eventData(deactB, 'msg_deact_B'));
    assert.equal(res.outcome, 'ignored', 'Event for non-current membership must be ignored');
    assert.equal(res.code, 'non_current_membership');
    assert.equal(res.mutated, false);

    // Verify current active membership A was NOT modified
    const current = db.store.whop_subscription_state.get(t.stateDocumentId(QA_USER));
    assert.equal(current.membership_id, 'mem_A', 'Must remain membership A');
    assert.equal(current.status, 'active', 'Must remain active');
  }

  // Scenario F: rejected missing_metadata_user event redelivery is recoverable
  {
    const db = createMockDatabases();
    // Pre-record a rejected entry in ledger
    const eventId = 'msg_redeliver_1';
    db.store.whop_event_ledger.set(t.ledgerDocumentId(eventId), {
      $id: t.ledgerDocumentId(eventId),
      event_id: eventId,
      event_type: 'membership.activated',
      processing_status: 'rejected',
      outcome_code: 'missing_metadata_user',
    });

    // Valid session correlation exists
    db.store.billing_checkout_sessions.set('sess_reclaim', {
      checkout_reference: 'ch_reclaim', user_id: QA_USER, plan: 'pro', environment: 'sandbox',
    });

    const redelivered = {
      id: eventId, api_version: 'v1', type: 'membership.activated',
      timestamp: new Date(1000).toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_rec', checkout_configuration_id: 'ch_reclaim',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
      },
    };

    const res = await t.processEvent(db, users, t.eventData(redelivered, eventId));
    assert.equal(res.outcome, 'processed', 'Eligible rejected event should be successfully reclaimed');
    assert.equal(res.code, 'state_updated');
    assert.equal(res.mutated, true);

    const ledger = db.store.whop_event_ledger.get(t.ledgerDocumentId(eventId));
    assert.equal(ledger.processing_status, 'processed');
    assert.equal(ledger.outcome_code, 'state_updated');
  }

  // Scenario G: unrelated rejected events remain non-reclaimable
  {
    const db = createMockDatabases();
    const eventId = 'msg_unrelated_rej';
    db.store.whop_event_ledger.set(t.ledgerDocumentId(eventId), {
      $id: t.ledgerDocumentId(eventId),
      event_id: eventId,
      event_type: 'membership.activated',
      processing_status: 'rejected',
      outcome_code: 'company_mismatch', // Unrelated rejection
    });

    const event = {
      id: eventId, api_version: 'v1', type: 'membership.activated',
      timestamp: new Date(1000).toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: { id: 'mem_g', plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID } },
    };

    const res = await t.processEvent(db, users, t.eventData(event, eventId));
    assert.equal(res.outcome, 'duplicate', 'Unrelated rejected event must remain terminal');
    assert.equal(res.code, 'already_recorded');
  }

  // Scenario H: payment.succeeded remains non-entitlement-mutating
  {
    const db = createMockDatabases();
    const payEvent = {
      id: 'msg_pay_1', api_version: 'v1', type: 'payment.succeeded',
      timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'pay_1', plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
        metadata: { wiseresume_user_id: QA_USER },
      },
    };

    const res = await t.processEvent(db, users, t.eventData(payEvent, 'msg_pay_1'));
    assert.equal(res.outcome, 'processed');
    assert.equal(res.code, 'observed_without_entitlement_mutation');
    assert.equal(res.mutated, false, 'Payment event must never mutate entitlement state');
    assert.equal(db.store.whop_subscription_state.size, 0, 'Subscription state must remain empty');
  }

  // Scenario I: duplicate processed event remains idempotent
  {
    const db = createMockDatabases();
    db.store.billing_checkout_sessions.set('sess_dup', {
      checkout_reference: 'ch_dup', user_id: QA_USER, plan: 'pro', environment: 'sandbox',
    });

    const dupEvent = {
      id: 'msg_dup_1', api_version: 'v1', type: 'membership.activated',
      timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
      data: {
        id: 'mem_dup', checkout_configuration_id: 'ch_dup',
        plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID },
        product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
      },
    };

    const first = await t.processEvent(db, users, t.eventData(dupEvent, 'msg_dup_1'));
    assert.equal(first.outcome, 'processed');
    assert.equal(first.mutated, true);

    const second = await t.processEvent(db, users, t.eventData(dupEvent, 'msg_dup_1'));
    assert.equal(second.outcome, 'duplicate', 'Second invocation must be recognized as duplicate');
    assert.equal(second.code, 'already_recorded');
    assert.equal(second.mutated, false);
  }

  console.log('All Whop webhook test scenarios (A through I) passed successfully.');
})().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
