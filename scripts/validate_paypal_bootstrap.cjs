'use strict';

/**
 * Validates non-mutating PayPal bootstrap configuration for deployment.
 * Supports exactly 'sandbox' and 'production'. Rejects any aliases (test, live, prod, etc.).
 * Makes zero network/Appwrite/PayPal calls, mutates nothing, and logs no secret values.
 *
 * @param {Record<string, string | undefined>} [env=process.env]
 * @returns {{ ok: true, environment: 'sandbox' | 'production', hasWebhookId: boolean }}
 * @throws {Error} If required bootstrap configuration is missing or invalid.
 */
function validatePaypalBootstrapEnv(env = process.env) {
  const missing = [];

  const rawEnv = String(env.PAYPAL_ACCESS_ENVIRONMENT || '').trim().toLowerCase();
  if (!rawEnv) {
    missing.push('PAYPAL_ACCESS_ENVIRONMENT');
  } else if (rawEnv !== 'sandbox' && rawEnv !== 'production') {
    throw new Error(`PAYPAL_ACCESS_ENVIRONMENT must be 'sandbox' or 'production' (got '${rawEnv}')`);
  }

  const clientId = String(env.PAYPAL_CLIENT_ID || '').trim();
  if (!clientId) {
    missing.push('PAYPAL_CLIENT_ID');
  }

  const clientSecret = String(env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientSecret) {
    missing.push('PAYPAL_CLIENT_SECRET');
  }

  if (rawEnv === 'sandbox') {
    const qaUserId = String(env.BILLING_CHECKOUT_QA_USER_ID || '').trim();
    if (!qaUserId) {
      missing.push('BILLING_CHECKOUT_QA_USER_ID');
    }
  }

  if (missing.length > 0) {
    const envLabel = rawEnv === 'production' ? 'Production' : 'Sandbox';
    throw new Error(`Missing required PayPal ${envLabel} bootstrap configuration: ${missing.join(', ')}`);
  }

  const webhookId = String(env.PAYPAL_WEBHOOK_ID || '').trim();
  return {
    ok: true,
    environment: rawEnv,
    hasWebhookId: Boolean(webhookId),
  };
}

function main() {
  const result = validatePaypalBootstrapEnv(process.env);
  const mode = result.hasWebhookId ? 'Stage B (webhook activation)' : 'Stage A (initial bootstrap)';
  const envLabel = result.environment === 'production' ? 'Production' : 'Sandbox';
  console.log(`[validate-paypal-bootstrap] PayPal ${envLabel} bootstrap preflight validated (${mode}). Zero remote mutations performed.`);
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
