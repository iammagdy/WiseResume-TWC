'use strict';

const crypto = require('crypto');

const PLAN_RANK = Object.freeze({ free: 0, pro: 1, premium: 2 });
const VALID_PAID_PLANS = new Set(['pro', 'premium']);
const VALID_PROVIDER_STATUSES = new Set(['active', 'past_due', 'canceled', 'billing_issue']);
const VALID_PROVIDER_ENVIRONMENTS = new Set(['sandbox', 'production']);

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  // Ultimate is a public display label only. It is accepted here solely as a
  // defensive read-normalization for legacy data and is never a write value.
  return plan === 'ultimate' ? 'premium' : (Object.prototype.hasOwnProperty.call(PLAN_RANK, plan) ? plan : null);
}

function normalizeProviderEnvironment(value) {
  const environment = String(value || '').trim().toLowerCase();
  return VALID_PROVIDER_ENVIRONMENTS.has(environment) ? environment : '';
}

function configuredProviderEnvironment(env = process.env) {
  return normalizeProviderEnvironment(env.BILLING_ACCESS_ENVIRONMENT || env.BILLING_CHECKOUT_ENVIRONMENT);
}

function configuredPaypalProviderEnvironment(env = process.env) {
  return normalizeProviderEnvironment(env.PAYPAL_ACCESS_ENVIRONMENT);
}

function configuredWhopProviderEnvironment(env = process.env) {
  return normalizeProviderEnvironment(env.WHOP_ACCESS_ENVIRONMENT || env.WHOP_CHECKOUT_ENVIRONMENT);
}

function configuredQaUserId(env = process.env) {
  return String(env.BILLING_CHECKOUT_QA_USER_ID || '').trim();
}

function configuredWhopQaUserId(env = process.env) {
  return String(env.WHOP_SANDBOX_QA_USER_ID || '').trim();
}

function configuredWhopCatalog(environment, env = process.env) {
  const prefix = environment === 'sandbox' ? 'WHOP_SANDBOX' : environment === 'production' ? 'WHOP_PRODUCTION' : '';
  if (!prefix) return { productId: '', planIds: {} };
  return {
    productId: String(env[`${prefix}_PRODUCT_ID`] || '').trim(),
    planIds: {
      pro: String(env[`${prefix}_PRO_PLAN_ID`] || '').trim(),
      premium: String(env[`${prefix}_PREMIUM_PLAN_ID`] || '').trim(),
    },
  };
}

function isFutureTimestamp(value, nowMs = Date.now()) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > nowMs;
}

function candidate(plan, source, metadata = {}) {
  const normalized = normalizePlan(plan);
  if (!normalized) return null;
  return { plan: normalized, source, ...metadata };
}

function buildPlanCandidates({
  subscription = null,
  providerState = null,
  whopProviderState = null,
  paypalProviderState = null,
  providerEnvironment = '',
  paypalProviderEnvironment = '',
  whopProviderEnvironment = '',
  whopQaUserId = '',
  qaUserId = '',
  userId = '',
  nowMs = Date.now(),
} = {}) {
  const candidates = [candidate('free', 'free')];

  // The legacy plan field is the durable manual/admin or coupon entitlement.
  // effective_plan is used only as a compatibility fallback for older rows
  // that predate plan population; it is never treated as provider state.
  const basePlan = subscription?.plan ?? subscription?.effective_plan;
  const manualCandidate = candidate(basePlan, subscription?.coupon_code ? 'coupon' : 'manual/admin');
  if (manualCandidate) candidates.push(manualCandidate);

  const trialPlan = normalizePlan(subscription?.trial_plan);
  if (trialPlan && isFutureTimestamp(subscription?.trial_expires_at, nowMs)) {
    candidates.push(candidate(trialPlan, 'active trial', { expiresAt: subscription.trial_expires_at }));
  }

  // Provider state is accepted only when a caller supplies an explicit
  // mode and the persisted provider state carries the same mode. Unknown mode
  // is deliberately fail-closed so Sandbox state cannot grant future Production access.
  const selectedRcEnvironment = normalizeProviderEnvironment(providerEnvironment);
  const selectedWhopEnvironment = normalizeProviderEnvironment(whopProviderEnvironment || selectedRcEnvironment || process.env.WHOP_ACCESS_ENVIRONMENT);

  // Whop provider state is isolated from PayPal and RevenueCat. Only the
  // authoritative environment, product/plan mapping, status, and future
  // provider expiry can produce a candidate.
  const whopStateEnvironment = normalizeProviderEnvironment(whopProviderState?.environment);
  const whopPlan = normalizePlan(whopProviderState?.plan);
  const whopStatus = String(whopProviderState?.status || '').trim().toLowerCase();
  const whopCatalog = configuredWhopCatalog(selectedWhopEnvironment);
  const whopStateUserId = String(whopProviderState?.user_id || '').trim();
  const currentCanonicalUserId = String(userId || '').trim();
  const effectiveWhopQaUser = String(whopQaUserId || configuredWhopQaUserId()).trim();
  const whopIdentityMatches = Boolean(
    whopStateUserId && currentCanonicalUserId && whopStateUserId === currentCanonicalUserId &&
    String(whopProviderState?.membership_id || '').trim() &&
    whopCatalog.productId && String(whopProviderState?.product_id || '').trim() === whopCatalog.productId &&
    whopCatalog.planIds[whopPlan] && String(whopProviderState?.plan_id || '').trim() === whopCatalog.planIds[whopPlan]
  );
  const whopQaAllowed = selectedWhopEnvironment !== 'sandbox' || (
    effectiveWhopQaUser && currentCanonicalUserId === effectiveWhopQaUser
  );
  if (
    selectedWhopEnvironment &&
    whopStateEnvironment === selectedWhopEnvironment &&
    whopPlan &&
    VALID_PAID_PLANS.has(whopPlan) &&
    VALID_PROVIDER_STATUSES.has(whopStatus) &&
    isFutureTimestamp(whopProviderState?.expires_at, nowMs) &&
    whopIdentityMatches &&
    whopQaAllowed
  ) {
    candidates.push(candidate(whopPlan, 'whop', {
      expiresAt: whopProviderState.expires_at,
      providerEnvironment: selectedWhopEnvironment,
      status: whopStatus,
    }));
  }

  // RevenueCat Provider Candidate (decoupled from PayPal environment)
  const rcStateEnvironment = normalizeProviderEnvironment(providerState?.environment);
  const rcPlan = normalizePlan(providerState?.plan);
  const rcStatus = String(providerState?.status || '').trim().toLowerCase();
  if (
    selectedRcEnvironment &&
    rcStateEnvironment === selectedRcEnvironment &&
    rcPlan &&
    VALID_PAID_PLANS.has(rcPlan) &&
    VALID_PROVIDER_STATUSES.has(rcStatus) &&
    isFutureTimestamp(providerState?.expires_at, nowMs)
  ) {
    candidates.push(candidate(rcPlan, 'revenuecat', {
      expiresAt: providerState.expires_at,
      providerEnvironment: selectedRcEnvironment,
      status: rcStatus,
    }));
  }

  // PayPal Provider Candidate: isolated provider-specific environment evaluation
  const selectedPaypalEnvironment = normalizeProviderEnvironment(paypalProviderEnvironment || configuredPaypalProviderEnvironment());
  const paypalStateEnvironment = normalizeProviderEnvironment(paypalProviderState?.environment);
  const paypalPlan = normalizePlan(paypalProviderState?.plan);
  const paypalStatus = String(paypalProviderState?.status || '').trim().toLowerCase();
  if (
    selectedPaypalEnvironment &&
    paypalStateEnvironment === selectedPaypalEnvironment &&
    paypalPlan &&
    VALID_PAID_PLANS.has(paypalPlan) &&
    VALID_PROVIDER_STATUSES.has(paypalStatus) &&
    isFutureTimestamp(paypalProviderState?.expires_at, nowMs)
  ) {
    const isSandbox = paypalStateEnvironment === 'sandbox';
    const effectiveQaUser = String(qaUserId || configuredQaUserId()).trim();
    const currentCanonicalUserId = String(userId || '').trim();
    const stateUserId = String(paypalProviderState?.user_id || '').trim();

    // Canonical QA ownership rule: Current user MUST be the configured QA user
    // AND the persisted PayPal state MUST belong to that exact canonical user.
    const qaAllowed = !isSandbox || (
      Boolean(effectiveQaUser) &&
      Boolean(currentCanonicalUserId) &&
      Boolean(stateUserId) &&
      currentCanonicalUserId === effectiveQaUser &&
      stateUserId === currentCanonicalUserId
    );

    if (qaAllowed) {
      candidates.push(candidate(paypalPlan, 'paypal', {
        expiresAt: paypalProviderState.expires_at,
        providerEnvironment: selectedPaypalEnvironment,
        status: paypalStatus,
      }));
    }
  }

  return candidates;
}

function resolveEffectivePlan(input = {}) {
  const candidates = buildPlanCandidates(input);
  return candidates.reduce((best, current) => (
    PLAN_RANK[current.plan] > PLAN_RANK[best.plan] ? current : best
  ), candidates[0]);
}

const DB_ID = 'main';
const STATE_COLLECTION_ID = 'paypal_subscription_state';
const LEDGER_COLLECTION_ID = 'paypal_event_ledger';
const CHECKOUT_TRANSACTION_TTL_SECONDS = 30;

function isQaCouponCode(code) {
  const clean = String(code || '').trim().toUpperCase();
  return clean.startsWith('QA_') || clean.startsWith('QA-') || clean.includes('_QA_') || clean.includes('-QA-');
}

function deterministicLedgerId(eventId) {
  return `ppe_${crypto.createHash('sha256').update(String(eventId)).digest('hex').slice(0, 29)}`;
}

function deterministicRedemptionId(userId, couponId) {
  return `cr_${crypto.createHash('sha256').update(`${userId}:${couponId}`).digest('hex').slice(0, 29)}`;
}

function makeEqualQuery(sdk, attr, val) {
  if (sdk?.Query?.equal) return sdk.Query.equal(attr, val);
  return `equal("${attr}", ["${val}"])`;
}

function makeLimitQuery(sdk, limit) {
  if (sdk?.Query?.limit) return sdk.Query.limit(limit);
  return `limit(${limit})`;
}

async function fulfillCompletedOneTimePayment({
  databases,
  sdk = null,
  userId,
  orderId,
  captureId,
  plan,
  environment,
  coupon = null,
  nowMs = Date.now(),
  qaUserId = '',
}) {
  const normEnv = normalizeProviderEnvironment(environment);
  if (!normEnv) {
    const err = new Error('Invalid provider environment');
    err.code = 'environment_mismatch';
    err.status = 409;
    throw err;
  }

  // Sandbox QA boundary check: in sandbox, only QA user is entitled
  if (normEnv === 'sandbox') {
    const effectiveQa = String(qaUserId || configuredQaUserId()).trim();
    if (!effectiveQa || userId !== effectiveQa) {
      const err = new Error('Sandbox fulfillment is restricted to configured QA user');
      err.code = 'forbidden';
      err.status = 403;
      throw err;
    }
  }

  // QA Coupon Authorization check: only authorized QA user can fulfill a QA coupon
  if (coupon && isQaCouponCode(coupon.code)) {
    const effectiveQa = String(qaUserId || configuredQaUserId()).trim();
    if (!effectiveQa || userId !== effectiveQa) {
      const err = new Error('QA coupon fulfillment is restricted to authorized QA accounts.');
      err.code = 'forbidden';
      err.status = 403;
      throw err;
    }
  }

  const cleanOrderId = String(orderId || '').trim();
  const cleanCaptureId = String(captureId || cleanOrderId).trim();
  const normalizedPlan = normalizePlan(plan) || 'pro';
  const nowIso = new Date(nowMs).toISOString();
  const ledgerDocId = deterministicLedgerId(cleanCaptureId);

  // 1. Idempotency check: verify if capture was already processed in paypal_event_ledger
  try {
    const existingLedger = await databases.getDocument(DB_ID, LEDGER_COLLECTION_ID, ledgerDocId, []);
    if (existingLedger && existingLedger.processing_status === 'processed') {
      let existingState = null;
      try {
        const stateRes = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
          makeEqualQuery(sdk, 'user_id', userId),
          makeLimitQuery(sdk, 1),
        ]);
        existingState = stateRes.documents?.[0] || null;
      } catch (_) {}
      return {
        alreadyFulfilled: true,
        success: true,
        plan: existingState?.plan || normalizedPlan,
        expiresAt: existingState?.expires_at || new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  } catch (err) {
    if (err?.code !== 404) {
      // transient or other, proceed with fulfillment attempt
    }
  }

  // 2. Perform fulfillment in an Appwrite database transaction if available
  let transaction = null;
  if (typeof databases.createTransaction === 'function') {
    try {
      transaction = await databases.createTransaction(CHECKOUT_TRANSACTION_TTL_SECONDS);
    } catch (_) {
      const err = new Error('Database transaction temporarily unavailable');
      err.code = 'state_unavailable';
      err.status = 503;
      throw err;
    }
  }

  const txId = transaction?.$id;
  let committed = false;

  try {
    // Check existing state to guarantee existing-paid-user safety
    let existingDoc = null;
    try {
      const listRes = await databases.listDocuments(DB_ID, STATE_COLLECTION_ID, [
        makeEqualQuery(sdk, 'user_id', userId),
        makeLimitQuery(sdk, 1),
      ], txId);
      existingDoc = listRes.documents?.[0] || null;
    } catch (_) {}

    // Existing paid-user safety evaluation:
    let finalPlan = normalizedPlan;
    let finalExpiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
    let finalWillRenew = false;
    let finalSubId = cleanOrderId;

    if (existingDoc) {
      const existingPlan = normalizePlan(existingDoc.plan);
      const isExistingActive = isFutureTimestamp(existingDoc.expires_at, nowMs) && ['active', 'billing_issue'].includes(String(existingDoc.status || '').trim().toLowerCase());
      const isRecurringActive = isExistingActive && (existingDoc.will_renew === true || (existingDoc.subscription_id && existingDoc.subscription_id.startsWith('I-')));

      // 1. Active recurring Pro/Ultimate subscriber cannot buy one-time access while their paid recurring entitlement is active
      if (isRecurringActive) {
        const err = new Error('Active recurring subscription already exists.');
        err.code = 'active_recurring_subscription_exists';
        err.status = 409;
        throw err;
      }

      // 2. Active Ultimate subscriber cannot buy Pro one-time
      if (isExistingActive && existingPlan === 'premium' && normalizedPlan === 'pro') {
        const err = new Error('Your account already has an active higher plan.');
        err.code = 'active_higher_plan_exists';
        err.status = 409;
        throw err;
      }

      // 3. Active one-time paid entitlement: block another one-time purchase (no stacking in this release)
      if (isExistingActive) {
        const err = new Error('Active paid entitlement already exists.');
        err.code = 'active_paid_entitlement_exists';
        err.status = 409;
        throw err;
      }
    }

    const statePayload = {
      user_id: userId,
      subscription_id: finalSubId,
      plan: finalPlan,
      status: 'active',
      environment: normEnv,
      expires_at: finalExpiresAt,
      will_renew: finalWillRenew,
      renewal_cancellation_pending: false,
      last_entitlement_payment_id: cleanCaptureId,
      last_entitlement_payment_ts_ms: nowMs,
    };

    if (existingDoc?.$id) {
      await databases.updateDocument(
        DB_ID,
        STATE_COLLECTION_ID,
        existingDoc.$id,
        statePayload,
        [],
        txId
      );
    } else {
      const uniqueStateId = `pps_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 29)}`;
      try {
        await databases.createDocument(
          DB_ID,
          STATE_COLLECTION_ID,
          uniqueStateId,
          statePayload,
          [],
          txId
        );
      } catch (err) {
        if (err?.code === 409 && existingDoc?.$id) {
          await databases.updateDocument(
            DB_ID,
            STATE_COLLECTION_ID,
            existingDoc.$id,
            statePayload,
            [],
            txId
          );
        } else if (err?.code === 409) {
          await databases.updateDocument(
            DB_ID,
            STATE_COLLECTION_ID,
            uniqueStateId,
            statePayload,
            [],
            txId
          );
        } else {
          throw err;
        }
      }
    }

    // 3. Coupon redemption handling with strict concurrency & max_uses protection
    if (coupon && coupon.$id) {
      // 3a. Re-read the coupon inside the transaction to check authoritative live uses_count
      let freshCoupon = null;
      try {
        freshCoupon = await databases.getDocument(DB_ID, 'discount_codes', coupon.$id, [], txId);
      } catch (_) {
        freshCoupon = coupon;
      }

      const maxUses = Number(freshCoupon?.max_uses ?? freshCoupon?.maxUses ?? coupon.max_uses ?? coupon.maxUses ?? 0);
      const currentUses = Number(freshCoupon?.uses_count ?? freshCoupon?.usesCount ?? coupon.uses_count ?? coupon.usesCount ?? 0);
      if (maxUses > 0 && currentUses >= maxUses) {
        const err = new Error('This coupon has reached its maximum redemption limit.');
        err.code = 'coupon_exhausted';
        err.status = 409;
        throw err;
      }

      // 3b. For single-use coupons (max_uses === 1), create a globally unique coupon slot document
      // This mathematically guarantees across concurrent different users that only ONE can claim use #1
      if (maxUses === 1) {
        const couponSlotId = `cuse_${crypto.createHash('sha256').update(coupon.$id).digest('hex').slice(0, 28)}`;
        try {
          await databases.createDocument(
            DB_ID,
            'coupon_redemptions',
            couponSlotId,
            {
              user_id: userId,
              coupon_code: coupon.code,
              discount_code_id: coupon.$id,
              status: 'redeemed',
              redeemed_at: nowIso,
            },
            [],
            txId
          );
        } catch (slotErr) {
          if (slotErr?.code === 409 || /already exists|conflict/i.test(slotErr?.message || '')) {
            const err = new Error('This single-use coupon has already been redeemed.');
            err.code = 'coupon_already_claimed';
            err.status = 409;
            throw err;
          }
          throw slotErr;
        }
      }

      // 3c. Per-user deterministic redemption document
      const redDocId = deterministicRedemptionId(userId, coupon.$id);
      let alreadyRedeemed = false;
      try {
        const existingRed = await databases.getDocument(DB_ID, 'coupon_redemptions', redDocId, [], txId);
        if (existingRed && existingRed.status === 'redeemed') {
          alreadyRedeemed = true;
        }
      } catch (e) {
        if (e?.code !== 404) throw e;
      }

      if (!alreadyRedeemed) {
        try {
          await databases.createDocument(
            DB_ID,
            'coupon_redemptions',
            redDocId,
            {
              user_id: userId,
              coupon_code: coupon.code,
              discount_code_id: coupon.$id,
              status: 'redeemed',
              redeemed_at: nowIso,
            },
            [],
            txId
          );
        } catch (redErr) {
          if (redErr?.code !== 409) throw redErr;
        }

        // 3d. Increment usage counter
        const key = Object.prototype.hasOwnProperty.call(freshCoupon || coupon, 'usesCount') && !Object.prototype.hasOwnProperty.call(freshCoupon || coupon, 'uses_count')
          ? 'usesCount' : 'uses_count';
        if (typeof databases.incrementDocumentAttribute === 'function') {
          await databases.incrementDocumentAttribute(
            DB_ID,
            'discount_codes',
            coupon.$id,
            key,
            1,
            maxUses > 0 ? maxUses : undefined,
            txId
          );
        } else if (typeof databases.updateDocument === 'function') {
          await databases.updateDocument(
            DB_ID,
            'discount_codes',
            coupon.$id,
            { [key]: currentUses + 1 },
            [],
            txId
          );
        }
      }
    }

    // 4. Ledger record (PAYMENT.CAPTURE.COMPLETED)
    try {
      await databases.createDocument(
        DB_ID,
        LEDGER_COLLECTION_ID,
        ledgerDocId,
        {
          event_id: cleanCaptureId,
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          event_timestamp_ms: nowMs,
          subscription_id: cleanOrderId,
          user_id: userId,
          payment_id: cleanCaptureId,
          processing_status: 'processed',
          outcome_code: 'order_entitled',
          environment: normEnv,
          created_at: nowIso,
        },
        [],
        txId
      );
    } catch (_) {
      try {
        await databases.updateDocument(
          DB_ID,
          LEDGER_COLLECTION_ID,
          ledgerDocId,
          {
            processing_status: 'processed',
            outcome_code: 'order_entitled',
            updated_at: nowIso,
          },
          [],
          txId
        );
      } catch (_) {}
    }

    if (transaction) {
      await databases.updateTransaction(transaction.$id, true, false);
      committed = true;
    }

    return {
      alreadyFulfilled: false,
      success: true,
      plan: finalPlan,
      expiresAt: finalExpiresAt,
    };
  } catch (error) {
    if (transaction && !committed) {
      try { await databases.updateTransaction(transaction.$id, false, true); } catch (_) {}
    }
    throw error;
  }
}

module.exports = {
  PLAN_RANK,
  VALID_PAID_PLANS,
  VALID_PROVIDER_STATUSES,
  VALID_PROVIDER_ENVIRONMENTS,
  normalizePlan,
  normalizeProviderEnvironment,
  configuredProviderEnvironment,
  configuredPaypalProviderEnvironment,
  configuredWhopProviderEnvironment,
  configuredQaUserId,
  configuredWhopQaUserId,
  isFutureTimestamp,
  buildPlanCandidates,
  resolveEffectivePlan,
  isQaCouponCode,
  deterministicLedgerId,
  deterministicRedemptionId,
  fulfillCompletedOneTimePayment,
};
