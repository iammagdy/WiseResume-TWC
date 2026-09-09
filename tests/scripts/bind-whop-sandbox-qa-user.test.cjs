'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('bind script constants and export verification', () => {
  const bindScript = require('../../scripts/bind-whop-sandbox-qa-user.cjs');
  assert.equal(typeof bindScript.main, 'function');
  assert.equal(bindScript.DEFAULT_TARGET_EMAIL, 'debeg50114@fidhost.com');
});

test('exact email matching logic: matches debeg50114@fidhost.com and rejects others', () => {
  const targetEmail = 'debeg50114@fidhost.com';
  const users = [
    { $id: 'u1', email: 'debeg50114@fidhost.com' },
    { $id: 'u2', email: 'other@fidhost.com' },
    { $id: 'u3', email: 'debeg50114+alias@fidhost.com' },
  ];

  const matched = users.filter(u => String(u.email || '').trim().toLowerCase() === targetEmail);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].$id, 'u1');
});

test('rejects old canonical QA fixtures', () => {
  const isOldCanonical = (id) => id.startsWith('qa_p') || ['qa_prod_sandbox_user_2026_06_21'].includes(id);
  assert.equal(isOldCanonical('qa_p12345678'), true);
  assert.equal(isOldCanonical('6aa123456789abcdef'), false);
  assert.equal(isOldCanonical('user_manual_debeg'), false);
});

test('resolveEffectivePlan resolves clean user to free', () => {
  const resolver = require('../../appwrite-hubs/shared-subscription-resolver');
  const res = resolver.resolveEffectivePlan({
    userId: 'some_user_id',
    whopProviderState: null,
    whopProviderEnvironment: 'sandbox',
    whopQaUserId: 'some_user_id',
  });
  assert.equal(res.plan, 'free');
  assert.equal(res.source, 'free');
});
