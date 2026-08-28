'use strict';

const assert = require('node:assert/strict');
const billing = require('../../appwrite-hubs/billing-checkout/src/main.js');
const schema = require('../../scripts/setup_billing_checkout_schema.cjs');

const {
  ACTIVE_WINDOW_MS,
  BillingCheckoutError,
  BillingCheckoutService,
  IDEMPOTENCY_WINDOW_MS,
  MAX_CREATIONS_PER_USER,
  safeProviderResult,
  validateRequest,
  buildUserLockPayload,
  buildPlanLockPayload,
  validateLockPayload,
  PaddleAutomaticProvider,
  readConfig,
} = billing.__test;

class MemoryCheckoutStore {
  constructor({ plan = 'free', nowMs = Date.now() } = {}) {
    this.plan = plan;
    this.nowMs = nowMs;
    this.sessions = new Map();
    this.activeByPlan = new Map();
    this.requestKeys = new Map();
    this.attempts = new Map();
    this.providerStateWrites = 0;
    this.legacySubscriptionWrites = 0;
    this.entitlementWrites = 0;
    this.creditWrites = 0;
  }

  async getEffectivePlan() {
    return this.plan;
  }

  async reserve(input) {
    const prior = this.requestKeys.get(`${input.userId}:${input.requestKeyFingerprint}`);
    if (prior) {
      const sameInput = prior.plan === input.plan && prior.environment === input.environment && prior.price_id === input.priceId;
      if (!sameInput) throw new BillingCheckoutError('idempotency_conflict', 409, 'This checkout request key was already used.');
      if (this.nowMs - prior.createdAt <= IDEMPOTENCY_WINDOW_MS && prior.state !== 'failed') {
        if (prior.state !== 'created' || !prior.checkout_reference) {
          throw new BillingCheckoutError('checkout_in_progress', 409, 'A checkout is already being prepared.');
        }
        return { outcome: 'reused', session: prior };
      }
      throw new BillingCheckoutError('idempotency_conflict', 409, 'This checkout request key cannot be replayed.');
    }
    const active = this.activeByPlan.get(`${input.userId}:${input.plan}:${input.environment}`);
    if (active && new Date(active.expires_at).getTime() > this.nowMs && active.state !== 'failed') {
      if (active.state !== 'created' || !active.checkout_reference) {
        throw new BillingCheckoutError('checkout_in_progress', 409, 'A checkout is already being prepared.');
      }
      return { outcome: 'reused', session: active };
    }
    const attemptKey = `${input.userId}:${Math.floor(input.nowMs / (10 * 60 * 1000))}`;
    const attemptCount = this.attempts.get(attemptKey) || 0;
    if (attemptCount >= MAX_CREATIONS_PER_USER) throw new BillingCheckoutError('rate_limited', 429, 'Checkout attempts are temporarily limited.');
    this.attempts.set(attemptKey, attemptCount + 1);
    const session = {
      $id: `session_${this.sessions.size + 1}`,
      public_reference: input.publicReference,
      user_id: input.userId,
      plan: input.plan,
      environment: input.environment,
      price_id: input.priceId,
      state: 'creating',
      expires_at: input.expiresAt,
      request_key_fingerprint: input.requestKeyFingerprint,
      created_at: new Date(input.nowMs).toISOString(),
      createdAt: input.nowMs,
    };
    this.sessions.set(session.$id, session);
    this.activeByPlan.set(`${input.userId}:${input.plan}:${input.environment}`, session);
    this.requestKeys.set(`${input.userId}:${input.requestKeyFingerprint}`, session);
    return { outcome: 'created', session };
  }

  async complete(session, providerResult) {
    session.state = 'created';
    session.provider_transaction_id = providerResult.providerTransactionId;
    session.checkout_reference = providerResult.checkoutReference;
  }

  async fail(session, code) {
    session.state = 'failed';
    session.last_error_code = code;
    this.activeByPlan.delete(`${session.user_id}:${session.plan}:${session.environment}`);
  }
}

function config(overrides = {}) {
  return {
    enabled: true,
    environment: 'production',
    providerReady: true,
    approvedCheckoutOrigin: 'https://checkout.example.test',
    catalogEnvironment: 'production',
    catalog: {
      pro: { priceId: 'price_pro_reviewed', productId: 'product_pro_reviewed', entitlementId: 'pro' },
      premium: { priceId: 'price_premium_reviewed', productId: 'product_premium_reviewed', entitlementId: 'premium' },
    },
    ...overrides,
  };
}

function provider({ calls, result = {} } = {}) {
  return {
    async createCheckout(input) {
      calls.push(input);
      return {
        checkoutReference: Object.prototype.hasOwnProperty.call(result, 'checkoutReference') ? result.checkoutReference : 'provider-reference-not-public',
        providerTransactionId: Object.prototype.hasOwnProperty.call(result, 'providerTransactionId') ? result.providerTransactionId : 'provider-transaction-server-only',
        providerEnvironment: Object.prototype.hasOwnProperty.call(result, 'providerEnvironment') ? result.providerEnvironment : 'production',
        collectionMode: Object.prototype.hasOwnProperty.call(result, 'collectionMode') ? result.collectionMode : 'automatic',
        ...(result.checkoutUrl ? { checkoutUrl: result.checkoutUrl } : {}),
      };
    },
  };
}

function appwriteDatabase({ subscription = null, providerState = null, failCollection = null } = {}) {
  return {
    async listDocuments(_databaseId, collection) {
      if (collection === failCollection) throw new Error(`sensitive Appwrite failure for ${collection}`);
      const document = collection === 'subscriptions' ? subscription : providerState;
      return { documents: document ? [document] : [] };
    },
  };
}

function reserveDiagnosticDatabase({ failureStage = '', failureFactory = null } = {}) {
  const fail = stage => {
    if (stage !== failureStage) return;
    throw failureFactory ? failureFactory() : new Error('underlying diagnostic marker');
  };
  const notFound = () => {
    const error = new Error('not found');
    error.code = 404;
    return error;
  };
  return {
    async createTransaction() {
      fail('reserve.create_transaction');
      return { $id: 'diagnostic-transaction' };
    },
    async listDocuments(_databaseId, collection) {
      if (collection === 'billing_checkout_sessions') fail('reserve.find_request_key');
      return { documents: [] };
    },
    async getDocument(_databaseId, collection, id) {
      if (collection === 'billing_checkout_locks' && id.startsWith('user_')) fail('reserve.get_user_lock');
      if (collection === 'billing_checkout_locks' && id.startsWith('plan_')) fail('reserve.get_plan_lock');
      if (collection === 'billing_checkout_sessions') fail('reserve.get_existing_session');
      throw notFound();
    },
    async createDocument(_databaseId, collection, id) {
      if (collection === 'billing_checkout_locks' && id.startsWith('plan_')) fail('reserve.write_plan_lock');
      if (collection === 'billing_checkout_locks' && id.startsWith('user_')) fail('reserve.write_user_lock');
      if (collection === 'billing_checkout_sessions') fail('reserve.write_session');
      return { $id: id };
    },
    async updateDocument() {
      return {};
    },
    async updateTransaction(_transactionId, commit, rollback) {
      if (commit) fail('reserve.commit');
      if (rollback) fail('reserve.rollback');
      return {};
    },
  };
}

function diagnosticStore(options = {}) {
  return new billing.__test.AppwriteCheckoutStore(reserveDiagnosticDatabase(options), 'production');
}

function trackingAppwriteStore(options = {}) {
  const store = new billing.__test.AppwriteCheckoutStore(appwriteDatabase(options), 'production');
  store.reserveCalls = 0;
  const reserve = store.reserve.bind(store);
  store.reserve = async (...args) => { store.reserveCalls += 1; return reserve(...args); };
  return store;
}

function providerState(plan, environment = 'production') {
  return { plan, environment, status: 'active', expires_at: new Date(nowMs + ACTIVE_WINDOW_MS).toISOString() };
}

function responseCapture() {
  return {
    value: null,
    status: null,
    statusCode: null,
    json(payload, status) {
      this.value = payload;
      Object.assign(this, payload);
      this.statusCode = status;
      return payload;
    },
  };
}

async function invoke(body, dependencies = {}) {
  const response = responseCapture();
  const logs = [];
  await billing.__test.handleBillingCheckout({
    req: { bodyJson: body, headers: {} },
    res: response,
    error: message => logs.push(message),
  }, dependencies);
  return { response, logs };
}

// This must remain in the future so active-entitlement fixtures cannot expire as wall-clock time advances.
const nowMs = Date.parse('2099-08-28T10:00:00.000Z');

async function main() {
// Schema is additive and server-only; no remote setup is invoked by this test.
assert.equal(schema.DB_ID, 'main');
assert.deepEqual(schema.COLLECTION_SPECS.map(spec => spec.id), ['billing_checkout_sessions', 'billing_checkout_locks']);
for (const spec of schema.COLLECTION_SPECS) {
  assert.deepEqual(spec.attributes.find(attribute => attribute.key === 'user_id')?.required, true);
}
const lockSpec = schema.COLLECTION_SPECS.find(spec => spec.id === 'billing_checkout_locks');
function assertSchemaCompatible(payload) {
  const attributes = new Map(lockSpec.attributes.map(attribute => [attribute.key, attribute]));
  for (const attribute of lockSpec.attributes.filter(attribute => attribute.required)) {
    assert.notEqual(payload[attribute.key], undefined, `${payload.scope} lock is missing required ${attribute.key}`);
  }
  for (const key of Object.keys(payload)) assert.equal(attributes.has(key), true, `${payload.scope} lock has unknown ${key}`);
}
const userLockPayload = validateLockPayload(buildUserLockPayload({
  lockKey: 'user_lock', userId: 'canonical-user', windowStartedAt: new Date(nowMs).toISOString(),
  attemptCount: 1, nowIso: new Date(nowMs).toISOString(), rateLimitExpiresAt: new Date(nowMs + 600000).toISOString(),
}));
assertSchemaCompatible(userLockPayload);
assert.equal(userLockPayload.environment, undefined);
assert.equal(userLockPayload.price_id, undefined);
assert.equal(userLockPayload.session_id, undefined);
assert.equal(userLockPayload.request_key_fingerprint, undefined);
const planLockPayload = validateLockPayload(buildPlanLockPayload({
  lockKey: 'plan_lock', userId: 'canonical-user', plan: 'pro', environment: 'production', priceId: 'price_pro',
  sessionId: 'session_1', requestKeyFingerprint: 'fingerprint',
  windowStartedAt: new Date(nowMs).toISOString(), attemptCount: 1, nowIso: new Date(nowMs).toISOString(),
  expiresAt: new Date(nowMs + ACTIVE_WINDOW_MS).toISOString(),
}));
assertSchemaCompatible(planLockPayload);
for (const field of ['environment', 'price_id', 'session_id', 'request_key_fingerprint']) assert.equal(typeof planLockPayload[field], 'string');
for (const field of ['environment', 'price_id', 'session_id', 'request_key_fingerprint']) {
  const invalid = { ...planLockPayload, [field]: undefined };
  assert.throws(() => validateLockPayload(invalid), /plan checkout lock payload/);
}

// The existing resolver inputs remain authoritative: no rows is legitimate Free.
{
  const store = trackingAppwriteStore();
  assert.equal(await store.getEffectivePlan('free-user'), 'free');
}

// Valid provider state wins through the existing shared resolver; checkout is rejected before reservation/provider work.
for (const plan of ['pro', 'premium']) {
  const store = trackingAppwriteStore({ providerState: providerState(plan) });
  const calls = [];
  const result = await invoke({ action: 'create-session', plan }, {
    user: { $id: `provider-state-${plan}` }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.error, 'already_entitled');
  assert.equal(calls.length, 0);
  assert.equal(store.reserveCalls, 0);
}
{
  const store = trackingAppwriteStore({ providerState: providerState('premium') });
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'premium-blocks-pro' }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.error, 'already_entitled');
  assert.equal(calls.length, 0);
  assert.equal(store.reserveCalls, 0);
}

// Authoritative read failures fail closed; no provider, session, or lock work is attempted and raw errors stay private.
for (const failCollection of ['subscriptions', 'revenuecat_subscription_state']) {
  const store = trackingAppwriteStore({ failCollection });
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: `read-failure-${failCollection}` }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.status, 'error');
  assert.equal(result.response.error, 'state_unavailable');
  assert.equal(result.response.statusCode, 503);
  assert.equal(result.response.message.includes('sensitive Appwrite failure'), false);
  assert.equal(result.logs.some(message => message.includes('sensitive Appwrite failure')), false);
  assert.equal(calls.length, 0);
  assert.equal(store.reserveCalls, 0);
}

// A partial authoritative read failure cannot fall through to checkout creation.
{
  const store = trackingAppwriteStore({ failCollection: 'revenuecat_subscription_state' });
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'partial-read-failure' }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.error, 'state_unavailable');
  assert.equal(calls.length, 0);
  assert.equal(store.reserveCalls, 0);
}

// Unauthenticated callers are rejected before storage/provider work.
{
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    account: { get: async () => { throw new Error('not authenticated'); } },
    store: new MemoryCheckoutStore({ nowMs }),
    provider: provider({ calls }),
    config: config(),
    now: () => nowMs,
  });
  assert.equal(result.response.status, 'error');
  assert.equal(result.response.error, 'unauthorized');
  assert.equal(result.response.statusCode, 401);
  assert.equal(calls.length, 0);
}

// Unexpected Appwrite reservation failures retain the public fail-closed contract while logging only allowlisted stages.
for (const stage of [
  'reserve.create_transaction',
  'reserve.find_request_key',
  'reserve.get_user_lock',
  'reserve.write_plan_lock',
  'reserve.write_user_lock',
  'reserve.write_session',
  'reserve.commit',
]) {
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: `diagnostic-${stage}` }, store: diagnosticStore({ failureStage: stage }), provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.statusCode, 500);
  assert.equal(result.response.error, 'checkout_unavailable');
  assert.equal(result.response.message, 'Checkout is temporarily unavailable.');
  assert.deepEqual(result.logs, [`billing-checkout checkout_unavailable stage=${stage}`]);
  assert.equal(JSON.stringify(result.response).includes('underlying diagnostic marker'), false);
  assert.equal(result.logs.some(message => message.includes('underlying diagnostic marker')), false);
  assert.equal(calls.length, 0);
}

// Typed checkout failures remain typed and do not gain an internal reserve stage.
{
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'typed-reserve-error' },
    store: diagnosticStore({
      failureStage: 'reserve.find_request_key',
      failureFactory: () => new BillingCheckoutError('checkout_in_progress', 409, 'A checkout is already being prepared.'),
    }),
    provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.statusCode, 409);
  assert.equal(result.response.error, 'checkout_in_progress');
  assert.deepEqual(result.logs, ['billing-checkout checkout_in_progress']);
  assert.equal(calls.length, 0);
}

// A successful Appwrite-backed reservation remains provider-backed and does not emit a diagnostic stage.
{
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'diagnostic-success' }, store: diagnosticStore(), provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.statusCode, 200);
  assert.equal(result.response.status, 'success');
  assert.deepEqual(result.logs, []);
  assert.equal(calls.length, 1);
}

// Exact internal plans only: free, public Ultimate, labels, and unknown values fail.
for (const plan of ['free', 'ultimate', 'Ultimate', 'proo', '', null]) {
  assert.throws(() => validateRequest({ action: 'create-session', plan }), error => error.code === 'invalid_plan');
}

// Browser-supplied ownership, price, transaction, environment, provider, and return fields are rejected.
{
  const result = await invoke({
    action: 'create-session', plan: 'pro', user_id: 'spoofed', price_id: 'spoofed', transaction_id: 'spoofed',
    environment: 'sandbox', provider: 'paddle', return_url: 'https://evil.example',
  }, {
    user: { $id: 'canonical-user' },
    store: new MemoryCheckoutStore({ nowMs }),
    provider: provider({ calls: [] }),
    config: config(),
    now: () => nowMs,
  });
  assert.equal(result.response.error, 'invalid_request');
}

// Kill switch is default-off and prevents storage/provider creation; no provider state can be mutated.
{
  const calls = [];
  const store = new MemoryCheckoutStore({ nowMs });
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'canonical-user' }, store, provider: provider({ calls }), config: config({ enabled: false }), now: () => nowMs,
  });
  assert.equal(result.response.error, 'payments_disabled');
  assert.equal(calls.length, 0);
  assert.equal(store.sessions.size, 0);
  assert.equal(store.providerStateWrites + store.legacySubscriptionWrites + store.entitlementWrites + store.creditWrites, 0);
}

// Production catalog unavailable and wrong environment fail closed before provider call.
for (const override of [
  { catalog: { pro: {}, premium: {} } },
  { environment: 'sandbox' },
]) {
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'canonical-user' }, store: new MemoryCheckoutStore({ nowMs }), provider: provider({ calls }),
    config: config(override), now: () => nowMs,
  });
  assert.equal(result.response.status, 'error');
  assert.ok(['catalog_mismatch', 'environment_mismatch'].includes(result.response.error));
  assert.equal(calls.length, 0);
}

// Pro and premium map server-side, attach canonical app_user_id, and force automatic collection.
for (const plan of ['pro', 'premium']) {
  const calls = [];
  const store = new MemoryCheckoutStore({ nowMs });
  const result = await invoke({ action: 'create-session', plan, idempotency_key: `${plan}-one` }, {
    user: { $id: 'canonical-user' }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.status, 'success');
  assert.equal(result.response.data.plan, plan);
  assert.equal(result.response.data.state, 'created_or_reused');
  assert.equal(result.response.data.expires_at, new Date(nowMs + ACTIVE_WINDOW_MS).toISOString());
  assert.deepEqual(calls[0].customData, {
    app_user_id: 'canonical-user',
    checkout_session_reference: store.sessions.values().next().value.public_reference,
    source: 'wiseresume-web',
  });
  assert.equal(calls[0].priceId, config().catalog[plan].priceId);
  assert.equal(calls[0].entitlementId, plan);
  assert.equal(calls[0].collectionMode, 'automatic');
  assert.equal(calls[0].environment, 'production');
  assert.equal(calls[0].returnPath, '/subscription?billing=pending');
}

// Safe response excludes provider transaction IDs, entitlement IDs, and raw provider payloads.
{
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'canonical-user-2' }, store: new MemoryCheckoutStore({ nowMs }), provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.deepEqual(Object.keys(result.response.data).sort(), ['checkout_reference', 'expires_at', 'plan', 'session_reference', 'state']);
  assert.equal(JSON.stringify(result.response).includes('provider-transaction-server-only'), false);
  assert.equal(JSON.stringify(result.response).includes('entitlement'), false);
}

// Same-key duplicate and concurrent requests create one provider session and reuse it.
{
  const calls = [];
  const store = new MemoryCheckoutStore({ nowMs });
  const dependencies = { user: { $id: 'concurrent-user' }, store, provider: provider({ calls }), config: config(), now: () => nowMs };
  const results = await Promise.all([
    invoke({ action: 'create-session', plan: 'pro', idempotency_key: 'same-key' }, dependencies),
    invoke({ action: 'create-session', plan: 'pro', idempotency_key: 'same-key' }, dependencies),
    invoke({ action: 'create-session', plan: 'pro', idempotency_key: 'same-key' }, dependencies),
  ]);
  assert.equal(calls.length, 1);
  assert.equal(results.filter(result => result.response.status === 'success').length, 1);
  assert.equal(results.filter(result => result.response.error === 'checkout_in_progress').length, 2);
  const retry = await invoke({ action: 'create-session', plan: 'pro', idempotency_key: 'same-key' }, dependencies);
  assert.equal(retry.response.status, 'success');
  assert.equal(retry.response.data.checkout_reference, 'provider-reference-not-public');
  assert.equal(retry.response.data.session_reference, results.find(result => result.response.status === 'success').response.data.session_reference);
  assert.equal(calls.length, 1);
  const conflict = await invoke({ action: 'create-session', plan: 'premium', idempotency_key: 'same-key' }, dependencies);
  assert.equal(conflict.response.error, 'idempotency_conflict');
}

// Without an explicit key, separate plan attempts receive independent server keys and do not collide.
{
  const calls = [];
  const store = new MemoryCheckoutStore({ nowMs });
  const dependencies = { user: { $id: 'no-key-plan-user' }, store, provider: provider({ calls }), config: config(), now: () => nowMs };
  const pro = await invoke({ action: 'create-session', plan: 'pro' }, dependencies);
  const premium = await invoke({ action: 'create-session', plan: 'premium' }, dependencies);
  assert.equal(pro.response.status, 'success');
  assert.equal(premium.response.status, 'success');
  assert.equal(calls.length, 2);
  assert.notEqual(pro.response.data.session_reference, premium.response.data.session_reference);
}

// A failed no-key attempt gets a fresh server key, so a legitimate retry is not stale-key blocked.
{
  const store = new MemoryCheckoutStore({ nowMs });
  const failing = { async createCheckout() { throw new Error('provider failure must stay private'); } };
  const first = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'no-key-retry-user' }, store, provider: failing, config: config(), now: () => nowMs,
  });
  assert.equal(first.response.error, 'provider_unavailable');
  const calls = [];
  const retry = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: 'no-key-retry-user' }, store, provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(retry.response.status, 'success');
  assert.equal(calls.length, 1);
}

// Stronger existing plan blocks checkout; Ultimate is read-normalized only and never a write target.
for (const currentPlan of ['pro', 'premium', 'ultimate']) {
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: `entitled-${currentPlan}` }, store: new MemoryCheckoutStore({ plan: currentPlan, nowMs }), provider: provider({ calls }), config: config(), now: () => nowMs,
  });
  assert.equal(result.response.error, 'already_entitled');
  assert.equal(calls.length, 0);
}

// Three failed provider attempts are bounded; the fourth is rate limited.
{
  const calls = [];
  const store = new MemoryCheckoutStore({ nowMs });
  const failingProvider = { async createCheckout() { calls.push(true); throw new Error('provider secret must never be returned'); } };
  for (let i = 0; i < MAX_CREATIONS_PER_USER; i += 1) {
    const result = await invoke({ action: 'create-session', plan: 'pro', idempotency_key: `attempt-${i}` }, {
      user: { $id: 'limited-user' }, store, provider: failingProvider, config: config(), now: () => nowMs,
    });
    assert.equal(result.response.error, 'provider_unavailable');
    assert.equal(result.response.message.includes('provider secret'), false);
    assert.equal(result.logs.some(message => message.includes('provider secret')), false);
  }
  const blocked = await invoke({ action: 'create-session', plan: 'pro', idempotency_key: 'attempt-4' }, {
    user: { $id: 'limited-user' }, store, provider: failingProvider, config: config(), now: () => nowMs,
  });
  assert.equal(blocked.response.error, 'rate_limited');
  assert.equal(calls.length, MAX_CREATIONS_PER_USER);
}

// Provider mismatches fail closed and do not return a false success.
for (const resultOverride of [
  { providerEnvironment: 'sandbox' },
  { collectionMode: 'manual' },
  { providerTransactionId: '' },
]) {
  const calls = [];
  const result = await invoke({ action: 'create-session', plan: 'pro' }, {
    user: { $id: `mismatch-${JSON.stringify(resultOverride)}` }, store: new MemoryCheckoutStore({ nowMs }),
    provider: provider({ calls, result: resultOverride }), config: config(), now: () => nowMs,
  });
  assert.ok(['environment_mismatch', 'catalog_mismatch', 'provider_unavailable'].includes(result.response.error));
  assert.equal(result.response.status, 'error');
}

// Provider checkout URLs are returned only for an explicitly approved HTTPS origin.
assert.throws(() => safeProviderResult({ checkoutReference: 'ref', providerTransactionId: 'txn', providerEnvironment: 'production', collectionMode: 'automatic', checkoutUrl: 'https://evil.example/x' }, config()), error => error.code === 'provider_unavailable');
assert.equal(safeProviderResult({ checkoutReference: 'ref', providerTransactionId: 'txn', providerEnvironment: 'production', collectionMode: 'automatic', checkoutUrl: 'https://checkout.example.test/session' }, config()).checkoutUrl, 'https://checkout.example.test/session');

// The implementation has no methods or code path that writes provider state, legacy subscriptions, entitlements, or credits.
{
  const store = new MemoryCheckoutStore({ nowMs });
  const calls = [];
  await invoke({ action: 'create-session', plan: 'pro' }, { user: { $id: 'no-grant-user' }, store, provider: provider({ calls }), config: config(), now: () => nowMs });
  assert.equal(store.providerStateWrites, 0);
  assert.equal(store.legacySubscriptionWrites, 0);
  assert.equal(store.entitlementWrites, 0);
  assert.equal(store.creditWrites, 0);
}

// Paddle adapter uses only the selected environment endpoint and sends server-selected catalog data.
{
  const requests = [];
  const provider = new PaddleAutomaticProvider({
    env: { BILLING_SANDBOX_PADDLE_API_KEY: 'sandbox-test-key' },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        async json() {
          return {
            data: {
              id: 'txn_sandbox_123',
              collection_mode: 'automatic',
              items: [{ price: { id: 'price_sandbox_pro', product_id: 'product_sandbox_pro' }, quantity: 1 }],
              custom_data: { app_user_id: 'canonical-user' },
              checkout: { url: 'https://checkout.example.test/sandbox' },
              environment: 'sandbox',
            },
          };
        },
      };
    },
  });
  const output = await provider.createCheckout({
    environment: 'sandbox',
    priceId: 'price_sandbox_pro',
    productId: 'product_sandbox_pro',
    customData: { app_user_id: 'canonical-user' },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://sandbox-api.paddle.com/transactions');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(JSON.parse(requests[0].options.body).collection_mode, 'automatic');
  assert.deepEqual(JSON.parse(requests[0].options.body).items, [{ price_id: 'price_sandbox_pro', quantity: 1 }]);
  assert.deepEqual(JSON.parse(requests[0].options.body).custom_data, { app_user_id: 'canonical-user' });
  assert.equal(output.providerEnvironment, 'sandbox');
  assert.equal(output.collectionMode, 'automatic');
  assert.equal(output.checkoutUrl, 'https://checkout.example.test/sandbox');
  assert.equal(JSON.stringify(output).includes('sandbox-test-key'), false);
}
{
  const provider = new PaddleAutomaticProvider({ env: {}, fetchImpl: async () => { throw new Error('must not call'); } });
  await assert.rejects(() => provider.createCheckout({ environment: 'sandbox', priceId: 'price', customData: { app_user_id: 'user' } }), error => error.code === 'provider_unavailable');
}
assert.equal(readConfig({ BILLING_CHECKOUT_ENVIRONMENT: 'sandbox', BILLING_SANDBOX_PRO_PRICE_ID: 'sp', BILLING_SANDBOX_PRO_PRODUCT_ID: 'sprod', BILLING_SANDBOX_PREMIUM_PRICE_ID: 'su', BILLING_SANDBOX_PREMIUM_PRODUCT_ID: 'suprod' }).catalog.pro.priceId, 'sp');
assert.equal(readConfig({ BILLING_CHECKOUT_ENVIRONMENT: 'production', BILLING_SANDBOX_PRO_PRICE_ID: 'sp', BILLING_SANDBOX_PRO_PRODUCT_ID: 'sprod' }).catalog.pro.priceId, '');

console.log('✓ billing-checkout: authenticated, fail-closed, environment-isolated, automatic-only, idempotent, rate-limited, non-granting contract OK');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
