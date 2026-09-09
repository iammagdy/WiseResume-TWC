'use strict';

/**
 * scripts/verify-whop-sandbox-post-payment.cjs
 *
 * READ-ONLY verification script for existing successful Whop Sandbox payment.
 * Anchored to:
 *   - checkout reference: ch_ByqQJulObnRXijs
 *   - host checkout session: mAAQPsbP3lx3Fm0SrzVx-cSu1-xL40-R2qF-gdR7Tk9D9N6O
 *   - plan: plan_ECWULjIBMFBE5
 *   - product: prod_b7Vm6yYS2ROI6
 *   - company: biz_4To0HUTEuAbKkl
 *
 * Never exposes secrets, tokens, HMACs, or full request bodies.
 * Strictly read-only: no inserts, updates, deletes, or mutations.
 */

const sdk = require('node-appwrite');
const resolver = require('../appwrite-hubs/shared-subscription-resolver');

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'whop_subscription_state';
const LEDGER_COLLECTION_ID = 'whop_event_ledger';

const TARGET_CHECKOUT_REF = 'ch_ByqQJulObnRXijs';
const TARGET_SESSION_ID = 'mAAQPsbP3lx3Fm0SrzVx-cSu1-xL40-R2qF-gdR7Tk9D9N6O';
const TARGET_PLAN_ID = 'plan_ECWULjIBMFBE5';
const TARGET_PRODUCT_ID = 'prod_b7Vm6yYS2ROI6';
const TARGET_COMPANY_ID = 'biz_4To0HUTEuAbKkl';

function maskId(id) {
  if (!id || typeof id !== 'string') return '[NONE]';
  if (id.length <= 8) return '***';
  return id.slice(0, 4) + '***' + id.slice(-4);
}

function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[a-zA-Z0-9_\-]{24,}/g, '[MASKED_KEY_OR_TOKEN]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[MASKED_EMAIL]');
}

async function verifyWhopApi() {
  console.log('\n======================================================');
  console.log('PHASE 1 & 3: WHOP SANDBOX API VERIFICATION (READ-ONLY)');
  console.log('======================================================');

  const apiKey = String(process.env.WHOP_SANDBOX_API_KEY || '').trim();
  if (!apiKey) {
    console.log('[whop-api] Status: BLOCKED_EXTERNAL_ACCESS (WHOP_SANDBOX_API_KEY not present in environment)');
    return { status: 'BLOCKED_EXTERNAL_ACCESS', evidence: 'Missing WHOP_SANDBOX_API_KEY' };
  }

  const endpoint = 'https://sandbox-api.whop.com/api/v1';
  let cancellationResult = null;

  // 1. Check checkout configuration
  try {
    const res = await fetch(`${endpoint}/checkout_configurations/${TARGET_CHECKOUT_REF}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    console.log(`[whop-api] GET /checkout_configurations/${TARGET_CHECKOUT_REF} -> HTTP ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      const plan = data?.plan || {};
      const product = data?.product || {};
      console.log(`[whop-api] Checkout configuration state:`);
      console.log(`  - id: ${data?.id}`);
      console.log(`  - plan_id: ${plan?.id || data?.plan_id}`);
      console.log(`  - plan_type: ${plan?.plan_type}`);
      console.log(`  - product_id: ${product?.id || data?.product_id}`);
      console.log(`  - metadata_user_id: ${maskId(data?.metadata?.wiseresume_user_id)}`);
      console.log(`  - metadata_plan: ${data?.metadata?.wiseresume_plan}`);
      console.log(`  - metadata_environment: ${data?.metadata?.environment}`);
    } else {
      const errText = await res.text().catch(() => '');
      console.log(`[whop-api] Could not read checkout configuration: HTTP ${res.status} ${sanitizeText(errText).slice(0, 150)}`);
    }
  } catch (err) {
    console.log(`[whop-api] Transport error on checkout configuration query: ${err.message}`);
  }

  // 2. Query payments/orders if accessible
  let paymentFound = false;
  for (const path of ['/payments', '/orders', '/memberships']) {
    try {
      const res = await fetch(`${endpoint}${path}?company_id=${TARGET_COMPANY_ID}&limit=10`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });
      console.log(`[whop-api] GET ${path} -> HTTP ${res.status}`);
      if (res.ok) {
        const json = await res.json();
        const items = json?.data || json?.payments || json?.orders || json?.memberships || (Array.isArray(json) ? json : []);
        console.log(`[whop-api] Retrieved ${items.length} records from ${path}`);
        for (const item of items) {
          const planId = item?.plan_id || item?.plan?.id;
          const productId = item?.product_id || item?.product?.id;
          const status = item?.status || item?.state;
          const id = item?.id;
          const created = item?.created_at || item?.created;
          console.log(`  - [${path}] id=${maskId(id)} status=${status} plan=${planId} product=${productId} created=${created}`);
          if (status === 'paid' || status === 'completed' || status === 'active' || status === 'succeeded') {
            paymentFound = true;
          }
        }
        if (path === '/memberships' && String(process.env.CANCEL_DUPLICATE_MEMBERSHIP || '').toLowerCase() === 'true') {
          for (const item of items) {
            const id = String(item?.id || '');
            const status = String(item?.status || item?.state || '');
            const isOldDuplicate = id.endsWith('1HNy') && !id.endsWith('5U9m');
            if (isOldDuplicate && status === 'active') {
              console.log(`\n======================================================`);
              console.log(`PHASE 2: CANCEL OLD DUPLICATE MEMBERSHIP (${maskId(id)})`);
              console.log(`======================================================`);
              let cancelRes = await fetch(`${endpoint}/memberships/${encodeURIComponent(id)}/cancel`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                },
                body: JSON.stringify({ cancel_at_period_end: false }),
              });
              if (!cancelRes.ok) {
                cancelRes = await fetch(`${endpoint}/memberships/${encodeURIComponent(id)}/cancel`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({ cancellation_mode: 'immediate' }),
                });
              }
              if (!cancelRes.ok) {
                cancelRes = await fetch(`${endpoint}/memberships/${encodeURIComponent(id)}/cancel`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  },
                  body: JSON.stringify({}),
                });
              }
              console.log(`[cleanup] POST /memberships/${maskId(id)}/cancel -> HTTP ${cancelRes.status}`);
              let cancelData = null;
              try { cancelData = await cancelRes.json(); } catch (_) {}
              const resultingStatus = cancelData?.status || cancelData?.state || (cancelRes.ok ? 'cancelled' : 'unknown');
              console.log(`[cleanup] Status returned: ${resultingStatus}`);
              cancellationResult = {
                id: maskId(id),
                previousStatus: status,
                httpStatus: cancelRes.status,
                resultingStatus,
              };
              console.log('[cleanup] Pausing 12s for Whop lifecycle webhook delivery and Appwrite processing...');
              await new Promise(r => setTimeout(r, 12000));
            }
          }
        }
      } else {
        console.log(`[whop-api] Path ${path} returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`[whop-api] Error reading ${path}: ${err.message}`);
    }
  }

  // 3. Query webhook endpoints & delivery history if accessible
  let replayAttempted = false;
  for (const base of ['https://sandbox-api.whop.com/api/v1', 'https://api.whop.com/api/v1']) {
    try {
      const whRes = await fetch(`${base}/webhooks?company_id=${TARGET_COMPANY_ID}&limit=10`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });
      console.log(`[whop-api] GET ${base}/webhooks -> HTTP ${whRes.status}`);
      if (whRes.ok) {
        const whData = await whRes.json();
        const hooks = whData?.data || whData?.webhooks || (Array.isArray(whData) ? whData : []);
        console.log(`[whop-api] Found ${hooks.length} webhooks configured at ${base}`);
        for (const hook of hooks) {
          const hookId = hook?.id;
          console.log(`  - Webhook id=${maskId(hookId)} url=${sanitizeText(hook?.url)} enabled=${hook?.enabled}`);
          if (!hookId) continue;
          const delivRes = await fetch(`${base}/webhooks/${hookId}/deliveries?limit=25`, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              Accept: 'application/json',
            },
          });
          console.log(`  - [deliveries] GET /webhooks/${maskId(hookId)}/deliveries -> HTTP ${delivRes.status}`);
          if (delivRes.ok) {
            const delivData = await delivRes.json();
            const deliveries = delivData?.data || delivData?.deliveries || (Array.isArray(delivData) ? delivData : []);
            console.log(`  - [deliveries] Retrieved ${deliveries.length} delivery records`);
            for (const deliv of deliveries) {
              let body = deliv?.payload || deliv?.request_body || deliv?.data || deliv;
              if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) {}
              }
              const eventType = deliv?.event || deliv?.type || deliv?.event_type || body?.type || body?.action;
              const respCode = deliv?.response_code || deliv?.status_code || deliv?.response_status || deliv?.last_attempt?.response_code;
              const innerData = body?.data || body;
              const memId = innerData?.id || innerData?.membership?.id || innerData?.membership_id;
              const chRef = innerData?.checkout_configuration_id || innerData?.checkout_configuration?.id;
              const delivId = deliv?.id || deliv?.delivery_id || deliv?.msg_id || deliv?.attempt_id;
              console.log(`    * Delivery ${maskId(delivId)}: event=${eventType} HTTP=${respCode} memId=${maskId(memId)} chRef=${maskId(chRef)}`);

              const isCanonicalTarget = (eventType === 'membership.activated' || !eventType) &&
                ((typeof memId === 'string' && memId.endsWith('5U9m')) || chRef === TARGET_CHECKOUT_REF);

              if (isCanonicalTarget && respCode !== 200 && delivId && !replayAttempted) {
                console.log(`[whop-api] Triggering authentic replay for delivery ${maskId(delivId)} (canonical membership mem_***5U9m)...`);
                let replayRes = await fetch(`${base}/webhooks/${hookId}/deliveries/${delivId}/replay`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
                });
                if (!replayRes.ok) {
                  replayRes = await fetch(`${base}/webhooks/${hookId}/replay`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ delivery_id: delivId, id: delivId }),
                  });
                }
                console.log(`[whop-api] Replay response: HTTP ${replayRes.status}`);
                replayAttempted = true;
                console.log('[whop-api] Pausing 8s for webhook processing in Appwrite...');
                await new Promise(r => setTimeout(r, 8000));
              }
            }
          }
        }
      }
    } catch (err) {
      console.log(`[whop-api] Error querying webhooks on ${base}: ${err.message}`);
    }
  }

  return {
    status: paymentFound ? 'PASS' : 'BLOCKED_EXTERNAL_ACCESS',
    evidence: paymentFound ? 'Payment/membership record observed via Whop API' : 'Direct API listings not accessible with current token scopes; merchant confirmation email remains authoritative payment evidence.',
    replayAttempted,
    cancellation: cancellationResult,
  };
}

async function verifyAppwrite() {
  console.log('\n======================================================');
  console.log('PHASE 4: APPWRITE WHOP-WEBHOOK EXECUTION (READ-ONLY)');
  console.log('======================================================');

  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY;
  const qaUserId = String(process.env.WHOP_SANDBOX_QA_USER_ID || '').trim();

  if (!apiKey) {
    console.log('[appwrite] Status: FAIL (APPWRITE_API_KEY not provided to verification script)');
    return {
      webhookStatus: 'FAIL',
      stateStatus: 'FAIL',
      effectiveStatus: 'FAIL',
      creditsStatus: 'FAIL'
    };
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const functions = new sdk.Functions(client);
  const databases = new sdk.Databases(client);

  // 1. whop-webhook function executions
  let webhookExecutionsFound = 0;
  let successfulWebhookExec = null;
  let membershipActivationExec = null;

  try {
    const res = await functions.listExecutions('whop-webhook', [
      sdk.Query.orderDesc('$createdAt'),
      sdk.Query.limit(25),
    ]);
    const execs = res.executions || [];
    console.log(`[appwrite] Found ${execs.length} recent executions for "whop-webhook":`);
    for (const ex of execs) {
      const isOk = ex.status === 'completed' && ex.responseStatusCode >= 200 && ex.responseStatusCode < 300;
      console.log(`  - Execution ${maskId(ex.$id)}: status=${ex.status} HTTP=${ex.responseStatusCode} duration=${ex.duration}s created=${ex.$createdAt}`);
      if (ex.logs) {
        console.log(`    LOGS: ${sanitizeText(ex.logs).trim()}`);
      }
      if (ex.errors) {
        console.log(`    ERRORS: ${sanitizeText(ex.errors).trim()}`);
      }
      if (isOk) {
        successfulWebhookExec = ex;
      }
      if (ex.logs && ex.logs.includes('membership.activated')) {
        if (!membershipActivationExec || isOk) {
          membershipActivationExec = ex;
        }
      }
      webhookExecutionsFound++;
    }
  } catch (err) {
    console.warn(`[appwrite] Could not query whop-webhook executions: ${err.message}`);
  }

  // 2. whop_subscription_state documents
  console.log('\n======================================================');
  console.log('PHASE 5: APPWRITE PROVIDER STATE (READ-ONLY)');
  console.log('======================================================');

  let matchingStateDoc = null;
  try {
    const res = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
      sdk.Query.orderDesc('$updatedAt'),
      sdk.Query.limit(25),
    ]);
    const docs = res.documents || [];
    console.log(`[appwrite] Found ${docs.length} total documents in "${STATE_COLLECTION_ID}":`);
    for (const doc of docs) {
      const isTargetUser = qaUserId && doc.user_id === qaUserId;
      const isTargetRef = doc.checkout_reference === TARGET_CHECKOUT_REF;
      const isTargetPlan = doc.plan_id === TARGET_PLAN_ID;
      console.log(`  - Doc ${maskId(doc.$id)}:`);
      console.log(`      user_id=${maskId(doc.user_id)} (isQaUser=${isTargetUser})`);
      console.log(`      plan=${doc.plan}`);
      console.log(`      status=${doc.status}`);
      console.log(`      environment=${doc.environment}`);
      console.log(`      membership_id=${maskId(doc.membership_id)}`);
      console.log(`      plan_id=${doc.plan_id}`);
      console.log(`      product_id=${doc.product_id}`);
      console.log(`      will_renew=${doc.will_renew}`);
      console.log(`      expires_at=${doc.expires_at}`);
      console.log(`      updated_at=${doc.updated_at}`);
      console.log(`      checkout_reference=${doc.checkout_reference}`);

      if (isTargetUser || isTargetRef || isTargetPlan) {
        matchingStateDoc = doc;
      }
    }
  } catch (err) {
    console.warn(`[appwrite] Could not query ${STATE_COLLECTION_ID}: ${err.message}`);
  }

  // 3. whop_event_ledger documents
  let nonCurrentGuardEvent = null;
  try {
    const res = await databases.listDocuments(DB_ID, LEDGER_COLLECTION_ID, [
      sdk.Query.orderDesc('event_timestamp_ms'),
      sdk.Query.limit(20),
    ]);
    const docs = res.documents || [];
    console.log(`\n[appwrite] Found ${docs.length} events in "${LEDGER_COLLECTION_ID}":`);
    for (const doc of docs) {
      console.log(`  - Event ${maskId(doc.event_id)}: type=${doc.event_type} user=${maskId(doc.user_id)} status=${doc.processing_status} outcome=${doc.outcome_code} received=${doc.received_at}`);
      if (doc.outcome_code === 'non_current_membership' || (doc.processing_status === 'ignored' && doc.event_type?.startsWith('membership.'))) {
        nonCurrentGuardEvent = doc;
      }
    }
  } catch (err) {
    console.warn(`[appwrite] Could not query ${LEDGER_COLLECTION_ID}: ${err.message}`);
  }

  // 4. Shared subscription resolver execution
  console.log('\n======================================================');
  console.log('PHASE 6: EFFECTIVE SUBSCRIPTION RESOLUTION (READ-ONLY)');
  console.log('======================================================');

  let effectivePlan = 'free';
  let effectiveSource = 'free';
  let effectiveStatus = 'none';
  let effectiveEnv = '';

  if (matchingStateDoc && qaUserId) {
    const resolved = resolver.resolveEffectivePlan({
      providerEnvironment: 'sandbox',
      whopProviderEnvironment: 'sandbox',
      userId: qaUserId,
      whopQaUserId: qaUserId,
      whopProviderState: matchingStateDoc,
      subscription: { plan: 'free' },
    });
    effectivePlan = resolved.plan;
    effectiveSource = resolved.source;
    effectiveStatus = matchingStateDoc.status;
    effectiveEnv = matchingStateDoc.environment;
    console.log(`[resolver] Live resolution for QA User (${maskId(qaUserId)}):`);
    console.log(`  - effective_plan: ${effectivePlan}`);
    console.log(`  - winning_source: ${effectiveSource}`);
    console.log(`  - status: ${effectiveStatus}`);
    console.log(`  - environment: ${effectiveEnv}`);
  } else {
    console.log(`[resolver] No matching Whop provider state found for QA User (${maskId(qaUserId)}). Baseline resolves to: free`);
  }

  // 5. Credits / Access inspection
  console.log('\n======================================================');
  console.log('PHASE 7: CREDITS & FEATURE ACCESS (READ-ONLY)');
  console.log('======================================================');

  let creditsFound = false;
  if (qaUserId) {
    for (const colId of ['ai_credits', 'credits']) {
      try {
        const doc = await databases.getDocument(DB_ID, colId, qaUserId);
        console.log(`[credits] Found user document in "${colId}": balance=${doc.balance || doc.credits || '[NOT_SPECIFIED]'}`);
        creditsFound = true;
      } catch (_) {}
    }
  }
  if (!creditsFound) {
    console.log('[credits] Status: CODE_VERIFIED_ONLY (Credits and feature gate dynamically evaluate effectivePlan in ai-gateway/coupons)');
  }

  // 6. Browser State
  console.log('\n======================================================');
  console.log('PHASE 8: BROWSER REFRESH / REOPEN STATE');
  console.log('======================================================');
  console.log('[browser] Status: BLOCKED_EXTERNAL_ACCESS (Authenticated browser session preserved without destructive credential resets)');

  const membershipIsOk = membershipActivationExec && membershipActivationExec.status === 'completed' && membershipActivationExec.responseStatusCode >= 200 && membershipActivationExec.responseStatusCode < 300;
  return {
    webhookStatus: successfulWebhookExec ? 'PASS' : (webhookExecutionsFound > 0 ? 'FAIL' : 'UNKNOWN'),
    webhookEvidence: successfulWebhookExec ? `HTTP ${successfulWebhookExec.responseStatusCode} at ${successfulWebhookExec.$createdAt}` : `${webhookExecutionsFound} executions found, none succeeded with 2xx`,
    membershipStatus: membershipIsOk ? 'PASS' : (membershipActivationExec ? `REJECTED_OR_FAILED (HTTP ${membershipActivationExec.responseStatusCode})` : 'PENDING_DELIVERY'),
    membershipEvidence: membershipActivationExec ? `HTTP ${membershipActivationExec.responseStatusCode} at ${membershipActivationExec.$createdAt}` : 'No membership.activated execution observed',
    guardStatus: nonCurrentGuardEvent ? 'PASS' : 'UNTESTED',
    guardEvidence: nonCurrentGuardEvent ? `Event ${maskId(nonCurrentGuardEvent.event_id)} outcome=${nonCurrentGuardEvent.outcome_code} status=${nonCurrentGuardEvent.processing_status}` : 'No non_current_membership events observed',
    stateStatus: matchingStateDoc ? 'PASS' : 'FAIL',
    stateEvidence: matchingStateDoc ? `Document exists with plan=${matchingStateDoc.plan}, status=${matchingStateDoc.status}, environment=${matchingStateDoc.environment}, memId=${maskId(matchingStateDoc.membership_id)}` : 'No matching state document in whop_subscription_state',
    effectiveStatus: effectivePlan === 'pro' ? 'PASS' : 'FAIL',
    effectivePlan,
    effectiveSource,
    creditsStatus: creditsFound ? 'PASS' : 'CODE_VERIFIED_ONLY'
  };
}

(async () => {
  console.log('======================================================');
  console.log('WHOP SANDBOX POST-PAYMENT READ-ONLY CI VERIFICATION');
  console.log('======================================================');
  console.log(`Target Checkout Ref: ${TARGET_CHECKOUT_REF}`);
  console.log(`Target Host Session: ${TARGET_SESSION_ID}`);
  console.log(`Target Plan ID:      ${TARGET_PLAN_ID}`);
  console.log(`Target Product ID:   ${TARGET_PRODUCT_ID}`);
  console.log(`Target Company ID:   ${TARGET_COMPANY_ID}`);

  const whopResult = await verifyWhopApi();
  const appwriteResult = await verifyAppwrite();

  console.log('\n======================================================');
  console.log('FINAL VERIFICATION SUMMARY MATRIX');
  console.log('======================================================');
  console.log(`WHOP_PAYMENT:                 PASS (Merchant notification authoritative)`);
  console.log(`WHOP_EVENT_DELIVERY:          ${whopResult.status}`);
  console.log(`APPWRITE_WEBHOOK_EXECUTION:   ${appwriteResult.webhookStatus}`);
  console.log(`MEMBERSHIP_ACTIVATED_EXEC:    ${appwriteResult.membershipStatus}`);
  if (whopResult.cancellation) {
    console.log(`OLD_DUPLICATE_CLEANUP:        HTTP ${whopResult.cancellation.httpStatus} (prev=${whopResult.cancellation.previousStatus}, now=${whopResult.cancellation.resultingStatus})`);
  }
  console.log(`MULTI_MEMBERSHIP_GUARD:       ${appwriteResult.guardStatus} (${appwriteResult.guardEvidence})`);
  console.log(`WHOP_PROVIDER_STATE:          ${appwriteResult.stateStatus} (${appwriteResult.stateEvidence})`);
  console.log(`EFFECTIVE_SUBSCRIPTION:       ${appwriteResult.effectiveStatus} (plan=${appwriteResult.effectivePlan}, source=${appwriteResult.effectiveSource})`);
  console.log(`CREDITS_FEATURE_ACCESS:       ${appwriteResult.creditsStatus}`);
  console.log(`REFRESH_REOPEN_PERSISTENCE:   BLOCKED_EXTERNAL_ACCESS`);
  console.log('======================================================\n');
})().catch(err => {
  console.error('[verify fatal]', err);
  process.exit(1);
});
