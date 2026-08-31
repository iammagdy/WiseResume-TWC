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
    { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID, secret: false },
    { key: 'BILLING_PRODUCTION_PRO_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID, secret: false },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID, secret: false },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID, secret: false },
    { key: 'BILLING_CHECKOUT_ENABLED', value: 'false', secret: false },
    { key: 'BILLING_CHECKOUT_PROVIDER_READY', value: 'false', secret: false },
    { key: 'BILLING_CHECKOUT_ENVIRONMENT', value: 'sandbox', secret: false },
  ];
  return base.map(v => overrides.find(o => o.key === v.key) || v);
}

function createMockFunctions() {
  const store = new Map(); // functionId -> Map(key -> { id, value, secret })
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
        const isSecretKey = key.includes('KEY') || key.includes('SECRET') || obj.secret === true;
        variables.push({
          $id: obj.id || `id_${key}`,
          key,
          value: obj.secret ? '' : obj.value,
          functionId,
          secret: isSecretKey,
        });
      }
      return { variables };
    },

    async createVariable(functionId, variableId, key, value, secret = false) {
      calls.push({ method: 'createVariable', functionId, variableId, key, value, secret });
      if (!variableId || typeof variableId !== 'string') {
        throw new Error('createVariable contract violation: variableId is required');
      }
      const fnStore = getStore(functionId);
      fnStore.set(key, { id: variableId, value, secret: Boolean(secret) });
      return { $id: variableId, key, value, secret: Boolean(secret) };
    },

    async updateVariable(functionId, variableId, key, value, secret = false) {
      calls.push({ method: 'updateVariable', functionId, variableId, key, value, secret });
      const fnStore = getStore(functionId);
      fnStore.set(key, { id: variableId, value, secret: Boolean(secret) });
      return { $id: variableId, key, value, secret: Boolean(secret) };
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
  mock.store.set('ai-gateway', new Map());
  mock.store.set('coupons', new Map([['BILLING_ACCESS_ENVIRONMENT', { id: 'v_coupons', value: 'sandbox', secret: false }]]));
  mock.store.set('admin-devkit-data', new Map());

  mock.updateVariable = async (fnId, varId, key, val, sec) => {
    if (fnId === 'coupons') throw new Error('Simulated network failure on coupons');
    const fnStore = mock.store.get(fnId) || new Map();
    fnStore.set(key, { id: varId, value: val, secret: Boolean(sec) });
    return { $id: varId, key, value: val, secret: Boolean(sec) };
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on coupons/
  );

  const aiGatewayStore = mock.store.get('ai-gateway');
  assert.equal(aiGatewayStore.has('BILLING_ACCESS_ENVIRONMENT'), false);
  const deleteCalls = mock.calls.filter(c => c.method === 'deleteVariable' && c.functionId === 'ai-gateway');
  assert.equal(deleteCalls.length, 1);

  console.log('[TEST PASS] testExactAbsenceRollbackRestoresUnconfigured');
}

async function testPreflightCatalogClassificationSecretsEmptyMissingMismatch() {
  const baseVars = validBillingCheckoutVars();
  const mockVarsMap = bcVars => ({
    'billing-checkout': bcVars,
    'ai-gateway': [],
    'coupons': [],
    'admin-devkit-data': [],
  });

  // 1. Catalog variable secret=true -> P4_PREFLIGHT_BLOCKED_CATALOG_SECRET
  const secretVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, secret: true, value: '' } : v);
  const repSecret = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(secretVars) });
  assert.equal(repSecret.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET');

  // 2. Catalog variable absent -> P4_PREFLIGHT_BLOCKED_CATALOG_MISSING
  const missingVars = baseVars.filter(v => v.key !== 'BILLING_PRODUCTION_PRO_PRICE_ID');
  const repMissing = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(missingVars) });
  assert.equal(repMissing.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISSING');

  // 3. Catalog variable empty -> P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY
  const emptyVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: '', secret: false } : v);
  const repEmpty = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(emptyVars) });
  assert.equal(repEmpty.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY');

  // 4. Catalog variable mismatch -> P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH
  const mismatchVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: 'pri_wrong_id', secret: false } : v);
  const repMismatch = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(mismatchVars) });
  assert.equal(repMismatch.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH');

  // 5. Exact catalog -> PASS MATCH -> P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED
  const repMatch = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(baseVars) });
  assert.equal(repMatch.verdict, 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED');

  console.log('[TEST PASS] testPreflightCatalogClassificationSecretsEmptyMissingMismatch');
}

async function testProductionCatalogReconcileMode() {
  const mock = createMockFunctions();

  // Populate checkout with ENABLED=false, PROVIDER_READY=true, missing catalog IDs
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
    ['BILLING_CHECKOUT_PROVIDER_READY', { id: 'v_r', value: 'true', secret: false }],
    ['BILLING_CHECKOUT_ENVIRONMENT', { id: 'v_env', value: 'sandbox', secret: false }],
    ['BILLING_CHECKOUT_APPROVED_ORIGIN', { id: 'v_o', value: 'https://wiseresume.app', secret: false }],
  ]));

  // Reconcile catalog
  const res = await configureBillingRuntime({ mode: 'production-catalog-reconcile' }, { functions: mock });
  assert.equal(res.verdict, 'P4_CATALOG_RECONCILIATION_SUCCESS');

  const bcStore = mock.store.get('billing-checkout');
  // Check PROVIDER_READY was forced to false
  assert.equal(bcStore.get('BILLING_CHECKOUT_PROVIDER_READY').value, 'false');
  // Check ENVIRONMENT remained sandbox
  assert.equal(bcStore.get('BILLING_CHECKOUT_ENVIRONMENT').value, 'sandbox');
  // Check APPROVED_ORIGIN was not modified
  assert.equal(bcStore.get('BILLING_CHECKOUT_APPROVED_ORIGIN').value, 'https://wiseresume.app');

  // Check all four catalog IDs were written with exact values and secret=false
  for (const [catKey, expectedVal] of Object.entries(PROD_CATALOG)) {
    const entry = bcStore.get(catKey);
    assert.ok(entry, `Catalog variable ${catKey} must exist`);
    assert.equal(entry.value, expectedVal);
    assert.equal(entry.secret, false);
  }

  // Check create/updateVariable calls specified secret=false explicitly
  const catalogCalls = mock.calls.filter(c => Object.keys(PROD_CATALOG).includes(c.key));
  assert.ok(catalogCalls.length >= 4);
  assert.ok(catalogCalls.every(c => c.secret === false));

  console.log('[TEST PASS] testProductionCatalogReconcileMode');
}

async function testProductionCatalogReconcileRefusesIfEnabledTrue() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'true', secret: false }],
  ]));

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile' }, { functions: mock }),
    /\[CATALOG RECONCILIATION BLOCKED\] BILLING_CHECKOUT_ENABLED must be false/
  );

  console.log('[TEST PASS] testProductionCatalogReconcileRefusesIfEnabledTrue');
}

async function testProductionCatalogReconcilePartialFailureFailsClosed() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
  ]));

  // Make createVariable/updateVariable fail on BILLING_PRODUCTION_PREMIUM_PRICE_ID
  const origCreate = mock.createVariable.bind(mock);
  mock.createVariable = async (fnId, varId, key, val, sec) => {
    if (key === 'BILLING_PRODUCTION_PREMIUM_PRICE_ID') {
      throw new Error('Simulated network error on premium price ID');
    }
    return origCreate(fnId, varId, key, val, sec);
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile' }, { functions: mock }),
    /P4_CATALOG_RECONCILIATION_PARTIAL_BLOCKED/
  );

  // Assert checkout ENABLED was never set to true
  const bcStore = mock.store.get('billing-checkout');
  assert.equal(bcStore.get('BILLING_CHECKOUT_ENABLED').value, 'false');

  console.log('[TEST PASS] testProductionCatalogReconcilePartialFailureFailsClosed');
}

async function testWorkflowFileMainFreshnessAndSafetyGuards() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/configure-billing-runtime.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(content.includes('production-catalog-reconcile'), 'Workflow MUST list production-catalog-reconcile option');
  assert.ok(content.includes('cancel-in-progress: false'), 'Workflow MUST set cancel-in-progress: false');
  assert.ok(content.includes('git fetch origin main --depth=1'), 'Workflow MUST fetch origin main');

  console.log('[TEST PASS] testWorkflowFileMainFreshnessAndSafetyGuards');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testExactAbsenceRollbackRestoresUnconfigured();
  await testPreflightCatalogClassificationSecretsEmptyMissingMismatch();
  await testProductionCatalogReconcileMode();
  await testProductionCatalogReconcileRefusesIfEnabledTrue();
  await testProductionCatalogReconcilePartialFailureFailsClosed();
  await testWorkflowFileMainFreshnessAndSafetyGuards();
  console.log('\n[ALL 9 CATALOG RECONCILIATION & SAFETY TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
