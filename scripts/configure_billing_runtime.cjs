'use strict';

const sdk = require('node-appwrite');

const ALLOWED_MODES = new Set([
  'production-preflight-audit',
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

const CONFIRMATION_REQUIRED_FOR_OPEN = 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT';

function parseArgs(argv = process.argv, env = process.env) {
  let mode = env.BILLING_RUNTIME_MODE || '';
  let approvedOriginOverride = env.BILLING_RUNTIME_APPROVED_ORIGIN || '';
  let confirm = env.BILLING_RUNTIME_CONFIRM || '';

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      mode = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--approved-origin=')) {
      approvedOriginOverride = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--confirm=')) {
      confirm = arg.slice(arg.indexOf('=') + 1).trim();
    }
  }

  return { mode, approvedOriginOverride, confirm };
}

function assertExecutionEnvironment(env = process.env) {
  const isAutomationMarker = env.WISERESUME_BILLING_RUNTIME_AUTOMATION === '1';
  const isCI = env.GITHUB_ACTIONS === 'true';
  const isMain = env.GITHUB_REF === 'refs/heads/main';

  if (!isAutomationMarker) {
    throw new Error('[FATAL EXECUTION GUARD] Execution blocked: script must be executed via approved repository automation (WISERESUME_BILLING_RUNTIME_AUTOMATION=1).');
  }

  if (isCI && !isMain) {
    throw new Error(`[FATAL EXECUTION GUARD] Execution blocked: billing runtime automation can only run on refs/heads/main. Current ref: ${env.GITHUB_REF}`);
  }
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

async function setOrUpdateVariable(functions, functionId, key, value) {
  const existingVars = await fetchFunctionVariables(functions, functionId);
  const existing = existingVars.find(v => v.key === key);

  if (existing) {
    if (existing.value === value) {
      console.log(`[VAR UNCHANGED] ${functionId} -> ${key} = ${value}`);
      return;
    }
    await functions.updateVariable(functionId, existing.$id, key, value);
  } else {
    const variableId = sdk.ID ? sdk.ID.unique() : `var_${Date.now()}`;
    await functions.createVariable(functionId, variableId, key, value);
  }

  // REAL PERSISTED READBACK VERIFICATION
  const freshVars = await fetchFunctionVariables(functions, functionId);
  const verified = freshVars.find(v => v.key === key);

  if (!verified || verified.value !== value) {
    throw new Error(`[READBACK MISMATCH] Failed to verify persisted ${functionId} -> ${key} = "${value}". Readback value: "${verified?.value || 'MISSING'}"`);
  }

  console.log(`[VAR SET PASS] ${functionId} -> ${key} = ${value}`);
}

function validateProductionPreconditions(billingCheckoutVars, approvedOriginOverride = '') {
  // 1. SECRET PRESENCE METADATA-ONLY CHECK
  const prodKeyVar = billingCheckoutVars.find(v => v.key === 'BILLING_PRODUCTION_PADDLE_API_KEY');
  if (!prodKeyVar) {
    throw new Error('Precondition failed: BILLING_PRODUCTION_PADDLE_API_KEY is MISSING on billing-checkout function');
  }
  const isSecretFlag = prodKeyVar.secret !== undefined
    ? `secret_flag=${Boolean(prodKeyVar.secret)}`
    : prodKeyVar.type !== undefined
      ? `type=${prodKeyVar.type}`
      : 'secret_flag_unsupported';
  console.log(`[SECRET METADATA] BILLING_PRODUCTION_PADDLE_API_KEY = PRESENT (${isSecretFlag})`);

  // 2. LIVE REMOTE PRODUCTION CATALOG ENFORCEMENT (NO process.env FALLBACK)
  for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
    const found = billingCheckoutVars.find(v => v.key === catalogKey);
    if (!found || !found.value) {
      throw new Error(`Precondition failed: Live remote variable ${catalogKey} is MISSING on billing-checkout function.`);
    }
    if (found.value !== expectedValue) {
      throw new Error(`Precondition failed: Live remote variable ${catalogKey} mismatch. Expected ${expectedValue}, found ${found.value}`);
    }
  }

  // 3. APPROVED ORIGIN PRECONDITION
  const foundOrigin = approvedOriginOverride ||
    billingCheckoutVars.find(v => v.key === 'BILLING_CHECKOUT_APPROVED_ORIGIN')?.value ||
    '';

  const sanitizedOrigin = String(foundOrigin).trim().replace(/\/$/, '');
  if (!sanitizedOrigin || !/^https:\/\//i.test(sanitizedOrigin)) {
    throw new Error('P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION: Valid BILLING_CHECKOUT_APPROVED_ORIGIN https URL is missing');
  }

  return sanitizedOrigin;
}

async function runProductionPreflightAudit(functions, dependencies = {}) {
  console.log('--- [READ-ONLY PREFLIGHT AUDIT START] ---');
  const auditReport = { timestamp: new Date().toISOString(), functions: {} };

  const allTargets = ['billing-checkout', ...ACCESS_CONSUMER_FUNCTIONS, 'revenuecat-webhook'];

  for (const fnId of allTargets) {
    const vars = dependencies.varsMap?.[fnId] || await fetchFunctionVariables(functions, fnId);
    auditReport.functions[fnId] = {};

    for (const v of vars) {
      const isSecret = v.key.includes('KEY') || v.key.includes('SECRET');
      auditReport.functions[fnId][v.key] = isSecret ? '[PRESENT]' : v.value;
      if (isSecret) {
        const flagInfo = v.secret !== undefined ? `secret_flag=${v.secret}` : 'secret_flag_unsupported';
        console.log(`[AUDIT METADATA] ${fnId} -> ${v.key}: PRESENT (${flagInfo})`);
      } else {
        console.log(`[AUDIT CONFIG] ${fnId} -> ${v.key}: ${v.value}`);
      }
    }
  }

  const bcVars = auditReport.functions['billing-checkout'] || {};
  const hasProdKey = Boolean(bcVars['BILLING_PRODUCTION_PADDLE_API_KEY']);
  const proPrice = bcVars['BILLING_PRODUCTION_PRO_PRICE_ID'];
  const approvedOrigin = bcVars['BILLING_CHECKOUT_APPROVED_ORIGIN'] || '[NOT_CONFIGURED]';

  console.log(`[AUDIT SUMMARY] Paddle Prod Key: ${hasProdKey ? 'PRESENT' : 'MISSING'}`);
  console.log(`[AUDIT SUMMARY] Pro Price ID: ${proPrice || 'MISSING'}`);
  console.log(`[AUDIT SUMMARY] Approved Origin: ${approvedOrigin}`);
  console.log('--- [READ-ONLY PREFLIGHT AUDIT COMPLETE - ZERO MUTATIONS PERFORMED] ---');

  return auditReport;
}

async function engageCompensatingLock(functions) {
  console.log('[COMPENSATING LOCK] Attempting immediate fail-closed lock on billing-checkout...');
  try {
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false');
    console.log('[COMPENSATING LOCK] Lock engaged and verified successfully.');
    return true;
  } catch (err) {
    console.error(`[CRITICAL FAIL-OPEN HAZARD] Failed to engage compensating lock: ${err.message}`);
    return false;
  }
}

async function configureBillingRuntime({ mode, approvedOriginOverride, confirm }, dependencies = {}) {
  if (!mode || !ALLOWED_MODES.has(mode)) {
    throw new Error(`Invalid or missing mode: "${mode}". Allowed modes: ${Array.from(ALLOWED_MODES).join(', ')}`);
  }

  console.log(`Starting billing runtime configuration for mode: ${mode}`);

  const functions = dependencies.functions || getAppwriteClients().functions;

  if (mode === 'production-preflight-audit') {
    return await runProductionPreflightAudit(functions, dependencies);
  }

  if (mode === 'production-smoke-open') {
    if (confirm !== CONFIRMATION_REQUIRED_FOR_OPEN) {
      throw new Error(`Confirmation required for production-smoke-open: pass --confirm=${CONFIRMATION_REQUIRED_FOR_OPEN}`);
    }

    const billingCheckoutVars = dependencies.billingCheckoutVars || await fetchFunctionVariables(functions, 'billing-checkout');
    const approvedOrigin = validateProductionPreconditions(billingCheckoutVars, approvedOriginOverride);

    // SAFE MUTATION ORDER FOR SMOKE OPEN
    // 1. Environment -> production
    // 2. Provider ready -> true
    // 3. Approved origin -> (if set)
    // 4. LAST: Enabled -> true
    let mutationStarted = false;
    try {
      mutationStarted = true;
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production');
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'true');
      if (approvedOrigin) {
        await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_APPROVED_ORIGIN', approvedOrigin);
      }
      // ENABLED IS THE VERY LAST MUTATION
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'true');
    } catch (err) {
      if (mutationStarted) {
        const locked = await engageCompensatingLock(functions);
        if (locked) {
          throw new Error(`[COMPENSATING LOCK ENGAGED & CONFIRMED] Operation failed during production-smoke-open, checkout safety lock re-engaged: ${err.message}`);
        } else {
          throw new Error(`[CRITICAL FAIL-OPEN HAZARD] OWNER ACTION REQUIRED IMMEDIATELY: Failed during production-smoke-open and compensating lock failed: ${err.message}`);
        }
      }
      throw err;
    }

  } else if (mode === 'production-smoke-lock') {
    // UNCONDITIONAL SAFETY LOCK (ENABLED=false FIRST)
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production');

  } else if (mode === 'production-access-enable') {
    // FORCE CHECKOUT LOCKED FIRST BEFORE CHANGING ACCESS CONSUMERS
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production');

    // ONLY THEN WRITE TO ACCESS CONSUMERS (NEVER REVENUECAT-WEBHOOK)
    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', 'production');
    }

  } else if (mode === 'emergency-prepayment-sandbox-restore') {
    // UNCONDITIONAL RESTORE (ENABLED=false FIRST)
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'sandbox');

    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', 'sandbox');
    }
  }

  console.log(`[SUCCESS] Billing runtime configured cleanly for mode: ${mode}`);
}

async function main() {
  assertExecutionEnvironment();
  const { mode, approvedOriginOverride, confirm } = parseArgs();
  await configureBillingRuntime({ mode, approvedOriginOverride, confirm });
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
  CONFIRMATION_REQUIRED_FOR_OPEN,
  parseArgs,
  assertExecutionEnvironment,
  validateProductionPreconditions,
  runProductionPreflightAudit,
  configureBillingRuntime,
  setOrUpdateVariable,
};
