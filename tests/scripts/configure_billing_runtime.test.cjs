'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ALLOWED_MODES,
  ACCESS_CONSUMER_FUNCTIONS,
  PROD_CATALOG,
  CONFIRMATION_REQUIRED_FOR_OPEN,
  parseArgs,
  validateProductionPreconditions,
  configureBillingRuntime,
} = require('../../scripts/configure_billing_runtime.cjs');

function validBillingCheckoutVars(overrides = []) {
  const base = [
    { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: '[SECRET_MASKED_METADATA]' },
    { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PRO_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID },
    { key: 'BILLING_CHECKOUT_APPROVED_ORIGIN', value: 'https://buy.paddle.com' },
  ];
  return base.map(v => overrides.find(o => o.key === v.key) || v);
}

function createMockFunctions() {
  const store = new Map(); // functionId -> Map(key -> value)
  const calls = [];

  function getStore(functionId) {
    if (!store.has(functionId)) store.set(functionId, new Map());
    return store.get(functionId);
  }

  return {
    store,
    calls,

    async listVariables(functionId) {
      calls.push({ method: 'listVariables', functionId });
      const fnStore = getStore(functionId);
      const variables = [];
      for (const [key, value] of fnStore.entries()) {
        variables.push({ $id: `id_${key}`, key, value, functionId });
      }
      return { variables };
    },

    async createVariable(functionId, variableId, key, value) {
      calls.push({ method: 'createVariable', functionId, variableId, key, value });
      if (!variableId || typeof variableId !== 'string') {
        throw new Error('createVariable contract violation: variableId is required');
      }
      const fnStore = getStore(functionId);
      fnStore.set(key, value);
      return { $id: variableId, key, value };
    },

    async updateVariable(functionId, variableId, key, value) {
      calls.push({ method: 'updateVariable', functionId, variableId, key, value });
      const fnStore = getStore(functionId);
      fnStore.set(key, value);
      return { $id: variableId, key, value };
    },
  };
}

async function testParseArgs() {
  const parsed1 = parseArgs(['node', 'script.js', '--mode=production-smoke-open', '--confirm=OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT', '--approved-origin=https://buy.paddle.com']);
  assert.equal(parsed1.mode, 'production-smoke-open');
  assert.equal(parsed1.confirm, 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT');
  assert.equal(parsed1.approvedOriginOverride, 'https://buy.paddle.com');

  console.log('[TEST PASS] parseArgs');
}

async function testUnknownModeRejection() {
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'invalid-mode' }),
    /Invalid or missing mode: "invalid-mode"/
  );
  console.log('[TEST PASS] testUnknownModeRejection');
}

async function testCreateVariableSignatureConstraint() {
  const mock = createMockFunctions();
  const mockSdk = {
    Functions: function () { return mock; },
  };

  // Pre-seed mock store with production paddle key metadata for preconditions
  mock.store.set('billing-checkout', new Map([
    ['BILLING_PRODUCTION_PADDLE_API_KEY', 'present'],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID],
    ['BILLING_PRODUCTION_PRO_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID],
  ]));

  await configureBillingRuntime({
    mode: 'production-smoke-open',
    approvedOriginOverride: 'https://buy.paddle.com',
    confirm: CONFIRMATION_REQUIRED_FOR_OPEN,
  }, { functions: mock });

  const createCalls = mock.calls.filter(c => c.method === 'createVariable');
  assert.ok(createCalls.length > 0);
  for (const call of createCalls) {
    assert.ok(call.variableId, 'variableId parameter must be passed to createVariable');
    assert.equal(typeof call.variableId, 'string');
  }

  console.log('[TEST PASS] testCreateVariableSignatureConstraint');
}

async function testSecretPresenceMetadataOnly() {
  const validVars = validBillingCheckoutVars();

  // Test secret present
  const origin = validateProductionPreconditions(validVars, 'https://buy.paddle.com');
  assert.equal(origin, 'https://buy.paddle.com');

  // Test secret missing
  const missingVars = validVars.filter(v => v.key !== 'BILLING_PRODUCTION_PADDLE_API_KEY');
  assert.throws(
    () => validateProductionPreconditions(missingVars, 'https://buy.paddle.com'),
    /BILLING_PRODUCTION_PADDLE_API_KEY is MISSING/
  );

  console.log('[TEST PASS] testSecretPresenceMetadataOnly');
}

async function testPersistedReadbackMismatchFails() {
  // Mock where updateVariable accepts call, but listVariables re-fetches stale data
  const mock = {
    async listVariables() {
      return { variables: [{ $id: 'v1', key: 'BILLING_CHECKOUT_ENABLED', value: 'true' }] };
    },
    async updateVariable() {
      // Returns mock success, but listVariables will return stale value 'true'
      return { $id: 'v1', key: 'BILLING_CHECKOUT_ENABLED', value: 'false' };
    },
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-lock' }, { functions: mock }),
    /\[READBACK MISMATCH\]/
  );

  console.log('[TEST PASS] testPersistedReadbackMismatchFails');
}

async function testProductionSmokeLockUnconditionalAndOrder() {
  const mock = createMockFunctions();
  // Call lock mode without any Production preconditions or catalog IDs
  await configureBillingRuntime({ mode: 'production-smoke-lock' }, { functions: mock });

  const calls = mock.calls.filter(c => c.method === 'updateVariable' || c.method === 'createVariable');
  assert.equal(calls[0].key, 'BILLING_CHECKOUT_ENABLED');
  assert.equal(calls[0].value, 'false');

  assert.equal(calls[1].key, 'BILLING_CHECKOUT_PROVIDER_READY');
  assert.equal(calls[1].value, 'false');

  assert.equal(calls[2].key, 'BILLING_CHECKOUT_ENVIRONMENT');
  assert.equal(calls[2].value, 'production');

  console.log('[TEST PASS] testProductionSmokeLockUnconditionalAndOrder');
}

async function testEmergencyRestoreUnconditionalAndOrder() {
  const mock = createMockFunctions();
  await configureBillingRuntime({ mode: 'emergency-prepayment-sandbox-restore' }, { functions: mock });

  const checkoutCalls = mock.calls.filter(c => (c.method === 'updateVariable' || c.method === 'createVariable') && c.functionId === 'billing-checkout');
  assert.equal(checkoutCalls[0].key, 'BILLING_CHECKOUT_ENABLED');
  assert.equal(checkoutCalls[0].value, 'false');

  assert.equal(checkoutCalls[1].key, 'BILLING_CHECKOUT_PROVIDER_READY');
  assert.equal(checkoutCalls[1].value, 'false');

  assert.equal(checkoutCalls[2].key, 'BILLING_CHECKOUT_ENVIRONMENT');
  assert.equal(checkoutCalls[2].value, 'sandbox');

  // Verify access consumers set to sandbox
  for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
    const fnCalls = mock.calls.filter(c => (c.method === 'updateVariable' || c.method === 'createVariable') && c.functionId === fnId);
    assert.equal(fnCalls[0].key, 'BILLING_ACCESS_ENVIRONMENT');
    assert.equal(fnCalls[0].value, 'sandbox');
  }

  console.log('[TEST PASS] testEmergencyRestoreUnconditionalAndOrder');
}

async function testProductionAccessEnableForcesCheckoutLockFirst() {
  const mock = createMockFunctions();
  await configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock });

  const calls = mock.calls.filter(c => c.method === 'updateVariable' || c.method === 'createVariable');

  // First 3 calls MUST lock billing-checkout
  assert.equal(calls[0].functionId, 'billing-checkout');
  assert.equal(calls[0].key, 'BILLING_CHECKOUT_ENABLED');
  assert.equal(calls[0].value, 'false');

  assert.equal(calls[1].functionId, 'billing-checkout');
  assert.equal(calls[1].key, 'BILLING_CHECKOUT_PROVIDER_READY');
  assert.equal(calls[1].value, 'false');

  assert.equal(calls[2].functionId, 'billing-checkout');
  assert.equal(calls[2].key, 'BILLING_CHECKOUT_ENVIRONMENT');
  assert.equal(calls[2].value, 'production');

  // Subsequent calls set consumer access environments
  const consumerCalls = calls.slice(3);
  const fnIds = consumerCalls.map(c => c.functionId);
  assert.deepEqual(fnIds, ['ai-gateway', 'coupons', 'admin-devkit-data']);

  // Strictly verify revenuecat-webhook is NOT in fnIds
  assert.ok(!fnIds.includes('revenuecat-webhook'));

  // Strictly verify coupons IS in fnIds
  assert.ok(fnIds.includes('coupons'));

  console.log('[TEST PASS] testProductionAccessEnableForcesCheckoutLockFirst');
}

async function testSmokeOpenConfirmationRequiredAndEnabledIsLast() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_PRODUCTION_PADDLE_API_KEY', 'present'],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID],
    ['BILLING_PRODUCTION_PRO_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID],
  ]));

  // Test missing confirmation string fails
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', approvedOriginOverride: 'https://buy.paddle.com' }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );

  // Test with confirmation string succeeds
  await configureBillingRuntime({
    mode: 'production-smoke-open',
    approvedOriginOverride: 'https://buy.paddle.com',
    confirm: CONFIRMATION_REQUIRED_FOR_OPEN,
  }, { functions: mock });

  const calls = mock.calls.filter(c => c.method === 'updateVariable' || c.method === 'createVariable');
  const enabledCallIndex = calls.findIndex(c => c.key === 'BILLING_CHECKOUT_ENABLED');

  // ENABLED=true MUST be the LAST call
  assert.equal(enabledCallIndex, calls.length - 1);
  assert.equal(calls[enabledCallIndex].value, 'true');

  console.log('[TEST PASS] testSmokeOpenConfirmationRequiredAndEnabledIsLast');
}

async function testSmokeOpenFailureTriggersCompensatingLock() {
  const store = new Map([
    ['BILLING_PRODUCTION_PADDLE_API_KEY', 'present'],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID],
    ['BILLING_PRODUCTION_PRO_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID],
    ['BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID],
  ]);

  const calls = [];
  let updateCount = 0;

  const mock = {
    async listVariables(fnId) {
      const vars = [];
      for (const [k, v] of store.entries()) {
        vars.push({ $id: `id_${k}`, key: k, value: v, functionId: fnId });
      }
      return { variables: vars };
    },
    async createVariable(fnId, varId, key, val) {
      updateCount += 1;
      // Simulate failure on the 3rd variable update to trigger compensating lock
      if (updateCount === 3) {
        throw new Error('Simulated network error during mutation');
      }
      store.set(key, val);
      calls.push({ method: 'createVariable', key, val });
      return { $id: varId, key, value: val };
    },
    async updateVariable(fnId, varId, key, val) {
      store.set(key, val);
      calls.push({ method: 'updateVariable', key, val });
      return { $id: varId, key, value: val };
    },
  };

  await assert.rejects(
    () => configureBillingRuntime({
      mode: 'production-smoke-open',
      approvedOriginOverride: 'https://buy.paddle.com',
      confirm: CONFIRMATION_REQUIRED_FOR_OPEN,
    }, { functions: mock }),
    /\[COMPENSATING LOCK ENGAGED & CONFIRMED\]/
  );

  // Verify that compensating lock set ENABLED=false and PROVIDER_READY=false
  assert.equal(store.get('BILLING_CHECKOUT_ENABLED'), 'false');
  assert.equal(store.get('BILLING_CHECKOUT_PROVIDER_READY'), 'false');

  console.log('[TEST PASS] testSmokeOpenFailureTriggersCompensatingLock');
}

async function testMainOnlyWorkflowGuardInWorkflowFile() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/configure-billing-runtime.yml');
  assert.ok(fs.existsSync(workflowPath), 'Workflow file must exist');

  const content = fs.readFileSync(workflowPath, 'utf8');
  assert.ok(content.includes('github.ref'), 'Workflow must check github.ref');
  assert.ok(content.includes('refs/heads/main'), 'Workflow must guard refs/heads/main');
  assert.ok(content.includes('exit 1'), 'Workflow must exit 1 on non-main ref');

  console.log('[TEST PASS] testMainOnlyWorkflowGuardInWorkflowFile');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testCreateVariableSignatureConstraint();
  await testSecretPresenceMetadataOnly();
  await testPersistedReadbackMismatchFails();
  await testProductionSmokeLockUnconditionalAndOrder();
  await testEmergencyRestoreUnconditionalAndOrder();
  await testProductionAccessEnableForcesCheckoutLockFirst();
  await testSmokeOpenConfirmationRequiredAndEnabledIsLast();
  await testSmokeOpenFailureTriggersCompensatingLock();
  await testMainOnlyWorkflowGuardInWorkflowFile();
  console.log('\n[ALL HARDENED TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
