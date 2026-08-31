'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  ALLOWED_MODES,
  ACCESS_CONSUMER_FUNCTIONS,
  PROD_CATALOG,
  SAFE_NON_SECRET_ALLOWLIST,
  SECRET_PRESENCE_KEYS,
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
    { key: 'BILLING_CHECKOUT_ENABLED', value: 'false' },
    { key: 'BILLING_CHECKOUT_PROVIDER_READY', value: 'false' },
    { key: 'BILLING_CHECKOUT_ENVIRONMENT', value: 'sandbox' },
  ];
  return base.map(v => overrides.find(o => o.key === v.key) || v);
}

function createMockFunctions() {
  const store = new Map(); // functionId -> Map(key -> { id, value })
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
      for (const [key, obj] of fnStore.entries()) {
        const isSecretKey = key.includes('KEY') || key.includes('SECRET');
        variables.push({ $id: obj.id || `id_${key}`, key, value: obj.value, functionId, secret: isSecretKey });
      }
      return { variables };
    },

    async createVariable(functionId, variableId, key, value) {
      calls.push({ method: 'createVariable', functionId, variableId, key, value });
      if (!variableId || typeof variableId !== 'string') {
        throw new Error('createVariable contract violation: variableId is required');
      }
      const fnStore = getStore(functionId);
      fnStore.set(key, { id: variableId, value });
      return { $id: variableId, key, value };
    },

    async updateVariable(functionId, variableId, key, value) {
      calls.push({ method: 'updateVariable', functionId, variableId, key, value });
      const fnStore = getStore(functionId);
      fnStore.set(key, { id: variableId, value });
      return { $id: variableId, key, value };
    },

    async deleteVariable(functionId, variableId) {
      calls.push({ method: 'deleteVariable', functionId, variableId });
      const fnStore = getStore(functionId);
      for (const [k, obj] of fnStore.entries()) {
        if (obj.id === variableId) {
          fnStore.delete(k);
          break;
        }
      }
      return {};
    },
  };
}

async function testParseArgs() {
  const parsed = parseArgs(
    ['node', 'script.js', '--mode=production-smoke-open', '--confirm=OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT'],
    {}
  );
  assert.equal(parsed.mode, 'production-smoke-open');
  assert.equal(parsed.confirm, 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT');
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
  assert.throws(() => assertExecutionEnvironment({}), /\[FATAL EXECUTION GUARD\]/);
  assert.throws(() => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1' }), /\[FATAL EXECUTION GUARD\]/);
  assert.throws(() => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1', GITHUB_REF: 'refs/heads/main' }), /\[FATAL EXECUTION GUARD\]/);
  assert.throws(() => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1', GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/feature-branch', GITHUB_EVENT_NAME: 'workflow_dispatch' }), /\[FATAL EXECUTION GUARD\]/);
  assert.throws(() => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1', GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'push' }), /\[FATAL EXECUTION GUARD\]/);
  assert.doesNotThrow(() => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1', GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch' }));
  console.log('[TEST PASS] testExecutionEnvironmentGuard');
}

async function testExactAbsenceRollbackRestoresUnconfigured() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map());
  // ai-gateway starts UNCONFIGURED (no BILLING_ACCESS_ENVIRONMENT)
  mock.store.set('ai-gateway', new Map());
  mock.store.set('coupons', new Map([['BILLING_ACCESS_ENVIRONMENT', { id: 'v_coupons', value: 'sandbox' }]]));
  mock.store.set('admin-devkit-data', new Map());

  // Fail on coupons update
  mock.updateVariable = async (fnId, varId, key, val) => {
    if (fnId === 'coupons') throw new Error('Simulated network failure on coupons');
    const fnStore = mock.store.get(fnId) || new Map();
    fnStore.set(key, { id: varId, value: val });
    return { $id: varId, key, value: val };
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on coupons/
  );

  // Assert ai-gateway variable was DELETED and remains ABSENT (not sandbox!)
  const aiGatewayStore = mock.store.get('ai-gateway');
  assert.equal(aiGatewayStore.has('BILLING_ACCESS_ENVIRONMENT'), false);

  // Assert deleteVariable call was made for ai-gateway
  const deleteCalls = mock.calls.filter(c => c.method === 'deleteVariable' && c.functionId === 'ai-gateway');
  assert.equal(deleteCalls.length, 1);

  console.log('[TEST PASS] testExactAbsenceRollbackRestoresUnconfigured');
}

async function testFailingConsumerIncludedInRollbackOnReadbackMismatch() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map());
  mock.store.set('ai-gateway', new Map([['BILLING_ACCESS_ENVIRONMENT', { id: 'v_ai', value: 'sandbox' }]]));
  mock.store.set('coupons', new Map([['BILLING_ACCESS_ENVIRONMENT', { id: 'v_coupons', value: 'sandbox' }]]));

  let callCount = 0;
  // Make coupons updateVariable update store but throw readback mismatch error
  const origUpdate = mock.updateVariable.bind(mock);
  mock.updateVariable = async (fnId, varId, key, val) => {
    callCount++;
    if (fnId === 'coupons' && val === 'production') {
      // Simulate remote update succeeds but readback fails
      mock.store.get('coupons').set(key, { id: varId, value: 'production' });
      throw new Error('Simulated readback mismatch');
    }
    return origUpdate(fnId, varId, key, val);
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on coupons/
  );

  // Assert coupons was ALSO included in rollback and restored to sandbox
  const couponsStore = mock.store.get('coupons');
  assert.equal(couponsStore.get('BILLING_ACCESS_ENVIRONMENT').value, 'sandbox');

  console.log('[TEST PASS] testFailingConsumerIncludedInRollbackOnReadbackMismatch');
}

async function testRollbackDeletionFailureGivesCriticalStatus() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map());
  mock.store.set('ai-gateway', new Map()); // unconfigured

  // Make coupons createVariable fail
  mock.createVariable = async (fnId, varId, key, val) => {
    if (fnId === 'coupons') throw new Error('Coupons fail');
    const fnStore = mock.store.get(fnId) || new Map();
    fnStore.set(key, { id: varId, value: val });
    return { $id: varId, key, value: val };
  };

  // Make deleteVariable throw error
  mock.deleteVariable = async () => {
    throw new Error('Simulated deleteVariable failure');
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /CRITICAL_PARTIAL_ACCESS_TRANSITION_OWNER_ACTION_REQUIRED/
  );

  console.log('[TEST PASS] testRollbackDeletionFailureGivesCriticalStatus');
}

async function testPreflightVerdictContractAndGateBaselines() {
  // 1. Exact safe baseline -> P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED
  const validVarsMap = {
    'billing-checkout': validBillingCheckoutVars(),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'coupons': [], // unconfigured
    'admin-devkit-data': [], // unconfigured
  };
  const report1 = await runProductionPreflightAudit(null, { varsMap: validVarsMap });
  assert.equal(report1.verdict, 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED');
  assert.equal(report1.functions['coupons']['BILLING_ACCESS_ENVIRONMENT'], '[UNCONFIGURED]');

  // 2. Checkout ENABLED=true -> P4_PREFLIGHT_BLOCKED_CHECKOUT_ENABLED
  const enabledVarsMap = {
    ...validVarsMap,
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_ENABLED', value: 'true' }]),
  };
  const report2 = await runProductionPreflightAudit(null, { varsMap: enabledVarsMap });
  assert.equal(report2.verdict, 'P4_PREFLIGHT_BLOCKED_CHECKOUT_ENABLED');

  // 3. Provider READY=true -> P4_PREFLIGHT_BLOCKED_PROVIDER_READY
  const readyVarsMap = {
    ...validVarsMap,
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_PROVIDER_READY', value: 'true' }]),
  };
  const report3 = await runProductionPreflightAudit(null, { varsMap: readyVarsMap });
  assert.equal(report3.verdict, 'P4_PREFLIGHT_BLOCKED_PROVIDER_READY');

  // 4. Unexpected Checkout Env -> P4_PREFLIGHT_BLOCKED_ENVIRONMENT_STATE
  const envVarsMap = {
    ...validVarsMap,
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_ENVIRONMENT', value: 'production' }]),
  };
  const report4 = await runProductionPreflightAudit(null, { varsMap: envVarsMap });
  assert.equal(report4.verdict, 'P4_PREFLIGHT_BLOCKED_ENVIRONMENT_STATE');

  console.log('[TEST PASS] testPreflightVerdictContractAndGateBaselines');
}

async function testWorkflowFileMainFreshnessAndSafetyGuards() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/configure-billing-runtime.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(content.includes('cancel-in-progress: false'), 'Workflow MUST set cancel-in-progress: false');
  assert.ok(content.includes('git fetch origin main --depth=1'), 'Workflow MUST fetch origin main');
  assert.ok(content.includes('CURRENT_HEAD=$(git rev-parse HEAD)'), 'Workflow MUST parse HEAD');
  assert.ok(content.includes('ORIGIN_MAIN=$(git rev-parse origin/main)'), 'Workflow MUST parse origin/main');

  const runBlocks = content.split('\n').filter(line => line.trim().startsWith('run:')).join('\n');
  assert.ok(!runBlocks.includes('${{ inputs.'), 'Workflow run: blocks MUST NOT contain ${{ inputs.* }} interpolation');

  console.log('[TEST PASS] testWorkflowFileMainFreshnessAndSafetyGuards');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testExactAbsenceRollbackRestoresUnconfigured();
  await testFailingConsumerIncludedInRollbackOnReadbackMismatch();
  await testRollbackDeletionFailureGivesCriticalStatus();
  await testPreflightVerdictContractAndGateBaselines();
  await testWorkflowFileMainFreshnessAndSafetyGuards();
  console.log('\n[ALL EXACT STATE ROLLBACK & PREFLIGHT SAFETY TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
