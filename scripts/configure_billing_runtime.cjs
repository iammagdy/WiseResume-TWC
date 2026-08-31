'use strict';

const sdk = require('node-appwrite');

const ALLOWED_MODES = new Set([
  'production-preflight-audit',
  'production-catalog-reconcile',
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
const CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE = 'RECONCILE_PRODUCTION_CATALOG_NON_SECRET';
const APPROVED_PRODUCTION_CHECKOUT_ORIGIN = ''; // Unverified until live preflight evidence proves correct host

function parseArgs(argv = process.argv, env = process.env) {
  let mode = env.BILLING_RUNTIME_MODE || '';
  let confirm = env.BILLING_RUNTIME_CONFIRM || '';
  let confirmCatalogReconcile = env.BILLING_RUNTIME_CONFIRM_CATALOG_RECONCILE || '';

  for (const arg of argv) {
    if (arg.startsWith('--mode=')) {
      mode = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--confirm=')) {
      confirm = arg.slice(arg.indexOf('=') + 1).trim();
    } else if (arg.startsWith('--confirm-catalog-reconcile=')) {
      confirmCatalogReconcile = arg.slice(arg.indexOf('=') + 1).trim();
    }
  }

  if (!confirmCatalogReconcile && confirm === CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE) {
    confirmCatalogReconcile = confirm;
  }

  return { mode, confirm, confirmCatalogReconcile };
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

async function setOrUpdateVariable(functions, functionId, key, value, isSecret = false) {
  const existingVars = await fetchFunctionVariables(functions, functionId);
  const existing = existingVars.find(v => v.key === key);

  if (existing) {
    if (existing.value === value && Boolean(existing.secret) === isSecret) {
      console.log(`[VAR UNCHANGED] ${functionId} -> ${key} = ${isSecret ? '[SECRET_MASKED]' : value} (secret=${isSecret})`);
      return;
    }
    await functions.updateVariable(functionId, existing.$id, key, value, isSecret);
  } else {
    const variableId = sdk.ID ? sdk.ID.unique() : `var_${Date.now()}`;
    await functions.createVariable(functionId, variableId, key, value, isSecret);
  }

  // REAL PERSISTED READBACK VERIFICATION
  const freshVars = await fetchFunctionVariables(functions, functionId);
  const verified = freshVars.find(v => v.key === key);

  if (!verified) {
    throw new Error(`[READBACK MISMATCH] Failed to verify persisted ${functionId} -> ${key}. Readback variable MISSING.`);
  }

  if (verified.secret !== isSecret && verified.secret !== undefined) {
    throw new Error(`[READBACK MISMATCH] ${functionId} -> ${key} secret flag mismatch. Expected secret=${isSecret}, got secret=${verified.secret}`);
  }

  if (!isSecret && verified.value !== value) {
    throw new Error(`[READBACK MISMATCH] Failed to verify persisted non-secret ${functionId} -> ${key} = "${value}". Readback value: "${verified.value || 'EMPTY_OR_UNREADABLE'}"`);
  }

  console.log(`[VAR SET PASS] ${functionId} -> ${key} = ${isSecret ? '[SECRET_MASKED]' : value} (secret=${isSecret})`);
}

async function setOrUpdateCatalogNonSecretVariable(functions, functionId, key, value) {
  const existingVars = await fetchFunctionVariables(functions, functionId);
  const existing = existingVars.find(v => v.key === key);

  if (existing) {
    if (existing.value === value && existing.secret === false) {
      console.log(`[CATALOG VAR UNCHANGED] ${functionId} -> ${key} = ${value} (secret=false)`);
    } else {
      await functions.updateVariable(functionId, existing.$id, key, value, false);
      console.log(`[CATALOG VAR UPDATED] ${functionId} -> ${key} = ${value} (secret=false)`);
    }
  } else {
    const variableId = sdk.ID ? sdk.ID.unique() : `var_${Date.now()}`;
    await functions.createVariable(functionId, variableId, key, value, false);
    console.log(`[CATALOG VAR CREATED] ${functionId} -> ${key} = ${value} (secret=false)`);
  }

  // REAL PERSISTED READBACK VERIFICATION WITH STRICT secret === false
  const freshVars = await fetchFunctionVariables(functions, functionId);
  const verified = freshVars.find(v => v.key === key);

  if (!verified) {
    throw new Error(`P4_CATALOG_RECONCILIATION_SECRET_METADATA_UNVERIFIED: Failed to verify persisted ${functionId} -> ${key}. Readback variable MISSING.`);
  }

  if (verified.secret !== false) {
    throw new Error(`P4_CATALOG_RECONCILIATION_SECRET_METADATA_UNVERIFIED: ${functionId} -> ${key} secret metadata is unverified or not explicitly false. Got secret=${verified.secret === undefined ? 'UNVERIFIED' : verified.secret}`);
  }

  if (verified.value !== value) {
    throw new Error(`[READBACK MISMATCH] Failed to verify persisted catalog ${functionId} -> ${key} = "${value}". Readback value: "${verified.value || 'EMPTY'}"`);
  }

  console.log(`[CATALOG VAR VERIFIED] ${functionId} -> ${key} = ${value} (secret=false)`);
}

async function restoreConsumerExactState(functions, fnId, prior) {
  if (prior.exists && prior.value !== null) {
    await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', prior.value, false);
  } else {
    const currentVars = await fetchFunctionVariables(functions, fnId);
    const existingCurrent = currentVars.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT');

    if (existingCurrent) {
      await functions.deleteVariable(fnId, existingCurrent.$id);
      const freshVars = await fetchFunctionVariables(functions, fnId);
      if (freshVars.some(v => v.key === 'BILLING_ACCESS_ENVIRONMENT')) {
        throw new Error(`[READBACK MISMATCH] Failed to verify deletion of ${fnId} -> BILLING_ACCESS_ENVIRONMENT`);
      }
      console.log(`[VAR RESTORE DELETED PASS] ${fnId} -> BILLING_ACCESS_ENVIRONMENT (restored ABSENCE)`);
    }
  }
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

  // 2. LIVE REMOTE PRODUCTION CATALOG ENFORCEMENT (NO process.env FALLBACK, MUST BE NON-SECRET WITH secret === false)
  for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
    const found = billingCheckoutVars.find(v => v.key === catalogKey);
    if (!found) {
      throw new Error(`Precondition failed: Live remote variable ${catalogKey} is MISSING on billing-checkout function.`);
    }
    if (found.secret !== false) {
      throw new Error(`Precondition failed: Live remote variable ${catalogKey} secret metadata is not explicitly false (got secret=${found.secret === undefined ? 'UNVERIFIED' : found.secret}).`);
    }
    if (!found.value) {
      throw new Error(`Precondition failed: Live remote variable ${catalogKey} value is EMPTY on billing-checkout function.`);
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
  let catalogVerdict = null;
  let catalogStatusSummary = 'MATCH';
  let accessDriftFnId = null;

  for (const fnId of targets) {
    const vars = dependencies.varsMap?.[fnId] || await fetchFunctionVariables(functions, fnId);
    auditReport.functions[fnId] = {};
    const safeAllowlist = SAFE_NON_SECRET_ALLOWLIST[fnId] || new Set();
    const secretAllowlist = SECRET_PRESENCE_KEYS[fnId] || new Set();

    for (const key of safeAllowlist) {
      const found = vars.find(v => v.key === key);
      if (found) {
        auditReport.functions[fnId][key] = found.value;
        console.log(`[AUDIT CONFIG] ${fnId} -> ${key}: ${found.secret === true ? '[SECRET_MASKED]' : found.value}`);
        if (ACCESS_CONSUMER_FUNCTIONS.includes(fnId) && key === 'BILLING_ACCESS_ENVIRONMENT') {
          if (found.value !== 'sandbox' && found.value !== '[UNCONFIGURED]') {
            accessDriftFnId = fnId;
            console.log(`[AUDIT ALERT] Unsafe access environment drift detected on ${fnId}: ${found.value}`);
          }
        }
      } else if (ACCESS_CONSUMER_FUNCTIONS.includes(fnId) && key === 'BILLING_ACCESS_ENVIRONMENT') {
        auditReport.functions[fnId][key] = '[UNCONFIGURED]';
        console.log(`[AUDIT CONFIG] ${fnId} -> ${key}: [UNCONFIGURED]`);
      }
    }

    for (const key of secretAllowlist) {
      const found = vars.find(v => v.key === key);
      if (found) {
        if (found.secret === false) secretMetadataStatus = 'FAIL_NOT_SECRET';
        const flagInfo = found.secret !== undefined ? `secret_flag=${Boolean(found.secret)}` : 'SECRET_FLAG_UNVERIFIED';
        auditReport.functions[fnId][key] = `[PRESENT (${flagInfo})]`;
        console.log(`[AUDIT METADATA] ${fnId} -> ${key}: PRESENT (${flagInfo})`);
      } else {
        auditReport.functions[fnId][key] = '[MISSING]';
        if (fnId === 'billing-checkout' && key === 'BILLING_PRODUCTION_PADDLE_API_KEY') {
          secretMetadataStatus = 'MISSING';
        }
      }
    }
  }

  const bcVars = auditReport.functions['billing-checkout'] || {};
  const bcRawVars = dependencies.varsMap?.['billing-checkout'] || await fetchFunctionVariables(functions, 'billing-checkout');
  const hasProdKey = bcVars['BILLING_PRODUCTION_PADDLE_API_KEY'] && bcVars['BILLING_PRODUCTION_PADDLE_API_KEY'].includes('PRESENT');

  // SAFE DETAILED CATALOG AUDIT CLASSIFICATION WITH STRICT UNVERIFIED DISCRIMINATION
  for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
    const found = bcRawVars.find(v => v.key === catalogKey);
    let valStatus = 'MATCH';
    let secretMetadataStr = 'UNVERIFIED';

    if (found) {
      if (found.secret === true) secretMetadataStr = 'true';
      else if (found.secret === false) secretMetadataStr = 'false';
      else secretMetadataStr = 'UNVERIFIED';
    }

    if (!found) {
      valStatus = 'MISSING';
      if (!catalogVerdict) catalogVerdict = 'P4_PREFLIGHT_BLOCKED_CATALOG_MISSING';
    } else if (found.secret === true) {
      valStatus = 'UNREADABLE_SECRET';
      if (!catalogVerdict) catalogVerdict = 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET';
    } else if (found.secret === undefined) {
      valStatus = 'UNREADABLE_SECRET';
      if (!catalogVerdict) catalogVerdict = 'P4_PREFLIGHT_BLOCKED_CATALOG_SECRET_UNVERIFIED';
    } else if (found.secret === false && !found.value) {
      valStatus = 'EMPTY';
      if (!catalogVerdict) catalogVerdict = 'P4_PREFLIGHT_BLOCKED_CATALOG_EMPTY';
    } else if (found.secret === false && found.value !== expectedValue) {
      valStatus = 'MISMATCH';
      if (!catalogVerdict) catalogVerdict = 'P4_PREFLIGHT_BLOCKED_CATALOG_MISMATCH';
    }

    console.log(`[CATALOG METADATA] ${catalogKey}: presence=${found ? 'PRESENT' : 'MISSING'}, secret_flag=${secretMetadataStr}, status=${valStatus}`);
  }

  if (catalogVerdict) {
    catalogStatusSummary = catalogVerdict.replace('P4_PREFLIGHT_BLOCKED_CATALOG_', '');
  }

  const liveOrigin = bcVars['BILLING_CHECKOUT_APPROVED_ORIGIN'] || '';
  const approvedOriginStatus = (APPROVED_PRODUCTION_CHECKOUT_ORIGIN && liveOrigin === APPROVED_PRODUCTION_CHECKOUT_ORIGIN)
    ? 'VERIFIED'
    : 'UNVERIFIED';

  if (secretMetadataStatus !== 'PASS') {
    auditReport.verdict = `P4_PREFLIGHT_BLOCKED_SECRET_${secretMetadataStatus}`;
  } else if (catalogVerdict !== null) {
    auditReport.verdict = catalogVerdict;
  } else if (bcVars['BILLING_CHECKOUT_ENABLED'] !== 'false') {
    auditReport.verdict = 'P4_PREFLIGHT_BLOCKED_CHECKOUT_ENABLED';
  } else if (bcVars['BILLING_CHECKOUT_PROVIDER_READY'] !== 'false') {
    auditReport.verdict = 'P4_PREFLIGHT_BLOCKED_PROVIDER_READY';
  } else if (bcVars['BILLING_CHECKOUT_ENVIRONMENT'] !== 'sandbox') {
    auditReport.verdict = 'P4_PREFLIGHT_BLOCKED_ENVIRONMENT_STATE';
  } else if (accessDriftFnId !== null) {
    auditReport.verdict = 'P4_PREFLIGHT_BLOCKED_ACCESS_ENVIRONMENT_STATE';
  } else {
    auditReport.verdict = 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED';
  }

  console.log(`[AUDIT SUMMARY] Paddle Prod Key: ${hasProdKey ? 'PRESENT' : 'MISSING'}`);
  console.log(`[AUDIT SUMMARY] Catalog Status: ${catalogStatusSummary}`);
  console.log(`[AUDIT SUMMARY] Checkout Enabled: ${bcVars['BILLING_CHECKOUT_ENABLED'] || '[UNCONFIGURED]'}`);
  console.log(`[AUDIT SUMMARY] Provider Ready: ${bcVars['BILLING_CHECKOUT_PROVIDER_READY'] || '[UNCONFIGURED]'}`);
  console.log(`[AUDIT SUMMARY] Checkout Env: ${bcVars['BILLING_CHECKOUT_ENVIRONMENT'] || '[UNCONFIGURED]'}`);
  console.log(`[AUDIT SUMMARY] Access Drift: ${accessDriftFnId ? `UNSAFE DRIFT ON ${accessDriftFnId}` : 'NONE (ALL SANDBOX OR UNCONFIGURED)'}`);
  console.log(`[AUDIT SUMMARY] Approved Origin Status: ${approvedOriginStatus}`);
  console.log(`[AUDIT SUMMARY] Final Verdict: ${auditReport.verdict}`);
  console.log('--- [READ-ONLY PREFLIGHT AUDIT COMPLETE - ZERO MUTATIONS PERFORMED] ---');

  return auditReport;
}

async function engageCompensatingLock(functions) {
  console.log('[COMPENSATING LOCK] Attempting immediate fail-closed lock on billing-checkout...');
  try {
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false', false);
    console.log('[COMPENSATING LOCK] Lock engaged and verified successfully.');
    return true;
  } catch (err) {
    console.error(`[CRITICAL FAIL-OPEN HAZARD] Failed to engage compensating lock: ${err.message}`);
    return false;
  }
}

async function configureBillingRuntime({ mode, confirm, confirmCatalogReconcile }, dependencies = {}) {
  if (!mode || !ALLOWED_MODES.has(mode)) {
    throw new Error(`Invalid or missing mode: "${mode}". Allowed modes: ${Array.from(ALLOWED_MODES).join(', ')}`);
  }

  console.log(`Starting billing runtime configuration for mode: ${mode}`);

  const functions = dependencies.functions || getAppwriteClients().functions;

  if (mode === 'production-preflight-audit') {
    return await runProductionPreflightAudit(functions, dependencies);
  }

  if (mode === 'production-catalog-reconcile') {
    // 1. EXACT CONFIRMATION STRING REQUIREMENT
    const reconcileConfirm = confirmCatalogReconcile || confirm;
    if (reconcileConfirm !== CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE) {
      throw new Error(`Confirmation required for production-catalog-reconcile: pass --confirm-catalog-reconcile=${CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE}`);
    }

    const preRunVars = dependencies.billingCheckoutVars || await fetchFunctionVariables(functions, 'billing-checkout');
    const preRunOrigin = preRunVars.find(v => v.key === 'BILLING_CHECKOUT_APPROVED_ORIGIN')?.value || '';

    // 2. VERIFY CHECKOUT ENABLED IS FALSE FIRST
    const currentEnabled = preRunVars.find(v => v.key === 'BILLING_CHECKOUT_ENABLED')?.value;
    if (currentEnabled !== 'false') {
      throw new Error(`[CATALOG RECONCILIATION BLOCKED] BILLING_CHECKOUT_ENABLED must be false (found: "${currentEnabled || 'UNCONFIGURED'}")`);
    }

    // 3. FORCE PROVIDER_READY=false FIRST WITH READBACK
    console.log('[CATALOG RECONCILE] Step 1/3: Forcing BILLING_CHECKOUT_PROVIDER_READY = false...');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false', false);

    // 4. KEEP CHECKOUT ENVIRONMENT SANDBOX
    console.log('[CATALOG RECONCILE] Step 2/3: Ensuring BILLING_CHECKOUT_ENVIRONMENT = sandbox...');
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'sandbox', false);

    // 5. RECONCILE EXACTLY THE FOUR PRODUCTION CATALOG VARIABLES (secret=false)
    console.log('[CATALOG RECONCILE] Step 3/3: Reconciling Production catalog variables with explicit secret=false...');
    for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
      try {
        await setOrUpdateCatalogNonSecretVariable(functions, 'billing-checkout', catalogKey, expectedValue);
      } catch (err) {
        console.error(`[CATALOG RECONCILIATION PARTIAL FAILURE] Failed to reconcile ${catalogKey}: ${err.message}`);
        throw new Error(`P4_CATALOG_RECONCILIATION_PARTIAL_BLOCKED: Failed to reconcile catalog variable ${catalogKey}: ${err.message}`);
      }
    }

    // 6. FINAL RECONCILIATION INVARIANT POST-CHECK
    console.log('[CATALOG RECONCILE] Performing fresh final reconciliation invariant post-check...');
    const postVars = await fetchFunctionVariables(functions, 'billing-checkout');
    const postEnabled = postVars.find(v => v.key === 'BILLING_CHECKOUT_ENABLED')?.value;
    const postReady = postVars.find(v => v.key === 'BILLING_CHECKOUT_PROVIDER_READY')?.value;
    const postEnv = postVars.find(v => v.key === 'BILLING_CHECKOUT_ENVIRONMENT')?.value;
    const postOrigin = postVars.find(v => v.key === 'BILLING_CHECKOUT_APPROVED_ORIGIN')?.value || '';

    if (postEnabled !== 'false' || postReady !== 'false' || postEnv !== 'sandbox' || postOrigin !== preRunOrigin) {
      throw new Error(`P4_CATALOG_RECONCILIATION_POSTCHECK_BLOCKED: Post-reconciliation invariant check failed. ENABLED=${postEnabled}, PROVIDER_READY=${postReady}, ENVIRONMENT=${postEnv}, APPROVED_ORIGIN=${postOrigin}`);
    }

    for (const [catalogKey, expectedValue] of Object.entries(PROD_CATALOG)) {
      const v = postVars.find(item => item.key === catalogKey);
      if (!v || v.value !== expectedValue || v.secret !== false) {
        throw new Error(`P4_CATALOG_RECONCILIATION_POSTCHECK_BLOCKED: Post-check failed for ${catalogKey}. value=${v?.value}, secret=${v?.secret}`);
      }
    }

    console.log('[CATALOG RECONCILE SUCCESS] Production catalog reconciled cleanly and verified with post-check invariants');
    return { verdict: 'P4_CATALOG_RECONCILIATION_SUCCESS' };

  } else if (mode === 'production-smoke-open') {
    if (confirm !== CONFIRMATION_REQUIRED_FOR_OPEN) {
      throw new Error(`Confirmation required for production-smoke-open: pass --confirm=${CONFIRMATION_REQUIRED_FOR_OPEN}`);
    }

    const billingCheckoutVars = dependencies.billingCheckoutVars || await fetchFunctionVariables(functions, 'billing-checkout');
    const approvedOrigin = validateProductionPreconditions(billingCheckoutVars);

    let mutationStarted = false;
    try {
      mutationStarted = true;
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production', false);
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'true', false);
      if (approvedOrigin) {
        await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_APPROVED_ORIGIN', approvedOrigin, false);
      }
      await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'true', false);
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
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production', false);

  } else if (mode === 'production-access-enable') {
    // FORCE CHECKOUT LOCKED FIRST BEFORE CHANGING ACCESS CONSUMERS
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'production', false);

    // SNAPSHOT EXACT PRIOR STATE FOR ALL THREE CONSUMERS BEFORE ANY MUTATION
    const priorSnapshots = new Map();
    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      const vars = await fetchFunctionVariables(functions, fnId);
      const existing = vars.find(v => v.key === 'BILLING_ACCESS_ENVIRONMENT');
      priorSnapshots.set(fnId, {
        exists: Boolean(existing),
        variableId: existing ? existing.$id : null,
        value: existing ? existing.value : null,
      });
    }

    let transitionError = null;
    let failedFnId = null;

    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      try {
        await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', 'production', false);
      } catch (err) {
        transitionError = err;
        failedFnId = fnId;
        break;
      }
    }

    if (transitionError) {
      console.log(`[ACCESS TRANSITION FAILURE] Failure on ${failedFnId}: ${transitionError.message}. Restoring ALL consumers to exact prior states...`);
      let rollbackSuccess = true;

      for (const fnId of [...ACCESS_CONSUMER_FUNCTIONS].reverse()) {
        try {
          const prior = priorSnapshots.get(fnId) || { exists: false, variableId: null, value: null };
          await restoreConsumerExactState(functions, fnId, prior);
        } catch (rbErr) {
          rollbackSuccess = false;
          console.error(`[ROLLBACK FAILURE] Failed to restore ${fnId}: ${rbErr.message}`);
        }
      }

      if (rollbackSuccess) {
        throw new Error(`ACCESS_TRANSITION_ROLLED_BACK: Consumer access transition failed on ${failedFnId}, all consumers restored to exact prior states: ${transitionError.message}`);
      } else {
        throw new Error(`CRITICAL_PARTIAL_ACCESS_TRANSITION_OWNER_ACTION_REQUIRED: Consumer access transition failed on ${failedFnId} and exact state rollback could not be confirmed: ${transitionError.message}`);
      }
    }

  } else if (mode === 'emergency-prepayment-sandbox-restore') {
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENABLED', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_PROVIDER_READY', 'false', false);
    await setOrUpdateVariable(functions, 'billing-checkout', 'BILLING_CHECKOUT_ENVIRONMENT', 'sandbox', false);

    for (const fnId of ACCESS_CONSUMER_FUNCTIONS) {
      await setOrUpdateVariable(functions, fnId, 'BILLING_ACCESS_ENVIRONMENT', 'sandbox', false);
    }
  }

  console.log(`[SUCCESS] Billing runtime configured cleanly for mode: ${mode}`);
}

async function main() {
  assertExecutionEnvironment();
  const { mode, confirm, confirmCatalogReconcile } = parseArgs();
  const result = await configureBillingRuntime({ mode, confirm, confirmCatalogReconcile });

  if (mode === 'production-preflight-audit' && result?.verdict && result.verdict !== 'P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED') {
    console.error(`[FATAL PREFLIGHT VERDICT] Audit finished with blocked verdict: ${result.verdict}`);
    process.exit(1);
  }
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
  CONFIRMATION_REQUIRED_FOR_CATALOG_RECONCILE,
  APPROVED_PRODUCTION_CHECKOUT_ORIGIN,
  parseArgs,
  assertExecutionEnvironment,
  validateProductionPreconditions,
  runProductionPreflightAudit,
  configureBillingRuntime,
  setOrUpdateVariable,
  setOrUpdateCatalogNonSecretVariable,
  restoreConsumerExactState,
};
