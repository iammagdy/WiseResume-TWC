'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  resolveEffectivePlan,
  buildPlanCandidates,
  normalizePlan,
  configuredPaypalProviderEnvironment,
  PLAN_RANK,
} = require('../../appwrite-hubs/shared-subscription-resolver');

const QA_USER_ID = 'user_qa_123';
const OTHER_USER_ID = 'user_other_999';
const nowMs = Date.parse('2026-09-03T12:00:00.000Z');
const futureExpiry = new Date(nowMs + 30 * 86400000).toISOString();
const pastExpiry = new Date(nowMs - 1000).toISOString();
const graceExpiry = new Date(nowMs + 48 * 3600000).toISOString();

// Verified Live Sandbox Plan IDs
const SANDBOX_PRO_PLAN_ID = 'P-3A193536YV1432359NKM36QY';
const SANDBOX_ULTIMATE_PLAN_ID = 'P-17M39010JR353545NNKM36RA';

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
