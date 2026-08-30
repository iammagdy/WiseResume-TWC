'use strict';

const assert = require('node:assert/strict');
const {
  ALLOWED_MODES,
  ACCESS_CONSUMER_FUNCTIONS,
  PROD_CATALOG,
  parseArgs,
  validateProductionPreconditions,
  buildTargetMatrix,
  configureBillingRuntime,
} = require('../../scripts/configure_billing_runtime.cjs');

async function testParseArgs() {
  const parsed1 = parseArgs(['node', 'script.js', '--mode=production-smoke-open', '--approved-origin=https://buy.paddle.com']);
  assert.equal(parsed1.mode, 'production-smoke-open');
  assert.equal(parsed1.approvedOriginOverride, 'https://buy.paddle.com');

  const parsed2 = parseArgs(['node', 'script.js']);
  assert.equal(parsed2.mode, '');
  assert.equal(parsed2.approvedOriginOverride, '');

  console.log('[TEST PASS] parseArgs');
}

async function testUnknownModeRejection() {
  await assert.rejects(
    () => configureBillingRuntime({ mode: 'invalid-mode' }),
    /Invalid or missing mode: "invalid-mode"/
  );

  await assert.rejects(
    () => configureBillingRuntime({ mode: '' }),
    /Invalid or missing mode: ""/
  );

  console.log('[TEST PASS] testUnknownModeRejection');
}

async function testPreconditionsValidation() {
  const validVars = [
    { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: 'secret-key-present' },
    { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PRO_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID },
    { key: 'BILLING_CHECKOUT_APPROVED_ORIGIN', value: 'https://buy.paddle.com' },
  ];

  const origin = validateProductionPreconditions(validVars);
  assert.equal(origin, 'https://buy.paddle.com');

  // Test missing prod key
  const missingKeyVars = validVars.filter(v => v.key !== 'BILLING_PRODUCTION_PADDLE_API_KEY');
  assert.throws(
    () => validateProductionPreconditions(missingKeyVars),
    /BILLING_PRODUCTION_PADDLE_API_KEY is missing/
  );

  // Test invalid catalog
  const invalidCatalogVars = validVars.map(v => v.key === 'BILLING_PRODUCTION_PRO_PRICE_ID' ? { ...v, value: 'wrong_id' } : v);
  assert.throws(
    () => validateProductionPreconditions(invalidCatalogVars),
    /BILLING_PRODUCTION_PRO_PRICE_ID mismatch/
  );

  // Test missing approved origin throws P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION
  const missingOriginVars = validVars.filter(v => v.key !== 'BILLING_CHECKOUT_APPROVED_ORIGIN');
  assert.throws(
    () => validateProductionPreconditions(missingOriginVars),
    /P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION/
  );

  console.log('[TEST PASS] testPreconditionsValidation');
}

async function testMatrixGenerationAndConsumerIsolation() {
  // Test production-smoke-open
  const matrixOpen = buildTargetMatrix('production-smoke-open', 'https://buy.paddle.com');
  assert.equal(matrixOpen.length, 1);
  assert.equal(matrixOpen[0].functionId, 'billing-checkout');
  assert.deepEqual(matrixOpen[0].vars, [
    ['BILLING_CHECKOUT_ENVIRONMENT', 'production'],
    ['BILLING_CHECKOUT_PROVIDER_READY', 'true'],
    ['BILLING_CHECKOUT_ENABLED', 'true'],
    ['BILLING_CHECKOUT_APPROVED_ORIGIN', 'https://buy.paddle.com'],
  ]);

  // Test production-smoke-lock
  const matrixLock = buildTargetMatrix('production-smoke-lock');
  assert.equal(matrixLock.length, 1);
  assert.equal(matrixLock[0].functionId, 'billing-checkout');
  assert.deepEqual(matrixLock[0].vars, [
    ['BILLING_CHECKOUT_ENVIRONMENT', 'production'],
    ['BILLING_CHECKOUT_PROVIDER_READY', 'false'],
    ['BILLING_CHECKOUT_ENABLED', 'false'],
  ]);

  // Test production-access-enable
  const matrixAccess = buildTargetMatrix('production-access-enable');
  assert.equal(matrixAccess.length, 4); // billing-checkout + 3 consumers
  assert.equal(matrixAccess[0].functionId, 'billing-checkout');

  const consumerIds = matrixAccess.slice(1).map(item => item.functionId);
  assert.deepEqual(consumerIds, ['ai-gateway', 'coupons', 'admin-devkit-data']);

  // Strictly verify revenuecat-webhook is NOT in consumer list
  assert.ok(!consumerIds.includes('revenuecat-webhook'));

  // Strictly verify coupons IS in consumer list
  assert.ok(consumerIds.includes('coupons'));

  for (const consumerItem of matrixAccess.slice(1)) {
    assert.deepEqual(consumerItem.vars, [['BILLING_ACCESS_ENVIRONMENT', 'production']]);
  }

  // Test emergency-prepayment-sandbox-restore
  const matrixRestore = buildTargetMatrix('emergency-prepayment-sandbox-restore');
  assert.equal(matrixRestore[0].functionId, 'billing-checkout');
  assert.deepEqual(matrixRestore[0].vars, [
    ['BILLING_CHECKOUT_ENVIRONMENT', 'sandbox'],
    ['BILLING_CHECKOUT_PROVIDER_READY', 'false'],
    ['BILLING_CHECKOUT_ENABLED', 'false'],
  ]);

  console.log('[TEST PASS] testMatrixGenerationAndConsumerIsolation');
}

async function testReadbackMismatchFailClosed() {
  const mockFunctions = {
    async updateVariable(functionId, id, key, value) {
      // Simulate return value mismatch
      return { $id: id, key, value: 'mismatched_value' };
    },
    async createVariable(functionId, key, value) {
      return { $id: 'v1', key, value: 'mismatched_value' };
    },
  };

  const validVars = [
    { key: 'BILLING_PRODUCTION_PADDLE_API_KEY', value: 'present' },
    { key: 'BILLING_PRODUCTION_PRO_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PRO_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PRO_PRODUCT_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRICE_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRICE_ID },
    { key: 'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID', value: PROD_CATALOG.BILLING_PRODUCTION_PREMIUM_PRODUCT_ID },
    { key: 'BILLING_CHECKOUT_APPROVED_ORIGIN', value: 'https://buy.paddle.com' },
  ];

  await assert.rejects(
    () => configureBillingRuntime({
      mode: 'production-smoke-open',
      approvedOriginOverride: 'https://buy.paddle.com',
    }, {
      functions: mockFunctions,
      billingCheckoutVars: validVars,
      existingVarsMap: { 'billing-checkout': [] },
    }),
    /READBACK MISMATCH/
  );

  console.log('[TEST PASS] testReadbackMismatchFailClosed');
}

async function runAllTests() {
  await testParseArgs();
  await testUnknownModeRejection();
  await testPreconditionsValidation();
  await testMatrixGenerationAndConsumerIsolation();
  await testReadbackMismatchFailClosed();
  console.log('\n[ALL TESTS PASSED SUCCESSFULLY]');
}

runAllTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
