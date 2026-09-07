'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PAYPAL_LIVE_API_BASE,
  CANONICAL_WEBHOOK_URL,
  REQUIRED_WEBHOOK_EVENTS,
  parsePlanAmount,
  bootstrapPaypalLive,
} = require('../../scripts/bootstrap_paypal_live.cjs');

test('bootstrap-paypal-live targets official PayPal Live API host', () => {
  assert.equal(PAYPAL_LIVE_API_BASE, 'https://api-m.paypal.com');
});

test('bootstrap-paypal-live uses canonical root webhook URL and not /v1/webhook', () => {
  assert.equal(CANONICAL_WEBHOOK_URL, 'https://paypal-webhook.wiseresume.app');
  assert.equal(CANONICAL_WEBHOOK_URL.includes('/v1/webhook'), false);
});

test('bootstrap-paypal-live includes exactly the 9 required webhook events', () => {
  assert.equal(REQUIRED_WEBHOOK_EVENTS.length, 9);
  const expectedEvents = [
    'BILLING.SUBSCRIPTION.ACTIVATED',
    'PAYMENT.SALE.COMPLETED',
    'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
    'BILLING.SUBSCRIPTION.SUSPENDED',
    'BILLING.SUBSCRIPTION.CANCELLED',
    'BILLING.SUBSCRIPTION.EXPIRED',
    'BILLING.SUBSCRIPTION.UPDATED',
    'PAYMENT.SALE.REFUNDED',
    'PAYMENT.SALE.REVERSED',
  ];
  for (const event of expectedEvents) {
    assert.equal(REQUIRED_WEBHOOK_EVENTS.includes(event), true, `Missing event: ${event}`);
  }
});

test('parsePlanAmount extracts regular monthly pricing correctly', () => {
  const plan5 = {
    billing_cycles: [
      {
        tenure_type: 'REGULAR',
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        pricing_scheme: { fixed_price: { value: '5.00', currency_code: 'USD' } },
      },
    ],
  };
  assert.deepEqual(parsePlanAmount(plan5), {
    value: 5,
    currency: 'USD',
    isMonthly: true,
  });

  const plan10 = {
    billing_cycles: [
      {
        tenure_type: 'REGULAR',
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        pricing_scheme: { fixed_price: { value: '10.00', currency_code: 'USD' } },
      },
    ],
  };
  assert.deepEqual(parsePlanAmount(plan10), {
    value: 10,
    currency: 'USD',
    isMonthly: true,
  });

  const invalidPlan = { billing_cycles: [] };
  assert.equal(parsePlanAmount(invalidPlan), null);
});

test('bootstrapPaypalLive fails closed when client ID or secret is missing', async () => {
  await assert.rejects(
    () => bootstrapPaypalLive({}),
    /PAYPAL_PRODUCTION_CLIENT_ID and PAYPAL_PRODUCTION_CLIENT_SECRET are required/
  );
  await assert.rejects(
    () => bootstrapPaypalLive({ PAYPAL_PRODUCTION_CLIENT_ID: 'id_only' }),
    /PAYPAL_PRODUCTION_CLIENT_ID and PAYPAL_PRODUCTION_CLIENT_SECRET are required/
  );
});
