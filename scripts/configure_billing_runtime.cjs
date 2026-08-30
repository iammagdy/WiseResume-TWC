'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnvFile('.env.deploy');

const ALLOWED_MODES = new Set([
  'production-smoke-open',
  'production-smoke-lock',
  'production-access-enable',
  'emergency-prepayment-sandbox-restore',
]);

const ACCESS_CONSUMER_FUNCTIONS = Object.freeze([
  'ai-gateway',
  'coupons',
  'admin-devkit-data',
]);

const PROD_CATALOG = Object.freeze({
  BILLING_PRODUCTION_PRO_PRICE_ID: 'pri_01m192gqtw1cxrkctafjcahmfe',
  BILLING_PRODUCTION_PRO_PRODUCT_ID: 'pro_01m1924dqce7nd69khnakxftzw',
  BILLING_PRODUCTION_PREMIUM_PRICE_ID: 'pri_01m192m6bwzvarmcr05c78by7r',
  BILLING_PRODUCTION_PREMIUM_PRODUCT_ID: 'pro_01m192jr9nzd6k5ysa6yhk5aq7',
});

function parseArgs(argv = process.argv) {
  let mode = '';
  let approvedOriginOverride = '';

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      mode = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--approved-origin=')) {
      approvedOriginOverride = arg.slice(arg.indexOf('=') + 1).trim();
    }
  }

  return { mode, approvedOriginOverride };
}

function getAppwriteClients(env = process.env) {
  const endpoint = env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY is required to configure billing runtime');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return { functions: new sdk.Functions(client) };
}

async function fetchFunctionVariables(functions, functionId) {
  try {
    const result = await functions.listVariables(functionId);
    return result.variables || [];
  } catch (err) {
    throw new Error(`Failed to list variables for ${functionId}: ${err.message}`);
  }
}

async function setOrUpdateVariable(functions, functionId, key, value, existingVars) {
  const existing = existingVars.find(v => v.key === key);
  let updated;

  if (existing) {
    if (existing.value === value) {
      console.log(`[VAR UNCHANGED] ${functionId} -> ${key} = ${value}`);
      return;
    }
    updated = await functions.updateVariable(functionId, existing.$id, key, value);
  } else {
    updated = await functions.createVariable(functionId, key, value);
  }

  if (!updated || updated.value !== value) {
    throw new Error(`[READBACK MISMATCH] Failed to verify ${functionId} -> ${key} = ${value}. Readback value: ${updated?.value}`);
  }

  console.log(`[VAR SET PASS] ${functionId} -> ${key} = ${value}`);
}

async function deleteVariableIfExists(functions, functionId, key, existingVars) {
  const existing = existingVars.find(v => v.key === key);
  if (!existing) {
    console.log(`[VAR ABSENT] ${functionId} -> ${key}`);
    return;
  }

  await functions.deleteVariable(functionId, existing.$id);
  const recheck = await fetchFunctionVariables(functions, functionId);
  if (recheck.some(v => v.key === key)) {
    throw new Error(`[DELETE MISMATCH] Failed to delete ${functionId} -> ${key}`);
  }

  console.log(`[VAR DELETED PASS] ${functionId} -> ${key}`);
}

function validateProductionPreconditions(billingCheckoutVars, approvedOriginOverride = '') {
  const prodKeyVar = billingCheckoutVars.find(v => v.key === 'BILLING_PRODUCTION_PADDLE_API_KEY');
  if (!prodKeyVar || !prodKeyVar.value) {
    throw new Error('Precondition failed: BILLING_PRODUCTION_PADDLE_API_KEY is missing on billing-checkout function');
  }

  for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
    const found = billingCheckoutVars.find(v => v.key === catalogKey);
    const value = found ? found.value : process.env[catalogKey];
    if (value !== expectedValue) {
      throw new Error(`Precondition failed: ${catalogKey} mismatch. Expected ${expectedValue}, found ${value || 'missing'}`);
    }
  }

  const foundOrigin = approvedOriginOverride ||
    process.env.BILLING_CHECKOUT_APPROVED_ORIGIN ||
    billingCheckoutVars.find(v => v.key === 'BILLING_CHECKOUT_APPROVED_ORIGIN')?.value ||
    '';

  const sanitizedOrigin = String(foundOrigin).trim().replace(/\/$/, '');
  if (!sanitizedOrigin || !/^https:\/\//i.test(sanitizedOrigin)) {
    throw new Error('P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION: Valid BILLING_CHECKOUT_APPROVED_ORIGIN https URL is missing');
  }

  return sanitizedOrigin;
}

function buildTargetMatrix(mode, approvedOrigin = '') {
  const matrix = [];

  if (mode === 'production-smoke-open') {
    matrix.push({
      functionId: 'billing-checkout',
      vars: [
        ['BILLING_CHECKOUT_ENVIRONMENT', 'production'],
        ['BILLING_CHECKOUT_PROVIDER_READY', 'true'],
        ['BILLING_CHECKOUT_ENABLED', 'true'],
        ...(approvedOrigin ? [['BILLING_CHECKOUT_APPROVED_ORIGIN', approvedOrigin]] : []),
      ],
    });
  } else if (mode === 'production-smoke-lock') {
    matrix.push({
      functionId: 'billing-checkout',
      vars: [
        ['BILLING_CHECKOUT_ENVIRONMENT', 'production'],
        ['BILLING_CHECKOUT_PROVIDER_READY', 'false'],
        ['BILLING_CHECKOUT_ENABLED', 'false'],
      ],
    });
  } else if (mode === 'production-access-enable') {
    matrix.push({
      functionId: 'billing-checkout',
      vars: [
        ['BILLING_CHECKOUT_ENVIRONMENT', 'production'],
        ['BILLING_CHECKOUT_PROVIDER_READY', 'false'],
        ['BILLING_CHECKOUT_ENABLED', 'false'],
      ],
    });
    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      matrix.push({
        functionId: fnId,
        vars: [['BILLING_ACCESS_ENVIRONMENT', 'production']],
      });
    }
  } else if (mode === 'emergency-prepayment-sandbox-restore') {
    matrix.push({
      functionId: 'billing-checkout',
      vars: [
        ['BILLING_CHECKOUT_ENVIRONMENT', 'sandbox'],
        ['BILLING_CHECKOUT_PROVIDER_READY', 'false'],
        ['BILLING_CHECKOUT_ENABLED', 'false'],
      ],
    });
    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      matrix.push({
        functionId: fnId,
        vars: [['BILLING_ACCESS_ENVIRONMENT', 'sandbox']],
      });
    }
  }

  return matrix;
}

async function configureBillingRuntime({ mode, approvedOriginOverride }, dependencies = {}) {
  if (!mode || !ALLOWED_MODES.has(mode)) {
    throw new Error(`Invalid or missing mode: "${mode}". Allowed modes: ${Array.from(ALLOWED_MODES).join(', ')}`);
  }

  console.log(`Starting billing runtime configuration for mode: ${mode}`);

  const functions = dependencies.functions || getAppwriteClients().functions;

  let approvedOrigin = '';
  if (mode !== 'emergency-prepayment-sandbox-restore') {
    const billingCheckoutVars = dependencies.billingCheckoutVars || await fetchFunctionVariables(functions, 'billing-checkout');
    approvedOrigin = validateProductionPreconditions(billingCheckoutVars, approvedOriginOverride);
  }

  const matrix = buildTargetMatrix(mode, approvedOrigin);

  for (const item of matrix) {
    const existingVars = dependencies.existingVarsMap?.[item.functionId] || await fetchFunctionVariables(functions, item.functionId);
    for (const [key, value] of item.vars) {
      await setOrUpdateVariable(functions, item.functionId, key, value, existingVars);
    }
  }

  console.log(`[SUCCESS] Billing runtime configured cleanly for mode: ${mode}`);
}

async function main() {
  const { mode, approvedOriginOverride } = parseArgs();
  await configureBillingRuntime({ mode, approvedOriginOverride });
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  ALLOWED_MODES,
  ACCESS_CONSUMER_FUNCTIONS,
  PROD_CATALOG,
  parseArgs,
  validateProductionPreconditions,
  buildTargetMatrix,
  configureBillingRuntime,
};
