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
  assertExecutionEnvironment,
  validateProductionPreconditions,
  runProductionPreflightAudit,
  configureBillingRuntime,
} = require('../../scripts/configure_billing_runtime.cjs');

function validBillingCheckoutVars(overrides = []) {
  const base = [
    { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: '[SECRET_MASKED_METADATA]', secret: true },
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
        const isSecretKey = key.includes('KEY') || key.includes('SECRET');
        variables.push({ $id: `id_${key}`, key, value, functionId, secret: isSecretKey });
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
  const parsed1 = parseArgs(
    ['node', 'script.js', '--mode=production-smoke-open', '--confirm=OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT'],
    { BILLING_RUNTIME_APPROVED_ORIGIN: 'https://buy.paddle.com' }
  );
  assert.equal(parsed1.mode, 'production-smoke-open');
  assert.equal(parsed1.confirm, 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT');
  assert.equal(parsed1.approvedOriginOverride, 'https://buy.paddle.com');

  console.log('[TEST PASS] testParseArgs');
}

async function testUnknownModeRejection() {
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'invalid-mode' }),
    /Invalid or missing mode: "invalid-mode"/
  );
  console.log('[TEST PASS] testUnknownModeRejection');
}

async function testExecutionEnvironmentGuard() {
  // Test local/manual execution without marker rejected
  assert.throws(
    () => assertExecutionEnvironment({}),
    /\[FATAL EXECUTION GUARD\] Execution blocked/
  );

  // Test non-main branch in CI rejected
  assert.throws(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_ACTIONS: 'true',
      GITHUB_REF: 'refs/heads/feature-branch',
    }),
    /billing runtime automation can only run on refs\/heads\/main/
  );

  // Test approved main CI execution accepted
  assert.doesNotThrow(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_ACTIONS: 'true',
      GITHUB_REF: 'refs/heads/main',
    })
  );

  console.log('[TEST PASS] testExecutionEnvironmentGuard');
}

async function testRequireLiveRemoteCatalogWithoutProcessEnvFallback() {
  // Setup valid remote vars
  const validVars = validBillingCheckoutVars();
  assert.doesNotThrow(() => validateProductionPreconditions(validVars, 'https://buy.paddle.com'));

  // Test missing live remote catalog variable fails even if process.env holds it
  const missingProPriceVars = validVars.filter(v => v.key !== 'BILLING_PRODUCTION_PRO_PRICE_ID');
  assert.throws(
    () => validateProductionPreconditions(missingProPriceVars, 'https://buy.paddle.com'),
    /Live remote variable BILLING_PRODUCTION_PRO_PRICE_ID is MISSING/
  );

  // Test mismatched live remote catalog variable fails
  const mismatchedVars = validVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: 'invalid_price' } : v);
  assert.throws(
    () => validateProductionPreconditions(mismatchedVars, 'https://buy.paddle.com'),
    /Live remote variable BILLING_PRODUCTION_PRO_PRICE_ID mismatch/
  );

  console.log('[TEST PASS] testRequireLiveRemoteCatalogWithoutProcessEnvFallback');
}

async function testReadOnlyPreflightAuditMode() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_PRODUCTION_PADDLE_API_KEY', 'present_secret_value'],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID],
  ]));
  mock.store.set('ai-gateway', new Map([['BILLING_ACCESS_ENVIRONMENT', 'sandbox']]));

  const report = await configureBillingRuntime({ mode: 'production-preflight-audit' }, { functions: mock });

  // Verify zero mutations performed (only listVariables calls)
  const mutationCalls = mock.calls.filter(c => c.method === 'createVariable' || c.method === 'updateVariable');
  assert.equal(mutationCalls.length, 0);

  // Verify secret value is masked in report
  assert.equal(report.functions['billing-checkout']['BILLING_PRODUCTION_PADDLE_API_KEY'], '[PRESENT]');
  assert.equal(report.functions['ai-gateway']['BILLING_ACCESS_ENVIRONMENT'], 'sandbox');

  console.log('[TEST PASS] testReadOnlyPreflightAuditMode');
}

async function testWorkflowFileSafetyGuards() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/configure-billing-runtime.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  // Verify cancel-in-progress: false
  assert.ok(content.includes('cancel-in-progress: false'), 'Workflow MUST set cancel-in-progress: false');

  // Verify no input interpolation inside run: blocks
  const runBlocks = content.split('\n')
    .filter(line => line.trim().startsWith('run:'))
    .join('\n');
  assert.ok(!runBlocks.includes('${{ inputs.'), 'Workflow run: blocks MUST NOT contain ${{ inputs.* }} interpolation');

  // Verify environment variables used for inputs
  assert.ok(content.includes('BILLING_RUNTIME_MODE: ${{ inputs.mode }}'));
  assert.ok(content.includes('WISERESUME_BILLING_RUNTIME_AUTOMATION: \'1\''));

  console.log('[TEST PASS] testWorkflowFileSafetyGuards');
}

async function testCreateVariableSignatureConstraint() {
  const mock = createMockFunctions();
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

  const origin = validateProductionPreconditions(validVars, 'https://buy.paddle.com');
  assert.equal(origin, 'https://buy.paddle.com');

  const missingVars = validVars.filter(v => v.key !== 'BILLING_PRODUCTION_PADDLE_API_KEY');
  assert.throws(
    () => validateProductionPreconditions(missingVars, 'https://buy.paddle.com'),
    /BILLING_PRODUCTION_PADDLE_API_KEY is MISSING/
  );

  console.log('[TEST PASS] testSecretPresenceMetadataOnly');
}

async function testPersistedReadbackMismatchFails() {
  const mock = {
    async listVariables() {
      return { variables: [{ $id: 'v1', key: 'BILLING_CHECKOUT_ENABLED', value: 'true' }] };
    },
    async updateVariable() {
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

  assert.equal(calls[0].functionId, 'billing-checkout');
  assert.equal(calls[0].key, 'BILLING_CHECKOUT_ENABLED');
  assert.equal(calls[0].value, 'false');

  assert.equal(calls[1].functionId, 'billing-checkout');
  assert.equal(calls[1].key, 'BILLING_CHECKOUT_PROVIDER_READY');
  assert.equal(calls[1].value, 'false');

  assert.equal(calls[2].functionId, 'billing-checkout');
  assert.equal(calls[2].key, 'BILLING_CHECKOUT_ENVIRONMENT');
  assert.equal(calls[2].value, 'production');

  const consumerCalls = calls.slice(3);
  const fnIds = consumerCalls.map(c => c.functionId);
  assert.deepEqual(fnIds, ['ai-gateway', 'coupons', 'admin-devkit-data']);
  assert.ok(!fnIds.includes('revenuecat-webhook'));
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

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', approvedOriginOverride: 'https://buy.paddle.com' }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );

  await configureBillingRuntime({
    mode: 'production-smoke-open',
    approvedOriginOverride: 'https://buy.paddle.com',
    confirm: CONFIRMATION_REQUIRED_FOR_OPEN,
  }, { functions: mock });

  const calls = mock.calls.filter(c => c.method === 'updateVariable' || c.method === 'createVariable');
  const enabledCallIndex = calls.findIndex(c => c.key === 'BILLING_CHECKOUT_ENABLED');
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

  assert.equal(store.get('BILLING_CHECKOUT_ENABLED'), 'false');
  assert.equal(store.get('BILLING_CHECKOUT_PROVIDER_READY'), 'false');

  console.log('[TEST PASS] testSmokeOpenFailureTriggersCompensatingLock');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testRequireLiveRemoteCatalogWithoutProcessEnvFallback();
  await testReadOnlyPreflightAuditMode();
  await testWorkflowFileSafetyGuards();
  await testCreateVariableSignatureConstraint();
  await testSecretPresenceMetadataOnly();
  await testPersistedReadbackMismatchFails();
  await testProductionSmokeLockUnconditionalAndOrder();
  await testEmergencyRestoreUnconditionalAndOrder();
  await testProductionAccessEnableForcesCheckoutLockFirst();
  await testSmokeOpenConfirmationRequiredAndEnabledIsLast();
  await testSmokeOpenFailureTriggersCompensatingLock();
  console.log('\n[ALL FINAL HARDENED TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
