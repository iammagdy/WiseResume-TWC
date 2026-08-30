'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const { parseExplicitHubTargets } = require('../../scripts/appwrite-function-policy.cjs');

test('deploy-appwrite-hubs workflow exposes BILLING_SANDBOX_PADDLE_API_KEY to deployment step', () => {
  const workflow = read('.github/workflows/deploy-appwrite-hubs.yml');
  assert.match(
    workflow,
    /BILLING_SANDBOX_PADDLE_API_KEY:\s*\$\{\{\s*secrets\.BILLING_SANDBOX_PADDLE_API_KEY\s*\}\}/,
    'Workflow must expose BILLING_SANDBOX_PADDLE_API_KEY from secrets',
  );
  assert.doesNotMatch(
    workflow,
    /BILLING_PRODUCTION_PADDLE_API_KEY/,
    'Workflow must NOT expose Production Paddle key',
  );
});

test('scripts/deploy_hubs.cjs synchronizes BILLING_SANDBOX_PADDLE_API_KEY only for billing-checkout', () => {
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
  // Verify other hubs do not receive the billing secret
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
  }
});

test('ensureBillingCheckoutVariables fails closed when secret is absent from both env and remote', async () => {
  const deployHubs = require('../../scripts/deploy_hubs.cjs');
  const originalEnv = process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  delete process.env.BILLING_SANDBOX_PADDLE_API_KEY;
  try {
    await assert.rejects(
      async () => {
        await deployHubs.ensureBillingCheckoutVariables();
      },
      /BILLING_SANDBOX_PADDLE_API_KEY is required to deploy billing-checkout/,
      'Must fail closed with clear error message when secret is absent',
    );
  } finally {
    if (originalEnv) process.env.BILLING_SANDBOX_PADDLE_API_KEY = originalEnv;
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
