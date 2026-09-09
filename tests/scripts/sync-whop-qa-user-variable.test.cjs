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
  audit,
  repair,
} = require('../../scripts/sync_whop_qa_user_variable.cjs');

function getTempStatePath(tag) {
  return path.join(process.cwd(), `.temp_qa_user_test_${tag}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.json`);
}

function cleanFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

function createMockFunctions(mockDb, options = {}) {
  const callLog = [];
  return {
    callLog,
    async listVariables(fnId) {
      callLog.push({ action: 'listVariables', fnId });
      if (options.listErrorOnHub === fnId) {
        throw new Error(`fetch failed on ${fnId}`);
      }
      return { variables: (mockDb[fnId] || []).map(v => ({ ...v })) };
    },
    async updateVariable(fnId, varId, key, value, secret) {
      callLog.push({ action: 'updateVariable', fnId, varId, key, value, secret });
      if (options.updateErrorOnHub === fnId) {
        if (options.failCount && (!options._fails || options._fails < options.failCount)) {
          options._fails = (options._fails || 0) + 1;
          throw new Error(`transient update error on ${fnId} (attempt ${options._fails})`);
        } else if (!options.failCount) {
          throw new Error(`update failed on ${fnId}`);
        }
      }
      const entry = (mockDb[fnId] || []).find(v => v.$id === varId);
      if (entry) {
        entry.value = value;
        entry.secret = secret;
      }
      return entry;
    },
    async createVariable(fnId, id, key, value, secret) {
      callLog.push({ action: 'createVariable', fnId, id, key, value, secret });
      if (options.createErrorOnHub === fnId) {
        throw new Error(`create failed on ${fnId}`);
      }
      const entry = { $id: id, key, value, secret };
      if (!mockDb[fnId]) mockDb[fnId] = [];
      mockDb[fnId].push(entry);
      return entry;
    },
    async deleteVariable(fnId, varId) {
      callLog.push({ action: 'deleteVariable', fnId, varId });
      if (options.deleteErrorOnHub === fnId) {
        throw new Error(`delete failed on ${fnId}`);
      }
      if (mockDb[fnId]) {
        mockDb[fnId] = mockDb[fnId].filter(v => v.$id !== varId);
      }
    },
  };
}

// SCENARIO A: Successful capture -> apply -> restore
test('Scenario A: successful capture -> apply -> restore', async () => {
  const statePath = getTempStatePath('scenario_a');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canonical_qa_user', secret: true }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canonical_qa_user', secret: false }],
    'coupons': [],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_a';

  await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });

  assert.equal(fs.existsSync(statePath), true);
  for (const hub of TARGET_HUBS) {
    const active = mockDb[hub].find(v => v.key === VARIABLE_KEY);
    assert.equal(active.value, freshUserId);
  }

  await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });

  assert.equal(mockDb['billing-checkout'].find(v => v.key === VARIABLE_KEY).value, 'canonical_qa_user');
  assert.equal(mockDb['billing-checkout'].find(v => v.key === VARIABLE_KEY).secret, true);
  assert.equal(mockDb['ai-gateway'].find(v => v.key === VARIABLE_KEY).value, 'canonical_qa_user');
  assert.equal(mockDb['ai-gateway'].find(v => v.key === VARIABLE_KEY).secret, false);
  assert.equal(mockDb['coupons'].find(v => v.key === VARIABLE_KEY), undefined);
  assert.equal(fs.existsSync(statePath), false);

  cleanFile(statePath);
});

// SCENARIO B: Snapshot write fails -> zero Appwrite variable mutations
test('Scenario B: snapshot write fails -> zero Appwrite variable mutations', async () => {
  const invalidPath = path.join(process.cwd(), 'nonexistent_folder_xyz', 'unwritable', 'state.json');

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'pre_val', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'pre_val', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'pre_val', secret: false }],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_b';

  await assert.rejects(
    async () => {
      await captureAndApply(mockFn, freshUserId, { stateFilePath: invalidPath, initialDelayMs: 0 });
    },
    /Failed to persist restore snapshot/
  );

  // Assert ZERO mutations occurred
  const mutations = mockFn.callLog.filter(c => ['updateVariable', 'createVariable', 'deleteVariable'].includes(c.action));
  assert.equal(mutations.length, 0);

  // Values remain completely untouched
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].value, 'pre_val');
  }
});

// SCENARIO C: First hub update succeeds, second hub throws fetch/network error -> first hub automatically restored
test('Scenario C: first hub update succeeds, second hub throws fetch/network error -> first hub automatically restored', async () => {
  const statePath = getTempStatePath('scenario_c');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
  };

  // Fail on ai-gateway update
  const mockFn = createMockFunctions(mockDb, { updateErrorOnHub: 'ai-gateway' });
  const freshUserId = 'fresh_qa_user_scenario_c';

  await assert.rejects(
    async () => {
      await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0, retries: 1 });
    },
    /update failed on ai-gateway/
  );

  // billing-checkout must have been rolled back to canonical_qa
  assert.equal(mockDb['billing-checkout'][0].value, 'canonical_qa');
  // ai-gateway and coupons must still have original canonical_qa
  assert.equal(mockDb['ai-gateway'][0].value, 'canonical_qa');
  assert.equal(mockDb['coupons'][0].value, 'canonical_qa');

  cleanFile(statePath);
});

// SCENARIO D: First two updates succeed, third fails -> both prior hubs restored
test('Scenario D: first two updates succeed, third fails -> both prior hubs restored', async () => {
  const statePath = getTempStatePath('scenario_d');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canonical_qa', secret: true }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
  };

  // Fail on coupons update
  const mockFn = createMockFunctions(mockDb, { updateErrorOnHub: 'coupons' });
  const freshUserId = 'fresh_qa_user_scenario_d';

  await assert.rejects(
    async () => {
      await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0, retries: 1 });
    },
    /update failed on coupons/
  );

  // Both billing-checkout and ai-gateway must have been reverted to canonical_qa
  assert.equal(mockDb['billing-checkout'][0].value, 'canonical_qa');
  assert.equal(mockDb['billing-checkout'][0].secret, true);
  assert.equal(mockDb['ai-gateway'][0].value, 'canonical_qa');
  assert.equal(mockDb['ai-gateway'][0].secret, false);
  assert.equal(mockDb['coupons'][0].value, 'canonical_qa');

  cleanFile(statePath);
});

// SCENARIO E: Rollback itself experiences one transient network failure -> bounded retry succeeds
test('Scenario E: rollback itself experiences one transient network failure -> bounded retry succeeds', async () => {
  const statePath = getTempStatePath('scenario_e');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canonical_qa', secret: false }],
  };

  // billing-checkout update will fail initially during rollback once, then succeed
  let applyAttempt = 0;
  const mockFn = {
    async listVariables(fnId) {
      return { variables: (mockDb[fnId] || []).map(v => ({ ...v })) };
    },
    async updateVariable(fnId, varId, key, value, secret) {
      if (fnId === 'ai-gateway') {
        throw new Error('primary apply error on ai-gateway');
      }
      if (fnId === 'billing-checkout') {
        applyAttempt++;
        // 1st call: apply fresh user -> succeed
        // 2nd call: rollback attempt 1 -> throw transient error
        // 3rd call: rollback retry attempt 2 -> succeed
        if (applyAttempt === 2) {
          throw new Error('transient network 503 during rollback');
        }
      }
      const entry = (mockDb[fnId] || []).find(v => v.$id === varId);
      if (entry) {
        entry.value = value;
        entry.secret = secret;
      }
      return entry;
    },
    async createVariable() {},
    async deleteVariable() {},
  };

  const freshUserId = 'fresh_qa_user_scenario_e';
  await assert.rejects(
    async () => {
      await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0, retries: 3 });
    },
    /primary apply error on ai-gateway/
  );

  // billing-checkout should have been successfully restored despite the transient rollback failure
  assert.equal(mockDb['billing-checkout'][0].value, 'canonical_qa');

  cleanFile(statePath);
});

// SCENARIO F: Previous variable secret=true -> secret flag preserved
test('Scenario F: previous variable secret=true -> secret flag preserved', async () => {
  const statePath = getTempStatePath('scenario_f');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'secret_user', secret: true }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'secret_user', secret: true }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'secret_user', secret: true }],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_f';

  await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].secret, true);
  }

  await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].secret, true);
    assert.equal(mockDb[hub][0].value, 'secret_user');
  }

  cleanFile(statePath);
});

// SCENARIO G: Previous variable secret=false -> preserved
test('Scenario G: previous variable secret=false -> preserved', async () => {
  const statePath = getTempStatePath('scenario_g');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'plain_user', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'plain_user', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'plain_user', secret: false }],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_g';

  await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].secret, false);
  }

  await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].secret, false);
    assert.equal(mockDb[hub][0].value, 'plain_user');
  }

  cleanFile(statePath);
});

// SCENARIO H: Variable originally absent -> temporary variable removed during restore
test('Scenario H: variable originally absent -> temporary variable removed during restore', async () => {
  const statePath = getTempStatePath('scenario_h');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [],
    'ai-gateway': [],
    'coupons': [],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_h';

  await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub].length, 1);
    assert.equal(mockDb[hub][0].value, freshUserId);
  }

  await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub].length, 0);
  }

  cleanFile(statePath);
});

// SCENARIO I: Repeated restore -> safe/idempotent
test('Scenario I: repeated restore -> safe/idempotent', async () => {
  const statePath = getTempStatePath('scenario_i');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canon_i', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canon_i', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canon_i', secret: false }],
  };

  const mockFn = createMockFunctions(mockDb);
  const freshUserId = 'fresh_qa_user_scenario_i';

  await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });

  // First restore call
  const res1 = await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  assert.equal(res1.restored, true);
  assert.equal(fs.existsSync(statePath), false);

  // Second restore call when state file no longer exists
  const res2 = await restore(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0 });
  assert.equal(res2.restored, false);
  assert.equal(res2.reason, 'no_restore_record');

  // Verify hubs remain untouched and clean
  for (const hub of TARGET_HUBS) {
    assert.equal(mockDb[hub][0].value, 'canon_i');
  }

  cleanFile(statePath);
});

// SCENARIO J: Restore snapshot must remain until readback verification succeeds
test('Scenario J: restore snapshot must remain until readback verification succeeds', async () => {
  const statePath = getTempStatePath('scenario_j');
  cleanFile(statePath);

  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'canon_j', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canon_j', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canon_j', secret: false }],
  };

  // Mock where rollback itself throws persistent error
  const mockFn = {
    async listVariables(fnId) {
      return { variables: (mockDb[fnId] || []).map(v => ({ ...v })) };
    },
    async updateVariable(fnId, varId, key, value) {
      if (fnId === 'ai-gateway') throw new Error('apply failure on ai-gateway');
      if (fnId === 'billing-checkout') {
        // Fail both apply and rollback update
        if (value === 'canon_j') {
          throw new Error('fatal rollback transport failure');
        }
        mockDb[fnId][0].value = value;
      }
    },
    async createVariable() {},
    async deleteVariable() {},
  };

  const freshUserId = 'fresh_qa_user_scenario_j';
  await assert.rejects(
    async () => {
      await captureAndApply(mockFn, freshUserId, { stateFilePath: statePath, initialDelayMs: 0, retries: 1 });
    },
    /apply failure on ai-gateway/
  );

  // Snapshot file MUST NOT be deleted so workflow-level if: always() restore has the record
  assert.equal(fs.existsSync(statePath), true);

  cleanFile(statePath);
});

// AUDIT & REPAIR TESTS
test('Audit & Repair: audit detects divergence and repair restores billing-checkout', async () => {
  const mockDb = {
    'billing-checkout': [{ $id: 'v1', key: VARIABLE_KEY, value: 'fresh_diverged_user', secret: false }],
    'ai-gateway': [{ $id: 'v2', key: VARIABLE_KEY, value: 'canonical_proven_user', secret: false }],
    'coupons': [{ $id: 'v3', key: VARIABLE_KEY, value: 'canonical_proven_user', secret: false }],
  };

  const mockFn = createMockFunctions(mockDb);

  // Audit
  const auditRes = await audit(mockFn, { initialDelayMs: 0 });
  assert.equal(auditRes.bc_eq_ag, false);
  assert.equal(auditRes.bc_eq_cp, false);
  assert.equal(auditRes.ag_eq_cp, true);
  assert.equal(auditRes.consistent, false);
  assert.equal(auditRes.partialMutationProven, true);

  // Repair
  const repairRes = await repair(mockFn, { initialDelayMs: 0 });
  assert.equal(repairRes.repaired, true);

  // Post-repair audit
  const postAudit = await audit(mockFn, { initialDelayMs: 0 });
  assert.equal(postAudit.consistent, true);
  assert.equal(mockDb['billing-checkout'][0].value, 'canonical_proven_user');
  assert.equal(mockDb['ai-gateway'][0].value, 'canonical_proven_user');
  assert.equal(mockDb['coupons'][0].value, 'canonical_proven_user');
});
