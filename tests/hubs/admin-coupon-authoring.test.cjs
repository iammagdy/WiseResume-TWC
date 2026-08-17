const assert = require('node:assert/strict');

const adminHub = require('../../appwrite-hubs/admin-devkit-data/src/main.js');
const { normalizeDiscountCodeInput } = adminHub._test;

const normalized = normalizeDiscountCodeInput({
  code: ' beta-2026 ',
  plan_override: 'Premium',
  plan_days: 30,
  max_uses: 250,
  percent_off: 100,
});

assert.deepEqual(normalized, {
  code: 'BETA-2026',
  active: true,
  percent_off: 100,
  discount_type: 'percent',
  discount_value: 100,
  plan_override: 'premium',
  plan_days: 30,
  max_uses: 250,
  uses_count: 0,
});

for (const body of [
  { code: 'x', plan_override: 'premium', plan_days: 30 },
  { code: 'VALID', plan_override: 'admin', plan_days: 30 },
  { code: 'VALID', plan_override: 'premium', plan_days: 0 },
  { code: 'VALID', plan_override: 'premium', plan_days: 366 },
  { code: 'VALID', plan_override: 'premium', plan_days: 30, max_uses: -1 },
]) {
  assert.throws(() => normalizeDiscountCodeInput(body));
}

console.log('admin coupon authoring tests passed');
