const assert = require('node:assert/strict');

const coupons = require('../../appwrite-hubs/coupons/src/main.js');

const { resolveCouponEntitlement } = coupons.__test;

assert.deepEqual(
  resolveCouponEntitlement({ plan_override: 'premium', plan_days: 30 }),
  { plan: 'premium', days: 30 },
);
assert.deepEqual(
  resolveCouponEntitlement({ planOverride: 'PRO', planDays: 7 }),
  { plan: 'pro', days: 7 },
);

for (const coupon of [
  { percent_off: 100 },
  { plan_override: 'admin', plan_days: 30 },
  { plan_override: 'premium', plan_days: 0 },
  { plan_override: 'premium', plan_days: 366 },
  { plan_override: 'premium', plan_days: 3.5 },
  { plan_override: 'premium', plan_days: '30' },
]) {
  assert.equal(
    resolveCouponEntitlement(coupon),
    null,
    'misconfigured or caller-shaped coupon values must not grant access',
  );
}

console.log('coupons security tests passed');
