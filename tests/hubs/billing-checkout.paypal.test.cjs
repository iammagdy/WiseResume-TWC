'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const billing = require('../../appwrite-hubs/billing-checkout/src/main.js');

const {
  BillingCheckoutError,
  BillingCheckoutService,
  AppwriteCheckoutStore,
  PayPalSubscriptionProvider,
  selectProvider,
  isAmbiguousProviderError,
  readConfig,
  handleBillingCheckout,
  PAYPAL_API_ORIGINS,
  PAYPAL_APPROVED_ORIGINS,
} = billing.__test;

class MockCheckoutStore {
  constructor({ plan = 'free', userSub = null, paypalState = null, existingSession = null } = {}) {
    this.plan = plan;
    this.userSub = userSub;
    this.paypalState = paypalState;
    this.existingSession = existingSession;
    this.sessions = new Map();
    this.completed = [];
    this.failed = [];
    this.uncertain = [];
    this.reserveOutcome = 'created';
  }

  async getEffectivePlan() {
    return this.plan;
  }

  async reserve(input) {
    if (this.existingSession) {
      return { outcome: 'resume_provider', session: this.existingSession };
    }
    if (this.reserveOutcome === 'resume_provider') {
      const existing = this.sessions.get(input.sessionKey) || {
        $id: 'sess_existing_123',
        session_key: input.sessionKey,
        public_reference: 'sess_pub_existing',
        plan: input.plan,
        state: 'uncertain',
        expires_at: input.expiresAt,
      };
      return { outcome: 'resume_provider', session: existing };
    }
    if (this.reserveOutcome === 'reused') {
      const existing = {
        $id: 'sess_reused_123',
        session_key: input.sessionKey,
        public_reference: 'sess_pub_reused',
        plan: input.plan,
        state: 'created',
        checkout_reference: 'paypal_ref_123',
        checkout_url: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
        expires_at: input.expiresAt,
      };
      return { outcome: 'reused', session: existing };
    }
    const session = {
      $id: `sess_${this.sessions.size + 1}`,
      session_key: input.sessionKey,
      public_reference: input.publicReference,
      user_id: input.userId,
      plan: input.plan,
      environment: input.environment,
      price_id: input.priceId,
      state: 'creating',
      expires_at: input.expiresAt,
      correlation_id: input.correlationId,
    };
    this.sessions.set(input.sessionKey, session);
    return { outcome: 'created', session };
  }

  async complete(session, result) {
    this.completed.push({ session, result });
    session.state = 'created';
    session.checkout_reference = result.checkoutReference;
    session.checkout_url = result.checkoutUrl;
    session.provider_transaction_id = result.providerTransactionId;
  }

  async markUncertain(session, code) {
    this.uncertain.push({ session, code });
    session.state = 'uncertain';
    session.last_error_code = code;
  }

  async fail(session, code) {
    this.failed.push({ session, code });
    session.state = 'failed';
    session.last_error_code = code;
  }

  async findOptional(collection, userId) {
    if (collection === 'subscriptions') return this.userSub && (!this.userSub.user_id || this.userSub.user_id === userId) ? this.userSub : null;
    if (collection === 'paypal_subscription_state') return this.paypalState && (!this.paypalState.user_id || this.paypalState.user_id === userId) ? this.paypalState : null;
    return null;
  }

  async updatePaypalExpiry(input, fallbackExpiry) {
    if (this.updatePaypalExpiryThrows) {
      throw this.updatePaypalExpiryThrows;
    }
    const params = typeof input === 'object' && input !== null
      ? input
      : { documentId: input, expiresAt: fallbackExpiry };
    const { documentId, userId, subscriptionId, environment, expectedPlan, expiresAt } = params;

    const currentDoc = this.paypalState;
    if (!currentDoc) {
      throw new BillingCheckoutError('not_found', 404, 'Subscription state not found.');
    }
    if (userId && currentDoc.user_id && currentDoc.user_id !== userId) {
      throw new BillingCheckoutError('forbidden', 403, 'Subscription state does not belong to the authenticated user.');
    }
    if (subscriptionId && currentDoc.subscription_id && currentDoc.subscription_id !== subscriptionId) {
      throw new BillingCheckoutError('bad_request', 400, 'Subscription state ID mismatch.');
    }
    if (environment && currentDoc.environment && currentDoc.environment !== environment) {
      throw new BillingCheckoutError('bad_request', 400, 'Subscription state environment mismatch.');
    }
    if (expectedPlan && currentDoc.plan && currentDoc.plan !== expectedPlan) {
      throw new BillingCheckoutError('bad_request', 400, 'Subscription state plan mismatch.');
    }
    if (currentDoc.status && !['active', 'billing_issue'].includes(currentDoc.status)) {
      throw new BillingCheckoutError('bad_request', 400, 'Subscription state status mismatch.');
    }
    if (currentDoc.will_renew !== true) {
      throw new BillingCheckoutError('bad_request', 400, 'Subscription state will_renew mismatch.');
    }

    currentDoc.expires_at = expiresAt;
    this.updatedPaypalExpiry = { documentId, userId, subscriptionId, environment, expectedPlan, expiresAt };
    return currentDoc;
  }
}

function validPayPalEnv() {
  return {
    BILLING_CHECKOUT_ENABLED: 'true',
    BILLING_CHECKOUT_ENVIRONMENT: 'sandbox',
    BILLING_CHECKOUT_PROVIDER: 'paypal',
    BILLING_CHECKOUT_PROVIDER_READY: 'true',
    PAYPAL_CLIENT_ID: 'mock_paypal_client_id',
    PAYPAL_CLIENT_SECRET: 'mock_paypal_client_secret',
    BILLING_SANDBOX_PRO_PRICE_ID: 'P-3A193536YV1432359NKM36QY',
    BILLING_SANDBOX_PRO_PRODUCT_ID: 'PROD-8XE5253028560521H',
    BILLING_SANDBOX_PREMIUM_PRICE_ID: 'P-17M39010JR353545NNKM36RA',
    BILLING_SANDBOX_PREMIUM_PRODUCT_ID: 'PROD-8XE5253028560521H',
    BILLING_CHECKOUT_APPROVED_APP_URL: 'https://wiseresume.app',
    BILLING_CHECKOUT_QA_USER_ID: 'qa_user_456',
  };
}

function mockFetch(handlers = {}) {
  return async (url, options = {}) => {
    const urlStr = String(url);
    if (handlers[urlStr]) {
      return handlers[urlStr](options);
    }
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (urlStr.includes(pattern)) {
        return handler(options, urlStr);
      }
    }
    throw new Error(`Unhandled mock fetch URL: ${urlStr}`);
  };
}

test('selectProvider enforces fail-closed behavior', () => {
  const env = validPayPalEnv();
  const config = readConfig(env);

  // 1. PayPal provider selected correctly
  const paypalProv = selectProvider(config, { env, fetchImpl: async () => {} });
  assert.ok(paypalProv instanceof PayPalSubscriptionProvider);

  // 2. Paddle provider explicitly retired (403 payments_disabled)
  assert.throws(
    () => selectProvider({ ...config, provider: 'paddle' }, {}),
    err => err instanceof BillingCheckoutError && err.status === 403 && err.code === 'payments_disabled'
  );

  // 3. Unconfigured provider throws 500 configuration_error
  assert.throws(
    () => selectProvider({ ...config, provider: '' }, {}),
    err => err instanceof BillingCheckoutError && err.status === 500 && err.code === 'configuration_error'
  );

  // 4. Unsupported provider throws 500 configuration_error
  assert.throws(
    () => selectProvider({ ...config, provider: 'stripe' }, {}),
    err => err instanceof BillingCheckoutError && err.status === 500 && err.code === 'configuration_error'
  );
});

test('PayPalSubscriptionProvider.getAccessToken retrieves OAuth token', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async (options) => {
      assert.equal(options.method, 'POST');
      assert.ok(options.headers.Authorization.startsWith('Basic '));
      assert.equal(options.body, 'grant_type=client_credentials');
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'mock_access_token_xyz', expires_in: 32400 }),
      };
    },
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const token = await provider.getAccessToken('sandbox');
  assert.equal(token, 'mock_access_token_xyz');
});

test('PayPalSubscriptionProvider.createCheckout generates subscription session with correct parameters and origin check', async () => {
  const env = validPayPalEnv();
  let subPayloadCaptured = null;
  let subHeadersCaptured = null;

  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions': async (options) => {
      subHeadersCaptured = options.headers;
      subPayloadCaptured = JSON.parse(options.body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: 'I-TEST12345678',
          status: 'APPROVAL_PENDING',
          links: [
            { href: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST123', rel: 'approve', method: 'GET' },
          ],
        }),
      };
    },
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const result = await provider.createCheckout({
    environment: 'sandbox',
    priceId: 'P-3A193536YV1432359NKM36QY',
    userId: 'qa_user_456',
    providerRequestId: 'wr_sub_deterministic_123',
    customData: { app_user_id: 'qa_user_456' },
  });

  assert.equal(result.providerTransactionId, 'I-TEST12345678');
  assert.equal(result.checkoutUrl, 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST123');
  assert.equal(subHeadersCaptured['PayPal-Request-Id'], 'wr_sub_deterministic_123');
  assert.equal(subPayloadCaptured.plan_id, 'P-3A193536YV1432359NKM36QY');
  assert.equal(subPayloadCaptured.custom_id, 'qa_user_456');
  assert.equal(subPayloadCaptured.application_context.user_action, 'SUBSCRIBE_NOW');
  assert.equal(subPayloadCaptured.application_context.payment_method.payer_selected, 'PAYPAL');
});

test('PayPalSubscriptionProvider rejects invalid or malicious checkout origins', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions': async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'I-TEST12345678',
        links: [
          { href: 'https://evil-phishing-site.test/checkout', rel: 'approve' },
        ],
      }),
    }),
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.createCheckout({
      environment: 'sandbox',
      priceId: 'P-3A193536YV1432359NKM36QY',
      userId: 'qa_user_456',
    }),
    err => err instanceof BillingCheckoutError && err.code === 'provider_unavailable'
  );
});

test('BillingCheckoutService handles ambiguous provider failures with markUncertain', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });

  // Simulate network transport failure in PayPalSubscriptionProvider
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions': async () => {
      throw new Error('ETIMEDOUT');
    },
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const service = new BillingCheckoutService({
    store,
    provider,
    config,
  });

  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'pro', idempotencyKey: 'key_timeout' }),
    err => err instanceof BillingCheckoutError && err.code === 'provider_unavailable'
  );

  assert.equal(store.uncertain.length, 1);
  assert.equal(store.failed.length, 0);
  assert.equal(store.uncertain[0].session.state, 'uncertain');
});

test('BillingCheckoutService marks failed on definitive provider errors', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });

  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions': async () => ({
      ok: false,
      status: 400,
      json: async () => ({ name: 'INVALID_REQUEST', message: 'Bad request' }),
    }),
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const service = new BillingCheckoutService({
    store,
    provider,
    config,
  });

  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'pro', idempotencyKey: 'key_bad_req' }),
    err => err instanceof BillingCheckoutError
  );

  assert.equal(store.failed.length, 1);
  assert.equal(store.uncertain.length, 0);
  assert.equal(store.failed[0].session.state, 'failed');
});

test('BillingCheckoutService enforces Sandbox QA user isolation', async () => {
  const env = validPayPalEnv(); // BILLING_CHECKOUT_QA_USER_ID = 'qa_user_456'
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });
  let providerCalled = false;
  const provider = {
    createCheckout: async (input) => {
      providerCalled = true;
      return {
        providerTransactionId: 'I-TEST_QA',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_123',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
      };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config });

  // 1. Non-QA user in sandbox receives 403 payments_disabled with zero provider calls
  await assert.rejects(
    () => service.create({ userId: 'regular_user_789', plan: 'pro' }),
    err => err instanceof BillingCheckoutError && err.status === 403 && err.code === 'payments_disabled'
  );
  assert.equal(providerCalled, false);

  // 2. Missing qaUserId in sandbox config fails closed with zero provider calls
  const missingQaConfig = { ...config, qaUserId: '' };
  const missingQaService = new BillingCheckoutService({ store, provider, config: missingQaConfig });
  await assert.rejects(
    () => missingQaService.create({ userId: 'qa_user_456', plan: 'pro' }),
    err => err instanceof BillingCheckoutError && err.status === 403 && err.code === 'payments_disabled'
  );
  assert.equal(providerCalled, false);

  // 3. QA user passes QA gate
  const goodResult = await service.create({
    userId: 'qa_user_456',
    plan: 'pro',
    idempotencyKey: 'qa_idem_1',
  });
  assert.ok(goodResult.data.session_reference);
  assert.equal(providerCalled, true);
});

test('BillingCheckoutService.cancel cancels active PayPal subscription (204 success) with stripped envelope', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-SUB12345',
      user_id: 'user_owner',
      status: 'active',
      environment: 'sandbox',
      will_renew: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  });

  let cancelCalled = false;
  const provider = {
    cancelSubscription: async ({ subscriptionId, reason, environment }) => {
      cancelCalled = true;
      assert.equal(subscriptionId, 'I-SUB12345');
      assert.equal(reason, 'Testing cancel');
      assert.equal(environment, 'sandbox');
      return { status: 'success', canceled: true, subscription_id: subscriptionId };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config });
  const res = await service.cancel({
    userId: 'user_owner',
    reason: 'Testing cancel',
  });

  assert.ok(cancelCalled);
  assert.equal(res.status, 'success');
  assert.equal(res.canceled, true);
  assert.equal(res.message, 'Cancellation request accepted.');
  assert.equal(res.subscription_id, undefined);
});

test('BillingCheckoutService.cancel rejects unauthorized subscription cancellation (ownership mismatch)', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: { subscription_id: 'I-OTHER_USER', user_id: 'user_other', status: 'active' },
  });

  const service = new BillingCheckoutService({
    store,
    provider: { cancelSubscription: async () => ({}) },
    config,
  });

  await assert.rejects(
    () => service.cancel({ userId: 'attacker_user', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 404 && err.code === 'not_found'
  );
});

test('PayPalSubscriptionProvider.cancelSubscription handles idempotent 422 with GET verification', async () => {
  const env = validPayPalEnv();
  let getSubCalled = false;

  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-ALREADY_CANCELED/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ name: 'UNPROCESSABLE_ENTITY', message: 'Subscription already canceled' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-ALREADY_CANCELED': async () => {
      getSubCalled = true;
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'I-ALREADY_CANCELED', status: 'CANCELLED' }),
      };
    },
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const result = await provider.cancelSubscription({
    subscriptionId: 'I-ALREADY_CANCELED',
    reason: 'Idempotent cancel',
    environment: 'sandbox',
  });

  assert.ok(getSubCalled);
  assert.equal(result.status, 'success');
  assert.equal(result.canceled, true);
  assert.equal(result.subscription_id, 'I-ALREADY_CANCELED');
});

test('PayPalSubscriptionProvider.cancelSubscription fails when 422 GET reveals status is NOT cancelled', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-STILL_ACTIVE/cancel': async () => ({
      ok: false,
      status: 422,
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-STILL_ACTIVE': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'I-STILL_ACTIVE', status: 'ACTIVE' }),
    }),
  });

  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({
      subscriptionId: 'I-STILL_ACTIVE',
      reason: 'Cancel test',
      environment: 'sandbox',
    }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'cancellation_failed'
  );
});

test('handleBillingCheckout routes action cancel-subscription correctly', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-TEST999',
      user_id: 'qa_user_456',
      status: 'active',
      environment: 'sandbox',
      will_renew: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  });

  const provider = {
    cancelSubscription: async ({ subscriptionId }) => ({
      status: 'success',
      canceled: true,
      subscription_id: subscriptionId,
    }),
  };

  let jsonResult = null;
  let statusCode = 0;
  const res = {
    json: (data, code) => {
      jsonResult = data;
      statusCode = code;
      return { data, code };
    },
  };

  const req = {
    body: {
      data: {
        action: 'cancel-subscription',
        reason: 'User request',
      },
    },
    headers: {},
  };

  await handleBillingCheckout(
    { req, res, error: () => {} },
    {
      user: { $id: 'qa_user_456' },
      store,
      provider,
      config,
    }
  );

  assert.equal(statusCode, 200);
  assert.equal(jsonResult.status, 'success');
  assert.equal(jsonResult.canceled, true);
  assert.equal(jsonResult.message, 'Cancellation request accepted.');
  assert.equal(jsonResult.subscription_id, undefined);
});

test('BillingCheckoutService classifies persistence failure after PayPal 201 as uncertain (markUncertain), never terminal failed', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });

  // Store where complete() throws a database persistence error
  store.complete = async () => {
    throw new Error('Database connection reset during session completion write');
  };

  const provider = {
    createCheckout: async (input) => ({
      providerTransactionId: 'I-PAYPAL_CREATED_201',
      providerEnvironment: input.environment,
      collectionMode: 'automatic',
      checkoutReference: 'ref_valid_123',
      checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-CREATED201',
    }),
  };

  const service = new BillingCheckoutService({ store, provider, config });

  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'pro', idempotencyKey: 'key_db_fail_after_201' }),
    err => err instanceof BillingCheckoutError && err.code === 'provider_unavailable'
  );

  // Must be classified as uncertain because PayPal already created the subscription!
  assert.equal(store.uncertain.length, 1, 'Must record uncertain session state on persistence failure');
  assert.equal(store.failed.length, 0, 'Must NEVER classify persistence failure after 201 as definitive terminal failed');
  assert.equal(store.uncertain[0].session.state, 'uncertain');
});

test('BillingCheckoutService derives providerRequestId deterministically from reservation session_key', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });

  let capturedRequestId = null;
  const provider = {
    createCheckout: async (input) => {
      capturedRequestId = input.providerRequestId;
      return {
        providerTransactionId: 'I-TEST_REQ_ID',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_123',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-TEST',
      };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config });
  await service.create({ userId: 'qa_user_456', plan: 'pro', idempotencyKey: 'test_fixed_attempt_key' });

  assert.ok(capturedRequestId, 'providerRequestId must be supplied to provider');
  assert.ok(capturedRequestId.startsWith('wr_sub_'), 'providerRequestId must follow wr_sub_ prefix format');

  // Verify it matches hash of the stored reservation session_key
  const storedSession = store.completed[0]?.session;
  assert.ok(storedSession, 'Session must have been completed');
  const expectedHash = billing.__test.hash(storedSession.session_key).slice(0, 32);
  assert.equal(capturedRequestId, `wr_sub_${expectedHash}`);
});

// ==============================================================================
// Cancellation Server Checks & Parameter Sanitization Tests
// ==============================================================================

test('validateRequest strictly rejects subscription_id injection in cancel-subscription', () => {
  const { validateRequest } = billing.__test;
  assert.throws(
    () => validateRequest({
      action: 'cancel-subscription',
      subscription_id: 'I-INJECTED123',
      reason: 'Attempted override',
    }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'invalid_request'
  );
});

test('validateRequest strictly rejects subscriptionId injection in cancel-subscription', () => {
  const { validateRequest } = billing.__test;
  assert.throws(
    () => validateRequest({
      action: 'cancel-subscription',
      subscriptionId: 'I-INJECTED123',
    }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'invalid_request'
  );
});

test('validateRequest strictly rejects client parameter injection (user_id, plan_id, provider, environment)', () => {
  const { validateRequest } = billing.__test;
  const injectionKeys = ['user_id', 'plan_id', 'provider', 'environment'];
  for (const key of injectionKeys) {
    assert.throws(
      () => validateRequest({
        action: 'cancel-subscription',
        reason: 'Valid reason',
        [key]: 'injected_value',
      }),
      err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'invalid_request',
      `Should reject injection of ${key}`
    );
  }
});

test('service.cancel: no PayPal state -> zero provider call, fails closed with 404', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'pro', paypalState: null });
  let providerCalled = false;
  const provider = {
    cancelSubscription: async () => { providerCalled = true; },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 404 && err.code === 'not_found'
  );
  assert.equal(providerCalled, false, 'Provider must not be called when paypalState is missing');
});

test('service.cancel: legacy subscriptions record only -> zero provider call, fails closed with 404', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    userSub: { subscription_id: 'I-LEGACY123', user_id: 'qa_user_456' },
    paypalState: null,
  });
  let providerCalled = false;
  const provider = {
    cancelSubscription: async () => { providerCalled = true; },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 404 && err.code === 'not_found'
  );
  assert.equal(providerCalled, false, 'Provider must not be called with legacy subscription fallback');
});

test('service.cancel: ownership mismatch (paypalState.user_id !== userId) -> zero provider call', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-OTHER123',
      user_id: 'victim_user',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
    },
  });
  // Ensure findOptional returns the state even if queried with attacker's ID to test ownership check
  store.findOptional = async () => store.paypalState;

  let providerCalled = false;
  const provider = {
    cancelSubscription: async () => { providerCalled = true; },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.cancel({ userId: 'attacker_user', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 403 && err.code === 'forbidden'
  );
  assert.equal(providerCalled, false, 'Provider must not be called on user ownership mismatch');
});

test('service.cancel: environment mismatch -> zero provider call, fails closed', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-ENVMISMATCH123',
      user_id: 'qa_user_456',
      environment: 'production', // Mismatch against sandbox config
      status: 'active',
      will_renew: true,
    },
  });
  let providerCalled = false;
  const provider = {
    cancelSubscription: async () => { providerCalled = true; },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );
  assert.equal(providerCalled, false, 'Provider must not be called on environment mismatch');
});

test('service.cancel: invalid/missing environment in provider -> zero PayPal call', async () => {
  const provider = new PayPalSubscriptionProvider({
    PAYPAL_CLIENT_ID: 'mock_id',
    PAYPAL_CLIENT_SECRET: 'mock_secret',
  });
  await assert.rejects(
    () => provider.cancelSubscription({
      subscriptionId: 'I-TEST123',
      reason: 'Cancel test',
      environment: 'staging_invalid',
    }),
    err => {
      const diag = billing.__test.providerDiagnostic(err);
      return diag && diag.stage === 'provider.runtime_configuration' && diag.category === 'missing_provider_endpoint';
    }
  );
});

test('service.cancel: will_renew = false -> zero provider call, fails closed', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-CANCELED123',
      user_id: 'qa_user_456',
      environment: 'sandbox',
      status: 'active',
      will_renew: false, // Already non-renewing
    },
  });
  let providerCalled = false;
  const provider = {
    cancelSubscription: async () => { providerCalled = true; },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );
  assert.equal(providerCalled, false, 'Provider must not be called when will_renew is false');
});

test('service.cancel: non-cancellable status -> zero provider call, fails closed', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const invalidStatuses = ['canceled', 'cancelled', 'suspended', 'expired', 'pending'];
  for (const status of invalidStatuses) {
    const store = new MockCheckoutStore({
      plan: 'pro',
      paypalState: {
        subscription_id: 'I-INVALID123',
        user_id: 'qa_user_456',
        environment: 'sandbox',
        status,
        will_renew: true,
      },
    });
    let providerCalled = false;
    const provider = {
      cancelSubscription: async () => { providerCalled = true; },
    };
    const service = new BillingCheckoutService({ store, provider, config });
    await assert.rejects(
      () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel' }),
      err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request',
      `Should reject non-cancellable status: ${status}`
    );
    assert.equal(providerCalled, false, `Provider must not be called when status is ${status}`);
  }
});

test('service.cancel: valid PayPal state -> provider called successfully', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      subscription_id: 'I-VALID12345',
      user_id: 'qa_user_456',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  let capturedInput = null;
  const provider = {
    cancelSubscription: async (input) => {
      capturedInput = input;
      return { status: 'success', canceled: true, subscription_id: input.subscriptionId };
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  const result = await service.cancel({ userId: 'qa_user_456', reason: 'User requested' });
  assert.equal(result.status, 'success');
  assert.equal(result.canceled, true);
  assert.equal(capturedInput.subscriptionId, 'I-VALID12345');
  assert.equal(capturedInput.environment, 'sandbox');
});

// ==============================================================================
// Exact Idempotency Recovery Tests
// ==============================================================================

test('Adversarial Idempotency 1: persisted uncertain session key beats newly calculated retry key', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);

  const ORIGINAL_KEY = 'user_qa_plan_pro_bucket_hour_1';
  const NEW_RECALCULATED_KEY = 'user_qa_plan_pro_bucket_hour_2';

  // Existing persisted session in uncertain state with session_key = ORIGINAL_KEY
  const persistedSession = {
    $id: 'sess_persisted_uncertain',
    session_key: ORIGINAL_KEY,
    public_reference: 'sess_pub_orig',
    user_id: 'qa_user_456',
    plan: 'pro',
    environment: 'sandbox',
    price_id: 'P-3A193536YV1432359NKM36QY',
    state: 'uncertain',
    expires_at: new Date(Date.now() + 300000).toISOString(),
  };

  const store = new MockCheckoutStore({
    plan: 'free',
    existingSession: persistedSession,
  });

  let capturedRequestId = null;
  const provider = {
    createCheckout: async (input) => {
      capturedRequestId = input.providerRequestId;
      return {
        providerTransactionId: 'I-RECOVERED123',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_rec_123',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-REC',
      };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config });

  // Client retries and calculates a different idempotency key
  await service.create({
    userId: 'qa_user_456',
    plan: 'pro',
    idempotencyKey: NEW_RECALCULATED_KEY,
  });

  // Provider MUST receive wr_sub_<hash(ORIGINAL_KEY)>, NOT a hash of NEW_RECALCULATED_KEY!
  const expectedHashOriginal = billing.__test.hash(ORIGINAL_KEY).slice(0, 32);
  const expectedHashNew = billing.__test.hash(NEW_RECALCULATED_KEY).slice(0, 32);

  assert.equal(
    capturedRequestId,
    `wr_sub_${expectedHashOriginal}`,
    'Provider MUST receive PayPal-Request-Id derived from the persisted session_key (ORIGINAL_KEY)'
  );
  assert.notEqual(
    capturedRequestId,
    `wr_sub_${expectedHashNew}`,
    'Provider MUST NOT receive a PayPal-Request-Id derived from the newly recalculated key'
  );
});

test('Adversarial Idempotency 2: PayPal 201 -> store.complete throws -> uncertain -> retry reuses exact PayPal-Request-Id and completes', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);

  let completeCallCount = 0;
  const store = new MockCheckoutStore({ plan: 'free' });

  // Step 1: First call -> store.complete throws database persistence error
  store.complete = async (session, result) => {
    completeCallCount += 1;
    if (completeCallCount === 1) {
      throw new Error('Database connection reset during completion');
    }
    store.completed.push({ session, result });
    session.state = 'created';
    session.checkout_reference = result.checkoutReference;
    session.checkout_url = result.checkoutUrl;
  };

  const requestIdsSeen = [];
  const provider = {
    createCheckout: async (input) => {
      requestIdsSeen.push(input.providerRequestId);
      return {
        providerTransactionId: 'I-PAYPAL201REC',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_201',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-201',
      };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config });

  // Attempt 1: provider returns 201, but complete() throws -> marks session uncertain
  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'pro', idempotencyKey: 'frontend_client_key_123' }),
    err => err instanceof BillingCheckoutError && err.code === 'provider_unavailable'
  );

  assert.equal(store.uncertain.length, 1, 'Session must be marked uncertain');
  const uncertainSession = store.uncertain[0].session;

  // Simulate store reserve returning the uncertain session on retry
  store.existingSession = uncertainSession;

  // Attempt 2: retry with same logical frontend key
  const response = await service.create({
    userId: 'qa_user_456',
    plan: 'pro',
    idempotencyKey: 'frontend_client_key_123',
  });

  assert.equal(requestIdsSeen.length, 2);
  assert.equal(
    requestIdsSeen[1],
    requestIdsSeen[0],
    'Retry MUST reuse the exact same PayPal-Request-Id'
  );
  assert.equal(completeCallCount, 2, 'store.complete must have succeeded on second call');
  assert.equal(response.status, 'success');
  assert.ok(response.data.checkout_url.includes('token=BA-201'));
});

test('P0 Plan Change 1: Free user -> Pro: provider Create Subscription called', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });
  let providerCalled = false;
  const provider = {
    createCheckout: async (input) => {
      providerCalled = true;
      return {
        providerTransactionId: 'I-SUB-FREE-PRO',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_free_pro',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-FREE-PRO',
      };
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  const response = await service.create({ userId: 'qa_user_456', plan: 'pro' });
  assert.ok(providerCalled, 'Provider Create Subscription MUST be called for Free -> Pro');
  assert.equal(response.status, 'success');
  assert.equal(response.data.plan, 'pro');
});

test('P0 Plan Change 2: Free user -> Premium: provider Create Subscription called', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const store = new MockCheckoutStore({ plan: 'free' });
  let providerCalled = false;
  const provider = {
    createCheckout: async (input) => {
      providerCalled = true;
      return {
        providerTransactionId: 'I-SUB-FREE-PREM',
        providerEnvironment: input.environment,
        collectionMode: 'automatic',
        checkoutReference: 'ref_free_prem',
        checkoutUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=BA-FREE-PREM',
      };
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  const response = await service.create({ userId: 'qa_user_456', plan: 'premium' });
  assert.ok(providerCalled, 'Provider Create Subscription MUST be called for Free -> Premium');
  assert.equal(response.status, 'success');
  assert.equal(response.data.plan, 'premium');
});

test('P0 Plan Change 3: Existing PayPal Pro + will_renew=true -> Premium request rejected with plan_change_unavailable, ZERO provider calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  let providerCallCount = 0;
  const store = new MockCheckoutStore({
    plan: 'pro',
    paypalState: {
      user_id: 'qa_user_456',
      subscription_id: 'I-PRO-EXISTING',
      plan: 'pro',
      status: 'active',
      will_renew: true,
      environment: 'sandbox',
    },
  });
  const provider = {
    createCheckout: async () => {
      providerCallCount += 1;
      return {};
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'premium' }),
    err => err instanceof BillingCheckoutError && err.code === 'plan_change_unavailable' && err.status === 409
  );
  assert.equal(providerCallCount, 0, 'Provider call count MUST remain ZERO for Pro -> Premium plan change');
  assert.equal(store.sessions.size, 0, 'Zero checkout sessions created or mutated');
});

test('P0 Plan Change 4: Existing PayPal Premium -> Pro rejected, ZERO provider calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  let providerCallCount = 0;
  const store = new MockCheckoutStore({
    plan: 'premium',
    paypalState: {
      user_id: 'qa_user_456',
      subscription_id: 'I-PREM-EXISTING',
      plan: 'premium',
      status: 'active',
      will_renew: true,
      environment: 'sandbox',
    },
  });
  const provider = {
    createCheckout: async () => {
      providerCallCount += 1;
      return {};
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'pro' }),
    err => err instanceof BillingCheckoutError && (err.code === 'already_entitled' || err.code === 'plan_change_unavailable') && err.status === 409
  );
  assert.equal(providerCallCount, 0, 'Provider call count MUST remain ZERO for Premium -> Pro');
});

test('P0 Plan Change 5: Existing PayPal Premium -> Premium rejected, ZERO provider calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  let providerCallCount = 0;
  const store = new MockCheckoutStore({
    plan: 'premium',
    paypalState: {
      user_id: 'qa_user_456',
      subscription_id: 'I-PREM-EXISTING',
      plan: 'premium',
      status: 'active',
      will_renew: true,
      environment: 'sandbox',
    },
  });
  const provider = {
    createCheckout: async () => {
      providerCallCount += 1;
      return {};
    },
  };
  const service = new BillingCheckoutService({ store, provider, config });
  await assert.rejects(
    () => service.create({ userId: 'qa_user_456', plan: 'premium' }),
    err => err instanceof BillingCheckoutError && (err.code === 'already_entitled' || err.code === 'plan_change_unavailable') && err.status === 409
  );
  assert.equal(providerCallCount, 0, 'Provider call count MUST remain ZERO for Premium -> Premium');
});

test('P1 Cancellation Verify: cancel 422 -> GET 429 -> retryable provider failure (rate limited)', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-429/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Cannot cancel' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-429': async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limited' }),
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({ subscriptionId: 'I-SUB-429', reason: 'Cancel test', environment: 'sandbox' }),
    (err) => {
      assert.ok(isAmbiguousProviderError(err), '429 verify GET MUST be classified as retryable provider failure');
      const diag = billing.__test.providerDiagnostic(err);
      assert.equal(diag?.category, 'provider_rate_limited');
      assert.equal(diag?.stage, 'provider.http_response');
      assert.equal(diag?.status, 429);
      return true;
    }
  );
});

test('P1 Cancellation Verify: cancel 422 -> GET 500 -> retryable provider failure (upstream error)', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-500/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Cannot cancel' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-500': async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal Server Error' }),
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({ subscriptionId: 'I-SUB-500', reason: 'Cancel test', environment: 'sandbox' }),
    (err) => {
      assert.ok(isAmbiguousProviderError(err), '500 verify GET MUST be classified as retryable upstream error');
      const diag = billing.__test.providerDiagnostic(err);
      assert.equal(diag?.category, 'provider_upstream_error');
      assert.equal(diag?.stage, 'provider.http_response');
      assert.equal(diag?.status, 500);
      return true;
    }
  );
});

test('P1 Cancellation Verify: cancel 422 -> GET 401 -> auth/provider failure', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-401/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Cannot cancel' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-401': async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({ subscriptionId: 'I-SUB-401', reason: 'Cancel test', environment: 'sandbox' }),
    (err) => {
      const diag = billing.__test.providerDiagnostic(err);
      assert.equal(diag?.category, 'provider_auth_rejected');
      assert.equal(diag?.stage, 'provider.http_response');
      assert.equal(diag?.status, 401);
      return true;
    }
  );
});

test('P1 Cancellation Verify: cancel 422 -> GET network timeout -> retryable provider failure', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-TIMEOUT/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Cannot cancel' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-TIMEOUT': async () => {
      const err = new Error('ETIMEDOUT');
      err.code = 'ETIMEDOUT';
      throw err;
    },
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({ subscriptionId: 'I-SUB-TIMEOUT', reason: 'Cancel test', environment: 'sandbox' }),
    (err) => {
      assert.ok(isAmbiguousProviderError(err), 'Network timeout on verify GET MUST be retryable');
      const diag = billing.__test.providerDiagnostic(err);
      assert.equal(diag?.category, 'transport_failure');
      assert.equal(diag?.stage, 'provider.transport');
      return true;
    }
  );
});

test('P1 Cancellation Verify: cancel 422 -> GET invalid JSON -> safe failure, no false canceled result', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-CORRUPT/cancel': async () => ({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Cannot cancel' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-CORRUPT': async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new Error('Unexpected token < in JSON at position 0'); },
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  await assert.rejects(
    () => provider.cancelSubscription({ subscriptionId: 'I-SUB-CORRUPT', reason: 'Cancel test', environment: 'sandbox' }),
    (err) => {
      const diag = billing.__test.providerDiagnostic(err);
      assert.equal(diag?.category, 'invalid_json');
      assert.equal(diag?.stage, 'provider.response_json');
      return true;
    }
  );
});

test('hasActivePaypalSubscription unit evaluations (fail-closed & lifecycle boundaries)', () => {
  const { hasActivePaypalSubscription } = billing.__test;
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 86400000).toISOString();
  const pastIso = new Date(nowMs - 86400000).toISOString();

  // 1. Non-matching user
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_other', plan: 'pro', status: 'active', will_renew: true }, 'user_current', nowMs),
    false,
    'Mismatched user ID must return false'
  );

  // 2. Active recurring Pro/Premium
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'pro', status: 'active', will_renew: true }, 'user_1', nowMs),
    true,
    'Active recurring Pro must return true'
  );
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'premium', status: 'billing_issue', will_renew: true }, 'user_1', nowMs),
    true,
    'Billing issue recurring Premium must return true'
  );

  // 3. Ambiguous will_renew (null/undefined) fails closed -> true
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'pro', status: 'active' }, 'user_1', nowMs),
    true,
    'Missing will_renew fails closed to true'
  );

  // 4. Canceled (will_renew = false) but unexpired -> returns true
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'pro', status: 'active', will_renew: false, expires_at: futureIso }, 'user_1', nowMs),
    true,
    'Canceled Pro with future expires_at remains active until expiry'
  );

  // 5. Canceled and expired -> returns false
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'pro', status: 'active', will_renew: false, expires_at: pastIso }, 'user_1', nowMs),
    false,
    'Canceled Pro with past expires_at returns false'
  );

  // 6. Inactive/cancelled status -> returns false
  assert.equal(
    hasActivePaypalSubscription({ user_id: 'user_1', plan: 'pro', status: 'cancelled', will_renew: false }, 'user_1', nowMs),
    false,
    'Cancelled status returns false'
  );
});

test('PayPalSubscriptionProvider.getSubscriptionDetails retrieves subscription details successfully', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-GET-OK': async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'I-SUB-GET-OK',
        status: 'ACTIVE',
        billing_info: { next_billing_time: '2026-10-06T08:38:00Z' },
      }),
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });
  const details = await provider.getSubscriptionDetails({ subscriptionId: 'I-SUB-GET-OK', environment: 'sandbox' });
  assert.equal(details.id, 'I-SUB-GET-OK');
  assert.equal(details.status, 'ACTIVE');
  assert.equal(details.billing_info.next_billing_time, '2026-10-06T08:38:00Z');
});

test('PayPalSubscriptionProvider.getSubscriptionDetails handles error statuses correctly', async () => {
  const env = validPayPalEnv();
  const fetchImpl = mockFetch({
    'https://api-m.sandbox.paypal.com/v1/oauth2/token': async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'mock_token' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-404': async () => ({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-403': async () => ({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-429': async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limited' }),
    }),
    'https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-500': async () => ({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' }),
    }),
  });
  const provider = new PayPalSubscriptionProvider({ env, fetchImpl });

  await assert.rejects(
    () => provider.getSubscriptionDetails({ subscriptionId: 'I-SUB-404', environment: 'sandbox' }),
    err => err instanceof BillingCheckoutError && err.status === 404 && err.code === 'not_found'
  );

  await assert.rejects(
    () => provider.getSubscriptionDetails({ subscriptionId: 'I-SUB-403', environment: 'sandbox' }),
    err => {
      const diag = billing.__test.providerDiagnostic(err);
      return diag?.category === 'provider_auth_rejected' && diag?.status === 403;
    }
  );

  await assert.rejects(
    () => provider.getSubscriptionDetails({ subscriptionId: 'I-SUB-429', environment: 'sandbox' }),
    err => {
      const diag = billing.__test.providerDiagnostic(err);
      return diag?.category === 'provider_rate_limited' && diag?.status === 429;
    }
  );

  await assert.rejects(
    () => provider.getSubscriptionDetails({ subscriptionId: 'I-SUB-500', environment: 'sandbox' }),
    err => {
      const diag = billing.__test.providerDiagnostic(err);
      return diag?.category === 'provider_upstream_error' && diag?.status === 500;
    }
  );
});

test('BillingCheckoutService.cancel preflight: already valid future expires_at does not need provider GET and proceeds to cancel', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let getDetailsCallCount = 0;
  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_1',
      user_id: 'qa_user_456',
      subscription_id: 'I-ALREADYEXPIRY123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: futureIso,
      plan: 'premium',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      getDetailsCallCount += 1;
      return {};
    },
    cancelSubscription: async ({ subscriptionId, reason }) => {
      cancelCallCount += 1;
      assert.equal(subscriptionId, 'I-ALREADYEXPIRY123');
      assert.equal(reason, 'User requested cancel');
      return { status: 'success', canceled: true, subscription_id: subscriptionId };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });
  const result = await service.cancel({ userId: 'qa_user_456', reason: 'User requested cancel' });

  assert.equal(result.status, 'success');
  assert.equal(result.canceled, true);
  assert.equal(getDetailsCallCount, 0, 'Should not fetch details when future expires_at is already valid');
  assert.equal(cancelCallCount, 1, 'Provider cancel must be called exactly once');
});

test('BillingCheckoutService.cancel preflight: missing expires_at fetches next_billing_time from provider, persists to store, and cancels', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let getDetailsCallCount = 0;
  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_preflight_1',
      user_id: 'qa_user_456',
      subscription_id: 'I-FETCHEXPIRY123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'premium',
    },
  });

  const provider = {
    getSubscriptionDetails: async ({ subscriptionId, environment }) => {
      getDetailsCallCount += 1;
      assert.equal(subscriptionId, 'I-FETCHEXPIRY123');
      assert.equal(environment, 'sandbox');
      return {
        id: subscriptionId,
        status: 'ACTIVE',
        billing_info: {
          next_billing_time: futureIso,
        },
      };
    },
    cancelSubscription: async ({ subscriptionId }) => {
      cancelCallCount += 1;
      assert.equal(subscriptionId, 'I-FETCHEXPIRY123');
      return { status: 'success', canceled: true, subscription_id: subscriptionId };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });
  const result = await service.cancel({ userId: 'qa_user_456', reason: 'Cancel with preflight' });

  assert.equal(result.status, 'success');
  assert.equal(result.canceled, true);
  assert.equal(getDetailsCallCount, 1, 'Preflight must fetch subscription snapshot');
  assert.equal(cancelCallCount, 1, 'Provider cancel must be called after preflight persistence');
  assert.equal(store.updatedPaypalExpiry?.documentId, 'state_doc_preflight_1');
  assert.equal(store.updatedPaypalExpiry?.expiresAt, futureIso);
  assert.equal(store.paypalState.expires_at, futureIso, 'Store state must reflect persisted expires_at');
});

test('BillingCheckoutService.cancel preflight FAIL-CLOSED: provider GET failure aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_fail_1',
      user_id: 'qa_user_456',
      subscription_id: 'I-GETFAIL123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      const err = new Error('PayPal upstream timeout');
      err.code = 'ETIMEDOUT';
      throw err;
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => {
      const diag = billing.__test.providerDiagnostic(err);
      return diag?.category === 'transport_failure';
    }
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when preflight GET fails');
});

test('BillingCheckoutService.cancel preflight FAIL-CLOSED: missing/invalid next_billing_time aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_fail_2',
      user_id: 'qa_user_456',
      subscription_id: 'I-NONEXTBILLING123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      return {
        id: 'I-NONEXTBILLING123',
        status: 'ACTIVE',
        billing_info: {
          next_billing_time: null, // No future billing time available
        },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'cancellation_failed' && err.status === 400
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when next_billing_time is missing');
});

test('BillingCheckoutService.cancel preflight FAIL-CLOSED: store persistence failure aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_fail_3',
      user_id: 'qa_user_456',
      subscription_id: 'I-STOREFAIL123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'premium',
    },
  });

  store.updatePaypalExpiryThrows = new BillingCheckoutError('state_unavailable', 503, 'DB write failed');

  const provider = {
    getSubscriptionDetails: async () => ({
      id: 'I-STOREFAIL123',
      status: 'ACTIVE',
      billing_info: { next_billing_time: futureIso },
    }),
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'state_unavailable' && err.status === 503
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when store write fails');
});

test('BillingCheckoutService.cancel preflight FAIL-CLOSED: missing initial document ID aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      // $id is deliberately missing
      user_id: 'qa_user_456',
      subscription_id: 'I-NODOCID123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => ({
      id: 'I-NODOCID123',
      status: 'ACTIVE',
      billing_info: { next_billing_time: futureIso },
    }),
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'cancellation_failed' && err.status === 400
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when state doc ID is missing');
});

test('BillingCheckoutService.cancel preflight FAIL-CLOSED: store missing updatePaypalExpiry capability aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_nocap_1',
      user_id: 'qa_user_456',
      subscription_id: 'I-NOCAP123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });
  // Disable updatePaypalExpiry capability on instance
  store.updatePaypalExpiry = null;

  const provider = {
    getSubscriptionDetails: async () => ({
      id: 'I-NOCAP123',
      status: 'ACTIVE',
      billing_info: { next_billing_time: futureIso },
    }),
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'cancellation_failed' && err.status === 400
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when store lacks updatePaypalExpiry capability');
});

test('BillingCheckoutService.cancel future-expiry revalidation FAIL-CLOSED: concurrent mutation (will_renew flipped to false) aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;
  let findCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_reval_1',
      user_id: 'qa_user_456',
      subscription_id: 'I-REVAL123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: futureIso,
      plan: 'pro',
    },
  });

  // On second lookup (revalidation), simulate concurrent webhook execution that already marked will_renew = false
  const originalFind = store.findOptional.bind(store);
  store.findOptional = async (collection, userId) => {
    findCount += 1;
    const doc = await originalFind(collection, userId);
    if (findCount > 1 && doc) {
      return { ...doc, will_renew: false, status: 'canceled' };
    }
    return doc;
  };

  const provider = {
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'bad_request' && err.status === 400
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when revalidation detects state mutation');
});

test('BillingCheckoutService.cancel future-expiry revalidation FAIL-CLOSED: concurrent mutation (plan changed) aborts cancellation with provider cancel call count = 0', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;
  let findCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_reval_2',
      user_id: 'qa_user_456',
      subscription_id: 'I-REVAL456',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: futureIso,
      plan: 'pro',
    },
  });

  const originalFind = store.findOptional.bind(store);
  store.findOptional = async (collection, userId) => {
    findCount += 1;
    const doc = await originalFind(collection, userId);
    if (findCount > 1 && doc) {
      return { ...doc, plan: 'free' };
    }
    return doc;
  };

  const provider = {
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.code === 'bad_request' && err.status === 400
  );

  assert.equal(cancelCallCount, 0, 'FAIL-CLOSED: Provider cancel call count MUST remain ZERO when revalidation detects plan change');
});

test('Hardening A: updatePaypalExpiry rejects state belonging to another user with ZERO PayPal cancel calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_other_user',
      user_id: 'qa_user_456',
      subscription_id: 'I-SUBOWNER123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      // Simulate concurrent state mutation swapping user ownership before updatePaypalExpiry executes
      store.paypalState.user_id = 'other_user_999';
      return {
        id: 'I-SUBOWNER123',
        status: 'ACTIVE',
        billing_info: { next_billing_time: futureIso },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.status === 403 && err.code === 'forbidden'
  );

  assert.equal(cancelCallCount, 0, 'ZERO provider cancel calls on user ownership mismatch at write time');
});

test('Hardening B: updatePaypalExpiry rejects state subscription_id mismatch with ZERO PayPal cancel calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_mismatch_sub',
      user_id: 'qa_user_456',
      subscription_id: 'I-ORIGINALSUB123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'premium',
    },
  });

  // Simulate concurrent state mutation swapping the subscription_id before updatePaypalExpiry executes
  const provider = {
    getSubscriptionDetails: async () => {
      store.paypalState.subscription_id = 'I-MODIFIEDSUB456';
      return {
        id: 'I-ORIGINALSUB123',
        status: 'ACTIVE',
        billing_info: { next_billing_time: futureIso },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );

  assert.equal(cancelCallCount, 0, 'ZERO provider cancel calls on subscription ID mismatch at write time');
});

test('Hardening C: updatePaypalExpiry rejects stale plan/environment changes with ZERO PayPal cancel calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_stale',
      user_id: 'qa_user_456',
      subscription_id: 'I-STALESUB123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      // Stale mutation altering plan mid-flight
      store.paypalState.plan = 'free';
      return {
        id: 'I-STALESUB123',
        status: 'ACTIVE',
        billing_info: { next_billing_time: futureIso },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );

  assert.equal(cancelCallCount, 0, 'ZERO provider cancel calls on stale plan/state change');
});

test('Hardening D: updatePaypalExpiry modifies ONLY expires_at and preserves all lifecycle/event metadata intact', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = '2026-10-06T12:00:00.000Z';

  const originalState = {
    $id: 'state_doc_meta_check',
    user_id: 'qa_user_456',
    subscription_id: 'I-METACHECK123',
    plan: 'premium',
    plan_id: 'P-17M39010JR353545NNKM36RA',
    environment: 'sandbox',
    status: 'active',
    will_renew: true,
    expires_at: null,
    grace_period_expires_at: null,
    latest_event_id: 'EVT-SALE-PREV-001',
    latest_event_type: 'PAYMENT.SALE.COMPLETED',
    latest_event_timestamp_ms: 1699990000000,
    latest_event_ordering_key: '01699990000000:EVT-SALE-PREV-001',
    updated_at: '2026-09-06T08:00:00.000Z',
  };

  const store = new MockCheckoutStore({
    paypalState: { ...originalState },
  });

  const provider = {
    getSubscriptionDetails: async () => ({
      id: 'I-METACHECK123',
      status: 'ACTIVE',
      billing_info: { next_billing_time: futureIso },
    }),
    cancelSubscription: async () => ({ status: 'success', canceled: true, subscription_id: 'I-METACHECK123' }),
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });
  const result = await service.cancel({ userId: 'qa_user_456', reason: 'Preserve metadata check' });

  assert.equal(result.status, 'success');
  assert.equal(result.canceled, true);

  const updatedState = store.paypalState;
  assert.equal(updatedState.expires_at, futureIso, 'Only expires_at must be updated');
  assert.equal(updatedState.user_id, originalState.user_id, 'user_id must remain unchanged');
  assert.equal(updatedState.subscription_id, originalState.subscription_id, 'subscription_id must remain unchanged');
  assert.equal(updatedState.plan, originalState.plan, 'plan must remain unchanged');
  assert.equal(updatedState.plan_id, originalState.plan_id, 'plan_id must remain unchanged');
  assert.equal(updatedState.environment, originalState.environment, 'environment must remain unchanged');
  assert.equal(updatedState.status, originalState.status, 'status must remain active before webhook');
  assert.equal(updatedState.will_renew, originalState.will_renew, 'will_renew must remain unchanged before webhook');
  assert.equal(updatedState.latest_event_id, originalState.latest_event_id, 'latest_event_id must remain unchanged');
  assert.equal(updatedState.latest_event_type, originalState.latest_event_type, 'latest_event_type must remain unchanged');
  assert.equal(updatedState.latest_event_timestamp_ms, originalState.latest_event_timestamp_ms, 'latest_event_timestamp_ms must remain unchanged');
  assert.equal(updatedState.latest_event_ordering_key, originalState.latest_event_ordering_key, 'latest_event_ordering_key must remain unchanged');
});

test('Hardening E: updatePaypalExpiry rejects inactive status with ZERO PayPal cancel calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_inactive',
      user_id: 'qa_user_456',
      subscription_id: 'I-INACTIVESUB123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      store.paypalState.status = 'canceled';
      return {
        id: 'I-INACTIVESUB123',
        status: 'ACTIVE',
        billing_info: { next_billing_time: futureIso },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );

  assert.equal(cancelCallCount, 0, 'ZERO provider cancel calls when state status is non-active at write time');
});

test('Hardening F: updatePaypalExpiry rejects non-renewing subscription with ZERO PayPal cancel calls', async () => {
  const env = validPayPalEnv();
  const config = readConfig(env);
  const nowMs = 1700000000000;
  const futureIso = new Date(nowMs + 30 * 86400000).toISOString();

  let cancelCallCount = 0;

  const store = new MockCheckoutStore({
    paypalState: {
      $id: 'state_doc_nonrenewing',
      user_id: 'qa_user_456',
      subscription_id: 'I-NONRENEWSUB123',
      environment: 'sandbox',
      status: 'active',
      will_renew: true,
      expires_at: null,
      plan: 'pro',
    },
  });

  const provider = {
    getSubscriptionDetails: async () => {
      store.paypalState.will_renew = false;
      return {
        id: 'I-NONRENEWSUB123',
        status: 'ACTIVE',
        billing_info: { next_billing_time: futureIso },
      };
    },
    cancelSubscription: async () => {
      cancelCallCount += 1;
      return { status: 'success' };
    },
  };

  const service = new BillingCheckoutService({ store, provider, config, now: () => nowMs });

  await assert.rejects(
    () => service.cancel({ userId: 'qa_user_456', reason: 'Cancel attempt' }),
    err => err instanceof BillingCheckoutError && err.status === 400 && err.code === 'bad_request'
  );

  assert.equal(cancelCallCount, 0, 'ZERO provider cancel calls when will_renew is false at write time');
});
