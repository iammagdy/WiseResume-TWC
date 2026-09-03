'use strict';

/**
 * Validates non-mutating PayPal bootstrap configuration for Stage A deployment.
 * Makes zero network/Appwrite/PayPal calls, mutates nothing, and logs no secret values.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ ok: true, environment: 'sandbox', hasWebhookId: boolean }}
 * @throws {Error} If required bootstrap configuration is missing or invalid.
 */
function validatePaypalBootstrapEnv(env = process.env) {
  const missing = [];

  const rawEnv = String(env.PAYPAL_ACCESS_ENVIRONMENT || '').trim().toLowerCase();
  if (!rawEnv) {
    missing.push('PAYPAL_ACCESS_ENVIRONMENT');
  } else if (rawEnv !== 'sandbox') {
    throw new Error(`PAYPAL_ACCESS_ENVIRONMENT must be 'sandbox' for PayPal Sandbox bootstrap (got '${rawEnv}')`);
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  if (!clientId) {
    missing.push('PAYPAL_CLIENT_ID');
  }

  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientSecret) {
    missing.push('PAYPAL_CLIENT_SECRET');
  }

  const qaUserId = String(env.BILLING_CHECKOUT_QA_USER_ID || '').trim();
  if (!qaUserId) {
    missing.push('BILLING_CHECKOUT_QA_USER_ID');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required PayPal Sandbox bootstrap configuration: ${missing.join(', ')}`);
  }

  const webhookId = String(env.PAYPAL_WEBHOOK_ID || '').trim();
  return {
    ok: true,
    environment: 'sandbox',
    hasWebhookId: Boolean(webhookId),
  };
}

function main() {
  const result = validatePaypalBootstrapEnv(process.env);
  const mode = result.hasWebhookId ? 'Stage B (webhook activation)' : 'Stage A (initial bootstrap)';
  console.log(`[validate-paypal-bootstrap] PayPal Sandbox bootstrap preflight validated (${mode}). Zero remote mutations performed.`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`[validate-paypal-bootstrap] PREFLIGHT FAILED: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  validatePaypalBootstrapEnv,
};