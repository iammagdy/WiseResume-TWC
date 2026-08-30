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

const SAFE_NON_SECRET_ALLOWLIST = Object.freeze({
  'billing-checkout': new Set([
    'BILLING_CHECKOUT_ENABLED',
    'BILLING_CHECKOUT_PROVIDER_READY',
    'BILLING_CHECKOUT_ENVIRONMENT',
    'BILLING_CHECKOUT_APPROVED_ORIGIN',
    'BILLING_PRODUCTION_PRO_PRICE_ID',
    'BILLING_PRODUCTION_PRO_PRODUCT_ID',
    'BILLING_PRODUCTION_PREMIUM_PRICE_ID',
    'BILLING_PRODUCTION_PREMIUM_PRODUCT_ID',
  ]),
  'ai-gateway': new Set(['BILLING_ACCESS_ENVIRONMENT']),
  'coupons': new Set(['BILLING_ACCESS_ENVIRONMENT']),
  'admin-devkit-data': new Set(['BILLING_ACCESS_ENVIRONMENT']),
});

const SECRET_PRESENCE_KEYS = Object.freeze({
  'billing-checkout': new Set(['BILLING_PRODUCTION_PADDLE_API_KEY']),
});

const CONFIRMATION_REQUIRED_FOR_OPEN = 'OPEN_ONE_PRODUCTION_SMOKE_CHECKOUT';
const APPROVED_PRODUCTION_CHECKOUT_ORIGIN = ''; // Unverified until live preflight evidence proves correct host

function parseArgs(argv = process.argv, env = process.env) {
  let mode = env.BILLING_RUNTIME_MODE || '';
  let confirm = env.BILLING_RUNTIME_CONFIRM || '';

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      mode = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--confirm=')) {
      confirm = arg.slice(arg.indexOf('=') + 1).trim();
    }
  }

  return { mode, confirm };
}

function assertExecutionEnvironment(env = process.env) {
  const isAutomationMarker = env.WISERESUME_BILLING_RUNTIME_AUTOMATION === '1';
  const isActions = env.GITHUB_ACTIONS === 'true';
  const isMainRef = env.GITHUB_REF === 'refs/heads/main';
  const isDispatchEvent = env.GITHUB_EVENT_NAME === 'workflow_dispatch';

  if (!isAutomationMarker || !isActions || !isMainRef || !isDispatchEvent) {
    const details = [];
    if (!isAutomationMarker) details.push('WISERESUME_BILLING_RUNTIME_AUTOMATION != 1');
    if (!isActions) details.push('GITHUB_ACTIONS != true');
    if (!isMainRef) details.push(`GITHUB_REF (${env.GITHUB_REF || 'missing'}) != refs/heads/main`);
    if (!isDispatchEvent) details.push(`GITHUB_EVENT_NAME (${env.GITHUB_EVENT_NAME || 'missing'}) != workflow_dispatch`);
    throw new Error(`[FATAL EXECUTION GUARD] Execution blocked: billing runtime script requires authorized GitHub Actions main workflow_dispatch context. Details: ${details.join(', ')}`);
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

function validateProductionPreconditions(billingCheckoutVars) {
  // 1. SECRET PRESENCE METADATA-ONLY CHECK
  const prodKeyVar = billingCheckoutVars.find(v => v.key === 'BILLING_PRODUCTION_PADDLE_API_KEY');
  if (!prodKeyVar) {
    throw new Error('Precondition failed: BILLING_PRODUCTION_PADDLE_API_KEY is MISSING on billing-checkout function');
  }
  if (prodKeyVar.secret === false) {
    throw new Error('Precondition failed: BILLING_PRODUCTION_PADDLE_API_KEY is NOT marked secret in Appwrite metadata');
  }
  const isSecretFlag = prodKeyVar.secret !== undefined
    ? `secret_flag=${Boolean(prodKeyVar.secret)}`
    : 'SECRET_FLAG_UNVERIFIED';
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
  const liveOrigin = billingCheckoutVars.find(v => v.key === 'BILLING_CHECKOUT_APPROVED_ORIGIN')?.value || '';
  const sanitizedOrigin = String(APPROVED_PRODUCTION_CHECKOUT_ORIGIN || liveOrigin).trim().replace(/\/$/, '');

  if (!sanitizedOrigin || !/^https:\/\//i.test(sanitizedOrigin) || sanitizedOrigin !== APPROVED_PRODUCTION_CHECKOUT_ORIGIN) {
    throw new Error('P4_APPROVED_ORIGIN_REQUIRES_EXECUTION_TIME_VERIFICATION: Approved Production checkout origin is unverified; smoke-open is fail-closed blocked');
  }

  return sanitizedOrigin;
}

async function runProductionPreflightAudit(functions, dependencies = {}) {
  console.log('--- [READ-ONLY PREFLIGHT AUDIT START] ---');
  const auditReport = { timestamp: new Date().toISOString(), verdict: '', functions: {} };

  const targets = ['billing-checkout', ...ACCESS_CONSUMER_FUNCTIONS];
  let secretMetadataStatus = 'PASS';
  let catalogStatus = 'MATCH';
  let approvedOriginStatus = 'UNVERIFIED';

  for (const fnId of targets) {
    const vars = dependencies.varsMap?.[fnId] || await fetchFunctionVariables(functions, fnId);
    auditReport.functions[fnId] = {};
    const safeAllowlist = SAFE_NON_SECRET_ALLOWLIST[fnId] || new Set();
    const secretAllowlist = SECRET_PRESENCE_KEYS[fnId] || new Set();

    for (const v of vars) {
      if (secretAllowlist.has(v.key)) {
        if (v.secret === false) secretMetadataStatus = 'FAIL_NOT_SECRET';
        const flagInfo = v.secret !== undefined ? `secret_flag=${Boolean(v.secret)}` : 'SECRET_FLAG_UNVERIFIED';
        auditReport.functions[fnId][v.key] = `[PRESENT (${flagInfo})]`;
        console.log(`[AUDIT METADATA] ${fnId} -> ${v.key}: PRESENT (${flagInfo})`);
      } else if (safeAllowlist.has(v.key)) {
        auditReport.functions[fnId][v.key] = v.value;
        console.log(`[AUDIT CONFIG] ${fnId} -> ${v.key}: ${v.value}`);
      }
      // Unallowlisted variables are STRICTLY IGNORED and NEVER printed or logged
    }
  }

  const bcVars = auditReport.functions['billing-checkout'] || {};
  const hasProdKey = Boolean(bcVars['BILLING_PRODUCTION_PADDLE_API_KEY']);
  if (!hasProdKey) secretMetadataStatus = 'MISSING';

  for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
    if (bcVars[catalogKey] !== expectedValue) {
      catalogStatus = bcVars[catalogKey] ? 'MISMATCH' : 'MISSING';
    }
  }

  const liveOrigin = bcVars['BILLING_CHECKOUT_APPROVED_ORIGIN'] || '';
  if (APPROVED_PRODUCTION_CHECKOUT_ORIGIN && liveOrigin === APPROVED_PRODUCTION_CHECKOUT_ORIGIN) {
    approvedOriginStatus = 'VERIFIED';
  }

  if (secretMetadataStatus !== 'PASS') {
    auditReport.verdict = `P4_PREFLIGHT_BLOCKED_SECRET_${secretMetadataStatus}`;
  } else if (catalogStatus !== 'MATCH') {
    auditReport.verdict = `P4_PREFLIGHT_BLOCKED_CATALOG_${catalogStatus}`;
  } else {
    auditReport.verdict = 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED';
  }

  console.log(`[AUDIT SUMMARY] Paddle Prod Key: ${hasProdKey ? 'PRESENT' : 'MISSING'}`);
  console.log(`[AUDIT SUMMARY] Catalog Status: ${catalogStatus}`);
  console.log(`[AUDIT SUMMARY] Approved Origin Status: ${approvedOriginStatus}`);
  console.log(`[AUDIT SUMMARY] Final Verdict: ${auditReport.verdict}`);
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

async function configureBillingRuntime({ mode, confirm }, dependencies = {}) {
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
    const approvedOrigin = validateProductionPreconditions(billingCheckoutVars);

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

    // CAPTURE PRIOR VALUES OF ACCESS CONSUMERS BEFORE MUTATING
    const priorValues = new Map();
    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      const vars = await fetchFunctionVariables(functions, fnId);
      const existing = vars.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT');
      priorValues.set(fnId, existing?.value || 'sandbox');
    }

    const changedConsumers = [];
    try {
      for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
        await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', 'production');
        changedConsumers.push(fnId);
      }
    } catch (err) {
      const failedFnId = ACCESS_CONSUMER_FUNCTIONS[changedConsumers.length] || 'unknown';
      console.log(`[ACCESS TRANSITION FAILURE] Failure on ${failedFnId}. Attempting rollback of changed consumers: ${changedConsumers.join(', ')}`);
      let rollbackSuccess = true;

      for (const fnId of [...changedConsumers].reverse()) {
        try {
          const prior = priorValues.get(fnId) || 'sandbox';
          await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', prior);
        } catch (rbErr) {
          rollbackSuccess = false;
          console.error(`[ROLLBACK FAILURE] Failed to restore ${fnId}: ${rbErr.message}`);
        }
      }

      if (rollbackSuccess) {
        throw new Error(`ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on ${failedFnId}, all changed consumers restored to prior values: ${err.message}`);
      } else {
        throw new Error(`CRITICAL_PARTIAL_ACCESS_TRANSITION_OWNER_ACTION_REQUIRED: Consumer access transition failed on ${failedFnId} and rollback could not be confirmed: ${err.message}`);
      }
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
  const { mode, confirm } = parseArgs();
  await configureBillingRuntime({ mode, confirm });
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
  SAFE_NON_SECRET_ALLOWLIST,
  SECRET_PRESENCE_KEYS,
  CONFIRMATION_REQUIRED_FOR_OPEN,
  APPROVED_PRODUCTION_CHECKOUT_ORIGIN,
  parseArgs,
  assertExecutionEnvironment,
  validateProductionPreconditions,
  runProductionPreflightAudit,
  configureBillingRuntime,
  setOrUpdateVariable,
};
