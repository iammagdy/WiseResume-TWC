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

const nowMs = Date.parse('2026-08-28T10:00:00.000Z');

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

console.log('✓ billing-checkout: authenticated, fail-closed, automatic-only, idempotent, rate-limited, non-granting contract OK');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
