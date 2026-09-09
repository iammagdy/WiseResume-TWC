'use strict';

/**
 * scripts/bind-whop-sandbox-qa-user.cjs
 *
 * Safely resolves a new WiseResume Appwrite user by exact email, audits
 * existing WHOP_SANDBOX_QA_USER_ID consistency across billing-checkout,
 * ai-gateway, and coupons, and atomically binds WHOP_SANDBOX_QA_USER_ID
 * to the new user without performing any code deployment or automated payment.
 */

const sdk = require('node-appwrite');
const path = require('path');
const resolver = require('../appwrite-hubs/shared-subscription-resolver');
const {
  TARGET_HUBS,
  VARIABLE_KEY,
  mask,
  maskId,
  retryWithBackoff,
  captureAndApply,
} = require('./sync_whop_qa_user_variable.cjs');

const DEFAULT_TARGET_EMAIL = 'debeg50114@fidhost.com';
const DB_ID = 'main';
const STATE_COLLECTION_ID = 'whop_subscription_state';

async function main() {
  const targetEmail = String(process.env.TARGET_QA_USER_EMAIL || process.argv[2] || DEFAULT_TARGET_EMAIL).trim().toLowerCase();
  if (!targetEmail) {
    throw new Error('[bind-qa] TARGET_QA_USER_EMAIL is required');
  }

  mask(targetEmail);

  console.log('\n======================================================');
  console.log('1. RESOLVE NEW APPWRITE USER (EXACT MATCH)');
  console.log('======================================================');

  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('[bind-qa] APPWRITE_API_KEY is required');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const users = new sdk.Users(client);
  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);

  const listed = await retryWithBackoff(() =>
    users.list([sdk.Query.equal('email', [targetEmail]), sdk.Query.limit(10)])
  );

  const matchingUsers = (listed.users || []).filter(
    u => String(u.email || '').trim().toLowerCase() === targetEmail
  );

  console.log(`[bind-qa] User search for ${targetEmail}: found ${matchingUsers.length} exact match(es)`);

  if (matchingUsers.length === 0) {
    throw new Error(`[bind-qa] No Appwrite user found with email: ${targetEmail}`);
  }
  if (matchingUsers.length > 1) {
    throw new Error(`[bind-qa] Multiple Appwrite users found matching email: ${targetEmail}`);
  }

  const targetUser = matchingUsers[0];
  const newUserId = String(targetUser.$id || '').trim();
  if (!newUserId) {
    throw new Error('[bind-qa] Target user has empty $id');
  }

  mask(newUserId);
  console.log(`[bind-qa] Target user resolved: ID=${maskId(newUserId)} Email=${targetEmail} Name=${targetUser.name || '[NONE]'}`);

  // Safety check: verify this is NOT the old canonical QA fixture
  const oldCanonicalFixtures = ['qa_p***725e', 'qa_prod_sandbox_user_2026_06_21'];
  if (newUserId.startsWith('qa_p') || oldCanonicalFixtures.includes(newUserId)) {
    throw new Error(`[bind-qa] Target user matches old canonical QA fixture (${maskId(newUserId)}). Must be a brand-new user.`);
  }

  // Check whop_subscription_state documents for this user
  console.log('\n======================================================');
  console.log('2. VERIFY INITIAL ENTITLEMENT STATE (READ-ONLY)');
  console.log('======================================================');

  let existingDocs = [];
  try {
    const stateRes = await retryWithBackoff(() =>
      databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
        sdk.Query.equal('user_id', [newUserId]),
        sdk.Query.limit(10),
      ])
    );
    existingDocs = stateRes.documents || [];
  } catch (err) {
    console.log(`[bind-qa] Notice on checking whop_subscription_state: ${err.message}`);
  }

  console.log(`[bind-qa] whop_subscription_state documents for user: ${existingDocs.length}`);
  if (existingDocs.length > 0) {
    throw new Error(`[bind-qa] Target user already has ${existingDocs.length} whop_subscription_state document(s). Must be free/clean.`);
  }

  // Resolve initial effective subscription plan
  const initialResolution = resolver.resolveEffectivePlan({
    userId: newUserId,
    whopProviderState: null,
    whopProviderEnvironment: 'sandbox',
    whopQaUserId: newUserId,
  });

  console.log(`[bind-qa] Initial effective plan: ${initialResolution.plan} (source: ${initialResolution.source})`);
  if (initialResolution.plan !== 'free') {
    throw new Error(`[bind-qa] Initial plan must be 'free', got: ${initialResolution.plan}`);
  }

  console.log('\n======================================================');
  console.log('3. AUDIT PRE-MUTATION QA GATE CONSISTENCY');
  console.log('======================================================');

  const preAudit = {};
  for (const fnId of TARGET_HUBS) {
    const listRes = await retryWithBackoff(() =>
      functions.listVariables(fnId, [sdk.Query.limit(100)])
    );
    const variable = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);
    preAudit[fnId] = {
      exists: Boolean(variable),
      value: variable ? variable.value : null,
      secret: variable ? Boolean(variable.secret) : false,
      varId: variable ? variable.$id : null,
    };
    if (variable && variable.value) mask(variable.value);
    console.log(`- ${fnId}: exists=${preAudit[fnId].exists} secret=${preAudit[fnId].secret} value=${maskId(preAudit[fnId].value)}`);
  }

  const bcVal = preAudit['billing-checkout'].value;
  const agVal = preAudit['ai-gateway'].value;
  const cpVal = preAudit['coupons'].value;

  const bcEqAg = bcVal === agVal;
  const bcEqCp = bcVal === cpVal;
  const agEqCp = agVal === cpVal;
  const allConsistent = bcEqAg && bcEqCp && agEqCp;

  console.log(`[bind-qa] Pre-mutation consistency check:`);
  console.log(`  billing-checkout == ai-gateway: ${bcEqAg ? 'YES' : 'NO'}`);
  console.log(`  billing-checkout == coupons:    ${bcEqCp ? 'YES' : 'NO'}`);
  console.log(`  ai-gateway == coupons:          ${agEqCp ? 'YES' : 'NO'}`);
  console.log(`  all hubs consistent:            ${allConsistent ? 'YES' : 'NO'}`);

  if (!allConsistent) {
    throw new Error('[bind-qa] Current QA gate variables are inconsistent across hubs. Stop.');
  }

  console.log('\n======================================================');
  console.log(`4. BIND WHOP_SANDBOX_QA_USER_ID TO NEW USER (${maskId(newUserId)})`);
  console.log('======================================================');

  const statePath = path.join(process.cwd(), '.temp_manual_qa_user_restore.json');
  await captureAndApply(functions, newUserId, {
    stateFilePath: statePath,
    initialDelayMs: 250,
    retries: 3,
  });

  console.log('\n======================================================');
  console.log('5. POST-BIND READBACK VERIFICATION');
  console.log('======================================================');

  const postAudit = {};
  for (const fnId of TARGET_HUBS) {
    const listRes = await retryWithBackoff(() =>
      functions.listVariables(fnId, [sdk.Query.limit(100)])
    );
    const variable = (listRes.variables || []).find(v => v.key === VARIABLE_KEY);
    postAudit[fnId] = {
      exists: Boolean(variable),
      value: variable ? variable.value : null,
      secret: variable ? Boolean(variable.secret) : false,
    };
    console.log(`- ${fnId}: exists=${postAudit[fnId].exists} secret=${postAudit[fnId].secret} value=${maskId(postAudit[fnId].value)} matches_new_user=${postAudit[fnId].value === newUserId}`);
  }

  const allMatchNewUser = TARGET_HUBS.every(h => postAudit[h].value === newUserId);
  if (!allMatchNewUser) {
    throw new Error('[bind-qa] Post-bind verification failed: not all hubs match the new user ID');
  }

  console.log('\n======================================================');
  console.log('FINAL BINDING SUMMARY MATRIX');
  console.log('======================================================');
  console.log(`TARGET_EMAIL:           ${targetEmail}`);
  console.log(`TARGET_USER_ID:         ${maskId(newUserId)}`);
  console.log(`INITIAL_PLAN:           free`);
  console.log(`PREVIOUS_GATE_AUDIT:    CONSISTENT (all 3 hubs matched)`);
  console.log(`BILLING_CHECKOUT_BOUND: PASS (${maskId(postAudit['billing-checkout'].value)})`);
  console.log(`AI_GATEWAY_BOUND:       PASS (${maskId(postAudit['ai-gateway'].value)})`);
  console.log(`COUPONS_BOUND:          PASS (${maskId(postAudit['coupons'].value)})`);
  console.log(`TRANSACTION_SAFETY:     PASS`);
  console.log(`APPWRITE_DEPLOYMENTS:   NONE`);
  console.log(`WHOP_SANDBOX_ACCESS:    BOUND_TO_NEW_MANUAL_QA_ACCOUNT`);
  console.log(`RESTORE_PERFORMED:      NO (Intentionally preserved for manual QA)`);
  console.log('======================================================\n');
}

if (require.main === module) {
  main().catch(err => {
    console.error(`[bind-qa] Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  main,
  DEFAULT_TARGET_EMAIL,
};
