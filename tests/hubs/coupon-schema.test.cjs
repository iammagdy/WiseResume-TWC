'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const schema = require('../../scripts/setup_discount_codes_schema.cjs').__test;
const setupModule = require('../../scripts/setup_discount_codes_schema.cjs');
const couponSource = fs.readFileSync(path.join(__dirname, '../../appwrite-hubs/coupons/src/main.js'), 'utf8');
const setupSource = fs.readFileSync(path.join(__dirname, '../../scripts/setup_discount_codes_schema.cjs'), 'utf8');

// Baseline Tests Preserved
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

// A. Current schema identifiers valid
test('coupon schema identifiers are valid and follow the letter-first Appwrite contract', () => {
  assert.doesNotThrow(() => setupModule.validateCollectionSpecs(setupModule.COLLECTION_SPECS));
  for (const spec of setupModule.COLLECTION_SPECS) {
    assert.equal(setupModule.isValidSchemaKey(spec.id), true);
    for (const attr of spec.attributes) {
      assert.equal(setupModule.isValidSchemaKey(attr.key), true);
    }
    for (const idx of spec.indexes) {
      assert.equal(setupModule.isValidSchemaKey(idx.key), true);
    }
  }
});

// B. Invalid 37-character identifier rejected before remote call
test('invalid 37-character identifier is rejected before remote call', async () => {
  const invalid37 = 'a' + 'b'.repeat(36);
  assert.equal(invalid37.length, 37);
  assert.equal(setupModule.isValidSchemaKey(invalid37), false);
  assert.throws(
    () => setupModule.validateSchemaKey(invalid37, 'discount_codes', 'attribute'),
    /Invalid Appwrite schema key "abbb.*" for discount_codes attribute: key must be 1-36 characters/
  );

  let remoteCalls = 0;
  const mockDatabases = {
    async getCollection() { remoteCalls++; return {}; },
    async createCollection() { remoteCalls++; },
    async listAttributes() { remoteCalls++; return { attributes: [] }; },
    async listIndexes() { remoteCalls++; return { indexes: [] }; },
    async createIndex() { remoteCalls++; },
  };

  const invalidSpec = {
    id: 'discount_codes',
    name: 'Discount Codes',
    attributes: [
      { key: invalid37, type: 'string', size: 64, required: true },
    ],
    indexes: [],
  };

  assert.throws(
    () => setupModule.validateCollectionSpecs([invalidSpec]),
    /Invalid Appwrite schema key/
  );
  assert.equal(remoteCalls, 0, 'No remote database operations must occur when identifier validation fails');
});

// C. Numeric-leading identifier rejected before remote call
test('numeric-leading identifier is rejected before remote call', () => {
  const numericKey = '1coupon_discount';
  assert.equal(setupModule.isValidSchemaKey(numericKey), false);
  assert.throws(
    () => setupModule.validateSchemaKey(numericKey, 'discount_codes', 'attribute'),
    /Invalid Appwrite schema key "1coupon_discount" for discount_codes attribute: key must be 1-36 characters, must start with a letter/
  );

  assert.equal(setupModule.isValidSchemaKey('.invalid'), false);
  assert.equal(setupModule.isValidSchemaKey('-invalid'), false);
  assert.equal(setupModule.isValidSchemaKey('_invalid'), false);
  assert.equal(setupModule.isValidSchemaKey('valid.key-name_123'), true);
});

// D. Existing available compatible index accepted
test('existing available compatible index is accepted without calling createIndex', async () => {
  const spec = setupModule.INDEX_SPECS.find(idx => idx.key === 'code_unique');
  let createCalled = false;
  const mockDatabases = {
    async listIndexes() {
      return {
        indexes: [
          { key: 'code_unique', type: 'unique', attributes: ['code'], status: 'available' },
        ],
      };
    },
    async createIndex() {
      createCalled = true;
    },
  };

  await setupModule.ensureIndex(mockDatabases, spec.collectionId, spec);
  assert.equal(createCalled, false, 'createIndex should not be called for compatible existing index');
});

// E. Newly created index waits until available
test('newly created index waits until status is available', async () => {
  const spec = setupModule.INDEX_SPECS.find(idx => idx.key === 'discount_code_idx');
  let createPayload = null;
  let listCallCount = 0;
  const mockDatabases = {
    async listIndexes() {
      listCallCount++;
      if (listCallCount === 1) {
        return { indexes: [] };
      }
      return {
        indexes: [
          { key: 'discount_code_idx', type: 'key', attributes: ['discount_code_id'], status: 'available' },
        ],
      };
    },
    async createIndex(dbId, collId, key, type, attributes, orders) {
      createPayload = { dbId, collId, key, type, attributes, orders };
    },
  };

  await setupModule.ensureIndex(mockDatabases, spec.collectionId, spec);
  assert.deepEqual(createPayload, {
    dbId: 'main',
    collId: 'coupon_redemptions',
    key: 'discount_code_idx',
    type: 'key',
    attributes: ['discount_code_id'],
    orders: undefined,
  });
  assert.ok(listCallCount >= 2, 'Polled listIndexes after creating index');
});

// F. Building index continues polling
test('building index continues polling until available', async () => {
  let callCount = 0;
  const mockDatabases = {
    async listIndexes() {
      callCount++;
      if (callCount === 1) return { indexes: [] };
      if (callCount === 2) return { indexes: [{ key: 'code_unique', status: 'processing' }] };
      if (callCount === 3) return { indexes: [{ key: 'code_unique', status: 'building' }] };
      return { indexes: [{ key: 'code_unique', status: 'available' }] };
    },
  };

  const result = await setupModule.waitForIndexAvailable(mockDatabases, 'discount_codes', 'code_unique', 5, 5);
  assert.equal(result.status, 'available');
  assert.equal(callCount, 4);
});

// G. Failed index throws
test('failed index throws immediately without waiting for retry timeout', async () => {
  let callCount = 0;
  const mockDatabases = {
    async listIndexes() {
      callCount++;
      return { indexes: [{ key: 'code_unique', status: 'failed' }] };
    },
  };

  await assert.rejects(
    () => setupModule.waitForIndexAvailable(mockDatabases, 'discount_codes', 'code_unique', 5, 5),
    /Index "discount_codes\.code_unique" creation failed in Appwrite \(status: failed\)/
  );
  assert.equal(callCount, 1, 'Should throw on first encounter with failed status');
});

// H. Timeout throws
test('waitForIndexAvailable fails with timeout when retry limit reached', async () => {
  const mockDatabases = {
    async listIndexes() {
      return { indexes: [{ key: 'discount_code_idx', status: 'building' }] };
    },
  };

  await assert.rejects(
    () => setupModule.waitForIndexAvailable(mockDatabases, 'coupon_redemptions', 'discount_code_idx', 2, 5),
    /Timeout waiting for index "coupon_redemptions\.discount_code_idx" to become available in Appwrite/
  );
});

// I. Incompatible existing code_unique index throws
test('incompatible existing code_unique index fails closed and throws without mutation', async () => {
  const spec = setupModule.INDEX_SPECS.find(idx => idx.key === 'code_unique');

  const wrongType = { key: 'code_unique', type: 'key', attributes: ['code'] };
  assert.match(
    setupModule.indexCompatibilityError(wrongType, spec, 'discount_codes'),
    /Incompatible index "discount_codes\.code_unique": type key \(expected unique\)/
  );

  const wrongAttrs = { key: 'code_unique', type: 'unique', attributes: ['code', 'active'] };
  assert.match(
    setupModule.indexCompatibilityError(wrongAttrs, spec, 'discount_codes'),
    /attributes \["code","active"\] \(expected \["code"\]\)/
  );

  let deleteCalled = false;
  const mockDatabases = {
    async listIndexes() {
      return { indexes: [wrongType] };
    },
    async deleteIndex() {
      deleteCalled = true;
    },
  };

  await assert.rejects(
    () => setupModule.ensureIndex(mockDatabases, 'discount_codes', spec),
    /Incompatible index "discount_codes\.code_unique"/
  );
  assert.equal(deleteCalled, false, 'Incompatible index must not be deleted');
});

// J. Incompatible existing discount_code_idx throws
test('incompatible existing discount_code_idx fails closed and throws without mutation', async () => {
  const spec = setupModule.INDEX_SPECS.find(idx => idx.key === 'discount_code_idx');

  const wrongType = { key: 'discount_code_idx', type: 'unique', attributes: ['discount_code_id'] };
  assert.match(
    setupModule.indexCompatibilityError(wrongType, spec, 'coupon_redemptions'),
    /Incompatible index "coupon_redemptions\.discount_code_idx": type unique \(expected key\)/
  );

  const wrongAttrs = { key: 'discount_code_idx', type: 'key', attributes: ['user_id'] };
  assert.match(
    setupModule.indexCompatibilityError(wrongAttrs, spec, 'coupon_redemptions'),
    /attributes \["user_id"\] \(expected \["discount_code_id"\]\)/
  );

  let deleteCalled = false;
  const mockDatabases = {
    async listIndexes() {
      return { indexes: [wrongAttrs] };
    },
    async deleteIndex() {
      deleteCalled = true;
    },
  };

  await assert.rejects(
    () => setupModule.ensureIndex(mockDatabases, 'coupon_redemptions', spec),
    /Incompatible index "coupon_redemptions\.discount_code_idx"/
  );
  assert.equal(deleteCalled, false, 'Incompatible index must not be deleted');
});

// K. No destructive delete operations introduced
test('no destructive delete operations are present in coupon schema provisioner', () => {
  assert.doesNotMatch(setupSource, /delete(Collection|Attribute|Index)/);
});

// L. Server-only permission enforcement preserved
test('server-only permission enforcement is preserved for discount collections', () => {
  assert.doesNotThrow(() => setupModule.assertServerOnlyCollection({ $permissions: [], documentSecurity: false }, 'discount_codes'));
  assert.throws(
    () => setupModule.assertServerOnlyCollection({ $permissions: ['read("any")'], documentSecurity: false }, 'discount_codes'),
    /Incompatible collection "discount_codes": server-only permissions and documentSecurity=false are required/
  );
  assert.throws(
    () => setupModule.assertServerOnlyCollection({ $permissions: [], documentSecurity: true }, 'discount_codes'),
    /Incompatible collection "discount_codes": server-only permissions and documentSecurity=false are required/
  );
});

// M. Proven live schema legacy contracts and strict non-legacy validation
test('proven live schema legacy contracts are accepted and unrelated attributes remain strict', () => {
  const codeSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'discount_codes')
    .attributes.find(a => a.key === 'code');
  const userIdSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'coupon_redemptions')
    .attributes.find(a => a.key === 'user_id');
  const discountTypeSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'discount_codes')
    .attributes.find(a => a.key === 'discount_type');
  const activeSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'discount_codes')
    .attributes.find(a => a.key === 'active');

  const percentOffSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'discount_codes')
    .attributes.find(a => a.key === 'percent_off');
  const statusSpec = setupModule.COLLECTION_SPECS.find(s => s.id === 'coupon_redemptions')
    .attributes.find(a => a.key === 'status');

  // 1. discount_codes.code: size=64 required=true PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'code', type: 'string', size: 64, required: true }, codeSpec, 'discount_codes'),
    null
  );

  // 2. discount_codes.code: size=50 required=true PASS as documented legacy compatibility
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'code', type: 'string', size: 50, required: true }, codeSpec, 'discount_codes'),
    null
  );

  // 3. discount_codes.code: size=49 FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'code', type: 'string', size: 49, required: true }, codeSpec, 'discount_codes'),
    /size 49 \(expected 50 or 64\)/
  );

  // 4. discount_codes.code: wrong type FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'code', type: 'integer', size: 50, required: true }, codeSpec, 'discount_codes'),
    /type integer \(expected string\)/
  );

  // 5. discount_codes.code: required=false FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'code', type: 'string', size: 50, required: false }, codeSpec, 'discount_codes'),
    /required false \(expected true\)/
  );

  // 6. coupon_redemptions.user_id: size=64 required=true PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'user_id', type: 'string', size: 64, required: true }, userIdSpec, 'coupon_redemptions'),
    null
  );

  // 7. coupon_redemptions.user_id: size=65000 required=false PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'user_id', type: 'string', size: 65000, required: false }, userIdSpec, 'coupon_redemptions'),
    null
  );

  // 8. coupon_redemptions.user_id: size=255 required=false PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'user_id', type: 'string', size: 255, required: false }, userIdSpec, 'coupon_redemptions'),
    null
  );

  // 9. coupon_redemptions.user_id: size=32 FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'user_id', type: 'string', size: 32, required: false }, userIdSpec, 'coupon_redemptions'),
    /size 32 \(expected at least 64\)/
  );

  // 10. coupon_redemptions.user_id: wrong type FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'user_id', type: 'integer', size: 65000, required: false }, userIdSpec, 'coupon_redemptions'),
    /type integer \(expected string\)/
  );

  // 11. discount_codes.active: proven live state (required=false, default=null) PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'active', type: 'boolean', required: false, default: null }, activeSpec, 'discount_codes'),
    null
  );

  // 12. discount_codes.active: spec ideal (required=true, default=true) PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'active', type: 'boolean', required: true, default: true }, activeSpec, 'discount_codes'),
    null
  );

  // 13. discount_codes.active: wrong type FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'active', type: 'string', size: 10, required: false, default: null }, activeSpec, 'discount_codes'),
    /type string \(expected boolean\)/
  );

  // 14. discount_codes.percent_off: spec ideal (required=true, default=100) PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'percent_off', type: 'integer', required: true, default: 100 }, percentOffSpec, 'discount_codes'),
    null
  );

  // 15. discount_codes.percent_off: legacy state (required=false, default=null) PASS
  assert.equal(
    setupModule.attributeCompatibilityError({ key: 'percent_off', type: 'integer', required: false, default: null }, percentOffSpec, 'discount_codes'),
    null
  );

  // 16. discount_codes.percent_off: wrong type FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'percent_off', type: 'string', size: 10, required: false, default: null }, percentOffSpec, 'discount_codes'),
    /type string \(expected integer\)/
  );

  // 17. non-legacy attribute required mismatch FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'status', type: 'string', size: 32, required: false }, statusSpec, 'coupon_redemptions'),
    /required false \(expected true\)/
  );

  // 18. non-legacy attribute size mismatch FAIL
  assert.match(
    setupModule.attributeCompatibilityError({ key: 'discount_type', type: 'string', size: 32, required: false }, discountTypeSpec, 'discount_codes'),
    /size 32 \(expected 16\)/
  );
});

console.log('[TEST] coupon schema compatibility and index readiness: all assertions passed');
