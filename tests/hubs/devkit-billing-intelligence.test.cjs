'use strict';

const assert = require('node:assert/strict');

// Set up isolated test environment for providers before loading module
process.env.WHOP_ACCESS_ENVIRONMENT = 'sandbox';
process.env.WHOP_SANDBOX_QA_USER_ID = 'user-whop-qa';
process.env.WHOP_SANDBOX_PRODUCT_ID = 'prod_sandbox';
process.env.WHOP_SANDBOX_PRO_PLAN_ID = 'plan_sandbox_pro';
process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID = 'plan_sandbox_premium';

process.env.PAYPAL_ACCESS_ENVIRONMENT = 'sandbox';
process.env.BILLING_CHECKOUT_QA_USER_ID = 'user-paypal-qa';
process.env.BILLING_ACCESS_ENVIRONMENT = 'production';

const {
  PLAN_LABELS,
  buildPlanCandidates,
  resolveUserPlanDetails,
  classifyUserAccess,
  buildBillingExplanation,
  buildBillingTimeline,
} = require('../../appwrite-hubs/admin-devkit-data/src/main.js')._test;

const futureExpiry = new Date(Date.now() + 30 * 86400000).toISOString();
const pastExpiry = new Date(Date.now() - 30 * 86400000).toISOString();

// ── Test 1: Plan Labels ───────────────────────────────────────────────────────
assert.equal(PLAN_LABELS.premium, 'Ultimate', 'premium internal key must display as Ultimate');
assert.equal(PLAN_LABELS.pro, 'Pro', 'pro internal key must display as Pro');
assert.equal(PLAN_LABELS.free, 'Free', 'free internal key must display as Free');

// ── Test 2: Pure Free User ───────────────────────────────────────────────────
{
  const { resolution } = resolveUserPlanDetails({
    subscription: null,
    providerState: null,
    whopProviderState: null,
    paypalProviderState: null,
    userId: 'user-free-1',
  });
  assert.equal(resolution.plan, 'free');
  assert.equal(resolution.rank, 0);
  assert.equal(PLAN_LABELS[resolution.plan], 'Free');
  const classification = classifyUserAccess({
    subscription: null,
    whopState: null,
    paypalState: null,
    rcState: null,
    effective: resolution,
  });
  assert.equal(classification, 'FREE');
}

// ── Test 3: Stored Free + Active Whop Sandbox Pro Subscription ────────────────
{
  const whopState = {
    user_id: 'user-whop-qa',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    membership_id: 'mem_12345678',
    product_id: 'prod_sandbox',
    plan_id: 'plan_sandbox_pro',
    expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: { plan: 'free' },
    providerState: null,
    whopProviderState: whopState,
    paypalProviderState: null,
    userId: 'user-whop-qa',
  });
  assert.equal(resolution.plan, 'pro');
  assert.equal(resolution.rank, 1);
  assert.equal(resolution.source, 'whop');
  const classification = classifyUserAccess({
    subscription: { plan: 'free' },
    whopState,
    paypalState: null,
    rcState: null,
    effective: resolution,
  });
  assert.equal(classification, 'PAID_PROVIDER');
}

// ── Test 4: Inactive / Terminated Whop Subscription Falls Back ────────────────
{
  const whopState = {
    user_id: 'user-whop-qa',
    plan: 'pro',
    status: 'terminated',
    environment: 'sandbox',
    membership_id: 'mem_12345678',
    product_id: 'prod_sandbox',
    plan_id: 'plan_sandbox_pro',
    expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: { plan: 'free' },
    whopProviderState: whopState,
    userId: 'user-whop-qa',
  });
  assert.equal(resolution.plan, 'free');
}

// ── Test 5: Active PayPal Pro Subscription ───────────────────────────────────
{
  const paypalState = {
    user_id: 'user-paypal-qa',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    subscription_id: 'I-SUB12345',
    expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: { plan: 'free' },
    paypalProviderState: paypalState,
    userId: 'user-paypal-qa',
  });
  assert.equal(resolution.plan, 'pro');
  assert.equal(resolution.source, 'paypal');
  const classification = classifyUserAccess({
    subscription: { plan: 'free' },
    paypalState,
    effective: resolution,
  });
  assert.equal(classification, 'PAID_PROVIDER');
}

// ── Test 6: Inactive / Cancelled PayPal Subscription Falls Back ───────────────
{
  const paypalState = {
    user_id: 'user-paypal-qa',
    plan: 'pro',
    status: 'canceled',
    environment: 'sandbox',
    subscription_id: 'I-SUB12345',
    expires_at: pastExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: null,
    paypalProviderState: paypalState,
    userId: 'user-paypal-qa',
  });
  assert.equal(resolution.plan, 'free');
}

// ── Test 7: Active RevenueCat Legacy Entitlement ──────────────────────────────
{
  const rcState = {
    plan: 'pro',
    status: 'active',
    environment: 'production',
    expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: { plan: 'free' },
    providerState: rcState,
    userId: 'user-rc-1',
  });
  assert.equal(resolution.plan, 'pro');
  assert.equal(resolution.source, 'revenuecat');
  const classification = classifyUserAccess({
    subscription: { plan: 'free' },
    rcState,
    effective: resolution,
  });
  assert.equal(classification, 'LEGACY_PROVIDER');
}

// ── Test 8: Active Admin Ultimate Grant with No Provider ──────────────────────
{
  const subscription = { plan: 'premium' };
  const { resolution } = resolveUserPlanDetails({
    subscription,
    userId: 'user-admin-grant',
  });
  assert.equal(resolution.plan, 'premium');
  assert.equal(PLAN_LABELS[resolution.plan], 'Ultimate');
  assert.equal(resolution.source, 'manual/admin');
  const classification = classifyUserAccess({
    subscription,
    effective: resolution,
  });
  assert.equal(classification, 'MANUAL_ADMIN');
}

// ── Test 9: Active Whop Pro + Active Admin Ultimate Grant ───────────────────
{
  const subscription = { plan: 'premium' };
  const whopState = {
    user_id: 'user-whop-qa',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    membership_id: 'mem_123',
    product_id: 'prod_sandbox',
    plan_id: 'plan_sandbox_pro',
    expires_at: futureExpiry,
  };
  const { resolution, candidates } = resolveUserPlanDetails({
    subscription,
    whopProviderState: whopState,
    userId: 'user-whop-qa',
  });
  assert.equal(resolution.plan, 'premium');
  assert.equal(resolution.source, 'manual/admin');
  assert.ok(candidates.length >= 2);
  const classification = classifyUserAccess({
    subscription,
    whopState,
    effective: resolution,
  });
  assert.equal(classification, 'MANUAL_PLUS_PAID_PROVIDER');
}

// ── Test 10: Active Trial Takes Precedence Over Free ──────────────────────────
{
  const subscription = {
    plan: 'free',
    trial_plan: 'premium',
    trial_expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription,
    userId: 'user-trial-1',
  });
  assert.equal(resolution.plan, 'premium');
  assert.equal(resolution.source, 'active trial');
  const classification = classifyUserAccess({
    subscription,
    effective: resolution,
  });
  assert.equal(classification, 'TRIAL');
}

// ── Test 11: Expired Trial Reverts to Base or Provider ───────────────────────
{
  const subscription = {
    plan: 'free',
    trial_plan: 'premium',
    trial_expires_at: pastExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription,
    userId: 'user-trial-expired',
  });
  assert.equal(resolution.plan, 'free');
}

// ── Test 12: Multiple Active Providers - Highest Rank Wins ────────────────────
{
  const whopState = {
    user_id: 'user-whop-qa',
    plan: 'pro',
    status: 'active',
    environment: 'sandbox',
    membership_id: 'mem_123',
    product_id: 'prod_sandbox',
    plan_id: 'plan_sandbox_pro',
    expires_at: futureExpiry,
  };
  const paypalState = {
    user_id: 'user-whop-qa',
    plan: 'premium',
    status: 'active',
    environment: 'sandbox',
    subscription_id: 'I-SUB123',
    expires_at: futureExpiry,
  };
  const { resolution } = resolveUserPlanDetails({
    subscription: { plan: 'free' },
    whopProviderState: whopState,
    paypalProviderState: paypalState,
    userId: 'user-whop-qa',
    qaUserId: 'user-whop-qa',
  });
  assert.equal(resolution.plan, 'premium');
  assert.equal(resolution.source, 'paypal');
  const classification = classifyUserAccess({
    subscription: { plan: 'free' },
    whopState,
    paypalState,
    effective: resolution,
  });
  assert.equal(classification, 'MULTIPLE_PROVIDER_SOURCES');
}

// ── Test 13: Promotional Coupon Access ───────────────────────────────────────
{
  const subscription = { plan: 'premium', coupon_code: 'SPECIAL2026' };
  const { resolution } = resolveUserPlanDetails({
    subscription,
    userId: 'user-coupon-1',
  });
  assert.equal(resolution.plan, 'premium');
  assert.equal(resolution.source, 'coupon');
  const classification = classifyUserAccess({
    subscription,
    effective: resolution,
  });
  assert.equal(classification, 'COUPON');
}

// ── Test 14: Billing Explanation Construction ────────────────────────────────
{
  const subscription = { plan: 'premium' };
  const whopState = { plan: 'pro', status: 'active', environment: 'sandbox' };
  const { resolution, candidates } = resolveUserPlanDetails({
    subscription,
    whopProviderState: whopState,
    userId: 'user-expl-1',
  });
  const explanation = buildBillingExplanation({
    effective: resolution,
    candidates,
    subscription,
    whopState,
  });
  assert.ok(typeof explanation === 'string');
  assert.ok(explanation.length > 10);
  assert.ok(explanation.includes('Ultimate') || explanation.includes('admin') || explanation.includes('Whop'));
}

// ── Test 15: Billing Explanation for Pure Free ────────────────────────────────
{
  const { resolution, candidates } = resolveUserPlanDetails({
    subscription: null,
    userId: 'user-expl-free',
  });
  const explanation = buildBillingExplanation({
    effective: resolution,
    candidates,
  });
  assert.ok(explanation.includes('free tier') || explanation.includes('Free'));
}

// ── Test 16: Billing Timeline Construction ───────────────────────────────────
{
  const checkouts = [
    {
      $createdAt: '2026-09-08T10:00:00.000Z',
      provider: 'whop',
      status: 'completed',
      plan: 'pro',
      checkout_id: 'chk_1234567890',
    },
  ];
  const whopLedger = [
    {
      $createdAt: '2026-09-08T10:05:00.000Z',
      event_type: 'membership.went_valid',
      plan: 'pro',
      membership_id: 'mem_abcdef123456',
    },
  ];
  const paypalLedger = [
    {
      $createdAt: '2026-08-01T12:00:00.000Z',
      event_type: 'BILLING.SUBSCRIPTION.CREATED',
      plan: 'pro',
      subscription_id: 'I-PP123456789',
    },
  ];
  const subscription = {
    $createdAt: '2026-07-01T08:00:00.000Z',
    plan: 'free',
  };

  const timeline = buildBillingTimeline({
    checkouts,
    whopLedger,
    paypalLedger,
    subscription,
  });

  assert.ok(Array.isArray(timeline));
  assert.ok(timeline.length >= 3);
  for (let i = 0; i < timeline.length - 1; i++) {
    assert.ok(new Date(timeline[i].timestamp) >= new Date(timeline[i + 1].timestamp));
  }
}

// ── Test 17: Candidate Ranks and Winning Resolution ─────────────────────────
{
  const { resolution, candidates } = resolveUserPlanDetails({
    subscription: { plan: 'premium', trial_plan: 'pro', trial_expires_at: futureExpiry },
    userId: 'test-ranks',
  });
  assert.ok(candidates.length >= 2);
  const maxRank = Math.max(...candidates.map(c => c.rank));
  assert.equal(resolution.rank, maxRank);
  assert.equal(resolution.plan, 'premium');
}

// ── Test 18: Masking in Timeline Entries ─────────────────────────────────────
{
  const timeline = buildBillingTimeline({
    checkouts: [{ $createdAt: '2026-09-08T10:00:00.000Z', checkout_id: 'chk_sensitive_12345' }],
    whopLedger: [{ $createdAt: '2026-09-08T10:01:00.000Z', membership_id: 'mem_super_secret_9999' }],
  });
  for (const item of timeline) {
    if (item.reference_id) {
      assert.ok(!item.reference_id.includes('sensitive_12345'));
      assert.ok(item.reference_id.includes('***'));
    }
  }
}

console.log('✓ DevKit Billing Intelligence contract tests (all 18 scenarios) passed OK');