'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.WHOP_SANDBOX_PRODUCT_ID = 'prod_WrbEGZdSaG2af';
process.env.WHOP_SANDBOX_PRO_PLAN_ID = 'plan_4JJSQLj5zEKVn';
process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID = 'plan_kt5MScAplbCuN';
process.env.WHOP_SANDBOX_QA_USER_ID = 'qa_user_1';

const coupons = require('../../appwrite-hubs/coupons/src/main.js');
const { getMySubscription } = coupons.__test;

function createMockRes() {
  let responseData = null;
  let responseStatus = null;
  return {
    json(payload, status = 200) {
      responseData = payload;
      responseStatus = status;
      return { status, data: payload };
    },
    get result() {
      return { status: responseStatus, payload: responseData };
    },
  };
}

test('coupons getMySubscription - returns 401 when user is not authenticated', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, { user: null });
  assert.equal(res.result.status, 401);
  assert.equal(res.result.payload.status, 'error');
  assert.equal(res.result.payload.message, 'Not authenticated.');
});

test('coupons getMySubscription - free user without subscriptions or providers', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'user_free' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.plan, 'free');
  assert.equal(data.effective_plan, 'free');
  assert.equal(data.status, null);
  assert.equal(data.expires_at, null);
  assert.equal(data.provider_source, null);
  assert.equal(data.provider_status, null);
  assert.equal(data.provider_expires_at, null);
  assert.equal(data.can_cancel_subscription, false);
  assert.equal(data.will_renew, null);
  // user_free is not QA user in Sandbox -> can_subscribe is false
  assert.equal(data.can_subscribe, false);
});

test('coupons getMySubscription - QA user in sandbox with checkout enabled', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_subscribe, true);
});

test('coupons getMySubscription - Whop state exposes cancellation and checkout readiness', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: null,
      whopProviderState: {
        user_id: 'qa_user_1',
        membership_id: 'mem_1',
        product_id: 'prod_WrbEGZdSaG2af',
        plan_id: 'plan_4JJSQLj5zEKVn',
        plan: 'pro',
        environment: 'sandbox',
        status: 'active',
        expires_at: '2099-01-01T00:00:00.000Z',
        will_renew: true,
      },
    },
    providerEnvironment: 'sandbox',
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'whop',
    checkoutProviderReady: true,
  });

  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.effective_plan, 'pro');
  assert.equal(res.result.payload.data.provider_source, 'whop');
  assert.equal(res.result.payload.data.can_cancel_subscription, true);
  assert.equal(res.result.payload.data.can_subscribe, true);
});

test('coupons getMySubscription - checkout disabled by configuration', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: false,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_subscribe, false);
});

test('coupons getMySubscription - active PayPal Pro subscriber with will_renew=true', async () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'active',
        expires_at: futureDate,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.effective_plan, 'pro');
  assert.equal(data.status, 'active');
  assert.equal(data.provider_source, 'paypal');
  assert.equal(data.provider_status, 'active');
  assert.equal(data.provider_expires_at, futureDate);
  assert.equal(data.expires_at, futureDate);
  assert.equal(data.can_cancel_subscription, true);
  assert.equal(data.will_renew, true);
  assert.equal(data.can_subscribe, true); // can upgrade to ultimate
});

test('coupons getMySubscription - renewal failure billing_issue with valid grace and will_renew=true allows cancel', async () => {
  const graceDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'billing_issue',
        expires_at: graceDate,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_cancel_subscription, true);
  assert.equal(data.will_renew, true);
  assert.equal(data.provider_status, 'billing_issue');
});

test('coupons getMySubscription - initial payment failure (will_renew=false) blocks cancel', async () => {
  const graceDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'billing_issue',
        expires_at: graceDate,
        will_renew: false, // initial failure has will_renew=false
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_cancel_subscription, false);
  assert.equal(data.will_renew, false);
});

test('coupons getMySubscription - CANCELLED terminal event during grace (will_renew=false) blocks cancel', async () => {
  const graceDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'billing_issue',
        expires_at: graceDate,
        will_renew: false,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_cancel_subscription, false);
});

test('coupons getMySubscription - canceled PayPal subscriber paid-through', async () => {
  const futureDate = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'canceled',
        expires_at: futureDate,
        will_renew: false,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.effective_plan, 'pro');
  assert.equal(data.status, 'canceled');
  assert.equal(data.provider_status, 'canceled');
  assert.equal(data.provider_expires_at, futureDate);
  assert.equal(data.can_cancel_subscription, false); // already canceled
  assert.equal(data.will_renew, false);
});

test('coupons getMySubscription - mixed sources: coupon effective but PayPal subscription exists', async () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: {
      plan: 'premium',
      coupon_code: 'VIP100',
    },
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'active',
        expires_at: futureDate,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  // Effective plan resolves to premium via coupon
  assert.equal(data.effective_plan, 'premium');
  // can_cancel_subscription is independent of effective source: PayPal exists and is cancellable!
  assert.equal(data.can_cancel_subscription, true);
  assert.equal(data.provider_source, 'paypal');
  assert.equal(data.provider_expires_at, futureDate);
  assert.equal(data.will_renew, true);
  // Already premium -> cannot subscribe further
  assert.equal(data.can_subscribe, false);
});

test('coupons getMySubscription - missing provider expiry results in null (no date fabrication)', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'active',
        expires_at: null,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.provider_expires_at, null);
  assert.equal(data.expires_at, null);
});

test('coupons getMySubscription - environment mismatch invalidates PayPal candidate', async () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'production', // Mismatched environment
        status: 'active',
        expires_at: futureDate,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.can_cancel_subscription, false);
  assert.equal(data.provider_source, null);
  assert.equal(data.effective_plan, 'free');
});

// ==============================================================================
// can_subscribe Runtime Readiness Permutation Tests
// ==============================================================================

test('can_subscribe permutation 1: checkoutEnabled = false -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: false,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 2: checkoutProvider missing/empty -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: '',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 3: checkoutProvider != paypal (e.g. paddle) -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paddle',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 4: checkoutProviderReady = false -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: false,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 5: paypalEnvironment invalid (e.g. staging or missing) -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'staging',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);

  const res2 = createMockRes();
  await getMySubscription({}, res2, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: '',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res2.result.status, 200);
  assert.equal(res2.result.payload.data.can_subscribe, false);
});

test('can_subscribe: production environment enables subscribe for normal free user without QA user requirement', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'regular_prod_user_456' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'production',
    qaUserId: '',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, true);
});

test('can_subscribe permutation 6: qaUserId missing/empty -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: '',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 7: user does not match qaUserId -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'other_user_2' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('can_subscribe permutation 8: correct fully ready QA user with free plan -> true', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, true);
});

test('can_subscribe permutation 9: Ultimate (premium) plan cannot subscribe/upgrade further -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: { plan: 'premium' },
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.effective_plan, 'premium');
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('coupons getMySubscription - surfaces renewal_cancellation_pending true when active in paypalProviderState', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'active',
        expires_at: null,
        will_renew: false,
        renewal_cancellation_pending: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.renewal_cancellation_pending, true);
});

test('coupons getMySubscription - renewal_cancellation_pending is false when false or environment mismatched', async () => {
  const res1 = createMockRes();
  await getMySubscription({}, res1, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'sandbox',
        status: 'active',
        expires_at: null,
        will_renew: false,
        renewal_cancellation_pending: false,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });
  assert.equal(res1.result.status, 200);
  assert.equal(res1.result.payload.data.renewal_cancellation_pending, false);

  const res2 = createMockRes();
  await getMySubscription({}, res2, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'qa_user_1',
        plan: 'pro',
        subscription_id: 'I-PRO12345',
        environment: 'production',
        status: 'active',
        expires_at: null,
        will_renew: false,
        renewal_cancellation_pending: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
  });
  assert.equal(res2.result.status, 200);
  assert.equal(res2.result.payload.data.renewal_cancellation_pending, false);
});

// ==============================================================================
// Section 11: Whop Sandbox QA Enrollment Gate Test Suite
// ==============================================================================

test('Section 11 Test A1: configured WHOP_SANDBOX_QA_USER_ID + Whop Sandbox ready + Free user (default call) -> can_subscribe = true', async () => {
  const res = createMockRes();
  // Simulates live production environment where BILLING_CHECKOUT_PROVIDER is 'paypal',
  // but the user matches WHOP_SANDBOX_QA_USER_ID and Whop Sandbox catalog is configured.
  const originalBcp = process.env.BILLING_CHECKOUT_PROVIDER;
  process.env.BILLING_CHECKOUT_PROVIDER = 'paypal';
  try {
    await getMySubscription({}, res, {
      user: { $id: 'qa_user_1' },
      subscription: null,
      providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
      whopProviderEnvironment: 'sandbox',
      checkoutEnabled: true,
      checkoutProviderReady: true,
    });
    assert.equal(res.result.status, 200);
    const data = res.result.payload.data;
    assert.equal(data.plan, 'free');
    assert.equal(data.effective_plan, 'free');
    assert.equal(data.can_subscribe, true);
  } finally {
    if (originalBcp !== undefined) process.env.BILLING_CHECKOUT_PROVIDER = originalBcp;
    else delete process.env.BILLING_CHECKOUT_PROVIDER;
  }
});

test('Section 11 Test A2: configured WHOP_SANDBOX_QA_USER_ID + explicit checkoutProvider=whop -> can_subscribe = true', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
    whopProviderEnvironment: 'sandbox',
    checkoutEnabled: true,
    checkoutProvider: 'whop',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, true);
});

test('Section 11 Test B: different production user with Whop Production disabled -> can_subscribe = false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'prod_regular_user_999' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
    whopProviderEnvironment: 'sandbox',
    checkoutEnabled: true,
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.plan, 'free');
  assert.equal(data.effective_plan, 'free');
  assert.equal(data.can_subscribe, false);
});

test('Section 11 Test C1: configured QA user but provider not ready -> can_subscribe = false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
    whopProviderEnvironment: 'sandbox',
    checkoutEnabled: true,
    checkoutProviderReady: false,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('Section 11 Test C2: configured QA user but checkout disabled -> can_subscribe = false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
    whopProviderEnvironment: 'sandbox',
    checkoutEnabled: false,
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('Section 11 Test C3: configured QA user but catalog missing product ID -> can_subscribe = false', async () => {
  const savedProdId = process.env.WHOP_SANDBOX_PRODUCT_ID;
  delete process.env.WHOP_SANDBOX_PRODUCT_ID;
  try {
    const res = createMockRes();
    await getMySubscription({}, res, {
      user: { $id: 'qa_user_1' },
      subscription: null,
      providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
      whopProviderEnvironment: 'sandbox',
      checkoutEnabled: true,
      checkoutProviderReady: true,
    });
    assert.equal(res.result.status, 200);
    assert.equal(res.result.payload.data.can_subscribe, false);
  } finally {
    process.env.WHOP_SANDBOX_PRODUCT_ID = savedProdId;
  }
});

test('Section 11 Test D: configured QA user already on premium cannot subscribe further -> can_subscribe = false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: { plan: 'premium' },
    providerStates: { providerState: null, paypalProviderState: null, whopProviderState: null },
    whopProviderEnvironment: 'sandbox',
    checkoutEnabled: true,
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.effective_plan, 'premium');
  assert.equal(res.result.payload.data.can_subscribe, false);
});

test('Section 11 Test E: PayPal alternative availability is preserved', async () => {
  // E1: Sandbox PayPal QA user matches -> can_subscribe = true
  const res1 = createMockRes();
  await getMySubscription({}, res1, {
    user: { $id: 'paypal_qa_user' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'paypal_qa_user',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res1.result.status, 200);
  assert.equal(res1.result.payload.data.can_subscribe, true);

  // E2: Sandbox PayPal other user -> can_subscribe = false
  const res2 = createMockRes();
  await getMySubscription({}, res2, {
    user: { $id: 'other_user' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'sandbox',
    qaUserId: 'paypal_qa_user',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res2.result.status, 200);
  assert.equal(res2.result.payload.data.can_subscribe, false);

  // E3: Production PayPal user -> can_subscribe = true
  const res3 = createMockRes();
  await getMySubscription({}, res3, {
    user: { $id: 'prod_user_any' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'production',
    qaUserId: '',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res3.result.status, 200);
  assert.equal(res3.result.payload.data.can_subscribe, true);
});

test('coupons getMySubscription - regression: effective plan Free guarantees can_cancel_subscription is false', async () => {
  const res = createMockRes();
  const pastDate = new Date(Date.now() - 3600000).toISOString();

  // User with an expired PayPal state where status was active and will_renew was true
  await getMySubscription({}, res, {
    user: { $id: 'user_free_expired_sub' },
    subscription: null,
    providerStates: {
      providerState: null,
      paypalProviderState: {
        user_id: 'user_free_expired_sub',
        subscription_id: 'I-EXPIRED123',
        plan: 'pro',
        status: 'active',
        environment: 'sandbox',
        expires_at: pastDate,
        will_renew: true,
      },
    },
    paypalEnvironment: 'sandbox',
    qaUserId: 'user_free_expired_sub',
    checkoutEnabled: true,
  });

  assert.equal(res.result.status, 200);
  const data = res.result.payload.data;
  assert.equal(data.effective_plan, 'free');
  assert.equal(data.can_cancel_subscription, false);
  assert.equal(data.renewal_cancellation_pending, false);
});
