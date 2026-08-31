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
    ['node', 'script.js', '--mode=production-catalog-reconcile', '--confirm-catalog-reconcile=RECONCILE_PRODUCTION_CATALOG_NON_SECRET', '--confirm=OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT'],
    {}
  );
  assert.equal(parsed.mode, 'production-catalog-reconcile');
  assert.equal(parsed.confirmCatalogReconcile, 'RECONCILE_PRODUCTION_CATALOG_NON_SECRET');
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

async function testSmokeOpenConfirmationRequirement() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_PRODUCTION_PADDLE_API_KEY', { id: 'v_k', value: 'sk_test_123', secret: true }],
    ['BILLING_PRODUCTION_PRO_PRICE_ID', { id: 'v_p1', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID, secret: false }],
    ['BILLING_PRODUCTION_PRO_PRODUCT_ID', { id: 'v_p2', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID, secret: false }],
    ['BILLING_PRODUCTION_PREMIUM_PRICE_ID', { id: 'v_p3', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID, secret: false }],
    ['BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', { id: 'v_p4', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID, secret: false }],
    ['BILLING_CHECKOUT_APPROVED_ORIGIN', { id: 'v_o', value: 'https://wiseresume.app', secret: false }],
  ]));

  // 1. Missing confirmation -> rejected
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', confirm: '' }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT touch Appwrite when confirmation is missing');

  // 2. Wrong confirmation -> rejected
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', confirm: 'WRONG' }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT touch Appwrite when confirmation is wrong');

  // 3. Catalog confirmation string passed to smoke-open -> rejected
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', confirm: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept catalog confirmation string for smoke open');

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-smoke-open', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE }, { functions: mock }),
    /Confirmation required for production-smoke-open/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept confirmCatalogReconcile field for smoke open');

  console.log('[TEST PASS] testSmokeOpenConfirmationRequirement');
}

async function testCatalogReconcileConfirmationIsolation() {
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
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirmCatalogReconcile: 'WRONG' }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT touch Appwrite when confirmation is wrong');

  // 3. Exact catalog string passed ONLY in generic --confirm= -> REJECTED
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirm: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE, confirmCatalogReconcile: '' }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept generic confirm field for catalog reconcile');

  // 4. Smoke open string passed to catalog reconcile -> REJECTED
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirm: CONFIRMATION_REQUIRED_FOR_OPEN, confirmCatalogReconcile: '' }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept smoke open confirmation for catalog reconcile');

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_OPEN }, { functions: mock }),
    /Confirmation required for production-catalog-reconcile/
  );
  assert.equal(mock.calls.length, 0, 'Must NOT accept smoke open confirmation in confirmCatalogReconcile field');

  // 5. Exact catalog confirmation in confirmCatalogReconcile field -> ACCEPTED
  const res = await configureBillingRuntime(
    { mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE },
    { functions: mock }
  );
  assert.equal(res.verdict, 'P4_CATALOG_RECONCILIATION_SUCCESS');

  console.log('[TEST PASS] testCatalogReconcileConfirmationIsolation');
}

async function testExactAbsenceRollbackRestoresUnconfigured() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
  ]));
  mock.store.set('ai-gateway', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_ai', value: 'sandbox', secret: false }],
  ]));
  mock.store.set('coupons', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_cp', value: 'sandbox', secret: false }],
  ]));

  const origCreate = mock.createVariable.bind(mock);
  mock.createVariable = async (fnId, varId, key, value, secret) => {
    if (fnId === 'admin-devkit-data') {
      throw new Error('Simulated network failure on admin-devkit-data');
    }
    return await origCreate(fnId, varId, key, value, secret);
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on admin-devkit-data/
  );

  const aiVars = await mock.listVariables('ai-gateway');
  assert.equal(aiVars.variables.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT')?.value, 'sandbox');

  const cpVars = await mock.listVariables('coupons');
  assert.equal(cpVars.variables.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT')?.value, 'sandbox');

  const admVars = await mock.listVariables('admin-devkit-data');
  assert.equal(admVars.variables.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT'), undefined, 'admin-devkit-data MUST remain UNCONFIGURED (variable absent)');

  console.log('[TEST PASS] testExactAbsenceRollbackRestoresUnconfigured');
}

async function testFailedReadbackMismatchedConsumerIncludedInRollback() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
  ]));
  mock.store.set('ai-gateway', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_ai', value: 'sandbox', secret: false }],
  ]));
  mock.store.set('coupons', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_cp', value: 'sandbox', secret: false }],
  ]));

  const origList = mock.listVariables.bind(mock);
  let couponsUpdateAttempted = false;

  mock.updateVariable = async (fnId, varId, key, value, secret) => {
    if (fnId === 'coupons') couponsUpdateAttempted = true;
    const store = mock.store.get(fnId) || new Map();
    store.set(key, { id: varId, value, secret: Boolean(secret) });
    return { $id: varId, key, value, secret: Boolean(secret) };
  };

  mock.listVariables = async fnId => {
    if (fnId === 'coupons' && couponsUpdateAttempted) {
      return { variables: [{ $id: 'v_cp', key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }] };
    }
    return await origList(fnId);
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on coupons/
  );

  console.log('[TEST PASS] testFailedReadbackMismatchedConsumerIncludedInRollback');
}

async function testRollbackDeletionFailureReturnsOwnerActionRequired() {
  const mock = createMockFunctions();
  mock.store.set('billing-checkout', new Map([
    ['BILLING_CHECKOUT_ENABLED', { id: 'v_e', value: 'false', secret: false }],
  ]));
  mock.store.set('ai-gateway', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_ai', value: 'sandbox', secret: false }],
  ]));
  mock.store.set('coupons', new Map([
    ['BILLING_ACCESS_ENVIRONMENT', { id: 'v_cp', value: 'sandbox', secret: false }],
  ]));
  mock.store.set('admin-devkit-data', new Map()); // UNCONFIGURED initially

  const origCreate = mock.createVariable.bind(mock);
  let adminCreated = false;
  mock.createVariable = async (fnId, varId, key, value, secret) => {
    if (fnId === 'admin-devkit-data') {
      adminCreated = true;
    }
    return await origCreate(fnId, varId, key, value, secret);
  };

  const origList = mock.listVariables.bind(mock);
  let listCount = 0;
  mock.listVariables = async fnId => {
    if (adminCreated && fnId === 'admin-devkit-data') {
      listCount++;
      if (listCount === 1) {
        // Readback mismatch right after createVariable: return wrong value so setOrUpdateVariable throws
        return { variables: [{ $id: 'v_adm', key: 'BILLING_ACCESS_ENVIRONMENT', value: 'wrong_value', secret: false }] };
      }
      // During rollback restoreConsumerExactState: listVariables returns the created variable so existingCurrent is found!
      return { variables: [{ $id: 'v_adm', key: 'BILLING_ACCESS_ENVIRONMENT', value: 'production', secret: false }] };
    }
    return await origList(fnId);
  };

  mock.deleteVariable = async () => {
    throw new Error('Simulated Appwrite API 500 on deleteVariable');
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /CRITICAL_PARTIAL_ACCESS_TRANSITION_OWNER_ACTION_REQUIRED/
  );

  console.log('[TEST PASS] testRollbackDeletionFailureReturnsOwnerActionRequired');
}

async function testPreflightExactSafeGateBaseline() {
  const mockVarsMap = {
    'billing-checkout': validBillingCheckoutVars(),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'admin-devkit-data': [], // [UNCONFIGURED] is safe
  };

  const rep = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });
  assert.equal(rep.verdict, 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED');
  console.log('[TEST PASS] testPreflightExactSafeGateBaseline');
}

async function testPreflightBlockedByCheckoutEnabledTrue() {
  const mockVarsMap = {
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_ENABLED', value: 'true', secret: false }]),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'coupons': [],
    'admin-devkit-data': [],
  };

  const rep = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });
  assert.equal(rep.verdict, 'P4_PREFLIGHT_BLOCKED_CHECKOUT_ENABLED');
  console.log('[TEST PASS] testPreflightBlockedByCheckoutEnabledTrue');
}

async function testPreflightBlockedByProviderReadyTrue() {
  const mockVarsMap = {
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_PROVIDER_READY', value: 'true', secret: false }]),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'coupons': [],
    'admin-devkit-data': [],
  };

  const rep = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });
  assert.equal(rep.verdict, 'P4_PREFLIGHT_BLOCKED_PROVIDER_READY');
  console.log('[TEST PASS] testPreflightBlockedByProviderReadyTrue');
}

async function testPreflightBlockedByUnexpectedCheckoutEnvironment() {
  const mockVarsMap = {
    'billing-checkout': validBillingCheckoutVars([{ key: 'BILLING_CHECKOUT_ENVIRONMENT', value: 'production', secret: false }]),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'coupons': [],
    'admin-devkit-data': [],
  };

  const rep = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });
  assert.equal(rep.verdict, 'P4_PREFLIGHT_BLOCKED_ENVIRONMENT_STATE');
  console.log('[TEST PASS] testPreflightBlockedByUnexpectedCheckoutEnvironment');
}

async function testPreflightBlockedByAccessEnvironmentDrift() {
  const repAi = await runProductionPreflightAudit(null, {
    varsMap: {
      'billing-checkout': validBillingCheckoutVars(),
      'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'production', secret: false }],
      'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
      'admin-devkit-data': [],
    },
  });
  assert.equal(repAi.verdict, 'P4_PREFLIGHT_BLOCKED_ACCESS_ENVIRONMENT_STATE');

  const repCp = await runProductionPreflightAudit(null, {
    varsMap: {
      'billing-checkout': validBillingCheckoutVars(),
      'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
      'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'unexpected_val', secret: false }],
      'admin-devkit-data': [],
    },
  });
  assert.equal(repCp.verdict, 'P4_PREFLIGHT_BLOCKED_ACCESS_ENVIRONMENT_STATE');

  const repAdm = await runProductionPreflightAudit(null, {
    varsMap: {
      'billing-checkout': validBillingCheckoutVars(),
      'ai-gateway': [],
      'coupons': [],
      'admin-devkit-data': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'production', secret: false }],
    },
  });
  assert.equal(repAdm.verdict, 'P4_PREFLIGHT_BLOCKED_ACCESS_ENVIRONMENT_STATE');

  console.log('[TEST PASS] testPreflightBlockedByAccessEnvironmentDrift');
}

async function testUnconfiguredAccessStateDistinctFromSandbox() {
  const mockVarsMap = {
    'billing-checkout': validBillingCheckoutVars(),
    'ai-gateway': [],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox', secret: false }],
    'admin-devkit-data': [],
  };

  const rep = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });
  assert.equal(rep.functions['ai-gateway']['BILLING_ACCESS_ENVIRONMENT'], '[UNCONFIGURED]');
  assert.equal(rep.functions['coupons']['BILLING_ACCESS_ENVIRONMENT'], 'sandbox');
  assert.equal(rep.functions['admin-devkit-data']['BILLING_ACCESS_ENVIRONMENT'], '[UNCONFIGURED]');
  console.log('[TEST PASS] testUnconfiguredAccessStateDistinctFromSandbox');
}

async function testPreflightCatalogClassificationSecretsEmptyMissingMismatchUnverified() {
  const baseVars = validBillingCheckoutVars();
  const mockVarsMap = bcVars => ({
    'billing-checkout': bcVars,
    'ai-gateway': [],
    'coupons': [],
    'admin-devkit-data': [],
  });

  const secretVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, secret: true, value: '' } : v);
  const repSecret = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(secretVars) });
  assert.equal(repSecret.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET');

  const unverifiedVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, secret: undefined } : v);
  const repUnverified = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(unverifiedVars) });
  assert.equal(repUnverified.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET_UNVERIFIED');

  const missingVars = baseVars.filter(v => v.key !== 'BILLING_PRODUCTION_PRO_PRICE_ID');
  const repMissing = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(missingVars) });
  assert.equal(repMissing.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISSING');

  const emptyVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: '', secret: false } : v);
  const repEmpty = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(emptyVars) });
  assert.equal(repEmpty.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY');

  const mismatchVars = baseVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: 'pri_wrong_id', secret: false } : v);
  const repMismatch = await runProductionPreflightAudit(null, { varsMap: mockVarsMap(mismatchVars) });
  assert.equal(repMismatch.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH');

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

  await assert.rejects(
    () => configureBillingRuntime(
      { mode: 'production-catalog-reconcile', confirmCatalogReconcile: CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE },
      { functions: mock }
    ),
    /P4_CATALOG_RECONCILIATION_SECRET_METADATA_UNVERIFIED/
  );

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

  let readCount = 0;
  const origList = mock.listVariables.bind(mock);
  mock.listVariables = async fnId => {
    const res = await origList(fnId);
    readCount++;
    if (readCount > 10) {
      const found = res.variables.find(v => v.key === 'BILLING_CHECKOUT_ENABLED');
      if (found) found.value = 'true';
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

async function testWorkflowFileMainFreshnessAndStaticGuards() {
  const workflowPath = path.resolve(__dirname, '../../.github/workflows/configure-billing-runtime.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  assert.ok(content.includes('cancel-in-progress: false'), 'Workflow must explicitly disable cancellation to guarantee lock execution');
  assert.ok(content.includes('refs/heads/main'), 'Workflow must enforce refs/heads/main');
  assert.ok(content.includes('git rev-parse origin/main'), 'Workflow must verify HEAD matches origin/main');
  assert.ok(!content.includes('node scripts/configure_billing_runtime.cjs --mode='), 'Workflow MUST NOT interpolate inputs into shell command string');

  console.log('[TEST PASS] testWorkflowFileMainFreshnessAndStaticGuards');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testSmokeOpenConfirmationRequirement();
  await testCatalogReconcileConfirmationIsolation();
  await testExactAbsenceRollbackRestoresUnconfigured();
  await testFailedReadbackMismatchedConsumerIncludedInRollback();
  await testRollbackDeletionFailureReturnsOwnerActionRequired();
  await testPreflightExactSafeGateBaseline();
  await testPreflightBlockedByCheckoutEnabledTrue();
  await testPreflightBlockedByProviderReadyTrue();
  await testPreflightBlockedByUnexpectedCheckoutEnvironment();
  await testPreflightBlockedByAccessEnvironmentDrift();
  await testUnconfiguredAccessStateDistinctFromSandbox();
  await testPreflightCatalogClassificationSecretsEmptyMissingMismatchUnverified();
  await testUnchangedPathCannotBypassExplicitSecretFalse();
  await testPostReconciliationInvariantCheckFailsOnDrift();
  await testWorkflowFileMainFreshnessAndStaticGuards();

  console.log('\n[ALL 18 FOCUSED RUNTIME HARDENING & CATALOG RECONCILIATION TEST SUITES PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
