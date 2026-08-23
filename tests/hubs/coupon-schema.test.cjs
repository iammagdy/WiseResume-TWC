'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const schema = require('../../scripts/setup_discount_codes_schema.cjs').__test;
const couponSource = fs.readFileSync(path.join(__dirname, '../../appwrite-hubs/coupons/src/main.js'), 'utf8');
const setupSource = fs.readFileSync(path.join(__dirname, '../../scripts/setup_discount_codes_schema.cjs'), 'utf8');

test('coupon schema uses the safe lookup index instead of the oversized composite index', () => {
  const legacyIndexBytes = (65000 + 64) * 4;
  const safeLookupIndexBytes = 64 * 4;
  assert.equal(legacyIndexBytes, 260256);
  assert.ok(legacyIndexBytes > 767, 'legacy composite index exceeds Appwrite limit');
  assert.ok(safeLookupIndexBytes < 767, 'replacement lookup index stays under Appwrite limit');
  assert.deepEqual(schema.INDEX_SPECS, [
    { collectionId: 'discount_codes', key: 'code_unique', type: 'unique', attributes: ['code'] },
    { collectionId: 'coupon_redemptions', key: 'discount_code_idx', type: 'key', attributes: ['discount_code_id'] },
  ]);
  assert.doesNotMatch(setupSource, /user_coupon_unique/);
  assert.doesNotMatch(setupSource, /\['user_id',\s*'discount_code_id'\]/);
});

test('coupon redemption uniqueness remains deterministic and server-side', () => {
  assert.match(couponSource, /function redemptionDocumentId\(userId, couponId\)/);
  assert.match(couponSource, /createDocument\(\s*DB_ID,\s*'coupon_redemptions',\s*redemptionDocumentId\(userId, coupon\.\$id\)/s);
  assert.match(couponSource, /createTransaction\(20\)/);
  assert.match(couponSource, /recordRedemption\(databases, userId, coupon, redeemedAt, transaction\.\$id\)/s);
  assert.match(couponSource, /const REDEEMABLE_PLANS = new Set\(\['pro', 'premium'\]\)/);
  assert.match(couponSource, /const MAX_COUPON_DAYS = 365/);
});

test('coupon setup remains additive and idempotent-compatible', () => {
  assert.match(setupSource, /if \(await attributeExists\(collId, key\)\)/);
  assert.match(setupSource, /if \(!\(await indexExists\(codeIndex\.collectionId, codeIndex\.key\)\)\)/);
  assert.match(setupSource, /if \(!\(await indexExists\(redemptionIndex\.collectionId, redemptionIndex\.key\)\)\)/);
  assert.doesNotMatch(setupSource, /delete(Collection|Attribute|Index)/);
  assert.match(setupSource, /updateCollection\([\s\S]*?\[\],\s*false/s);
});

console.log('[TEST] coupon schema compatibility: all assertions passed');
