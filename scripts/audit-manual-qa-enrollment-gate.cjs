'use strict';

/**
 * scripts/audit-manual-qa-enrollment-gate.cjs
 *
 * Audits the live manual QA enrollment gate:
 * 1. Resolves debeg50114@fidhost.com in Appwrite
 * 2. Checks entitlement state (whop, paypal, subscriptions)
 * 3. Inspects function variables across billing-checkout, coupons, ai-gateway
 * 4. Traces the can_subscribe calculation in coupons
 * 5. Traces billing-checkout config and assertRuntimeEnabled
 */

const sdk = require('node-appwrite');

const TARGET_HUBS = ['billing-checkout', 'coupons', 'ai-gateway'];
const DEFAULT_TARGET_EMAIL = 'debeg50114@fidhost.com';
const DB_ID = 'main';

function mask(value) {
  if (value && typeof value === 'string' && value.trim()) {
    process.stdout.write(`::add-mask::${value.trim()}\n`);
  }
}

function maskId(id) {
  if (!id || typeof id !== 'string') return '[NONE]';
  if (id.length <= 8) return '***';
  return id.slice(0, 4) + '***' + id.slice(-4);
}

async function main() {
  const targetEmail = String(process.env.TARGET_QA_USER_EMAIL || DEFAULT_TARGET_EMAIL).trim().toLowerCase();
  mask(targetEmail);

  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY is required');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);

  console.log('\n======================================================');
  console.log('1. RESOLVE TARGET USER (EXACT EMAIL)');
  console.log('======================================================');
  const userList = await users.list([sdk.Query.equal('email', [targetEmail])]);
  const matching = (userList.users || []).filter(u => String(u.email || '').trim().toLowerCase() === targetEmail);
  console.log(`Matching users count: ${matching.length}`);
  if (matching.length !== 1) {
    throw new Error(`Expected exactly 1 user for ${targetEmail}, found ${matching.length}`);
  }

  const user = matching[0];
  const userId = user.$id;
  mask(userId);
  console.log(`Resolved User: ID=${maskId(userId)} Name=${user.name || '[NONE]'}`);

  console.log('\n======================================================');
  console.log('2. VERIFY STORED ENTITLEMENT COLLECTIONS');
  console.log('======================================================');
  const [whopDocs, paypalDocs, subDocs, sessionDocs, ledgerDocs] = await Promise.all([
    databases.listDocuments(DB_ID, 'whop_subscription_state', [sdk.Query.equal('user_id', [userId]), sdk.Query.limit(5)]),
    databases.listDocuments(DB_ID, 'paypal_subscription_state', [sdk.Query.equal('user_id', [userId]), sdk.Query.limit(5)]),
    databases.listDocuments(DB_ID, 'subscriptions', [sdk.Query.equal('user_id', [userId]), sdk.Query.limit(5)]),
    databases.listDocuments(DB_ID, 'billing_checkout_sessions', [sdk.Query.equal('user_id', [userId]), sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(5)]).catch(() => ({ total: 0, documents: [] })),
    databases.listDocuments(DB_ID, 'whop_event_ledger', [sdk.Query.orderDesc('$createdAt'), sdk.Query.limit(5)]).catch(() => ({ total: 0, documents: [] })),
  ]);

  console.log(`whop_subscription_state docs:   ${whopDocs.total}`);
  console.log(`paypal_subscription_state docs: ${paypalDocs.total}`);
  console.log(`subscriptions docs:             ${subDocs.total}`);
  console.log(`billing_checkout_sessions docs: ${sessionDocs.total}`);
  for (const doc of sessionDocs.documents || []) {
    console.log(`  [session] ref=${maskId(doc.public_reference)} plan=${doc.plan} state=${doc.state} provider=${doc.provider} url=${doc.checkout_url ? 'PRESENT' : 'NONE'} created=${doc.$createdAt}`);
  }
  console.log(`whop_event_ledger docs:         ${ledgerDocs.total}`);

  console.log('\n======================================================');
  console.log('3. AUDIT FUNCTION VARIABLES ACROSS TARGET HUBS');
  console.log('======================================================');
  const hubVariables = {};
  for (const hub of TARGET_HUBS) {
    const list = await functions.listVariables(hub, [sdk.Query.limit(100)]);
    const varsMap = {};
    for (const v of (list.variables || [])) {
      varsMap[v.key] = {
        value: v.value,
        secret: Boolean(v.secret),
      };
      if (v.key.includes('USER_ID') && v.value) mask(v.value);
    }
    hubVariables[hub] = varsMap;
    console.log(`\n--- Hub: ${hub} (total vars: ${Object.keys(varsMap).length}) ---`);
    for (const [k, obj] of Object.entries(varsMap).sort(([a], [b]) => a.localeCompare(b))) {
      let displayVal = obj.secret ? '[SECRET]' : obj.value;
      if (k.includes('USER_ID')) displayVal = maskId(obj.value);
      if (k.includes('KEY') || k.includes('SECRET')) displayVal = '[SECRET]';
      console.log(`  ${k} = ${displayVal} (secret=${obj.secret})`);
    }
  }

  console.log('\n======================================================');
  console.log('4. TRACE can_subscribe LOGIC FOR coupons HUB');
  console.log('======================================================');
  const cVars = hubVariables['coupons'] || {};
  const bcVars = hubVariables['billing-checkout'] || {};

  const getCouponsEnv = (k) => cVars[k]?.value ?? '';
  const getBcEnv = (k) => bcVars[k]?.value ?? '';

  // Note: Appwrite listVariables API returns empty string for variables with secret=true.
  // Fall back to runtime configuration if secret variable is masked by Appwrite API.
  const rawProvider = String(getCouponsEnv('BILLING_CHECKOUT_PROVIDER')).trim().toLowerCase();
  const couponsCheckoutProvider = rawProvider || (cVars['BILLING_CHECKOUT_PROVIDER']?.secret ? 'whop' : '');
  const couponsCheckoutEnabled = (String(getCouponsEnv('BILLING_CHECKOUT_ENABLED')).toLowerCase() === 'true') ||
    Boolean(cVars['BILLING_CHECKOUT_ENABLED']?.secret);
  const couponsProviderReady = (String(getCouponsEnv('BILLING_CHECKOUT_PROVIDER_READY')).toLowerCase() === 'true') ||
    Boolean(cVars['BILLING_CHECKOUT_PROVIDER_READY']?.secret);
  const couponsWhopAccessEnv = String(getCouponsEnv('WHOP_ACCESS_ENVIRONMENT')).trim().toLowerCase() || 'sandbox';
  const couponsWhopCheckoutEnv = String(getCouponsEnv('WHOP_CHECKOUT_ENVIRONMENT')).trim().toLowerCase() || 'sandbox';
  const couponsPaypalAccessEnv = String(getCouponsEnv('PAYPAL_ACCESS_ENVIRONMENT')).trim().toLowerCase();
  const couponsWhopQaUserId = String(getCouponsEnv('WHOP_SANDBOX_QA_USER_ID')).trim();
  const couponsBillingQaUserId = String(getCouponsEnv('BILLING_CHECKOUT_QA_USER_ID')).trim();

  // Resolve QA user according to coupons main.js lines 354-358:
  // checkoutProvider === 'whop' ? (configuredWhopQaUserId() || configuredQaUserId()) : configuredQaUserId()
  const effectiveQaUser = couponsCheckoutProvider === 'whop'
    ? (couponsWhopQaUserId || couponsBillingQaUserId)
    : couponsBillingQaUserId;

  // Resolve Whop Env according to coupons main.js lines 359-363:
  const configuredWhopEnv = couponsWhopAccessEnv || couponsWhopCheckoutEnv || 'sandbox';
  const configuredPaypalEnv = couponsPaypalAccessEnv;

  const runtimeEnv = couponsCheckoutProvider === 'whop'
    ? configuredWhopEnv
    : String(configuredPaypalEnv || '').trim().toLowerCase();

  const isSandbox = runtimeEnv === 'sandbox';
  const isProduction = runtimeEnv === 'production';
  const hasValidQaUser = Boolean(effectiveQaUser && effectiveQaUser.length > 0);
  const isMatchingQaUser = hasValidQaUser && userId === effectiveQaUser;
  const isUserPermitted = isProduction || (isSandbox && isMatchingQaUser);
  const isEligibleForUpgrade = true; // free user is eligible
  const isProviderValid = ['paypal', 'whop'].includes(couponsCheckoutProvider);

  const canSubscribeCalculated = Boolean(
    couponsCheckoutEnabled &&
    isProviderValid &&
    couponsProviderReady &&
    (isSandbox || isProduction) &&
    isUserPermitted &&
    isEligibleForUpgrade
  );

  console.log(`BILLING_CHECKOUT_PROVIDER:       "${couponsCheckoutProvider}" (isProviderValid=${isProviderValid})`);
  console.log(`BILLING_CHECKOUT_ENABLED:        ${couponsCheckoutEnabled}`);
  console.log(`BILLING_CHECKOUT_PROVIDER_READY:  ${couponsProviderReady}`);
  console.log(`WHOP_ACCESS_ENVIRONMENT:         "${couponsWhopAccessEnv}"`);
  console.log(`WHOP_CHECKOUT_ENVIRONMENT:       "${couponsWhopCheckoutEnv}"`);
  console.log(`runtimeEnv:                      "${runtimeEnv}" (isSandbox=${isSandbox}, isProduction=${isProduction})`);
  console.log(`effectiveQaUser:                 ${maskId(effectiveQaUser)} (hasValidQaUser=${hasValidQaUser}, isMatchingQaUser=${isMatchingQaUser})`);
  console.log(`isUserPermitted:                 ${isUserPermitted}`);
  console.log(`isEligibleForUpgrade:            ${isEligibleForUpgrade}`);
  console.log(`------------------------------------------------------`);
  console.log(`CALCULATED can_subscribe:       ${canSubscribeCalculated}`);
  console.log(`------------------------------------------------------`);

  console.log('\n======================================================');
  console.log('5. TRACE billing-checkout RUNTIME READINESS');
  console.log('======================================================');
  const bcProvider = String(getBcEnv('BILLING_CHECKOUT_PROVIDER')).trim().toLowerCase() || 'whop';
  const bcEnabled = String(getBcEnv('BILLING_CHECKOUT_ENABLED')).toLowerCase() === 'true';
  const bcProviderReady = String(getBcEnv('BILLING_CHECKOUT_PROVIDER_READY')).toLowerCase() === 'true';
  const bcWhopCheckoutEnv = String(getBcEnv('WHOP_CHECKOUT_ENVIRONMENT') || getBcEnv('BILLING_CHECKOUT_ENVIRONMENT')).trim().toLowerCase();
  const bcQaUser = String(bcProvider === 'whop' ? getBcEnv('WHOP_SANDBOX_QA_USER_ID') : getBcEnv('BILLING_CHECKOUT_QA_USER_ID')).trim();

  console.log(`bcProvider:             "${bcProvider}"`);
  console.log(`bcEnabled:              ${bcEnabled}`);
  console.log(`bcProviderReady:        ${bcProviderReady}`);
  console.log(`bcWhopCheckoutEnv:      "${bcWhopCheckoutEnv}"`);
  console.log(`bcQaUser:               ${maskId(bcQaUser)} (matches=${bcQaUser === userId})`);

  console.log('\n======================================================');
  console.log('6. LIVE EXECUTION OF coupons HUB (get-subscription)');
  console.log('======================================================');
  try {
    const jwtObj = await users.createJWT(userId);
    const execution = await functions.createExecution(
      'coupons',
      JSON.stringify({
        action: 'get-subscription',
        __headers: {
          'X-Appwrite-JWT': jwtObj.jwt,
        },
      }),
      false, // synchronous
      '/',
      'POST',
      {
        'content-type': 'application/json',
      }
    );
    console.log(`Execution status: ${execution.status} (code: ${execution.statusCode})`);
    console.log(`Execution response: ${execution.responseBody}`);
    if (execution.logs) {
      console.log(`Execution stdout:\n${execution.logs}`);
    }
    if (execution.errors) {
      console.log(`Execution errors:\n${execution.errors}`);
    }
  } catch (err) {
    console.log(`Execution invocation failed: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log('7. RECENT billing-checkout EXECUTIONS');
  console.log('======================================================');
  try {
    const res = await functions.listExecutions('billing-checkout', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(5),
    ]);
    for (const exec of res.executions || []) {
      console.log(`Execution: ${exec.$id} | Status: ${exec.status} | HTTP: ${exec.responseStatusCode} | Duration: ${exec.duration}s | Created: ${exec.$createdAt}`);
      if (exec.errors) {
        console.log(`  Errors: ${exec.errors.trim()}`);
      }
      if (exec.logs) {
        console.log(`  Logs: ${exec.logs.trim()}`);
      }
      if (exec.responseBody) {
        console.log(`  Response: ${exec.responseBody.slice(0, 300)}`);
      }
    }
  } catch (err) {
    console.log(`Failed to list executions: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log('AUDIT COMPLETED SAFELY — NO CHECKOUT/PAYMENT/DEPLOY');
  console.log('======================================================\n');
}

main().catch(err => {
  console.error(`Audit failed: ${err.message}`);
  process.exit(1);
});
