'use strict';

const assert = require('assert');
const crypto = require('crypto');
process.env.WHOP_ACCESS_ENVIRONMENT = 'sandbox';
process.env.WHOP_SANDBOX_COMPANY_ID = 'biz_test_sandbox';
process.env.WHOP_SANDBOX_PRODUCT_ID = 'prod_test_sandbox';
process.env.WHOP_SANDBOX_PRO_PLAN_ID = 'plan_test_pro';
process.env.WHOP_SANDBOX_PREMIUM_PLAN_ID = 'plan_test_premium';
const webhook = require('../../appwrite-hubs/whop-webhook/src/main.js');
const { __test: t } = webhook;

function signed(raw, secret, id = 'msg_test', timestamp = Math.floor(Date.now() / 1000)) {
  const encoded = secret.startsWith('whsec_') ? secret.slice(6) : secret.startsWith('ws_') ? secret.slice(3) : secret;
  const key = Buffer.from(encoded, 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

const secret = `whsec_${Buffer.from('test-secret').toString('base64')}`;
const sandboxSecret = `ws_${Buffer.from('sandbox-test-secret').toString('base64')}`;
const raw = JSON.stringify({
  id: 'msg_1', api_version: 'v1', type: 'membership.activated',
  timestamp: new Date().toISOString(), account_id: process.env.WHOP_SANDBOX_COMPANY_ID,
  data: {
    id: 'mem_1', user: { id: 'whop_user' },
    plan: { id: process.env.WHOP_SANDBOX_PRO_PLAN_ID }, product: { id: process.env.WHOP_SANDBOX_PRODUCT_ID },
    renewal_period_end: new Date(Date.now() + 86400000).toISOString(),
    cancel_at_period_end: false,
    metadata: { wiseresume_user_id: 'appwrite_user', checkout_reference: 'sess_1' },
  },
});

assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1') }, secret), true);
assert.equal(t.verifySignature(raw, { headers: signed(raw, sandboxSecret, 'msg_1') }, sandboxSecret), true);
assert.equal(t.verifySignature(`${raw}x`, { headers: signed(raw, secret, 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1', 1) }, secret), false);
assert.equal(t.verifySignature(raw, { headers: {} }, secret), false);

const event = t.eventData(JSON.parse(raw), 'msg_1');
assert.equal(t.validateEvent(event), null);
assert.equal(t.statePatch(event, Date.now(), null).plan, 'pro');
assert.equal(t.validateEvent({ ...event, planId: 'plan_unknown' }), 'unknown_product_or_plan');
assert.equal(t.validateEvent({ ...event, companyId: 'biz_wrong' }), 'company_mismatch');

console.log('Whop webhook contract tests passed.');
