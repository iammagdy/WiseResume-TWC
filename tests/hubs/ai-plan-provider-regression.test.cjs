'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const aiGateway = require('../../appwrite-hubs/ai-gateway/src/main.js');

const getEffectivePlan = aiGateway.__test.getEffectivePlan;

test('AI gateway resolves an active RevenueCat premium state without changing the legacy subscription row', async () => {
  let call = 0;
  const db = {
    async listDocuments() {
      call += 1;
      return call === 1
        ? { documents: [{ user_id: 'user_1', plan: 'free', effective_plan: 'free' }] }
        : { documents: [{ user_id: 'user_1', plan: 'premium', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() }] };
    },
  };
  assert.equal(await getEffectivePlan(db, 'user_1'), 'premium');
});

test('AI gateway preserves Free fallback when provider collection is unavailable or expired', async () => {
  let call = 0;
  const db = {
    async listDocuments() {
      call += 1;
      if (call === 1) return { documents: [{ user_id: 'user_1', plan: 'free', effective_plan: 'free' }] };
      throw new Error('collection unavailable');
    },
  };
  assert.equal(await getEffectivePlan(db, 'user_1'), 'free');

  let expiredCall = 0;
  const expiredDb = {
    async listDocuments() {
      expiredCall += 1;
      return expiredCall === 1
        ? { documents: [{ user_id: 'user_1', plan: 'free' }] }
        : { documents: [{ user_id: 'user_1', plan: 'pro', status: 'expired', expires_at: new Date(Date.now() - 1000).toISOString() }] };
    },
  };
  assert.equal(await getEffectivePlan(expiredDb, 'user_1'), 'free');
});
