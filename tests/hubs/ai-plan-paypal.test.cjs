'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const getEffectivePlan = aiGateway.__test.getEffectivePlan;
const QA_USER_ID = 'user_qa_123';
const OTHER_USER_ID = 'user_other_999';

test('AI gateway resolves active PayPal Pro state for QA user under isolated PAYPAL_ACCESS_ENVIRONMENT=sandbox', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const origRcEnv = process.env.BILLING_ACCESS_ENVIRONMENT;
  const origQa = process.env.BILLING_CHECKOUT_QA_USER_ID;

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'sandbox';
  delete process.env.BILLING_ACCESS_ENVIRONMENT; // RC remains unconfigured/production
  process.env.BILLING_CHECKOUT_QA_USER_ID = QA_USER_ID;

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: QA_USER_ID, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: QA_USER_ID,
              plan: 'pro',
              plan_id: 'P-62G07996SG1490118NKN6I3Q',
              environment: 'sandbox',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, QA_USER_ID);
    assert.equal(plan, 'pro');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
    process.env.BILLING_ACCESS_ENVIRONMENT = origRcEnv;
    process.env.BILLING_CHECKOUT_QA_USER_ID = origQa;
  }
});

test('AI gateway resolves active PayPal Premium state for QA user under isolated PAYPAL_ACCESS_ENVIRONMENT=sandbox', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const origRcEnv = process.env.BILLING_ACCESS_ENVIRONMENT;
  const origQa = process.env.BILLING_CHECKOUT_QA_USER_ID;

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'sandbox';
  delete process.env.BILLING_ACCESS_ENVIRONMENT;
  process.env.BILLING_CHECKOUT_QA_USER_ID = QA_USER_ID;

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: QA_USER_ID, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: QA_USER_ID,
              plan: 'premium',
              plan_id: 'P-17M39010JR353545NNKM36RA',
              environment: 'sandbox',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, QA_USER_ID);
    assert.equal(plan, 'premium');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
    process.env.BILLING_ACCESS_ENVIRONMENT = origRcEnv;
    process.env.BILLING_CHECKOUT_QA_USER_ID = origQa;
  }
});

test('AI gateway ignores Sandbox PayPal state for non-QA user and preserves Free fallback', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const origQa = process.env.BILLING_CHECKOUT_QA_USER_ID;

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'sandbox';
  process.env.BILLING_CHECKOUT_QA_USER_ID = QA_USER_ID;

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: OTHER_USER_ID, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: OTHER_USER_ID,
              plan: 'premium',
              plan_id: 'P-17M39010JR353545NNKM36RA',
              environment: 'sandbox',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, OTHER_USER_ID);
    assert.equal(plan, 'free');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
    process.env.BILLING_CHECKOUT_QA_USER_ID = origQa;
  }
});

test('Phase I - 12, 13, 16: AI gateway resolves valid Production Pro for normal user to 50 credits/day', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const origQa = process.env.BILLING_CHECKOUT_QA_USER_ID;
  const normalUserId = 'user_normal_prod_456';

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'production';
  delete process.env.BILLING_CHECKOUT_QA_USER_ID;

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: normalUserId, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: normalUserId,
              plan: 'pro',
              plan_id: 'P-PROD-PRO-ID',
              environment: 'production',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, normalUserId);
    assert.equal(plan, 'pro');

    const dailyLimit = aiGateway.__test.PLAN_DAILY_LIMITS[plan];
    assert.equal(dailyLimit, 50, 'Pro daily AI allowance must be exactly 50 credits/day');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
    if (origQa !== undefined) process.env.BILLING_CHECKOUT_QA_USER_ID = origQa;
  }
});

test('Phase I - 17: AI gateway resolves valid Production Ultimate/premium for normal user to unlimited', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const origQa = process.env.BILLING_CHECKOUT_QA_USER_ID;
  const normalUserId = 'user_normal_prod_789';

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'production';
  delete process.env.BILLING_CHECKOUT_QA_USER_ID;

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: normalUserId, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: normalUserId,
              plan: 'premium',
              plan_id: 'P-PROD-PREM-ID',
              environment: 'production',
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, normalUserId);
    assert.equal(plan, 'premium');

    const dailyLimit = aiGateway.__test.PLAN_DAILY_LIMITS[plan];
    assert.equal(dailyLimit, -1, 'Premium daily AI allowance must be unlimited (-1)');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
    if (origQa !== undefined) process.env.BILLING_CHECKOUT_QA_USER_ID = origQa;
  }
});

test('Phase I - 14: Sandbox state is rejected while configured environment=production', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const normalUserId = 'user_test_env_mismatch_1';

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'production';

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: normalUserId, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: normalUserId,
              plan: 'pro',
              environment: 'sandbox', // sandbox state in production environment!
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, normalUserId);
    assert.equal(plan, 'free', 'Sandbox state must be rejected when PAYPAL_ACCESS_ENVIRONMENT is production');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
  }
});

test('Phase I - 15: Production state is rejected while configured environment=sandbox', async () => {
  const origPaypalEnv = process.env.PAYPAL_ACCESS_ENVIRONMENT;
  const normalUserId = 'user_test_env_mismatch_2';

  process.env.PAYPAL_ACCESS_ENVIRONMENT = 'sandbox';

  try {
    const db = {
      async listDocuments(_dbId, collectionId) {
        if (collectionId === 'subscriptions') {
          return { documents: [{ user_id: normalUserId, plan: 'free' }] };
        }
        if (collectionId === 'revenuecat_subscription_state') {
          return { documents: [] };
        }
        if (collectionId === 'paypal_subscription_state') {
          return {
            documents: [{
              user_id: normalUserId,
              plan: 'pro',
              environment: 'production', // production state in sandbox environment!
              status: 'active',
              expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
          };
        }
        return { documents: [] };
      },
    };

    const plan = await getEffectivePlan(db, normalUserId);
    assert.equal(plan, 'free', 'Production state must be rejected when PAYPAL_ACCESS_ENVIRONMENT is sandbox');
  } finally {
    process.env.PAYPAL_ACCESS_ENVIRONMENT = origPaypalEnv;
  }
});
