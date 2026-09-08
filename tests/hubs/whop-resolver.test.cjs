'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const resolver = require('../../appwrite-hubs/shared-subscription-resolver');
process.env.WHOP_ACCESS_ENVIRONMENT = 'sandbox';
process.env.WHOP_SANDBOX_QA_USER_ID = 'user_1';
process.env.WHOP_SANDBOX_PRODUCT_ID = 'prod_sandbox';
process.env.WHOP_SANDBOX_PRO_PLAN_ID = 'plan_sandbox_pro';
process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID = 'plan_sandbox_premium';

test('Whop authoritative state resolves to Pro and preserves provider ranking', () => {
  const result = resolver.resolveEffectivePlan({
    providerEnvironment: 'sandbox',
    userId: 'user_1',
    nowMs: Date.parse('2026-09-08T00:00:00.000Z'),
    subscription: { plan: 'free' },
    whopProviderState: {
      user_id: 'user_1',
      product_id: 'prod_sandbox',
      plan_id: 'plan_sandbox_pro',
      membership_id: 'mem_sandbox_1',
      plan: 'pro',
      status: 'active',
      environment: 'sandbox',
      expires_at: '2026-10-08T00:00:00.000Z',
    },
    paypalProviderState: {
      plan: 'premium',
      status: 'active',
      environment: 'production',
      expires_at: '2026-10-08T00:00:00.000Z',
    },
  });

  assert.equal(result.plan, 'pro');
  assert.equal(result.source, 'whop');
});

test('Whop expired, unknown-plan, and wrong-environment state fails closed', () => {
  const base = {
    providerEnvironment: 'sandbox',
    nowMs: Date.parse('2026-09-08T00:00:00.000Z'),
    subscription: { plan: 'free' },
  };
  for (const state of [
    { user_id: 'user_1', membership_id: 'mem_1', product_id: 'prod_sandbox', plan_id: 'plan_sandbox_pro', plan: 'pro', status: 'active', environment: 'sandbox', expires_at: '2026-08-01T00:00:00.000Z' },
    { user_id: 'user_1', membership_id: 'mem_1', product_id: 'prod_sandbox', plan_id: 'plan_unknown', plan: 'gold', status: 'active', environment: 'sandbox', expires_at: '2026-10-08T00:00:00.000Z' },
    { user_id: 'user_1', membership_id: 'mem_1', product_id: 'prod_sandbox', plan_id: 'plan_sandbox_premium', plan: 'premium', status: 'active', environment: 'production', expires_at: '2026-10-08T00:00:00.000Z' },
  ]) {
    assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: state }).plan, 'free');
  }
});

const validWhopState = {
  user_id: 'user_1', membership_id: 'mem_2', product_id: 'prod_sandbox', plan_id: 'plan_sandbox_pro',
  plan: 'pro', status: 'active', environment: 'sandbox', expires_at: '2026-10-08T00:00:00.000Z',
};

test('Whop Sandbox requires canonical QA ownership and complete catalog identity', () => {
  const base = { providerEnvironment: 'sandbox', userId: 'user_1', nowMs: Date.parse('2026-09-08T00:00:00.000Z'), subscription: { plan: 'free' } };
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: validWhopState }).plan, 'pro');
  assert.equal(resolver.resolveEffectivePlan({ ...base, userId: 'user_other', whopProviderState: validWhopState }).plan, 'free');
  const savedQaUser = process.env.WHOP_SANDBOX_QA_USER_ID;
  delete process.env.WHOP_SANDBOX_QA_USER_ID;
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: validWhopState }).plan, 'free');
  process.env.WHOP_SANDBOX_QA_USER_ID = savedQaUser;
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderEnvironment: 'production', whopProviderState: validWhopState }).plan, 'free');
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: { ...validWhopState, product_id: 'prod_wrong' } }).plan, 'free');
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: { ...validWhopState, plan_id: 'plan_wrong' } }).plan, 'free');
  assert.equal(resolver.resolveEffectivePlan({ ...base, whopProviderState: { ...validWhopState, user_id: '' } }).plan, 'free');
});
