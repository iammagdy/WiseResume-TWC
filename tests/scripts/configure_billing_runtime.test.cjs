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
    {}
  );
  assert.equal(parsed1.mode, 'production-smoke-open');
  assert.equal(parsed1.confirm, 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT');

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
  // 1. No marker -> reject
  assert.throws(
    () => assertExecutionEnvironment({}),
    /\[FATAL EXECUTION GUARD\]/
  );

  // 2. Marker only, local -> reject
  assert.throws(
    () => assertExecutionEnvironment({ WISERESUME_BILLING_RUNTIME_AUTOMATION: '1' }),
    /\[FATAL EXECUTION GUARD\]/
  );

  // 3. Marker + fake local main ref, GITHUB_ACTIONS absent -> reject
  assert.throws(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_REF: 'refs/heads/main',
    }),
    /\[FATAL EXECUTION GUARD\]/
  );

  // 4. Actions feature branch -> reject
  assert.throws(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_ACTIONS: 'true',
      GITHUB_REF: 'refs/heads/feature-branch',
      GITHUB_EVENT_NAME: 'workflow_dispatch',
    }),
    /\[FATAL EXECUTION GUARD\]/
  );

  // 5. Actions main but wrong event -> reject
  assert.throws(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_ACTIONS: 'true',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_NAME: 'push',
    }),
    /\[FATAL EXECUTION GUARD\]/
  );

  // 6. Exact approved Actions/main/workflow_dispatch context -> accept
  assert.doesNotThrow(
    () => assertExecutionEnvironment({
      WISERESUME_BILLING_RUNTIME_AUTOMATION: '1',
      GITHUB_ACTIONS: 'true',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_EVENT_NAME: 'workflow_dispatch',
    })
  );

  console.log('[TEST PASS] testExecutionEnvironmentGuard');
}

async function testArbitraryApprovedOriginRejected() {
  const validVars = validBillingCheckoutVars();

  // Any attempt to run smoke-open without an explicitly verified constant origin fails
  assert.throws(
    () => validateProductionPreconditions(validVars),
    /P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION/
  );

  console.log('[TEST PASS] testArbitraryApprovedOriginRejected');
}

async function testStrictNonSecretPreflightAllowlist() {
  const mockVarsMap = {
    'billing-checkout': [
      { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: 'raw_secret_key_123', secret: true },
      { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID },
      { key: 'UNALLOWLISTED_ADMIN_TOKEN', value: 'sensitive_admin_token' },
    ],
    'ai-gateway': [
      { key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' },
      { key: 'OPENROUTER_SECRET_KEY', value: 'secret_openrouter_val' },
    ],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'admin-devkit-data': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
  };

  const report = await runProductionPreflightAudit(null, { varsMap: mockVarsMap });

  // Unallowlisted variables MUST NOT appear in report output
  assert.equal(report.functions['billing-checkout']['UNALLOWLISTED_ADMIN_TOKEN'], undefined);
  assert.equal(report.functions['ai-gateway']['OPENROUTER_SECRET_KEY'], undefined);

  // Secret paddle key value MUST be masked
  assert.equal(report.functions['billing-checkout']['BILLING_PRODUCTION_PADDLE_API_KEY'], '[PRESENT (secret_flag=true)]');

  // Test secret === false fails if metadata field exists
  const mockVarsNotSecret = {
    'billing-checkout': [
      { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: 'exposed_key', secret: false },
      { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID },
      { key: 'BILLING_PRODUCTION_PRO_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID },
      { key: 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID },
      { key: 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID },
    ],
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'admin-devkit-data': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
  };

  const reportNotSecret = await runProductionPreflightAudit(null, { varsMap: mockVarsNotSecret });
  assert.equal(reportNotSecret.verdict, 'P4_PREFLIGHT_BLOCKED_SECRET_FAIL_NOT_SECRET');

  console.log('[TEST PASS] testStrictNonSecretPreflightAllowlist');
}

async function testPreflightVerdictContract() {
  // Preconditions match -> P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED
  const validVarsMap = {
    'billing-checkout': validBillingCheckoutVars(),
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'admin-devkit-data': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
  };
  const report1 = await runProductionPreflightAudit(null, { varsMap: validVarsMap });
  assert.equal(report1.verdict, 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED');

  // Catalog missing -> P4_PREFLIGHT_BLOCKED_CATALOG_MISSING
  const missingCatalogVarsMap = {
    'billing-checkout': [{ key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: 'present', secret: true }],
    'ai-gateway': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'coupons': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
    'admin-devkit-data': [{ key: 'BILLING_ACCESS_ENVIRONMENT', value: 'sandbox' }],
  };
  const report2 = await runProductionPreflightAudit(null, { varsMap: missingCatalogVarsMap });
  assert.equal(report2.verdict, 'P4_PREFLIGHT_BLOCKED_CATALOG_MISSING');

  console.log('[TEST PASS] testPreflightVerdictContract');
}

async function testWorkflowFileMainFreshnessAndSafetyGuards() {
  const workflowPath = path.join(process.cwd(), '.github/workflows/configure-billing-runtime.yml');
  const content = fs.readFileSync(workflowPath, 'utf8');

  // Verify cancel-in-progress: false
  assert.ok(content.includes('cancel-in-progress: false'), 'Workflow MUST set cancel-in-progress: false');

  // Verify main SHA freshness guard
  assert.ok(content.includes('git fetch origin main --depth=1'), 'Workflow MUST fetch origin main');
  assert.ok(content.includes('CURRENT_HEAD=$(git rev-parse HEAD)'), 'Workflow MUST parse HEAD');
  assert.ok(content.includes('ORIGIN_MAIN=$(git rev-parse origin/main)'), 'Workflow MUST parse origin/main');

  // Verify no input interpolation inside run: blocks
  const runBlocks = content.split('\n')
    .filter(line => line.trim().startsWith('run:'))
    .join('\n');
  assert.ok(!runBlocks.includes('${{ inputs.'), 'Workflow run: blocks MUST NOT contain ${{ inputs.* }} interpolation');

  console.log('[TEST PASS] testWorkflowFileMainFreshnessAndSafetyGuards');
}

async function testProductionAccessEnablePartialFailureRollback() {
  const store = new Map();
  function getStore(fnId) {
    if (!store.has(fnId)) store.set(fnId, new Map());
    return store.get(fnId);
  }

  getStore('billing-checkout');
  getStore('ai-gateway').set('BILLING_ACCESS_ENVIRONMENT', 'sandbox');
  getStore('coupons').set('BILLING_ACCESS_ENVIRONMENT', 'sandbox');
  getStore('admin-devkit-data').set('BILLING_ACCESS_ENVIRONMENT', 'sandbox');

  let updateCount = 0;

  const mock = {
    async listVariables(fnId) {
      const fnStore = getStore(fnId);
      const variables = [];
      for (const [k, v] of fnStore.entries()) {
        variables.push({ $id: `id_${k}`, key: k, value: v, functionId: fnId });
      }
      return { variables };
    },
    async createVariable(fnId, varId, key, val) {
      return this.updateVariable(fnId, varId, key, val);
    },
    async updateVariable(fnId, varId, key, val) {
      if (fnId === 'coupons') {
        throw new Error('Simulated coupons update network failure');
      }
      const fnStore = getStore(fnId);
      fnStore.set(key, val);
      return { $id: varId, key, value: val };
    },
  };

  await assert.rejects(
    () => configureBillingRuntime({ mode: 'production-access-enable' }, { functions: mock }),
    /ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on coupons/
  );

  // Verify ai-gateway was rolled back to prior value ('sandbox')
  const aiGatewayStore = getStore('ai-gateway');
  assert.equal(aiGatewayStore.get('BILLING_ACCESS_ENVIRONMENT'), 'sandbox');

  console.log('[TEST PASS] testProductionAccessEnablePartialFailureRollback');
}

async function testRequireLiveRemoteCatalogWithoutProcessEnvFallback() {
  const validVars = validBillingCheckoutVars();

  // Test missing live remote catalog variable fails even if process.env holds it
  const missingProPriceVars = validVars.filter(v => v.key !== 'BILLING_PRODUCTION_PRO_PRICE_ID');
  assert.throws(
    () => validateProductionPreconditions(missingProPriceVars),
    /Live remote variable BILLING_PRODUCTION_PRO_PRICE_ID is MISSING/
  );

  console.log('[TEST PASS] testRequireLiveRemoteCatalogWithoutProcessEnvFallback');
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

  await configureBillingRuntime({ mode: 'production-smoke-lock' }, { functions: mock });

  const createCalls = mock.calls.filter(c => c.method === 'createVariable');
  assert.ok(createCalls.length > 0);
  for (const call of createCalls) {
    assert.ok(call.variableId, 'variableId parameter must be passed to createVariable');
    assert.equal(typeof call.variableId, 'string');
  }

  console.log('[TEST PASS] testCreateVariableSignatureConstraint');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testExecutionEnvironmentGuard();
  await testArbitraryApprovedOriginRejected();
  await testStrictNonSecretPreflightAllowlist();
  await testPreflightVerdictContract();
  await testWorkflowFileMainFreshnessAndSafetyGuards();
  await testProductionAccessEnablePartialFailureRollback();
  await testRequireLiveRemoteCatalogWithoutProcessEnvFallback();
  await testCreateVariableSignatureConstraint();
  console.log('\n[ALL TRUST BOUNDARY CLOSURE TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
