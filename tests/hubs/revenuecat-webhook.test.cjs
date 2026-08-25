'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const webhook = require('../../appwrite-hubs/revenuecat-webhook/src/main.js');
const {
  resolveEffectivePlan,
  normalizePlan,
} = require('../../appwrite-hubs/shared-subscription-resolver');

const { __test } = webhook;
const PRO_PRODUCT = 'pri_01m0fnjspex6yqqf6w9v9apaxg';
const PREMIUM_PRODUCT = 'pri_01m0fnq9hetwdwm9e1sa49n08s';
const nowMs = Date.parse('2026-08-22T12:00:00.000Z');

function event(overrides = {}) {
  return __test.normalizeEvent({
    id: 'evt_1',
    type: 'INITIAL_PURCHASE',
    app_user_id: 'user_1',
    product_id: PRO_PRODUCT,
    entitlement_ids: ['pro'],
    environment: 'SANDBOX',
    event_timestamp_ms: nowMs,
    expiration_at_ms: nowMs + 30 * 86400000,
    ...overrides,
  });
}

function fakeStore() {
  const states = new Map();
  const ledger = new Map();
  const calls = [];
  return {
    calls,
    async listDocuments(_db, collection, queries) {
      const userId = queries.find(query => String(query).includes('user_id'))?.match?.(/user_id[^,]*,?/) ? null : null;
      if (collection === __test.STATE_COLLECTION_ID) {
        const match = [...states.values()][0];
        return { documents: match ? [match] : [] };
      }
      return { documents: [] };
    },
    async getDocument(_db, collection, id) {
      if (collection === __test.LEDGER_COLLECTION_ID) {
        const value = ledger.get(id);
        if (!value) { const error = new Error('not found'); error.code = 404; throw error; }
        return value;
      }
      throw new Error('unexpected getDocument');
    },
    async createDocument(_db, collection, id, data) {
      calls.push({ method: 'create', collection, id, data });
      if (collection === __test.LEDGER_COLLECTION_ID) {
        if (ledger.has(id)) { const error = new Error('conflict'); error.code = 409; throw error; }
        const doc = { $id: id, ...data };
        ledger.set(id, doc);
        return doc;
      }
      const doc = { $id: id, ...data };
      states.set(data.user_id, doc);
      return doc;
    },
    async updateDocument(_db, collection, id, data) {
      calls.push({ method: 'update', collection, id, data });
      const current = [...states.values()].find(value => value.$id === id);
      const doc = { ...(current || {}), $id: id, ...data };
      states.set(doc.user_id, doc);
      return doc;
    },
    state(userId = 'user_1') { return states.get(userId) || null; },
    ledger,
  };
}

function fakeUsers(existing = true) {
  return { get: async () => { if (!existing) { const error = new Error('not found'); error.code = 404; throw error; } return { $id: 'user_1' }; } };
}

test('normalizes Ultimate only for defensive reads and never treats it as a persisted plan', () => {
  assert.equal(normalizePlan('ultimate'), 'premium');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'ultimate' } }).plan, 'premium');
  assert.equal(__test.resolvePlanForEvent(event({ product_id: PREMIUM_PRODUCT, entitlement_ids: ['premium'] })), 'premium');
  assert.equal(__test.resolvePlanForEvent(event({ product_id: PREMIUM_PRODUCT, entitlement_ids: ['ultimate'] })), null);
});

test('rejects missing or invalid Authorization before JSON/database mutation', () => {
  const previous = process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
  process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = 'secret';
  try {
    assert.equal(__test.authenticated({ headers: {} }), false);
    assert.equal(__test.authenticated({ headers: { Authorization: 'Bearer wrong' } }), false);
    assert.equal(__test.authenticated({ headers: { Authorization: 'Bearer secret' } }), true);
  } finally {
    if (previous === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
    else process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = previous;
  }
});

test('returns safe malformed-body rejection when Appwrite bodyText is malformed and legacy body getter throws', async () => {
  const previous = process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
  process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = 'secret';
  let response;
  const req = {
    headers: { Authorization: 'Bearer secret' },
    bodyText: '{',
    get body() {
      throw new SyntaxError('Appwrite legacy body JSON getter');
    },
  };
  try {
    await webhook({
      req,
      res: { json(payload, status) { response = { payload, status }; return response; } },
      log() {},
      error() {},
    });
  } finally {
    if (previous === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
    else process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = previous;
  }
  assert.deepEqual(response, {
    payload: { status: 'error', code: 'malformed_body', message: 'Malformed request.' },
    status: 400,
  });
});

test('acknowledges authenticated TEST events without validation or database mutation', async () => {
  const previous = process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
  const appwriteEnvNames = [
    'APPWRITE_FUNCTION_API_ENDPOINT',
    'APPWRITE_ENDPOINT',
    'APPWRITE_FUNCTION_PROJECT_ID',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_FUNCTION_API_KEY',
  ];
  const previousAppwriteEnv = Object.fromEntries(appwriteEnvNames.map(name => [name, process.env[name]]));
  process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = 'secret';
  appwriteEnvNames.forEach(name => delete process.env[name]);
  let response;
  const logs = [];
  const req = {
    headers: { Authorization: 'Bearer secret' },
    bodyText: JSON.stringify({ event: { id: 'evt_test', type: 'TEST' } }),
  };
  try {
    await webhook({
      req,
      res: { json(payload, status) { response = { payload, status }; return response; } },
      log(message) { logs.push(message); },
      error() {},
    });
  } finally {
    if (previous === undefined) delete process.env.REVENUECAT_WEBHOOK_AUTH_SECRET;
    else process.env.REVENUECAT_WEBHOOK_AUTH_SECRET = previous;
    appwriteEnvNames.forEach(name => {
      if (previousAppwriteEnv[name] === undefined) delete process.env[name];
      else process.env[name] = previousAppwriteEnv[name];
    });
  }
  assert.deepEqual(response, {
    payload: {
      status: 'success',
      data: { ok: true, outcome: 'acknowledged', code: 'test_acknowledged', mutated: false },
    },
    status: 200,
  });
  assert.deepEqual(logs, ['RevenueCat webhook request: TEST -> acknowledged']);
});

test('rejects malformed, unknown event, product, entitlement, and identity inputs without mutation', async () => {
  assert.equal(__test.parseJsonBody({ body: '{' }), null);
  assert.equal(__test.validateEvent(event({ type: 'UNKNOWN' })).ok, false);
  assert.equal(__test.resolvePlanForEvent(event({ product_id: 'unknown', entitlement_ids: ['pro'] })), null);
  assert.equal(__test.resolvePlanForEvent(event({ entitlement_ids: ['unknown'] })), null);
  const store = fakeStore();
  const result = await __test.processEvent(store, event(), nowMs, fakeUsers(false));
  assert.deepEqual(result, { outcome: 'rejected', code: 'unknown_identity', mutated: false });
  assert.equal(store.calls.length, 0);
});

test('processes Pro and premium purchase, renewal, cancellation, billing issue, uncancellation, product change, and expiration', async () => {
  const store = fakeStore();
  const events = [
    event({ id: 'evt_purchase', type: 'INITIAL_PURCHASE' }),
    event({ id: 'evt_renew', type: 'RENEWAL', event_timestamp_ms: nowMs + 1 }),
    event({ id: 'evt_cancel', type: 'CANCELLATION', event_timestamp_ms: nowMs + 2 }),
    event({ id: 'evt_issue', type: 'BILLING_ISSUE', event_timestamp_ms: nowMs + 3 }),
    event({ id: 'evt_uncancel', type: 'UNCANCELLATION', event_timestamp_ms: nowMs + 4 }),
    event({ id: 'evt_change', type: 'PRODUCT_CHANGE', product_id: PREMIUM_PRODUCT, entitlement_ids: ['premium'], event_timestamp_ms: nowMs + 5 }),
    event({ id: 'evt_expire', type: 'EXPIRATION', event_timestamp_ms: nowMs + 6 }),
  ];
  for (const item of events) {
    const result = await __test.processEvent(store, item, nowMs, fakeUsers());
    assert.equal(result.outcome, 'processed');
  }
  assert.equal(store.state().plan, 'premium');
  assert.equal(store.state().status, 'expired');
  assert.equal(store.state().will_renew, false);
  assert.equal(store.state().latest_event_type, 'EXPIRATION');
  assert.ok(!JSON.stringify(store.state()).includes('ultimate'));
});

test('duplicate events are idempotent and older events cannot regress provider state', async () => {
  const store = fakeStore();
  const fresh = event({ id: 'evt_fresh', event_timestamp_ms: nowMs + 100, product_id: PREMIUM_PRODUCT, entitlement_ids: ['premium'] });
  assert.equal((await __test.processEvent(store, fresh, nowMs, fakeUsers())).outcome, 'processed');
  assert.equal((await __test.processEvent(store, fresh, nowMs, fakeUsers())).outcome, 'duplicate');
  const stale = event({ id: 'evt_stale', event_timestamp_ms: nowMs - 1 });
  const staleResult = await __test.processEvent(store, stale, nowMs, fakeUsers());
  assert.equal(staleResult.outcome, 'ignored');
  assert.equal(store.state().plan, 'premium');
  assert.equal(store.state().latest_event_id, 'evt_fresh');
});

test('resolver preserves higher manual, coupon, and active-trial candidates and falls back to Free', () => {
  const expires = new Date(nowMs + 86400000).toISOString();
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'premium' }, providerState: { plan: 'pro', status: 'active', expires_at: expires }, nowMs }).plan, 'premium');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free', coupon_code: 'PROMO' }, providerState: { plan: 'pro', status: 'expired', expires_at: expires }, nowMs }).plan, 'free');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free', trial_plan: 'pro', trial_expires_at: expires }, providerState: { plan: 'premium', status: 'expired', expires_at: expires }, nowMs }).plan, 'pro');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free' }, providerState: { plan: 'premium', status: 'expired', expires_at: expires }, nowMs }).plan, 'free');
  assert.equal(resolveEffectivePlan({ subscription: { plan: 'free' }, providerState: { plan: 'pro', status: 'canceled', expires_at: expires }, nowMs }).plan, 'pro');
});
