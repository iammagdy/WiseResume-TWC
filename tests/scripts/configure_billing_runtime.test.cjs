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
  CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE,
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

function createMockFunctions(options = {}) {
  const store = new Map(); // functionId -> Map(key -> { id, value, secret })
  const calls = [];
  const omitSecretMetadata = options.omitSecretMetadata || false;

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
        const entry = {
          $id: obj.id || `id_${key}`,
          key,
          value: obj.secret ? '' : obj.value,
          functionId,
        };
        if (!omitSecretMetadata) {
          entry.secret = obj.secret !== undefined ? obj.secret : !isSecretKey ? false : true;
        }
        variables.push(entry);
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
    ['node', 'script.js', '--mode=production-catalog-reconcile', '--confirm-catalog-reconcile=RECONCILE_PRODUCTION_CATALOG_NON_SECRET'],
    {}
  );
  assert.equal(parsed.mode, 'production-catalog-reconcile');
  assert.equal(parsed.confirmCatalogReconcile, 'RECONCILE_PRODUCTION_CATALOG_NON_SECRET');
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

async function testReconcileConfirmationRequirement() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
  ]));

  // 1. Missing confirmation -> rejected BEFORE mutation
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirmCatalogReconcile: '' }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT touch Appwrite when confirmation is missing');

  // 2. Wrong confirmation -> rejected BEFORE mutation
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirmCatalogReconcile: 'WRONG_CONFIRMATION' }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT touch Appwrite when confirmation is wrong');

  // 3. Smoke open confirmation passed to reconcile mode -> rejected
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirm: CONFIRMATION_REQUIRED_FOR_OPEN }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept smoke open confirmation for catalog reconcile');

  // 4. Exact confirmation -> accepted
  const res = await configureBillingRuntime(
    { mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE },
    { functions: mock }
  );
  assert.equal(res.verdict, 'P4_CATALOG_RECONCILIATION_SUCCESS');

  console.log('[TEST PASS] testReconcileConfirmationRequirement');
}

async function testPreflightCatalogClassificationSecretsEmptyMissingMismatchUnverified() {
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

  // 2. Catalog variable secret=undefined -> P4_PREFLIGHT_BLOCKED_CATALOG_SECRET_UNVERIFIED
  const unverifiedVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, secret: undefined } : v);
  const repUnverified = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(unverifiedVars) });
  assert.equal(repUnverified.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET_UNVERIFIED');

  // 3. Catalog variable absent -> P4_PREFLIGHT_BLOCKED_CATALOG_MISSING
  const missingVars = baseVars.filter(v => v.key !== 'BILLING_PRODUCTION_PRO_PRICE_ID');
  const repMissing = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(missingVars) });
  assert.equal(repMissing.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISSING');

  // 4. Catalog variable empty -> P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY
  const emptyVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: '', secret: false } : v);
  const repEmpty = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(emptyVars) });
  assert.equal(repEmpty.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY');

  // 5. Catalog variable mismatch -> P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH
  const mismatchVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: 'pri_wrong_id', secret: false } : v);
  const repMismatch = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(mismatchVars) });
  assert.equal(repMismatch.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH');

  // 6. Exact catalog -> PASS MATCH -> P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED
  const repMatch = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(baseVars) });
  assert.equal(repMatch.verdict, 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED');

  console.log('[TEST PASS] testPreflightCatalogClassificationSecretsEmptyMissingMismatchUnverified');
}

async function testUnchangedPathCannotBypassExplicitSecretFalse() {
  const mock = createMockFunctions({ omitSecretMetadata: true });
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', { id: 'v_p', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID, secret: undefined }],
  ]));

  // Mock listVariables to omit `secret` property during readback
  await assert.rejects(
    () => configureBillingRuntime(
      { mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE },
      { functions: mock }
    ),
    /P4_CATALOG_RECONCILIATION_SECRET_METADATA_UNVERIFIED/
  );

  // Assert updateVariable was attempted with secret=false because secret metadata was undefined
  const updateCall = mock.calls.find(c => c.method === 'updateVariable' && c.key === 'BILLING_PRODUCTION_PRO_PRICE_ID');
  assert.ok(updateCall, 'Must perform explicit updateVariable with secret=false when existing secret metadata is undefined');
  assert.equal(updateCall.secret, false);

  console.log('[TEST PASS] testUnchangedPathCannotBypassExplicitSecretFalse');
}

async function testPostReconciliationInvariantCheckFailsOnDrift() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
    ['BILLING_CHECKOUT_APPROVED_ORIGIN', { id: 'v_o', value: 'https://wiseresume.app', secret: false }],
  ]));

  // Inject drift during final post-check read
  let readCount = 0;
  const origList = mock.listVariables.bind(mock);
  mock.listVariables = async fnId => {
    const res = await origList(fnId);
    readCount++;
    if (readCount > 10) { // Post-check call
      const found = res.variables.find(v => v.key === 'BILLING_CHECKOUT_ENABLED');
      if (found) found.value = 'true'; // Inject drift
    }
    return res;
  };

  await assert.rejects(
    () => configureBillingRuntime(
      { mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE },
      { functions: mock }
    ),
    /P4_CATALOG_RECONCILIATION_POSTCHECK_BLOCKED/
  );

  console.log('[TEST PASS] testPostReconciliationInvariantCheckFailsOnDrift');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testReconcileConfirmationRequirement();
  await testPreflightCatalogClassificationSecretsEmptyMissingMismatchUnverified();
  await testUnchangedPathCannotBypassExplicitSecretFalse();
  await testPostReconciliationInvariantCheckFailsOnDrift();
  console.log('\n[ALL FOCUSED HARDENING & RECONCILIATION TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
