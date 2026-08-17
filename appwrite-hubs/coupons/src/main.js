'use strict';

const sdk = require('node-appwrite');
const crypto = require('crypto');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const REDEEMABLE_PLANS = new Set(['pro', 'premium']);
const MAX_COUPON_DAYS = 365;

function getClients(jwt) {
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
  const admin = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(apiKey || '');
  const user = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
  if (jwt) user.setJWT(jwt);
  return {
    databases: new sdk.Databases(admin),
    account: new sdk.Account(user),
  };
}

function header(body, name) {
  const headers = body?.__headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

function json(res, payload, status = 200) {
  return res.json(payload, status);
}

function upperCode(body) {
  return String(body.code || body.couponCode || '').trim().toUpperCase();
}

async function getCurrentUser(account) {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

async function findCoupon(databases, code, transactionId) {
  const exact = await databases.listDocuments(DB_ID, 'discount_codes', [
    sdk.Query.equal('code', code),
    sdk.Query.limit(1),
  ], transactionId);
  return exact.documents[0] || null;
}

function couponActive(coupon) {
  if (!coupon) return false;
  if (coupon.active === false || coupon.is_active === false) return false;
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) return false;
  const maxUses = Number(coupon.max_uses ?? coupon.maxUses ?? 0);
  const usesCount = Number(coupon.uses_count ?? coupon.usesCount ?? 0);
  if (maxUses > 0 && usesCount >= maxUses) return false;
  return true;
}

function normalizeCoupon(coupon) {
  return {
    id: coupon.$id,
    code: coupon.code,
    active: couponActive(coupon),
    discount_type: coupon.discount_type ?? coupon.discountType ?? (coupon.percent_off ? 'percent' : null),
    discount_value: Number(coupon.discount_value ?? coupon.discountValue ?? coupon.percent_off ?? 0),
    plan_override: coupon.plan_override ?? coupon.planOverride ?? null,
    plan_days: coupon.plan_days ?? coupon.planDays ?? null,
    expires_at: coupon.expires_at ?? coupon.expiresAt ?? null,
  };
}

function resolveCouponEntitlement(coupon) {
  const normalized = normalizeCoupon(coupon);
  const plan = String(normalized.plan_override || '').trim().toLowerCase();
  const days = normalized.plan_days;
  if (!REDEEMABLE_PLANS.has(plan)) return null;
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > MAX_COUPON_DAYS) return null;
  return { plan, days };
}

async function findSubscription(databases, userId, transactionId) {
  const existing = await databases.listDocuments(DB_ID, 'subscriptions', [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ], transactionId);
  return existing.documents[0] || null;
}

async function writeSubscription(databases, userId, patch, transactionId) {
  const existing = await findSubscription(databases, userId, transactionId);
  const payloads = [
    patch,
    Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'coupon_code')),
    Object.fromEntries(Object.entries(patch).filter(([key]) => !['coupon_code', 'effective_plan'].includes(key))),
  ];
  const perms = [
    sdk.Permission.read(sdk.Role.user(userId)),
    // UPDATE intentionally omitted: subscription documents are written exclusively
    // by server-side functions (admin API key). Client sessions need read-only access.
  ];

  let lastError;
  for (const payload of payloads) {
    try {
      if (existing) {
        return await databases.updateDocument(DB_ID, 'subscriptions', existing.$id, payload, perms, transactionId);
      }
      return await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), {
        user_id: userId,
        ...payload,
      }, perms, transactionId);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function redemptionDocumentId(userId, couponId) {
  return `cr_${crypto.createHash('sha256').update(`${userId}:${couponId}`).digest('hex').slice(0, 29)}`;
}

async function findRedemption(databases, userId, coupon, transactionId) {
  const deterministicId = redemptionDocumentId(userId, coupon.$id);
  try {
    return await databases.getDocument(
      DB_ID,
      'coupon_redemptions',
      deterministicId,
      [],
      transactionId,
    );
  } catch (err) {
    if (err?.code !== 404) throw err;
  }

  // Backward compatibility for redemptions created before deterministic IDs.
  const existing = await databases.listDocuments(
    DB_ID,
    'coupon_redemptions',
    [
      sdk.Query.equal('user_id', userId),
      sdk.Query.equal('discount_code_id', coupon.$id),
      sdk.Query.equal('status', 'redeemed'),
      sdk.Query.limit(1),
    ],
    transactionId,
  );
  return existing.documents?.[0] || null;
}

async function recordRedemption(databases, userId, coupon, redeemedAt, transactionId) {
  return databases.createDocument(
    DB_ID,
    'coupon_redemptions',
    redemptionDocumentId(userId, coupon.$id),
    {
      user_id: userId,
      coupon_code: coupon.code,
      discount_code_id: coupon.$id,
      status: 'redeemed',
      redeemed_at: redeemedAt,
    },
    undefined,
    transactionId,
  );
}

async function incrementCouponUses(databases, coupon, transactionId) {
  const maxUses = Number(coupon.max_uses ?? coupon.maxUses ?? 0);
  const key = Object.prototype.hasOwnProperty.call(coupon, 'usesCount') &&
    !Object.prototype.hasOwnProperty.call(coupon, 'uses_count')
    ? 'usesCount'
    : 'uses_count';
  await databases.incrementDocumentAttribute(
    DB_ID,
    'discount_codes',
    coupon.$id,
    key,
    1,
    maxUses > 0 ? maxUses : undefined,
    transactionId,
  );
}

function isConflict(error) {
  return error?.code === 409 || /conflict/i.test(error?.message || '');
}

async function redeemCouponAtomically(databases, userId, code, now = () => Date.now()) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const transaction = await databases.createTransaction(20);
    let committed = false;
    try {
      const coupon = await findCoupon(databases, code, transaction.$id);
      if (!coupon) {
        await databases.updateTransaction(transaction.$id, false, true);
        return { outcome: 'invalid' };
      }

      const previousRedemption = await findRedemption(databases, userId, coupon, transaction.$id);
      if (previousRedemption) {
        const subscription = await findSubscription(databases, userId, transaction.$id);
        await databases.updateTransaction(transaction.$id, false, true);
        if (!subscription || subscription.coupon_code !== code) {
          return { outcome: 'inconsistent' };
        }
        return {
          outcome: 'already_redeemed',
          plan: subscription.effective_plan || subscription.trial_plan || subscription.plan || 'free',
          trialExpiresAt: subscription.trial_expires_at || null,
        };
      }

      if (!couponActive(coupon)) {
        await databases.updateTransaction(transaction.$id, false, true);
        return { outcome: 'invalid' };
      }
      const entitlement = resolveCouponEntitlement(coupon);
      if (!entitlement) {
        await databases.updateTransaction(transaction.$id, false, true);
        return { outcome: 'misconfigured' };
      }

      const nowMs = now();
      const redeemedAt = new Date(nowMs).toISOString();
      const trialExpiresAt = new Date(nowMs + entitlement.days * 86400000).toISOString();
      await writeSubscription(databases, userId, {
        plan: entitlement.plan,
        effective_plan: entitlement.plan,
        status: 'active',
        trial_plan: entitlement.plan,
        trial_expires_at: trialExpiresAt,
        coupon_code: code,
      }, transaction.$id);
      await recordRedemption(databases, userId, coupon, redeemedAt, transaction.$id);
      await incrementCouponUses(databases, coupon, transaction.$id);
      await databases.updateTransaction(transaction.$id, true, false);
      committed = true;
      return {
        outcome: 'redeemed',
        plan: entitlement.plan,
        trialExpiresAt,
      };
    } catch (err) {
      if (!committed) {
        try { await databases.updateTransaction(transaction.$id, false, true); } catch (_) {}
      }
      if (isConflict(err) && attempt < maxAttempts - 1) continue;
      throw err;
    }
  }
  throw new Error('Coupon redemption conflict retry exhausted.');
}

async function validateCoupon(body, res) {
  const code = upperCode(body);
  if (!code) {
    return json(res, { status: 'success', data: { ok: true, valid: false, error: 'Enter a coupon code.' } });
  }

  const { databases } = getClients();
  const coupon = await findCoupon(databases, code);
  if (!coupon || !couponActive(coupon)) {
    return json(res, { status: 'success', data: { ok: true, valid: false, error: 'Invalid or expired coupon code.' } });
  }

  return json(res, { status: 'success', data: { ok: true, valid: true, coupon: normalizeCoupon(coupon) } });
}

async function getMySubscription(body, res) {
  const jwt = header(body, 'X-Appwrite-JWT');
  const { databases, account } = getClients(jwt);
  const user = await getCurrentUser(account);

  if (!user) {
    return json(res, { status: 'error', message: 'Not authenticated.' }, 401);
  }

  const sub = await findSubscription(databases, user.$id);

  if (!sub) {
    return json(res, {
      status: 'success',
      data: { plan: 'free', effective_plan: 'free', status: null, trial_plan: null, trial_expires_at: null, coupon_code: null },
    });
  }

  const trialPlan = sub.trial_plan ?? null;
  const trialExpiresAt = sub.trial_expires_at ?? null;
  const trialActive = !!trialPlan && !!trialExpiresAt && new Date(trialExpiresAt).getTime() > Date.now();
  const effectivePlan = sub.effective_plan ?? (trialActive ? trialPlan : (sub.plan ?? 'free'));

  return json(res, {
    status: 'success',
    data: {
      plan: sub.plan ?? 'free',
      effective_plan: effectivePlan,
      status: sub.status ?? null,
      trial_plan: trialPlan,
      trial_expires_at: trialExpiresAt,
      coupon_code: sub.coupon_code ?? null,
    },
  });
}

async function redeemCoupon(body, res) {
  const code = upperCode(body);
  const jwt = header(body, 'X-Appwrite-JWT');
  const { databases, account } = getClients(jwt);
  const user = await getCurrentUser(account);

  if (!user) {
    return json(res, { status: 'error', message: 'Please sign in before redeeming a coupon.' }, 401);
  }
  if (!code) {
    return json(res, { status: 'success', data: { ok: false, success: false, error: 'Enter a coupon code.' } });
  }

  const result = await redeemCouponAtomically(databases, user.$id, code);
  if (result.outcome === 'invalid') {
    return json(res, { status: 'success', data: { ok: false, success: false, error: 'Invalid or expired coupon code.' } });
  }
  if (result.outcome === 'misconfigured') {
    return json(res, {
      status: 'success',
      data: {
        ok: false,
        success: false,
        error: 'This coupon is not configured for subscription access.',
      },
    }, 422);
  }
  if (result.outcome === 'inconsistent') {
    return json(res, {
      status: 'error',
      message: 'This coupon redemption needs support review before it can be retried.',
    }, 409);
  }

  const { plan, trialExpiresAt } = result;
  const alreadyRedeemed = result.outcome === 'already_redeemed';

  return json(res, {
    status: 'success',
    data: {
      ok: true,
      success: true,
      already_redeemed: alreadyRedeemed,
      message: alreadyRedeemed
        ? `This coupon was already applied to your account${trialExpiresAt ? ` until ${trialExpiresAt.slice(0, 10)}` : ''}.`
        : `Coupon applied. ${plan} is active until ${trialExpiresAt.slice(0, 10)}.`,
      plan,
      trial_ends_at: trialExpiresAt,
      coupon_code: code,
    },
  });
}

module.exports = async ({ req, res, error }) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const headerAction = header(body, 'x-coupons-action');
    const action = body.action || headerAction || 'validate';
    if (action === 'validate') return validateCoupon(body, res);
    if (action === 'redeem') return redeemCoupon(body, res);
    if (action === 'get-subscription') return getMySubscription(body, res);
    return json(res, { status: 'error', message: 'Unsupported coupons request.' }, 400);
  } catch (err) {
    error(`Coupons error: ${err.message}`);
    return json(res, { status: 'error', message: 'Coupons function failed.' }, 500);
  }
};

module.exports.__test = {
  MAX_COUPON_DAYS,
  REDEEMABLE_PLANS,
  resolveCouponEntitlement,
  redemptionDocumentId,
  redeemCouponAtomically,
};
