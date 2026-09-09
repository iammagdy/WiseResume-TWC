'use strict';

/**
 * scripts/audit_legacy_premium_accounts.cjs
 *
 * READ-ONLY audit of all existing accounts touching premium / ultimate:
 * 1. Queries Appwrite users, profiles, subscriptions, whop_subscription_state,
 *    paypal_subscription_state, revenuecat_subscription_state, and billing_checkout_sessions.
 * 2. Applies authoritative @wiseresume/subscription-resolver.
 * 3. Aggregates statistics: TOTAL_USERS, FREE_EFFECTIVE, PRO_EFFECTIVE, ULTIMATE_EFFECTIVE, etc.
 * 4. Categorizes premium-touching accounts into explicit categories.
 * 5. Detects provider and profile anomalies.
 * 6. Masks all PII (user IDs, emails).
 * 7. Strictly ZERO mutations/writes.
 */

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');
const resolver = require('../appwrite-hubs/shared-subscription-resolver');

const DB_ID = 'main';

function maskId(id) {
  if (!id || typeof id !== 'string') return '[NONE]';
  if (id.length <= 8) return 'u_***' + id.slice(-2);
  return 'u_' + id.slice(0, 3) + '***' + id.slice(-4);
}

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '[NO_EMAIL]';
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return '[INVALID_EMAIL]';
  const local = parts[0];
  const domain = parts[1];
  const maskedLocal = local.length <= 2 ? local[0] + '***' : local.slice(0, 2) + '***' + local.slice(-1);
  const domainParts = domain.split('.');
  const maskedDomain = domainParts.length >= 2
    ? domainParts[0].slice(0, 2) + '***.' + domainParts.slice(1).join('.')
    : domain.slice(0, 2) + '***';
  return `${maskedLocal}@${maskedDomain}`;
}

async function fetchAllDocuments(databases, collectionId) {
  const documents = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    try {
      const res = await databases.listDocuments(DB_ID, collectionId, [
        sdk.Query.limit(limit),
        sdk.Query.offset(offset),
      ]);
      const docs = res.documents || [];
      documents.push(...docs);
      if (docs.length < limit || documents.length >= res.total) break;
      offset += limit;
    } catch (err) {
      // Collection may not exist (e.g. revenuecat_subscription_state)
      console.log(`[audit] Note: Collection '${collectionId}' query returned: ${err.message}`);
      break;
    }
  }
  return documents;
}

async function fetchAllUsers(usersClient) {
  const allUsers = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const res = await usersClient.list([
      sdk.Query.limit(limit),
      sdk.Query.offset(offset),
    ]);
    const batch = res.users || [];
    allUsers.push(...batch);
    if (batch.length < limit || allUsers.length >= res.total) break;
    offset += limit;
  }
  return allUsers;
}

async function runAudit() {
  const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!apiKey) {
    throw new Error('APPWRITE_API_KEY is required to run the audit');
  }

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const usersClient = new sdk.Users(client);
  const databases = new sdk.Databases(client);

  console.log('================================================================');
  console.log('WISERESUME READ-ONLY LEGACY PREMIUM ACCOUNT AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Endpoint:', endpoint);
  console.log('Project ID:', projectId);
  console.log('================================================================\n');

  console.log('[audit] Fetching Appwrite users...');
  const users = await fetchAllUsers(usersClient);
  console.log(`[audit] Total auth users: ${users.length}`);

  console.log('[audit] Fetching profiles...');
  const profiles = await fetchAllDocuments(databases, 'profiles');
  console.log(`[audit] Total profiles: ${profiles.length}`);

  console.log('[audit] Fetching subscriptions...');
  const subscriptions = await fetchAllDocuments(databases, 'subscriptions');
  console.log(`[audit] Total subscriptions: ${subscriptions.length}`);

  console.log('[audit] Fetching whop_subscription_state...');
  const whopStates = await fetchAllDocuments(databases, 'whop_subscription_state');
  console.log(`[audit] Total whop_subscription_state: ${whopStates.length}`);

  console.log('[audit] Fetching paypal_subscription_state...');
  const paypalStates = await fetchAllDocuments(databases, 'paypal_subscription_state');
  console.log(`[audit] Total paypal_subscription_state: ${paypalStates.length}`);

  console.log('[audit] Fetching revenuecat_subscription_state...');
  const rcStates = await fetchAllDocuments(databases, 'revenuecat_subscription_state');
  console.log(`[audit] Total revenuecat_subscription_state: ${rcStates.length}`);

  console.log('[audit] Fetching billing_checkout_sessions...');
  const checkouts = await fetchAllDocuments(databases, 'billing_checkout_sessions');
  console.log(`[audit] Total billing_checkout_sessions: ${checkouts.length}`);

  // Build lookup maps
  const userMap = new Map(users.map(u => [u.$id, u]));
  const profileMap = new Map(profiles.map(p => [p.user_id || p.$id, p]));
  const subMap = new Map(subscriptions.map(s => [s.user_id || s.userId || s.$id, s]));
  const whopMap = new Map(whopStates.map(w => [w.user_id, w]));
  const paypalMap = new Map(paypalStates.map(p => [p.user_id, p]));
  const rcMap = new Map(rcStates.map(r => [r.user_id, r]));

  // Checkouts map by user_id
  const checkoutsByUser = new Map();
  for (const c of checkouts) {
    const uid = c.user_id || c.wiseresume_user_id;
    if (uid) {
      if (!checkoutsByUser.has(uid)) checkoutsByUser.set(uid, []);
      checkoutsByUser.get(uid).push(c);
    }
  }

  // Aggregate stats counters
  let totalUsers = users.length;
  let freeEffective = 0;
  let proEffective = 0;
  let ultimateEffective = 0;
  let manualOnlyCount = 0;
  let whopCount = 0;
  let paypalCount = 0;
  let rcCount = 0;
  let trialCount = 0;
  let couponCount = 0;
  let multiSourceCount = 0;
  let needsReviewCount = 0;

  // Categorized accounts list
  const categorizedAccounts = [];
  const anomalies = [];

  // Check duplicate provider documents
  const whopCustomerIds = new Map();
  for (const w of whopStates) {
    const memId = w.membership_id || w.$id;
    if (whopCustomerIds.has(memId)) {
      anomalies.push({
        type: 'DUPLICATE_WHOP_MEMBERSHIP_DOC',
        membershipId: maskId(memId),
        userIds: [maskId(whopCustomerIds.get(memId)), maskId(w.user_id)],
      });
    } else {
      whopCustomerIds.set(memId, w.user_id);
    }
  }

  const paypalSubIds = new Map();
  for (const p of paypalStates) {
    const subId = p.subscription_id || p.$id;
    if (paypalSubIds.has(subId)) {
      anomalies.push({
        type: 'DUPLICATE_PAYPAL_SUB_DOC',
        subscriptionId: maskId(subId),
        userIds: [maskId(paypalSubIds.get(subId)), maskId(p.user_id)],
      });
    } else {
      paypalSubIds.set(subId, p.user_id);
    }
  }

  // Check orphaned provider records
  for (const w of whopStates) {
    if (!userMap.has(w.user_id)) {
      anomalies.push({
        type: 'ORPHANED_WHOP_RECORD',
        userId: maskId(w.user_id),
        status: w.status,
        plan: w.plan,
      });
    }
  }
  for (const p of paypalStates) {
    if (!userMap.has(p.user_id)) {
      anomalies.push({
        type: 'ORPHANED_PAYPAL_RECORD',
        userId: maskId(p.user_id),
        status: p.status,
        plan: p.plan,
      });
    }
  }

  // Evaluate every user
  for (const user of users) {
    const userId = user.$id;
    const profile = profileMap.get(userId) || null;
    const sub = subMap.get(userId) || null;
    const whop = whopMap.get(userId) || null;
    const paypal = paypalMap.get(userId) || null;
    const rc = rcMap.get(userId) || null;
    const userCheckouts = checkoutsByUser.get(userId) || [];

    // Evaluate effective plan via authoritative resolver
    const candidates = resolver.buildPlanCandidates({
      subscription: sub,
      providerState: rc,
      whopProviderState: whop,
      paypalProviderState: paypal,
      whopProviderEnvironment: 'sandbox',
      paypalProviderEnvironment: 'sandbox',
      userId,
      nowMs: Date.now(),
    });
    const effective = resolver.resolveEffectivePlan({
      subscription: sub,
      providerState: rc,
      whopProviderState: whop,
      paypalProviderState: paypal,
      whopProviderEnvironment: 'sandbox',
      paypalProviderEnvironment: 'sandbox',
      userId,
      nowMs: Date.now(),
    });

    if (effective.plan === 'premium') ultimateEffective++;
    else if (effective.plan === 'pro') proEffective++;
    else freeEffective++;

    if (whop && (whop.status === 'active' || whop.status === 'trialing')) whopCount++;
    if (paypal && (paypal.status === 'active' || paypal.status === 'trialing')) paypalCount++;
    if (rc && (rc.status === 'active' || rc.status === 'trialing')) rcCount++;
    if (effective.source === 'active trial') trialCount++;
    if (effective.source === 'coupon') couponCount++;
    if (effective.source === 'manual/admin') manualOnlyCount++;

    // Check multiple active providers
    let activeProviderCount = 0;
    if (whop && whop.status === 'active') activeProviderCount++;
    if (paypal && paypal.status === 'active') activeProviderCount++;
    if (rc && rc.status === 'active') activeProviderCount++;
    if (activeProviderCount > 1) {
      multiSourceCount++;
      anomalies.push({
        type: 'MULTIPLE_ACTIVE_PROVIDERS',
        userId: maskId(userId),
        providers: [
          whop ? `whop(${whop.status})` : null,
          paypal ? `paypal(${paypal.status})` : null,
          rc ? `rc(${rc.status})` : null,
        ].filter(Boolean),
      });
    }

    // Check stored plan vs provider status anomalies
    const storedProfilePlan = profile?.plan_name || profile?.plan || 'free';
    if (activeProviderCount > 0 && storedProfilePlan === 'free') {
      anomalies.push({
        type: 'ACTIVE_PROVIDER_BUT_STORED_FREE',
        userId: maskId(userId),
        storedPlan: storedProfilePlan,
        effectivePlan: effective.plan,
        provider: whop?.status === 'active' ? 'whop' : paypal?.status === 'active' ? 'paypal' : 'revenuecat',
      });
    }

    const hasCanceledProviderOnly = (
      (whop && whop.status === 'canceled') ||
      (paypal && paypal.status === 'canceled')
    ) && activeProviderCount === 0;

    if (hasCanceledProviderOnly && storedProfilePlan === 'premium' && !sub?.plan && !sub?.trial_plan) {
      anomalies.push({
        type: 'CANCELED_PROVIDER_BUT_STORED_PREMIUM',
        userId: maskId(userId),
        storedPlan: storedProfilePlan,
      });
    }

    // Determine if this user touches "premium" / "ultimate"
    const touchesPremium = (
      storedProfilePlan === 'premium' ||
      storedProfilePlan === 'ultimate' ||
      sub?.plan === 'premium' ||
      sub?.plan === 'ultimate' ||
      sub?.effective_plan === 'premium' ||
      sub?.effective_plan === 'ultimate' ||
      sub?.trial_plan === 'premium' ||
      sub?.trial_plan === 'ultimate' ||
      whop?.plan === 'premium' ||
      whop?.plan === 'ultimate' ||
      paypal?.plan === 'premium' ||
      paypal?.plan === 'ultimate' ||
      rc?.plan === 'premium' ||
      rc?.plan === 'ultimate' ||
      effective.plan === 'premium'
    );

    if (touchesPremium) {
      // Categorize
      let category = 'UNKNOWN';
      const hasManualPremium = sub?.plan === 'premium' || storedProfilePlan === 'premium';
      const hasActiveWhopPremium = whop?.plan === 'premium' && whop?.status === 'active';
      const hasActivePaypalPremium = paypal?.plan === 'premium' && paypal?.status === 'active';
      const hasActiveRcPremium = rc?.plan === 'premium' && rc?.status === 'active';
      const hasActiveProviderPremium = hasActiveWhopPremium || hasActivePaypalPremium || hasActiveRcPremium;
      const hasActiveTrialPremium = effective.source === 'active trial' && effective.plan === 'premium';
      const hasCouponPremium = effective.source === 'coupon' && effective.plan === 'premium';

      if (effective.plan === 'free' && touchesPremium) {
        category = 'FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL';
      } else if (hasCouponPremium) {
        category = 'COUPON_ULTIMATE';
      } else if (hasActiveTrialPremium) {
        category = 'TRIAL_ULTIMATE';
      } else if (hasManualPremium && hasActiveProviderPremium) {
        category = 'MANUAL_ULTIMATE_PLUS_PROVIDER';
      } else if (hasManualPremium && !hasActiveProviderPremium) {
        category = 'MANUAL_ULTIMATE_ONLY';
      } else if (!hasManualPremium && hasActiveProviderPremium) {
        category = 'PROVIDER_ULTIMATE_ONLY';
      } else if (hasActiveRcPremium) {
        category = 'LEGACY_PROVIDER_ENTITLEMENT';
      } else if (candidates.length > 2) {
        category = 'MULTI_SOURCE_ENTITLEMENT';
      } else {
        category = 'STALE_OR_SUSPICIOUS';
      }

      if (category === 'STALE_OR_SUSPICIOUS' || category === 'UNKNOWN') {
        needsReviewCount++;
      }

      categorizedAccounts.push({
        userId: maskId(userId),
        email: maskEmail(user.email),
        category,
        effectivePlan: effective.plan,
        effectiveSource: effective.source,
        storedProfilePlan,
        manualSubscriptionPlan: sub?.plan || null,
        trialPlan: sub?.trial_plan || null,
        trialExpiresAt: sub?.trial_expires_at || null,
        whopState: whop ? { plan: whop.plan, status: whop.status, env: whop.environment } : null,
        paypalState: paypal ? { plan: paypal.plan, status: paypal.status, env: paypal.environment } : null,
        rcState: rc ? { plan: rc.plan, status: rc.status, env: rc.environment } : null,
        hasCheckoutSession: userCheckouts.length > 0,
      });
    }
  }

  // Compile final summary
  const summary = {
    TOTAL_USERS: totalUsers,
    FREE_EFFECTIVE: freeEffective,
    PRO_EFFECTIVE: proEffective,
    ULTIMATE_EFFECTIVE: ultimateEffective,
    MANUAL_ONLY: manualOnlyCount,
    WHOP: whopCount,
    PAYPAL: paypalCount,
    REVENUECAT: rcCount,
    TRIAL: trialCount,
    COUPON: couponCount,
    MULTI_SOURCE: multiSourceCount,
    NEEDS_REVIEW: needsReviewCount,
    PREMIUM_TOUCHING_TOTAL: categorizedAccounts.length,
    ANOMALIES_COUNT: anomalies.length,
  };

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY STATISTICS:');
  console.log('================================================================');
  console.log(JSON.stringify(summary, null, 2));

  console.log('\n================================================================');
  console.log('CATEGORIZED PREMIUM-TOUCHING ACCOUNTS:');
  console.log('================================================================');
  for (const acct of categorizedAccounts) {
    console.log(`- User: ${acct.userId} (${acct.email}) | Category: ${acct.category} | Effective: ${acct.effectivePlan} (${acct.effectiveSource}) | Stored: ${acct.storedProfilePlan} | Whop: ${acct.whopState ? `${acct.whopState.plan}/${acct.whopState.status}` : 'none'} | PayPal: ${acct.paypalState ? `${acct.paypalState.plan}/${acct.paypalState.status}` : 'none'}`);
  }

  console.log('\n================================================================');
  console.log('DETECTED ANOMALIES:');
  console.log('================================================================');
  if (anomalies.length === 0) {
    console.log('None detected.');
  } else {
    for (const anom of anomalies) {
      console.log(`- [${anom.type}] ${JSON.stringify(anom)}`);
    }
  }

  // Save audit report markdown
  const reportDate = new Date().toISOString().slice(0, 10);
  const reportPath = path.resolve(__dirname, `../Project Atlas/reports/devkit/${reportDate}-legacy-premium-accounts-audit.md`);

  const categoryCounts = {};
  for (const acct of categorizedAccounts) {
    categoryCounts[acct.category] = (categoryCounts[acct.category] || 0) + 1;
  }

  const markdown = `# Read-Only Legacy Premium / Ultimate Accounts Audit Report

**Date:** ${reportDate}  
**Type:** Read-Only Runtime Audit (Zero Mutations Allowed)  
**Corpus:** WiseResume Production Appwrite Datastore  
**Authority:** Phase 4 — DevKit Billing & Entitlements 2026 Refresh  

---

## 1. Executive Summary

- **Total Appwrite Auth Users:** ${summary.TOTAL_USERS}
- **Effective Plan Breakdown:**
  - Free: ${summary.FREE_EFFECTIVE}
  - Pro: ${summary.PRO_EFFECTIVE}
  - Ultimate (internal \`premium\`): ${summary.ULTIMATE_EFFECTIVE}
- **Provider & Access Distribution:**
  - Manual Admin Grants Only: ${summary.MANUAL_ONLY}
  - Whop Subscribers: ${summary.WHOP}
  - PayPal Subscribers: ${summary.PAYPAL}
  - RevenueCat Subscribers: ${summary.REVENUECAT}
  - Active Trials: ${summary.TRIAL}
  - Active Coupons: ${summary.COUPON}
  - Multi-Source Entitlements: ${summary.MULTI_SOURCE}
  - Accounts Requiring Review: ${summary.NEEDS_REVIEW}

---

## 2. Category Breakdown (Accounts Touching Premium / Ultimate)

Total accounts touching \`premium\` / \`ultimate\` across any datastore: **${summary.PREMIUM_TOUCHING_TOTAL}**

| Category | Count | Description |
|---|---|---|
| \`MANUAL_ULTIMATE_ONLY\` | ${categoryCounts['MANUAL_ULTIMATE_ONLY'] || 0} | Manually granted Ultimate with no active provider subscription |
| \`MANUAL_ULTIMATE_PLUS_PROVIDER\` | ${categoryCounts['MANUAL_ULTIMATE_PLUS_PROVIDER'] || 0} | Manual Ultimate combined with active provider subscription |
| \`PROVIDER_ULTIMATE_ONLY\` | ${categoryCounts['PROVIDER_ULTIMATE_ONLY'] || 0} | Active Ultimate subscription via Whop, PayPal, or RevenueCat |
| \`TRIAL_ULTIMATE\` | ${categoryCounts['TRIAL_ULTIMATE'] || 0} | Active trial granting Ultimate |
| \`COUPON_ULTIMATE\` | ${categoryCounts['COUPON_ULTIMATE'] || 0} | Active promotional coupon granting Ultimate |
| \`MULTI_SOURCE_ENTITLEMENT\` | ${categoryCounts['MULTI_SOURCE_ENTITLEMENT'] || 0} | Multiple concurrent entitlement sources |
| \`LEGACY_PROVIDER_ENTITLEMENT\` | ${categoryCounts['LEGACY_PROVIDER_ENTITLEMENT'] || 0} | Grandfathered RevenueCat or legacy payment record |
| \`STALE_OR_SUSPICIOUS\` | ${categoryCounts['STALE_OR_SUSPICIOUS'] || 0} | Expired/canceled provider with lingering stale profile data |
| \`FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL\` | ${categoryCounts['FREE_EFFECTIVE_DESPITE_PREMIUM_SIGNAL'] || 0} | Legacy row with past premium flag but resolver yields Free |
| \`UNKNOWN\` | ${categoryCounts['UNKNOWN'] || 0} | Unclassified state |

---

## 3. Account Inventory (Masked Identifiers)

| User ID | Email | Category | Effective Plan | Access Source | Stored Plan | Whop State | PayPal State |
|---|---|---|---|---|---|---|---|
${categorizedAccounts.length === 0 ? '| *None* | *None* | *None* | *None* | *None* | *None* | *None* | *None* |\n' : categorizedAccounts.map(a => `| \`${a.userId}\` | \`${a.email}\` | \`${a.category}\` | **${a.effectivePlan}** | ${a.effectiveSource} | \`${a.storedProfilePlan}\` | ${a.whopState ? `${a.whopState.plan} (${a.whopState.status})` : '—'} | ${a.paypalState ? `${a.paypalState.plan} (${a.paypalState.status})` : '—'} |`).join('\n')}

---

## 4. Anomalies & Provider Inconsistencies

Detected Anomalies: **${anomalies.length}**

${anomalies.length === 0 ? '*No provider anomalies or orphaned records detected.*' : anomalies.map(a => `- **[${a.type}]**: \`${JSON.stringify(a)}\``).join('\n')}

---

## 5. Verification of Zero Data Mutations

- Appwrite mutations performed: **0** (ZERO)
- Scripts executed: Read-only queries (\`users.list\`, \`databases.listDocuments\`)
- Integrity Verdict: **ENTITLEMENT_DATA_MUTATION = NONE**
`;

  fs.writeFileSync(reportPath, markdown, 'utf8');
  console.log(`\n[audit] Successfully wrote audit report to: ${reportPath}`);

  return { summary, categorizedAccounts, anomalies };
}

if (require.main === module) {
  runAudit().catch(err => {
    console.error('[audit] Fatal error:', err.message);
    process.exit(1);
  });
}

module.exports = { runAudit };
