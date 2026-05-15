'use strict';

const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';

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

async function findCoupon(databases, code) {
  const exact = await databases.listDocuments(DB_ID, 'discount_codes', [
    sdk.Query.equal('code', code),
    sdk.Query.limit(1),
  ]);
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

async function findSubscription(databases, userId) {
  const existing = await databases.listDocuments(DB_ID, 'subscriptions', [
    sdk.Query.equal('user_id', userId),
    sdk.Query.limit(1),
  ]);
  return existing.documents[0] || null;
}

async function writeSubscription(databases, userId, patch) {
  const existing = await findSubscription(databases, userId);
  const payloads = [
    patch,
    Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'coupon_code')),
    Object.fromEntries(Object.entries(patch).filter(([key]) => !['coupon_code', 'effective_plan'].includes(key))),
  ];
  const perms = [
    sdk.Permission.read(sdk.Role.user(userId)),
    sdk.Permission.update(sdk.Role.user(userId)),
  ];

  let lastError;
  for (const payload of payloads) {
    try {
      if (existing) {
        return await databases.updateDocument(DB_ID, 'subscriptions', existing.$id, payload, perms);
      }
      return await databases.createDocument(DB_ID, 'subscriptions', sdk.ID.unique(), {
        user_id: userId,
        ...payload,
      }, perms);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function recordRedemption(databases, userId, coupon, status) {
  try {
    await databases.createDocument(DB_ID, 'coupon_redemptions', sdk.ID.unique(), {
      user_id: userId,
      coupon_code: coupon.code,
      discount_code_id: coupon.$id,
      status,
      redeemed_at: new Date().toISOString(),
    });
  } catch (_) {
    // Non-critical. The subscription update is the source of truth.
  }
}

async function bumpUses(databases, coupon) {
  const usesCount = Number(coupon.uses_count ?? coupon.usesCount ?? 0);
  for (const key of ['uses_count', 'usesCount']) {
    if (Object.prototype.hasOwnProperty.call(coupon, key)) {
      try {
        await databases.updateDocument(DB_ID, 'discount_codes', coupon.$id, { [key]: usesCount + 1 });
      } catch (_) {}
      return;
    }
  }
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

  const coupon = await findCoupon(databases, code);
  if (!coupon || !couponActive(coupon)) {
    return json(res, { status: 'success', data: { ok: false, success: false, error: 'Invalid or expired coupon code.' } });
  }

  const normalized = normalizeCoupon(coupon);
  const plan = normalized.plan_override || body.product_plan || 'premium';
  const days = Number(normalized.plan_days || body.plan_days || 30);
  const trialExpiresAt = new Date(Date.now() + Math.max(1, days) * 86400000).toISOString();

  await writeSubscription(databases, user.$id, {
    plan,
    effective_plan: plan,
    status: 'active',
    trial_plan: plan,
    trial_expires_at: trialExpiresAt,
    coupon_code: code,
  });
  await recordRedemption(databases, user.$id, coupon, 'redeemed');
  await bumpUses(databases, coupon);

  return json(res, {
    status: 'success',
    data: {
      ok: true,
      success: true,
      message: `Coupon applied. ${plan} is active until ${trialExpiresAt.slice(0, 10)}.`,
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
    return json(res, { status: 'error', message: `Unknown coupons action: ${action}` }, 400);
  } catch (err) {
    error(`Coupons error: ${err.message}`);
    return json(res, { status: 'error', message: err.message || 'Coupons function failed.' }, 500);
  }
};
