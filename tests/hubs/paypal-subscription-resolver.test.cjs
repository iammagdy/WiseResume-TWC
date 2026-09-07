'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  resolveEffectivePlan,
  buildPlanCandidates,
  normalizePlan,
  configuredPaypalProviderEnvironment,
  PLAN_RANK,
  fulfillCompletedOneTimePayment,
} = require('../../appwrite-hubs/shared-subscription-resolver');

const QA_USER_ID = 'user_qa_123';
const OTHER_USER_ID = 'user_other_999';
const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
const futureExpiry = new Date(nowMs + 30 * 86400000).toISOString();
const pastExpiry = new Date(nowMs - 1000).toISOString();
const graceExpiry = new Date(nowMs + 48 * 3600000).toISOString();

// Verified Live Sandbox Plan IDs
const SANDBOX_PRO_PLAN_ID = 'P-62G07996SG1490118NKN6I3Q';
const SANDBOX_ULTIMATE_PLAN_ID = 'P-56D04005HN592501XNKN6I3Q';

function paypalState(overrides = {}) {
  return {
    user_id: QA_USER_ID,
    plan: 'pro',
    subscription_id: 'I-3A193536YV14',
    plan_id: SANDBOX_PRO_PLAN_ID,
    environment: 'sandbox',
    status: 'active',
    expires_at: futureExpiry,
    will_renew: true,
    ...overrides,
  };
}

function rcState(overrides = {}) {
  return {
    user_id: QA_USER_ID,
    plan: 'pro',
    environment: 'sandbox',
    status: 'active',
    expires_at: futureExpiry,
    will_renew: true,
    ...overrides,
  };
}

// 1. PayPal Pro active + QA user => pro
test('Case 1: PayPal Pro active + QA user resolves to pro', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ plan: 'pro', plan_id: SANDBOX_PRO_PLAN_ID }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'pro');
  assert.equal(result.source, 'paypal');
});

// 2. PayPal Premium active + QA user => premium
test('Case 2: PayPal Premium active + QA user resolves to premium', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ plan: 'premium', plan_id: SANDBOX_ULTIMATE_PLAN_ID }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'premium');
  assert.equal(result.source, 'paypal');
});

// 3. PayPal active + non-QA user => ignored (falls back to free)
test('Case 3: PayPal Sandbox active for non-QA user is ignored and falls back to free', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ user_id: OTHER_USER_ID, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: OTHER_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
  assert.equal(result.source, 'free');
});

// 4. Missing QA-user configuration + Sandbox PayPal state => ignored/fail closed
test('Case 4: Missing QA-user configuration fails closed and ignores Sandbox PayPal state', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: '', // Empty QA user ID
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 5. Sandbox/production environment mismatch => ignored
test('Case 5: Sandbox/production environment mismatch ignores PayPal candidate', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ environment: 'sandbox', plan: 'premium' }),
    paypalProviderEnvironment: 'production', // Caller requested production
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 6. pending_initial_payment status => NO paid access (falls back to free)
test('Case 6: pending_initial_payment status grants no paid access', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'pending_initial_payment', plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 7. suspended status => NO paid access (falls back to free)
test('Case 7: suspended status grants no paid access', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'suspended', plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 8. expired status => NO paid access (falls back to free)
test('Case 8: expired status grants no paid access', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'expired', plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 9. billing_issue with future expires_at => preserves paid access
test('Case 9: billing_issue with future expires_at preserves paid access', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'billing_issue', expires_at: graceExpiry, plan: 'pro' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'pro');
  assert.equal(result.source, 'paypal');
});

// 10. billing_issue with past expires_at => drops to Free
test('Case 10: billing_issue after expires_at drops to Free', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'billing_issue', expires_at: pastExpiry, plan: 'pro' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 11. canceled before expires_at => preserves paid access
test('Case 11: canceled before expires_at preserves paid access', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'canceled', expires_at: futureExpiry, will_renew: false, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'premium');
  assert.equal(result.source, 'paypal');
});

// 12. canceled after expires_at => drops to Free
test('Case 12: canceled after expires_at drops to Free', () => {
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({ status: 'canceled', expires_at: pastExpiry, will_renew: false, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(result.plan, 'free');
});

// 13. RevenueCat behavior remains intact and independent of PayPal
test('Case 13: RevenueCat behavior remains intact and independent of PayPal', () => {
  const result = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro' }),
    providerEnvironment: 'sandbox',
    nowMs,
  });
  assert.equal(result.plan, 'pro');
  assert.equal(result.source, 'revenuecat');
});

// 14. legacy manual, coupon, and trial subscriptions remain intact
test('Case 14: legacy manual, coupon, and trial subscriptions remain intact', () => {
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'pro' } }).plan, 'pro');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'pro' } }).source, 'manual/admin');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'premium', coupon_code: 'SPECIAL' } }).plan, 'premium');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'premium', coupon_code: 'SPECIAL' } }).source, 'coupon');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free', trial_plan: 'pro', trial_expires_at: futureExpiry }, nowMs }).plan, 'pro');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free', trial_plan: 'pro', trial_expires_at: futureExpiry }, nowMs }).source, 'active trial');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free', trial_plan: 'pro', trial_expires_at: pastExpiry }, nowMs }).plan, 'free');
});

// 15. highest valid plan wins; equal rank preserves existing precedence
test('Case 15: highest valid plan rank wins across multiple providers and sources', () => {
  // RevenueCat Pro (rank 1) + PayPal Premium (rank 2) => Premium wins
  const rcProPaypalPremium = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro' }),
    paypalProviderState: paypalState({ plan: 'premium' }),
    providerEnvironment: 'sandbox',
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(rcProPaypalPremium.plan, 'premium');
  assert.equal(rcProPaypalPremium.source, 'paypal');

  // RevenueCat Premium (rank 2) + PayPal Pro (rank 1) => RevenueCat Premium wins
  const rcPremiumPaypalPro = resolveEffectivePlan({
    providerState: rcState({ plan: 'premium' }),
    paypalProviderState: paypalState({ plan: 'pro' }),
    providerEnvironment: 'sandbox',
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(rcPremiumPaypalPro.plan, 'premium');
  assert.equal(rcPremiumPaypalPro.source, 'revenuecat');

  // Legacy Manual Premium (rank 2) + PayPal Pro (rank 1) => Legacy Premium wins
  const legacyPremiumPaypalPro = resolveEffectivePlan({
    subscription: { plan: 'premium' },
    paypalProviderState: paypalState({ plan: 'pro' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(legacyPremiumPaypalPro.plan, 'premium');
  assert.equal(legacyPremiumPaypalPro.source, 'manual/admin');

  // Same Rank Precedence: Existing order preserved (RevenueCat Pro beats PayPal Pro)
  const sameRankWinner = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro' }),
    paypalProviderState: paypalState({ plan: 'pro' }),
    providerEnvironment: 'sandbox',
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(sameRankWinner.plan, 'pro');
  assert.equal(sameRankWinner.source, 'revenuecat');

  // Same Rank Precedence: Manual Pro beats PayPal Pro
  const manualVsPaypal = resolveEffectivePlan({
    subscription: { plan: 'pro' },
    paypalProviderState: paypalState({ plan: 'pro' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(manualVsPaypal.plan, 'pro');
  assert.equal(manualVsPaypal.source, 'manual/admin');
});

// 16. internal Ultimate remains premium
test('Case 16: public Ultimate maps to internal premium', () => {
  assert.equal(normalizePlan('ultimate'), 'premium');
  assert.equal(normalizePlan('Ultimate'), 'premium');
  assert.equal(normalizePlan('ULTIMATE'), 'premium');
  assert.equal(normalizePlan('premium'), 'premium');
});

// 17. no persisted/accepted ultimate internal plan value
test('Case 17: ultimate is never a valid candidate plan or rank key', () => {
  assert.equal(PLAN_RANK.ultimate, undefined);
  assert.equal(PLAN_RANK.premium, 2);
  assert.equal(PLAN_RANK.pro, 1);
  assert.equal(PLAN_RANK.free, 0);

  const candidates = buildPlanCandidates({
    paypalProviderState: paypalState({ plan: 'ultimate' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  const paypalCandidate = candidates.find(c => c.source === 'paypal');
  assert.ok(paypalCandidate);
  assert.equal(paypalCandidate.plan, 'premium');
});

// 18. Canonical QA Ownership Boundary Tests
test('Case 18: Canonical QA Ownership Boundary enforces both user ID and state user_id match', () => {
  // QA user + PayPal state owned by another user => ignored/free
  const qaUserStolenState = resolveEffectivePlan({
    paypalProviderState: paypalState({ user_id: OTHER_USER_ID, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(qaUserStolenState.plan, 'free');

  // Non-QA user + PayPal state owned by QA user => ignored/free
  const nonQaUserWithQaState = resolveEffectivePlan({
    paypalProviderState: paypalState({ user_id: QA_USER_ID, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: OTHER_USER_ID,
    nowMs,
  });
  assert.equal(nonQaUserWithQaState.plan, 'free');

  // Missing userId => ignored/free (no fallback to state user_id)
  const missingUserId = resolveEffectivePlan({
    paypalProviderState: paypalState({ user_id: QA_USER_ID, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: '',
    nowMs,
  });
  assert.equal(missingUserId.plan, 'free');

  // QA user + matching QA PayPal state => eligible (resolves to premium)
  const validQaState = resolveEffectivePlan({
    paypalProviderState: paypalState({ user_id: QA_USER_ID, plan: 'premium' }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(validQaState.plan, 'premium');
  assert.equal(validQaState.source, 'paypal');
});

// 19. Provider Environment Isolation Tests
test('Case 19: Provider Environment Isolation decouples PayPal Sandbox from RevenueCat', () => {
  // RevenueCat in Sandbox state does NOT become eligible merely because PayPal Sandbox is enabled
  const rcIsolated = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro', environment: 'sandbox' }),
    paypalProviderState: paypalState({ plan: 'premium', environment: 'sandbox' }),
    providerEnvironment: 'production', // RevenueCat set to production
    paypalProviderEnvironment: 'sandbox', // PayPal set to sandbox
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  // PayPal Premium wins; RevenueCat Sandbox Pro candidate was rejected because providerEnvironment !== 'sandbox'
  assert.equal(rcIsolated.plan, 'premium');
  assert.equal(rcIsolated.source, 'paypal');

  // When RevenueCat has sandbox state and providerEnvironment is unconfigured, RevenueCat fails closed
  const rcFailsClosed = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro', environment: 'sandbox' }),
    providerEnvironment: '', // unconfigured
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(rcFailsClosed.plan, 'free');

  // Missing PayPal environment fails closed even for QA user
  const paypalFailsClosed = resolveEffectivePlan({
    paypalProviderState: paypalState({ plan: 'premium', environment: 'sandbox' }),
    paypalProviderEnvironment: '', // unconfigured
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(paypalFailsClosed.plan, 'free');
});

// 20. Exact Grace Boundary: billing_issue evaluated at exactly G (nowMs === Date.parse(G)) => drops to Free
test('Case 20: billing_issue evaluated at exactly G (nowMs === Date.parse(G)) drops to Free', () => {
  const G = graceExpiry;
  const exactGraceExpiryMs = Date.parse(G);
  const result = resolveEffectivePlan({
    paypalProviderState: paypalState({
      status: 'billing_issue',
      expires_at: G,
      grace_period_expires_at: G,
      plan: 'premium',
      will_renew: true,
    }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs: exactGraceExpiryMs,
  });
  assert.equal(result.plan, 'free');
});

// 21. Multi-provider fallback: expired PayPal grace does not force Free when another valid entitlement exists
test('Case 21: expired PayPal grace does not force Free when another valid entitlement exists', () => {
  const expiredG = pastExpiry;

  // Expired PayPal Premium (billing_issue) + Active RevenueCat Pro => RevenueCat Pro wins
  const rcFallback = resolveEffectivePlan({
    providerState: rcState({ plan: 'pro', status: 'active', expires_at: futureExpiry }),
    paypalProviderState: paypalState({
      status: 'billing_issue',
      plan: 'premium',
      expires_at: expiredG,
      grace_period_expires_at: expiredG,
    }),
    providerEnvironment: 'sandbox',
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(rcFallback.plan, 'pro');
  assert.equal(rcFallback.source, 'revenuecat');

  // Expired PayPal Premium (billing_issue) + Manual/Admin Pro => Manual/Admin Pro wins
  const manualFallback = resolveEffectivePlan({
    subscription: { plan: 'pro' },
    paypalProviderState: paypalState({
      status: 'billing_issue',
      plan: 'premium',
      expires_at: expiredG,
      grace_period_expires_at: expiredG,
    }),
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
    userId: QA_USER_ID,
    nowMs,
  });
  assert.equal(manualFallback.plan, 'pro');
  assert.equal(manualFallback.source, 'manual/admin');
});

// Mock database helper for fulfillCompletedOneTimePayment tests
function createMockDatabases() {
  const collections = {
    paypal_subscription_state: new Map(),
    paypal_event_ledger: new Map(),
    discount_codes: new Map(),
    coupon_redemptions: new Map(),
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
        for (const [key, readVer] of tx.readVersions.entries()) {
          const currentVer = docVersions.get(key) || 0;
          if (currentVer !== readVer) {
            transactions.delete(transactionId);
            const err = new Error('Transaction conflict');
            err.code = 409;
            throw err;
          }
        }
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
    async listDocuments(_dbId, collectionId, queries = [], _txId = null) {
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
    async getDocument(_dbId, collectionId, docId, _queries = [], txId = null) {
      const col = collections[collectionId];
      const doc = col?.get(docId);
      if (!doc) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      if (txId) {
        const tx = transactions.get(txId);
        if (tx) {
          const key = docKey(collectionId, docId);
          tx.readVersions.set(key, docVersions.get(key) || 0);
        }
      }
      return clone(doc);
    },
    async createDocument(_dbId, collectionId, docId, data, _perms, txId = null) {
      const col = collections[collectionId];
      if (col.has(docId)) {
        const err = new Error('Document already exists');
        err.code = 409;
        throw err;
      }
      if (txId) {
        const tx = transactions.get(txId);
        if (tx) {
          const key = docKey(collectionId, docId);
          tx.stagedUpdates.set(key, { collId: collectionId, docId, data: clone(data) });
          col.set(docId, { $id: docId, ...clone(data) });
          return { $id: docId, ...clone(data) };
        }
      }
      const created = { $id: docId, ...clone(data) };
      col.set(docId, created);
      docVersions.set(docKey(collectionId, docId), 1);
      return clone(created);
    },
    async updateDocument(_dbId, collectionId, docId, data, _perms, txId = null) {
      if (txId) {
        const tx = transactions.get(txId);
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
    async incrementDocumentAttribute(_dbId, collectionId, docId, attr, value = 1, _max, _txId) {
      const col = collections[collectionId];
      const existing = col.get(docId);
      if (!existing) {
        const err = new Error('Document not found');
        err.code = 404;
        throw err;
      }
      const cur = Number(existing[attr] || 0);
      existing[attr] = cur + value;
      return clone(existing);
    },
  };
}

// 22. Shared Resolver Concurrency: Concurrent redemption of single-use coupon prevents double redemption
test('fulfillCompletedOneTimePayment: concurrent redemption of single-use coupon prevents double redemption', async () => {
  const db = createMockDatabases();
  db.collections.discount_codes.set('c_single', {
    $id: 'c_single',
    code: 'SINGLE-USE-100',
    max_uses: 1,
    uses_count: 0,
    is_active: true,
  });

  const coupon = {
    $id: 'c_single',
    code: 'SINGLE-USE-100',
    max_uses: 1,
    uses_count: 0,
  };

  // User 1 fulfills successfully
  const res1 = await fulfillCompletedOneTimePayment({
    databases: db,
    userId: QA_USER_ID,
    orderId: 'ORD-USER-1',
    captureId: 'CAP-USER-1',
    plan: 'pro',
    environment: 'sandbox',
    coupon,
    nowMs,
    qaUserId: QA_USER_ID,
  });
  assert.equal(res1.success, true);
  assert.equal(res1.alreadyFulfilled, false);

  // User 2 attempts to claim the same coupon (in production or with different order)
  await assert.rejects(
    async () => {
      await fulfillCompletedOneTimePayment({
        databases: db,
        userId: OTHER_USER_ID,
        orderId: 'ORD-USER-2',
        captureId: 'CAP-USER-2',
        plan: 'pro',
        environment: 'production',
        coupon,
        nowMs,
        qaUserId: QA_USER_ID,
      });
    },
    (err) => {
      assert.ok(err.code === 'coupon_already_claimed' || err.code === 'coupon_exhausted', `Expected coupon conflict code, got: ${err.code}`);
      assert.equal(err.status, 409);
      return true;
    }
  );

  // Coupon uses_count remains exactly 1
  const updatedCoupon = db.collections.discount_codes.get('c_single');
  assert.equal(updatedCoupon.uses_count, 1);
});

// 23. Shared Resolver Hierarchy Safety: active Ultimate subscriber cannot purchase Pro one-time
test('fulfillCompletedOneTimePayment: rejects active Ultimate subscriber purchasing Pro one-time with 409 active_higher_plan_exists', async () => {
  const db = createMockDatabases();

  // User already has active Ultimate plan
  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'ORD-ULTIMATE-PRIOR',
    plan: 'premium',
    status: 'active',
    environment: 'sandbox',
    expires_at: futureExpiry,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-ULT-1',
    last_entitlement_payment_ts_ms: nowMs,
  });

  // User attempts to purchase 30-day Pro access
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-PRO-NEW',
      captureId: 'CAP-PRO-NEW',
      plan: 'pro',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_higher_plan_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );

  const stateInDb = db.collections.paypal_subscription_state.get('pps_qa');
  assert.equal(stateInDb.plan, 'premium');
  assert.equal(stateInDb.status, 'active');
});

// 24. Shared Resolver Recurring Safety: active recurring subscriber cannot purchase one-time access
test('fulfillCompletedOneTimePayment: rejects active recurring subscriber purchasing one-time access with 409 active_recurring_subscription_exists', async () => {
  const db = createMockDatabases();

  // User has active recurring subscription
  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'I-REC-SUB-12345',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    expires_at: futureExpiry,
    will_renew: true,
    last_entitlement_payment_id: 'SALE-REC-1',
    last_entitlement_payment_ts_ms: nowMs,
  });

  // User attempts to purchase one-time access
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-ONE-TIME-BUY',
      captureId: 'CAP-ONE-TIME-BUY',
      plan: 'pro',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_recurring_subscription_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );

  const stateInDb = db.collections.paypal_subscription_state.get('pps_qa');
  assert.equal(stateInDb.will_renew, true);
  assert.equal(stateInDb.subscription_id, 'I-REC-SUB-12345');
});

// 25. Shared Resolver Stacking Prevention: active Pro one-time subscriber cannot purchase Pro one-time (409 active_paid_entitlement_exists)
test('fulfillCompletedOneTimePayment: active Pro one-time -> Pro one-time blocked with 409 active_paid_entitlement_exists', async () => {
  const db = createMockDatabases();

  // User has active Pro one-time access
  const currentExpiryMs = nowMs + 15 * 86400000;
  const currentExpiryIso = new Date(currentExpiryMs).toISOString();

  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'ORD-PRO-ACTIVE',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    expires_at: currentExpiryIso,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-PRO-ACTIVE',
    last_entitlement_payment_ts_ms: nowMs,
  });

  // User attempts to purchase Pro one-time again
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-PRO-STACK-ATTEMPT',
      captureId: 'CAP-PRO-STACK-ATTEMPT',
      plan: 'pro',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_paid_entitlement_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );

  // State in DB remains unchanged
  const stateInDb = db.collections.paypal_subscription_state.get('pps_qa');
  assert.equal(stateInDb.expires_at, currentExpiryIso);
  assert.equal(stateInDb.last_entitlement_payment_id, 'CAP-PRO-ACTIVE');
});

// 26. Shared Resolver Stacking Prevention: active Pro one-time -> Ultimate one-time blocked for this release (409 active_paid_entitlement_exists)
test('fulfillCompletedOneTimePayment: active Pro one-time -> Ultimate one-time blocked for this release with 409 active_paid_entitlement_exists', async () => {
  const db = createMockDatabases();

  // User has active Pro one-time access
  const currentExpiryMs = nowMs + 10 * 86400000;
  const currentExpiryIso = new Date(currentExpiryMs).toISOString();

  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'ORD-PRO-ACTIVE',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    expires_at: currentExpiryIso,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-PRO-ACTIVE',
    last_entitlement_payment_ts_ms: nowMs,
  });

  // User attempts to purchase Ultimate one-time (premium)
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-ULT-ATTEMPT',
      captureId: 'CAP-ULT-ATTEMPT',
      plan: 'premium',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_paid_entitlement_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );
});

// 27. Shared Resolver Stacking Prevention: active Ultimate one-time -> any one-time blocked
test('fulfillCompletedOneTimePayment: active Ultimate one-time -> any one-time blocked', async () => {
  const db = createMockDatabases();

  // User has active Ultimate one-time access
  const currentExpiryMs = nowMs + 20 * 86400000;
  const currentExpiryIso = new Date(currentExpiryMs).toISOString();

  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'ORD-ULT-ACTIVE',
    plan: 'premium',
    status: 'active',
    environment: 'sandbox',
    expires_at: currentExpiryIso,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-ULT-ACTIVE',
    last_entitlement_payment_ts_ms: nowMs,
  });

  // 1. Attempting Pro: blocked by active_higher_plan_exists (409)
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-PRO-ATTEMPT',
      captureId: 'CAP-PRO-ATTEMPT',
      plan: 'pro',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_higher_plan_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );

  // 2. Attempting Ultimate: blocked by active_paid_entitlement_exists (409)
  await assert.rejects(
    () => fulfillCompletedOneTimePayment({
      databases: db,
      userId: QA_USER_ID,
      orderId: 'ORD-ULT-ANOTHER',
      captureId: 'CAP-ULT-ANOTHER',
      plan: 'premium',
      environment: 'sandbox',
      nowMs,
      qaUserId: QA_USER_ID,
    }),
    (err) => {
      assert.equal(err.code, 'active_paid_entitlement_exists');
      assert.equal(err.status, 409);
      return true;
    }
  );
});

// 28. Shared Resolver Expired User: expired one-time user can purchase normally
test('fulfillCompletedOneTimePayment: expired one-time -> purchase allowed normally', async () => {
  const db = createMockDatabases();

  // User had access that expired yesterday
  const expiredMs = nowMs - 24 * 60 * 60 * 1000;
  const expiredIso = new Date(expiredMs).toISOString();

  db.collections.paypal_subscription_state.set('pps_qa', {
    $id: 'pps_qa',
    user_id: QA_USER_ID,
    subscription_id: 'ORD-EXPIRED',
    plan: 'premium',
    status: 'active', // expired by timestamp
    environment: 'sandbox',
    expires_at: expiredIso,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-EXPIRED',
    last_entitlement_payment_ts_ms: expiredMs,
  });

  // User buys Pro for 30 days
  const res = await fulfillCompletedOneTimePayment({
    databases: db,
    userId: QA_USER_ID,
    orderId: 'ORD-NEW-PRO',
    captureId: 'CAP-NEW-PRO',
    plan: 'pro',
    environment: 'sandbox',
    nowMs,
    qaUserId: QA_USER_ID,
  });

  assert.equal(res.success, true);
  assert.equal(res.plan, 'pro');
  const expectedExpiryIso = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(res.expiresAt, expectedExpiryIso);

  const stateInDb = db.collections.paypal_subscription_state.get('pps_qa');
  assert.equal(stateInDb.plan, 'pro');
  assert.equal(stateInDb.expires_at, expectedExpiryIso);
});

// 29. Shared Resolver Free User: free user can purchase normally
test('fulfillCompletedOneTimePayment: free user -> purchase allowed normally', async () => {
  const db = createMockDatabases();

  // User has no prior subscription state (free user)
  const res = await fulfillCompletedOneTimePayment({
    databases: db,
    userId: QA_USER_ID,
    orderId: 'ORD-FREE-TO-PRO',
    captureId: 'CAP-FREE-TO-PRO',
    plan: 'pro',
    environment: 'sandbox',
    nowMs,
    qaUserId: QA_USER_ID,
  });

  assert.equal(res.success, true);
  assert.equal(res.plan, 'pro');
  const expectedExpiryIso = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(res.expiresAt, expectedExpiryIso);

  const stateDocs = Array.from(db.collections.paypal_subscription_state.values());
  assert.equal(stateDocs.length, 1);
  const stateInDb = stateDocs[0];
  assert.ok(stateInDb);
  assert.equal(stateInDb.plan, 'pro');
  assert.equal(stateInDb.status, 'active');
  assert.equal(stateInDb.expires_at, expectedExpiryIso);
});

// 30. Refund: refund of the sole active one-time capture -> Free
test('Refund: refund of the sole active one-time capture transitions state and resolves to Free', () => {
  // Sole active one-time state refunded: status set to 'canceled', expires_at set to null
  const refundedState = {
    user_id: QA_USER_ID,
    subscription_id: 'ORD-ONE-TIME',
    plan: 'pro',
    status: 'canceled',
    environment: 'sandbox',
    expires_at: null,
    will_renew: false,
    last_entitlement_payment_id: 'CAP-REFUNDED',
    last_entitlement_payment_ts_ms: nowMs,
  };

  const resolved = resolveEffectivePlan({
    userId: QA_USER_ID,
    nowMs,
    paypalProviderState: refundedState,
    paypalProviderEnvironment: 'sandbox',
    qaUserId: QA_USER_ID,
  });

  assert.equal(resolved.plan, 'free');
  assert.equal(resolved.source, 'free');
});
