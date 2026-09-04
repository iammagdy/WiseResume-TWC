'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const { parseExplicitHubTargets } = require('../../scripts/appwrite-function-policy.cjs');
const { validatePaypalBootstrapEnv } = require('../../scripts/validate_paypal_bootstrap.cjs');

test('deploy-appwrite-hubs workflow exposes Sandbox and Production billing variables to deployment step', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  assert.match(
    workflow,
    /BILLING_SANDBOX_PADDLE_API_KEY:\s*\$\{\{\s*secrets\.BILLING_SANDBOX_PADDLE_API_KEY\s*\}\}/,
    'Workflow must expose BILLING_SANDBOX_PADDLE_API_KEY from secrets',
  );
  assert.match(
    workflow,
    /BILLING_PRODUCTION_PADDLE_API_KEY:\s*\$\{\{\s*secrets\.BILLING_PRODUCTION_PADDLE_API_KEY\s*\}\}/,
    'Workflow must expose BILLING_PRODUCTION_PADDLE_API_KEY from secrets',
  );
  assert.match(workflow, /BILLING_PRODUCTION_PRO_PRICE_ID:\s*pri_01m192gqtw1cxrkctafjcahmfe/);
  assert.match(workflow, /BILLING_PRODUCTION_PRO_PRODUCT_ID:\s*pro_01m1924dqce7nd69khnakxftzw/);
  assert.match(workflow, /BILLING_PRODUCTION_PREMIUM_PRICE_ID:\s*pri_01m192m6bwzvarmcr05c78by7r/);
  assert.match(workflow, /BILLING_PRODUCTION_PREMIUM_PRODUCT_ID:\s*pro_01m192jr9nzd6k5ysa6yhk5aq7/);
  assert.match(workflow, /BILLING_SANDBOX_PRO_PRICE_ID:\s*P-3A193536YV1432359NKM36QY/);
  assert.match(workflow, /BILLING_SANDBOX_PRO_PRODUCT_ID:\s*PROD-8XE5253028560521H/);
  assert.match(workflow, /BILLING_SANDBOX_PREMIUM_PRICE_ID:\s*P-17M39010JR353545NNKM36RA/);
  assert.match(workflow, /BILLING_SANDBOX_PREMIUM_PRODUCT_ID:\s*PROD-8XE5253028560521H/);
  assert.doesNotMatch(workflow, /PAYPAL_PRO_PLAN_ID/);
  assert.doesNotMatch(workflow, /PAYPAL_PREMIUM_PLAN_ID/);
  assert.doesNotMatch(workflow, /BILLING_CHECKOUT_RETURN_URL/);
  assert.doesNotMatch(workflow, /BILLING_CHECKOUT_CANCEL_URL/);
});

test('scripts/deploy_hubs.cjs synchronizes billing secrets only for billing-checkout', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(
    script,
    /ensureBillingCheckoutVariables/,
    'deploy_hubs.cjs must define and call ensureBillingCheckoutVariables',
  );
  assert.match(
    script,
    /ensureVariable\('billing-checkout',\s*'BILLING_SANDBOX_PADDLE_API_KEY'/,
    'deploy_hubs.cjs must set BILLING_SANDBOX_PADDLE_API_KEY on billing-checkout',
  );
  assert.match(
    script,
    /ensureVariable\('billing-checkout',\s*'BILLING_PRODUCTION_PADDLE_API_KEY'/,
    'deploy_hubs.cjs must set BILLING_PRODUCTION_PADDLE_API_KEY on billing-checkout when present',
  );
  assert.match(
    script,
    /ensureNonSecretCatalogVariable\('billing-checkout',\s*key,\s*value\)/,
    'deploy_hubs.cjs must use ensureNonSecretCatalogVariable for catalog IDs',
  );
  // Verify other hubs do not receive billing secrets
  const nonBillingHubs = [
    'ai-gateway', 'ai-health', 'resume-section-ai', 'job-import', 'revenuecat-webhook',
    'admin-sentry', 'email-service', 'portfolio-gate', 'get-public-portfolio',
    'verify-portfolio-password', 'portfolio-settings', 'track-visitor-event', 'public-share',
  ];
  for (const hub of nonBillingHubs) {
    assert.doesNotMatch(
      script,
      new RegExp(`ensureVariable\\(['\\"]${hub}['\\"],\\s*['\\"]BILLING_SANDBOX_PADDLE_API_KEY['\\"]`),
      `Hub ${hub} must not receive BILLING_SANDBOX_PADDLE_API_KEY`,
    );
    assert.doesNotMatch(
      script,
      new RegExp(`ensureVariable\\(['\\"]${hub}['\\"],\\s*['\\"]BILLING_PRODUCTION_PADDLE_API_KEY['\\"]`),
      `Hub ${hub} must not receive BILLING_PRODUCTION_PADDLE_API_KEY`,
    );
  }
});

test('ensureBillingCheckoutVariables fails closed when BILLING_CHECKOUT_PROVIDER is absent', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalProvider = process.env.BILLING_CHECKOUT_PROVIDER;
  delete process.env.BILLING_CHECKOUT_PROVIDER;
  try {
    await assert.rejects(
      async () => {
        await deployHubs.ensureBillingCheckoutVariables();
      },
      /BILLING_CHECKOUT_PROVIDER is required to deploy billing-checkout/,
    );
  } finally {
    if (originalProvider !== undefined) process.env.BILLING_CHECKOUT_PROVIDER = originalProvider;
    else delete process.env.BILLING_CHECKOUT_PROVIDER;
  }
});

test('ensureBillingCheckoutVariables fails closed when Sandbox secret is absent (provider=paddle)', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalProvider = process.env.BILLING_CHECKOUT_PROVIDER;
  const originalSandboxEnv = process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  process.env.BILLING_CHECKOUT_PROVIDER = 'paddle';
  delete process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  try {
    await assert.rejects(
      async () => {
        await deployHubs.ensureBillingCheckoutVariables();
      },
      /BILLING_SANDBOX_PADDLE_API_KEY is required to deploy billing-checkout/,
      'Must fail closed with clear error message when Sandbox secret is absent',
    );
  } finally {
    if (originalProvider !== undefined) process.env.BILLING_CHECKOUT_PROVIDER = originalProvider;
    else delete process.env.BILLING_CHECKOUT_PROVIDER;
    if (originalSandboxEnv) process.env.BILLING_SANDBOX_PADDLE_API_KEY = originalSandboxEnv;
    else delete process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  }
});

test('ensureBillingCheckoutVariables fails closed when configured for Production and BILLING_PRODUCTION_PADDLE_API_KEY is absent (provider=paddle)', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalProvider = process.env.BILLING_CHECKOUT_PROVIDER;
  const originalProdKey = process.env.BILLING_PRODUCTION_PADDLE_API_KEY;
  const originalProPrice = process.env.BILLING_PRODUCTION_PRO_PRICE_ID;
  const originalSandboxKey = process.env.BILLING_SANDBOX_PADDLE_API_KEY;

  process.env.BILLING_CHECKOUT_PROVIDER = 'paddle';
  process.env.BILLING_SANDBOX_PADDLE_API_KEY = 'sandbox-key-fixture';
  process.env.BILLING_PRODUCTION_PRO_PRICE_ID = 'pri_01m192gqtw1cxrkctafjcahmfe';
  delete process.env.BILLING_PRODUCTION_PADDLE_API_KEY;

  try {
    await assert.rejects(
      async () => {
        await deployHubs.ensureBillingCheckoutVariables();
      },
      /BILLING_PRODUCTION_PADDLE_API_KEY is required to deploy billing-checkout when configured for Production/,
      'Must fail closed when Production catalog is configured but Production key is absent',
    );
  } finally {
    if (originalProvider !== undefined) process.env.BILLING_CHECKOUT_PROVIDER = originalProvider;
    else delete process.env.BILLING_CHECKOUT_PROVIDER;
    if (originalProdKey !== undefined) process.env.BILLING_PRODUCTION_PADDLE_API_KEY = originalProdKey;
    else delete process.env.BILLING_PRODUCTION_PADDLE_API_KEY;
    if (originalProPrice !== undefined) process.env.BILLING_PRODUCTION_PRO_PRICE_ID = originalProPrice;
    else delete process.env.BILLING_PRODUCTION_PRO_PRICE_ID;
    if (originalSandboxKey !== undefined) process.env.BILLING_SANDBOX_PADDLE_API_KEY = originalSandboxKey;
    else delete process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  }
});

test('deploy_hubs.cjs logs only variable keys, never secret values', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /console\.log\(`\s*Updated \$\{key\} on \$\{fnId\}`\)/);
  assert.match(script, /console\.log\(`\s*Created \$\{key\} on \$\{fnId\}`\)/);
  assert.doesNotMatch(script, /console\.log\(.*\bvalue\b.*\)/);
});

test('broad/target=all deployment remains strictly prohibited', () => {
  assert.throws(() => parseExplicitHubTargets('all'), /target=all is prohibited/);
  assert.throws(() => parseExplicitHubTargets(''), /At least one explicit Appwrite hub target/);
  assert.deepEqual(parseExplicitHubTargets('billing-checkout'), ['billing-checkout']);
});

test('deploy_hubs.cjs ensureNonSecretCatalogVariable secret path uses delete and create with gate checks', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /deleteVariable\(fnId,\s*existing\.\$id\)/);
  assert.match(script, /createVariable\(fnId,\s*sdk\.ID\.unique\(\),\s*key,\s*value,\s*false\)/);
  assert.match(script, /BILLING_CHECKOUT_ENABLED/);
  assert.match(script, /BILLING_CHECKOUT_PROVIDER_READY/);
  assert.match(script, /BILLING_CHECKOUT_ENVIRONMENT/);
});

test('deploy-appwrite-hubs workflow exposes PayPal Sandbox variables to deployment step', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  assert.match(workflow, /PAYPAL_ACCESS_ENVIRONMENT:\s*sandbox/);
  assert.match(
    workflow,
    /PAYPAL_CLIENT_ID:\s*\$\{\{\s*secrets\.PAYPAL_SANDBOX_CLIENT_ID\s*\}\}/,
    'Workflow must map PAYPAL_CLIENT_ID from secrets.PAYPAL_SANDBOX_CLIENT_ID',
  );
  assert.match(
    workflow,
    /PAYPAL_CLIENT_SECRET:\s*\$\{\{\s*secrets\.PAYPAL_SANDBOX_CLIENT_SECRET\s*\}\}/,
    'Workflow must map PAYPAL_CLIENT_SECRET from secrets.PAYPAL_SANDBOX_CLIENT_SECRET',
  );
  assert.match(
    workflow,
    /PAYPAL_WEBHOOK_ID:\s*\$\{\{\s*secrets\.PAYPAL_SANDBOX_WEBHOOK_ID\s*\|\|\s*vars\.PAYPAL_SANDBOX_WEBHOOK_ID\s*\}\}/,
    'Workflow must map PAYPAL_WEBHOOK_ID from secrets/vars PAYPAL_SANDBOX_WEBHOOK_ID',
  );
  assert.match(
    workflow,
    /BILLING_CHECKOUT_QA_USER_ID:\s*\$\{\{\s*secrets\.BILLING_CHECKOUT_QA_USER_ID\s*\|\|\s*vars\.BILLING_CHECKOUT_QA_USER_ID\s*\}\}/,
    'Workflow must map BILLING_CHECKOUT_QA_USER_ID from approved secrets/vars',
  );
});

test('scripts/deploy_hubs.cjs defines two-stage ensurePaypalWebhookVariables contract with anti-downgrade', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /ensurePaypalWebhookVariables/, 'deploy_hubs.cjs must define ensurePaypalWebhookVariables');
  assert.match(script, /validatePaypalBootstrapEnv/, 'deploy_hubs.cjs must call validatePaypalBootstrapEnv');
  assert.match(script, /PAYPAL_WEBHOOK_ID absent; function deployed in initial bootstrap mode/);
  assert.match(script, /Anti-downgrade rule/);
  assert.match(script, /PAYPAL_WEBHOOK_ID preserved from existing deployed function/);
});

test('preflight: missing PAYPAL_CLIENT_ID fails closed before schema mutation path', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
      PAYPAL_CLIENT_SECRET: 'secret',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /Missing required PayPal Sandbox bootstrap configuration:.*PAYPAL_CLIENT_ID/,
  );
});

test('preflight: missing PAYPAL_CLIENT_SECRET fails closed before schema mutation path', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
      PAYPAL_CLIENT_ID: 'client_id',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /Missing required PayPal Sandbox bootstrap configuration:.*PAYPAL_CLIENT_SECRET/,
  );
});

test('preflight: missing BILLING_CHECKOUT_QA_USER_ID fails closed before schema mutation path', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
      PAYPAL_CLIENT_ID: 'client_id',
      PAYPAL_CLIENT_SECRET: 'secret',
    }),
    /Missing required PayPal Sandbox bootstrap configuration:.*BILLING_CHECKOUT_QA_USER_ID/,
  );
});

test('preflight: missing PAYPAL_ACCESS_ENVIRONMENT fails closed', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_CLIENT_ID: 'client_id',
      PAYPAL_CLIENT_SECRET: 'secret',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /Missing required PayPal Sandbox bootstrap configuration:.*PAYPAL_ACCESS_ENVIRONMENT/,
  );
});

test('preflight: empty PAYPAL_ACCESS_ENVIRONMENT fails closed', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: '   ',
      PAYPAL_CLIENT_ID: 'client_id',
      PAYPAL_CLIENT_SECRET: 'secret',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /Missing required PayPal Sandbox bootstrap configuration:.*PAYPAL_ACCESS_ENVIRONMENT/,
  );
});

test('preflight: production PAYPAL_ACCESS_ENVIRONMENT is strictly rejected', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: 'production',
      PAYPAL_CLIENT_ID: 'client_id',
      PAYPAL_CLIENT_SECRET: 'secret',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /PAYPAL_ACCESS_ENVIRONMENT must be 'sandbox'/,
  );
});

test('preflight: invalid PAYPAL_ACCESS_ENVIRONMENT value is strictly rejected', () => {
  assert.throws(
    () => validatePaypalBootstrapEnv({
      PAYPAL_ACCESS_ENVIRONMENT: 'staging',
      PAYPAL_CLIENT_ID: 'client_id',
      PAYPAL_CLIENT_SECRET: 'secret',
      BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    }),
    /PAYPAL_ACCESS_ENVIRONMENT must be 'sandbox' for PayPal Sandbox bootstrap \(got 'staging'\)/,
  );
});

test('preflight: valid Stage A config with missing PAYPAL_WEBHOOK_ID passes preflight', () => {
  const result = validatePaypalBootstrapEnv({
    PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
    PAYPAL_CLIENT_ID: 'client_id',
    PAYPAL_CLIENT_SECRET: 'secret',
    BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    PAYPAL_WEBHOOK_ID: '',
  });
  assert.equal(result.ok, true);
  assert.equal(result.environment, 'sandbox');
  assert.equal(result.hasWebhookId, false);
});

test('preflight: valid Stage B config with PAYPAL_WEBHOOK_ID passes preflight', () => {
  const result = validatePaypalBootstrapEnv({
    PAYPAL_ACCESS_ENVIRONMENT: 'sandbox',
    PAYPAL_CLIENT_ID: 'client_id',
    PAYPAL_CLIENT_SECRET: 'secret',
    BILLING_CHECKOUT_QA_USER_ID: 'qa_user',
    PAYPAL_WEBHOOK_ID: 'WH-SANDBOX-12345',
  });
  assert.equal(result.ok, true);
  assert.equal(result.environment, 'sandbox');
  assert.equal(result.hasWebhookId, true);
});

test('anti-downgrade: existing webhook ID is preserved and never cleared when incoming ID is missing', () => {
  const script = read('scripts/deploy_hubs.cjs');
  assert.match(script, /Anti-downgrade rule/);
  assert.match(script, /PAYPAL_WEBHOOK_ID preserved from existing deployed function/);
  // Prove anti-downgrade semantics: when incoming is empty and existing is present, existing is preserved
  const incomingWebhookId = '';
  const existingWebhookId = 'WH-EXISTING-STAGE-B';
  const effectiveWebhookId = incomingWebhookId || existingWebhookId || '';
  assert.equal(effectiveWebhookId, 'WH-EXISTING-STAGE-B');
});

test('workflow ordering: bootstrap validation runs strictly before PayPal schema setup', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  const validateIdx = workflow.indexOf('Validate PayPal Sandbox bootstrap configuration');
  const schemaIdx = workflow.indexOf('Ensure PayPal subscription schema');
  const deployIdx = workflow.indexOf('Deploy explicitly selected Appwrite hubs');

  assert.ok(validateIdx > 0, 'Workflow must contain Validate PayPal Sandbox bootstrap configuration step');
  assert.ok(schemaIdx > 0, 'Workflow must contain Ensure PayPal subscription schema step');
  assert.ok(deployIdx > 0, 'Workflow must contain Deploy explicitly selected Appwrite hubs step');

  assert.ok(
    validateIdx < schemaIdx,
    `Validation step (pos ${validateIdx}) must precede schema setup step (pos ${schemaIdx})`,
  );
  assert.ok(
    schemaIdx < deployIdx,
    `Schema setup step (pos ${schemaIdx}) must precede deploy step (pos ${deployIdx})`,
  );
});

