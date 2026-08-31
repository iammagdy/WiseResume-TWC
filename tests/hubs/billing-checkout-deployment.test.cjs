'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const { parseExplicitHubTargets } = require('../../scripts/appwrite-function-policy.cjs');

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
    'deploy_hubs.cjs must use ensureNonSecretCatalogVariable for Production catalog IDs',
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

test('ensureBillingCheckoutVariables fails closed when Sandbox secret is absent', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalSandboxEnv = process.env.BILLING_SANDBOX_PADDLE_API_KEY;
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
    if (originalSandboxEnv) process.env.BILLING_SANDBOX_PADDLE_API_KEY = originalSandboxEnv;
  }
});

test('ensureBillingCheckoutVariables fails closed when configured for Production and BILLING_PRODUCTION_PADDLE_API_KEY is absent', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalProdKey = process.env.BILLING_PRODUCTION_PADDLE_API_KEY;
  const originalProPrice = process.env.BILLING_PRODUCTION_PRO_PRICE_ID;
  const originalSandboxKey = process.env.BILLING_SANDBOX_PADDLE_API_KEY;

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

