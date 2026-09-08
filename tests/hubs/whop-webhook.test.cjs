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
  const key = Buffer.from(secret, 'utf8');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

function signedWithKey(raw, key, id = 'msg_test', timestamp = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

const secret = `ws_${'a'.repeat(64)}`;
const wrongSecret = `ws_${'b'.repeat(64)}`;
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
assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1') }, wrongSecret), false);
assert.equal(t.verifySignature(raw, { headers: signedWithKey(raw, Buffer.from(secret.slice(3), 'hex'), 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: signedWithKey(raw, Buffer.from(secret.slice(3), 'base64'), 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: { ...signed(raw, secret, 'msg_1'), 'webhook-signature': `v2,${signed(raw, secret, 'msg_1')['webhook-signature'].slice(3)}` } }, secret), false);
assert.equal(t.verifySignature(raw, { headers: { ...signed(raw, secret, 'msg_1'), 'webhook-signature': `v2,invalid ${signed(raw, secret, 'msg_1')['webhook-signature']}` } }, secret), true);
assert.equal(t.verifySignature(`${raw}x`, { headers: signed(raw, secret, 'msg_1') }, secret), false);
assert.equal(t.verifySignature(JSON.stringify(JSON.parse(raw), null, 2), { headers: signed(raw, secret, 'msg_1') }, secret), false);
assert.equal(t.verifySignature(raw, { headers: signed(raw, secret, 'msg_1', 1) }, secret), false);
assert.equal(t.verifySignature(raw, { headers: {} }, secret), false);

const event = t.eventData(JSON.parse(raw), 'msg_1');
assert.equal(t.validateEvent(event), null);
assert.equal(t.statePatch(event, Date.now(), null).plan, 'pro');
assert.equal(t.validateEvent({ ...event, planId: 'plan_unknown' }), 'unknown_product_or_plan');
assert.equal(t.validateEvent({ ...event, companyId: 'biz_wrong' }), 'company_mismatch');

console.log('Whop webhook contract tests passed.');
