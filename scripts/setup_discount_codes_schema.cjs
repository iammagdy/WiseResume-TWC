'use strict';

/**
 * Sets up the server-only coupon collections used by the DevKit and coupons hub.
 *
 * Fields:
 *   code        (str 64,  required) — the discount code string
 *   active      (bool,    required) — whether the code is currently active
 * Redemption and usage-counter fields are included so max-use enforcement and
 * per-user idempotency can be committed in one Appwrite transaction.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_discount_codes_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'discount_codes';
const REDEMPTIONS_COLL_ID = 'coupon_redemptions';

// coupon_redemptions.user_id is a legacy oversized string attribute in the live
// project. A composite unique index on user_id + discount_code_id exceeds
// Appwrite's 767-byte index limit. Redemption uniqueness is enforced by the
// deterministic document ID in appwrite-hubs/coupons/src/main.js; this index
// preserves the fallback lookup without attempting to index the oversized field.
const INDEX_SPECS = [
  { collectionId: COLL_ID, key: 'code_unique', type: 'unique', attributes: ['code'] },
  { collectionId: REDEMPTIONS_COLL_ID, key: 'discount_code_idx', type: 'key', attributes: ['discount_code_id'] },
];

const COLLECTION_SPECS = Object.freeze([
  {
    id: COLL_ID,
    name: 'Discount Codes',
    attributes: [
      { key: 'code', type: 'string', size: 64, required: true, array: false },
      { key: 'active', type: 'boolean', required: true, array: false, default: true },
      { key: 'percent_off', type: 'integer', required: true, array: false, default: 100 },
      { key: 'discount_type', type: 'string', size: 16, required: false, array: false },
      { key: 'discount_value', type: 'integer', required: false, array: false, default: 0 },
      { key: 'plan_override', type: 'string', size: 16, required: false, array: false },
      { key: 'plan_days', type: 'integer', required: false, array: false },
      { key: 'expires_at', type: 'datetime', required: false, array: false },
      { key: 'max_uses', type: 'integer', required: false, array: false, default: 0 },
      { key: 'uses_count', type: 'integer', required: false, array: false, default: 0 },
    ],
    indexes: [
      { key: 'code_unique', type: 'unique', attributes: ['code'] },
    ],
  },
  {
    id: REDEMPTIONS_COLL_ID,
    name: 'Coupon Redemptions',
    attributes: [
      { key: 'user_id', type: 'string', size: 64, required: true, array: false },
      { key: 'coupon_code', type: 'string', size: 64, required: true, array: false },
      { key: 'discount_code_id', type: 'string', size: 64, required: true, array: false },
      { key: 'status', type: 'string', size: 32, required: true, array: false },
      { key: 'redeemed_at', type: 'datetime', required: true, array: false },
    ],
    indexes: [
      { key: 'discount_code_idx', type: 'key', attributes: ['discount_code_id'] },
    ],
  },
]);

const APPWRITE_KEY_REGEX = /^[A-Za-z][A-Za-z0-9._-]{0,35}$/;

function isValidSchemaKey(key) {
  return typeof key === 'string' && APPWRITE_KEY_REGEX.test(key);
}

function validateSchemaKey(key, collectionId = '', kind = 'attribute') {
  if (!isValidSchemaKey(key)) {
    const target = collectionId ? ` for ${collectionId} ${kind}` : '';
    throw new Error(
      `Invalid Appwrite schema key "${key}"${target}: ` +
      `key must be 1-36 characters, must start with a letter, and remaining characters must follow the allowed Appwrite identifier contract.`
    );
  }
}

function validateCollectionSpecs(specs = COLLECTION_SPECS) {
  for (const spec of specs) {
    if (spec.id) {
      validateSchemaKey(spec.id, spec.id, 'collection');
    }
    for (const attr of spec.attributes || []) {
      validateSchemaKey(attr.key, spec.id, 'attribute');
    }
    for (const idx of spec.indexes || []) {
      validateSchemaKey(idx.key, spec.id, 'index');
    }
  }
}

function valuesEqual(actual, expected) {
  return Array.isArray(actual) && Array.isArray(expected) && actual.length === expected.length && actual.every((val, idx) => val === expected[idx]);
}

function indexCompatibilityError(index, spec, collectionId = 'collection') {
  const issues = [];
  if (index.type !== spec.type) {
    issues.push(`type ${index.type} (expected ${spec.type})`);
  }
  if (!valuesEqual(index.attributes, spec.attributes)) {
    issues.push(`attributes ${JSON.stringify(index.attributes)} (expected ${JSON.stringify(spec.attributes)})`);
  }
  if (spec.orders && !valuesEqual(index.orders || [], spec.orders)) {
    issues.push(`orders ${JSON.stringify(index.orders || [])} (expected ${JSON.stringify(spec.orders)})`);
  }
  return issues.length ? `Incompatible index "${collectionId}.${spec.key}": ${issues.join(', ')}` : null;
}

function attributeCompatibilityError(attribute, spec, collectionId = 'collection') {
  const issues = [];
  if (attribute.type !== spec.type) {
    issues.push(`type ${attribute.type} (expected ${spec.type})`);
  }
  if (attribute.required !== spec.required) {
    issues.push(`required ${attribute.required} (expected ${spec.required})`);
  }
  if (spec.array !== undefined && Boolean(attribute.array) !== Boolean(spec.array)) {
    issues.push(`array ${Boolean(attribute.array)} (expected ${Boolean(spec.array)})`);
  }

  // Documented legacy exception:
  // coupon_redemptions.user_id is a legacy oversized string attribute in the live project.
  // We preserve documented compatibility without breaking existing data.
  const isLegacyUserId = collectionId === REDEMPTIONS_COLL_ID && spec.key === 'user_id';
  if (spec.size !== undefined) {
    const actualSize = Number(attribute.size);
    if (isLegacyUserId) {
      if (actualSize < spec.size) {
        issues.push(`size ${actualSize} (expected at least ${spec.size})`);
      }
    } else if (actualSize !== spec.size) {
      issues.push(`size ${actualSize} (expected ${spec.size})`);
    }
  }

  if (spec.min !== undefined && Number(attribute.min) !== spec.min) {
    issues.push(`min ${attribute.min} (expected ${spec.min})`);
  }
  if (spec.max !== undefined && Number(attribute.max) !== spec.max) {
    issues.push(`max ${attribute.max} (expected ${spec.max})`);
  }
  if (spec.default !== undefined && attribute.default !== spec.default) {
    issues.push(`default ${attribute.default} (expected ${spec.default})`);
  }
  return issues.length ? `Incompatible attribute "${collectionId}.${spec.key}": ${issues.join(', ')}` : null;
}

function assertServerOnlyCollection(collection, collectionId) {
  const permissions = collection?.$permissions;
  const permissionsIsArray = Array.isArray(permissions);
  const permissionCount = permissionsIsArray ? permissions.length : 'unknown';
  const documentSecurity = collection?.documentSecurity;
  if (!permissionsIsArray || permissionCount !== 0 || documentSecurity !== false) {
    throw new Error(
      `Incompatible collection "${collectionId}": server-only permissions and documentSecurity=false are required `
      + `(permissionsIsArray=${permissionsIsArray}, permissionCount=${permissionCount}, documentSecurity=${typeof documentSecurity === 'boolean' ? documentSecurity : `type:${typeof documentSecurity}`})`,
    );
  }
}

let databases;

function getDatabases() {
  if (!databases) {
    if (!API_KEY) throw new Error('APPWRITE_API_KEY is required');
    const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
    databases = new sdk.Databases(client);
  }
  return databases;
}

async function collectionExists(id) {
  try { await databases.getCollection(DB_ID, id); return true; }
  catch (e) { if (e.code === 404) return false; throw e; }
}
async function attributeExists(collId, key) {
  try { const r = await databases.listAttributes(DB_ID, collId); return r.attributes.some(a => a.key === key); }
  catch { return false; }
}
async function getAttributeOrNull(collId, key) {
  try {
    const r = await databases.listAttributes(DB_ID, collId);
    return (r.attributes || []).find(a => a.key === key) || null;
  } catch {
    return null;
  }
}
async function waitForAttribute(collId, key) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const r = await databases.listAttributes(DB_ID, collId);
    const attr = r.attributes.find(a => a.key === key);
    if (attr?.status === 'available') return;
    if (attr?.status === 'failed') throw new Error(`Attribute ${collId}.${key} failed to build`);
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for attribute ${collId}.${key}`);
}
async function indexExists(collId, key) {
  try { const r = await databases.listIndexes(DB_ID, collId); return r.indexes.some(i => i.key === key); }
  catch { return false; }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForIndexAvailable(databasesInstance, collId, key, maxRetries = 30, delayMs = 500) {
  const db = databasesInstance || databases || getDatabases();
  for (let i = 0; i < maxRetries; i++) {
    const result = await db.listIndexes(DB_ID, collId);
    const index = (result.indexes || []).find(idx => idx.key === key);
    if (!index) {
      await sleep(delayMs);
      continue;
    }
    const status = String(index.status || '').toLowerCase();
    if (status === 'available') return index;
    if (status === 'failed') {
      throw new Error(`Index "${collId}.${key}" creation failed in Appwrite (status: failed)`);
    }
    await sleep(delayMs);
  }
  throw new Error(`Timeout waiting for index "${collId}.${key}" to become available in Appwrite`);
}

async function ensureIndex(databasesInstance, collId, spec) {
  validateSchemaKey(spec.key, collId, 'index');
  const db = databasesInstance || databases || getDatabases();
  const result = await db.listIndexes(DB_ID, collId);
  const existing = (result.indexes || []).find(index => index.key === spec.key);
  if (existing) {
    const incompatible = indexCompatibilityError(existing, spec, collId);
    if (incompatible) throw new Error(incompatible);
    await waitForIndexAvailable(db, collId, spec.key);
    return;
  }
  await db.createIndex(DB_ID, collId, spec.key, spec.type, spec.attributes, spec.orders);
  await waitForIndexAvailable(db, collId, spec.key);
}

async function ensureStringAttr(collId, key, size, required, defaultVal) {
  validateSchemaKey(key, collId, 'attribute');
  const spec = { key, type: 'string', size, required, default: defaultVal };
  if (await attributeExists(collId, key)) {
    const existing = await getAttributeOrNull(collId, key);
    if (existing) {
      const incompatible = attributeCompatibilityError(existing, spec, collId);
      if (incompatible) throw new Error(incompatible);
    }
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultVal ?? undefined);
  console.log(`  ✓ created string attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureIntAttr(collId, key, required, defaultVal) {
  validateSchemaKey(key, collId, 'attribute');
  const spec = { key, type: 'integer', required, default: defaultVal };
  if (await attributeExists(collId, key)) {
    const existing = await getAttributeOrNull(collId, key);
    if (existing) {
      const incompatible = attributeCompatibilityError(existing, spec, collId);
      if (incompatible) throw new Error(incompatible);
    }
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, undefined, undefined, defaultVal ?? undefined);
  console.log(`  ✓ created integer attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureBoolAttr(collId, key, required, defaultVal) {
  validateSchemaKey(key, collId, 'attribute');
  const spec = { key, type: 'boolean', required, default: defaultVal };
  if (await attributeExists(collId, key)) {
    const existing = await getAttributeOrNull(collId, key);
    if (existing) {
      const incompatible = attributeCompatibilityError(existing, spec, collId);
      if (incompatible) throw new Error(incompatible);
    }
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultVal ?? undefined);
  console.log(`  ✓ created boolean attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureDatetimeAttr(collId, key, required) {
  validateSchemaKey(key, collId, 'attribute');
  const spec = { key, type: 'datetime', required };
  if (await attributeExists(collId, key)) {
    const existing = await getAttributeOrNull(collId, key);
    if (existing) {
      const incompatible = attributeCompatibilityError(existing, spec, collId);
      if (incompatible) throw new Error(incompatible);
    }
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createDatetimeAttribute(DB_ID, collId, key, required);
  console.log(`  ✓ created datetime attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureServerOnlyCollection(id, name) {
  validateSchemaKey(id, id, 'collection');
  if (!(await collectionExists(id))) {
    await databases.createCollection(DB_ID, id, name, [], false, true);
    console.log(`  ✓ created ${id} collection`);
    await sleep(800);
  } else {
    console.log(`  ✓ ${id} collection already exists`);
  }
  const collection = await databases.getCollection(DB_ID, id);
  await databases.updateCollection(
    DB_ID,
    id,
    collection.name || name,
    [],
    false,
    collection.enabled !== false,
  );
  assertServerOnlyCollection(await databases.getCollection(DB_ID, id), id);
  console.log(`  ✓ enforced server-only access for ${id}`);
}

async function main() {
  validateCollectionSpecs(COLLECTION_SPECS);
  getDatabases();
  console.log(`Setting up discount_codes schema — project=${PROJECT_ID} db=${DB_ID}`);

  await ensureServerOnlyCollection(COLL_ID, 'Discount Codes');

  await ensureStringAttr(COLL_ID, 'code', 64, true);
  await ensureBoolAttr(COLL_ID, 'active', true, true);
  await ensureIntAttr(COLL_ID, 'percent_off', true, 100);
  await ensureStringAttr(COLL_ID, 'discount_type', 16, false);
  await ensureIntAttr(COLL_ID, 'discount_value', false, 0);
  await ensureStringAttr(COLL_ID, 'plan_override', 16, false);
  await ensureIntAttr(COLL_ID, 'plan_days', false);
  await ensureDatetimeAttr(COLL_ID, 'expires_at', false);
  await ensureIntAttr(COLL_ID, 'max_uses', false, 0);
  await ensureIntAttr(COLL_ID, 'uses_count', false, 0);

  const codeIndex = INDEX_SPECS.find(index => index.key === 'code_unique');
  if (!(await indexExists(codeIndex.collectionId, codeIndex.key))) {
    await databases.createIndex(DB_ID, codeIndex.collectionId, codeIndex.key, codeIndex.type, codeIndex.attributes);
    console.log('  ✓ created unique index on code');
  } else {
    const r = await databases.listIndexes(DB_ID, codeIndex.collectionId);
    const existing = (r.indexes || []).find(i => i.key === codeIndex.key);
    if (existing) {
      const incompatible = indexCompatibilityError(existing, codeIndex, codeIndex.collectionId);
      if (incompatible) throw new Error(incompatible);
    }
    console.log('  ✓ index code_unique already exists');
  }
  await waitForIndexAvailable(databases, codeIndex.collectionId, codeIndex.key);

  await ensureServerOnlyCollection(REDEMPTIONS_COLL_ID, 'Coupon Redemptions');
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'user_id', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'coupon_code', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'discount_code_id', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'status', 32, true);
  await ensureDatetimeAttr(REDEMPTIONS_COLL_ID, 'redeemed_at', true);

  const redemptionIndex = INDEX_SPECS.find(index => index.key === 'discount_code_idx');
  if (!(await indexExists(redemptionIndex.collectionId, redemptionIndex.key))) {
    await databases.createIndex(DB_ID, redemptionIndex.collectionId, redemptionIndex.key, redemptionIndex.type, redemptionIndex.attributes);
    console.log('  ✓ created redemption lookup index on discount_code_id');
  } else {
    const r = await databases.listIndexes(DB_ID, redemptionIndex.collectionId);
    const existing = (r.indexes || []).find(i => i.key === redemptionIndex.key);
    if (existing) {
      const incompatible = indexCompatibilityError(existing, redemptionIndex, redemptionIndex.collectionId);
      if (incompatible) throw new Error(incompatible);
    }
    console.log('  ✓ index discount_code_idx already exists');
  }
  await waitForIndexAvailable(databases, redemptionIndex.collectionId, redemptionIndex.key);

  console.log('\n✅ discount_codes schema ready');
}

if (require.main === module) {
  main().catch(e => { console.error('✗', e.message); process.exit(1); });
}

module.exports = {
  DB_ID,
  COLL_ID,
  REDEMPTIONS_COLL_ID,
  COLLECTION_SPECS,
  INDEX_SPECS,
  APPWRITE_KEY_REGEX,
  isValidSchemaKey,
  validateSchemaKey,
  validateCollectionSpecs,
  valuesEqual,
  attributeCompatibilityError,
  indexCompatibilityError,
  assertServerOnlyCollection,
  waitForIndexAvailable,
  waitForAttribute,
  ensureIndex,
  main,
  __test: {
    INDEX_SPECS,
    COLLECTION_SPECS,
    APPWRITE_KEY_REGEX,
    isValidSchemaKey,
    validateSchemaKey,
    validateCollectionSpecs,
    valuesEqual,
    attributeCompatibilityError,
    indexCompatibilityError,
    assertServerOnlyCollection,
    waitForIndexAvailable,
  },
};
