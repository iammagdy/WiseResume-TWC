'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

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

test('can_subscribe permutation 5: paypalEnvironment missing or not sandbox -> false', async () => {
  const res = createMockRes();
  await getMySubscription({}, res, {
    user: { $id: 'qa_user_1' },
    subscription: null,
    providerStates: { providerState: null, paypalProviderState: null },
    paypalEnvironment: 'production',
    qaUserId: 'qa_user_1',
    checkoutEnabled: true,
    checkoutProvider: 'paypal',
    checkoutProviderReady: true,
  });
  assert.equal(res.result.status, 200);
  assert.equal(res.result.payload.data.can_subscribe, false);
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
