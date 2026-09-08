'use strict';

const assert = require('assert');
const checkout = require('../../appwrite-hubs/billing-checkout/src/main.js');
const { __test: t } = checkout;

const response = {
  ok: true,
  status: 200,
  json: async () => ({
    id: 'ch_test',
    purchase_url: 'https://sandbox.whop.com/checkout/plan_4JJSQLj5zEKVn?session=opaque',
    plan: {
      id: 'plan_4JJSQLj5zEKVn', product: { id: 'prod_WrbEGZdSaG2af' },
      plan_type: 'renewal', billing_period: 30, initial_price: 5, renewal_price: 5,
    },
  }),
};
const requests = [];
const provider = new t.WhopCheckoutProvider({
  env: {
    WHOP_SANDBOX_API_KEY: 'sandbox-key',
    WHOP_SANDBOX_COMPANY_ID: 'biz_sandbox_test',
  },
  fetchImpl: async (url, options) => { requests.push({ url, options }); return response; },
});

(async () => {
  const result = await provider.createCheckout({
    environment: 'sandbox', plan: 'pro', priceId: 'plan_4JJSQLj5zEKVn',
    productId: 'prod_WrbEGZdSaG2af', appOrigin: 'https://wiseresume.app',
    customData: { app_user_id: 'appwrite_user', checkout_session_reference: 'sess_1' },
  });
  assert.equal(result.providerEnvironment, 'sandbox');
  assert.equal(result.collectionMode, 'automatic');
  assert.equal(result.checkoutReference, 'ch_test');
  assert.match(requests[0].url, /sandbox-api\.whop\.com\/api\/v1\/checkout_configurations$/);
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.plan_id, 'plan_4JJSQLj5zEKVn');
  assert.equal(body.redirect_url, 'https://wiseresume.app/subscription?billing=pending');
  assert.equal(body.metadata.wiseresume_user_id, 'appwrite_user');
  assert.equal(body.metadata.wiseresume_plan, 'pro');
  assert.equal(body.allow_promo_codes, true);

  // Test real Whop Sandbox response: initial_price is 0 (no initial fee), renewal_price is 5
  const sandboxZeroInitialProvider = new t.WhopCheckoutProvider({
    env: { WHOP_SANDBOX_API_KEY: 'key', WHOP_SANDBOX_COMPANY_ID: 'biz_test' },
    fetchImpl: async () => ({
      ok: true, status: 200,
      json: async () => ({
        id: 'ch_sandbox_zero_init',
        purchase_url: 'https://sandbox.whop.com/checkout/plan_4JJSQLj5zEKVn',
        plan: {
          id: 'plan_4JJSQLj5zEKVn', product: { id: 'prod_WrbEGZdSaG2af' },
          plan_type: 'renewal', billing_period: 30, initial_price: 0, renewal_price: 5,
        },
      }),
    }),
  });
  const zeroInitResult = await sandboxZeroInitialProvider.createCheckout({
    environment: 'sandbox', plan: 'pro', priceId: 'plan_4JJSQLj5zEKVn',
    productId: 'prod_WrbEGZdSaG2af', appOrigin: 'https://wiseresume.app',
    customData: { app_user_id: 'appwrite_user', checkout_session_reference: 'sess_2' },
  });
  assert.equal(zeroInitResult.checkoutReference, 'ch_sandbox_zero_init');

  // Test mismatching renewal price rejection
  const mismatchRenewalProvider = new t.WhopCheckoutProvider({
    env: { WHOP_SANDBOX_API_KEY: 'key', WHOP_SANDBOX_COMPANY_ID: 'biz_test' },
    fetchImpl: async () => ({
      ok: true, status: 200,
      json: async () => ({
        id: 'ch_mismatch', purchase_url: 'https://sandbox.whop.com/checkout/plan_4JJSQLj5zEKVn',
        plan: {
          id: 'plan_4JJSQLj5zEKVn', product: { id: 'prod_WrbEGZdSaG2af' },
          plan_type: 'renewal', billing_period: 30, initial_price: 0, renewal_price: 99,
        },
      }),
    }),
  });
  await assert.rejects(
    mismatchRenewalProvider.createCheckout({
      environment: 'sandbox', plan: 'pro', priceId: 'plan_4JJSQLj5zEKVn',
      productId: 'prod_WrbEGZdSaG2af', appOrigin: 'https://wiseresume.app',
      customData: { app_user_id: 'appwrite_user', checkout_session_reference: 'sess_3' },
    }),
    err => err.code === 'provider_unavailable'
  );

  console.log('Whop checkout contract tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
