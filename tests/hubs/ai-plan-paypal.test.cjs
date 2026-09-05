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
