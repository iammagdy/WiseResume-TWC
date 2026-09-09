'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  TARGET_HUBS,
  VARIABLE_KEY,
  RESTORE_STATE_FILE,
  captureAndApply,
  restore,
} = require('../../scripts/sync_whop_qa_user_variable.cjs');

test('sync_whop_qa_user_variable: captureAndApply updates target hubs and saves restore state', async () => {
  // Clean up any existing state file
  if (fs.existsSync(RESTORE_STATE_FILE)) fs.unlinkSync(RESTORE_STATE_FILE);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'old_qa_user', secret: true }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'old_qa_user', secret: false }],
    'coupons': [], // Variable does not exist initially
  };

  const updatedSecrets = {};
  const createdSecrets = {};

  const mockFunctions = {
    async listVariables(fnId) {
      return { variables: mockDb[fnId] || [] };
    },
    async updateVariable(fnId, varId, key, value, secret) {
      assert.equal(key, VARIABLE_KEY);
      updatedSecrets[fnId] = secret;
      const entry = mockDb[fnId].find(v => v.$id === varId);
      if (entry) {
        entry.value = value;
        entry.secret = secret;
      }
      return entry;
    },
    async createVariable(fnId, id, key, value, secret) {
      assert.equal(key, VARIABLE_KEY);
      createdSecrets[fnId] = secret;
      const entry = { $id: id, key, value, secret };
      mockDb[fnId].push(entry);
      return entry;
    },
    async deleteVariable(fnId, varId) {
      mockDb[fnId] = mockDb[fnId].filter(v => v.$id !== varId);
    },
  };

  const freshUserId = 'fresh_qa_user_123';
  await captureAndApply(mockFunctions, freshUserId);

  assert.equal(fs.existsSync(RESTORE_STATE_FILE), true);
  // Verify secrets preserved on apply
  assert.equal(updatedSecrets['billing-checkout'], true);
  assert.equal(updatedSecrets['ai-gateway'], false);
  assert.equal(createdSecrets['coupons'], false);

  for (const hub of TARGET_HUBS) {
    const active = mockDb[hub].find(v => v.key === VARIABLE_KEY);
    assert.equal(active.value, freshUserId);
  }

  // Now test restore
  await restore(mockFunctions, freshUserId);

  // billing-checkout should be restored to old_qa_user with secret=true
  const bc = mockDb['billing-checkout'].find(v => v.key === VARIABLE_KEY);
  assert.equal(bc.value, 'old_qa_user');
  assert.equal(bc.secret, true);

  // ai-gateway should be restored to old_qa_user with secret=false
  const ag = mockDb['ai-gateway'].find(v => v.key === VARIABLE_KEY);
  assert.equal(ag.value, 'old_qa_user');
  assert.equal(ag.secret, false);

  // coupons should be deleted
  const cp = mockDb['coupons'].find(v => v.key === VARIABLE_KEY);
  assert.equal(cp, undefined);

  assert.equal(fs.existsSync(RESTORE_STATE_FILE), false);
});
