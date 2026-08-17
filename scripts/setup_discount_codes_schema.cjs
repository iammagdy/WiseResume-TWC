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

if (!API_KEY) { console.error('✗ APPWRITE_API_KEY is required'); process.exit(1); }

const client    = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new sdk.Databases(client);

async function collectionExists(id) {
  try { await databases.getCollection(DB_ID, id); return true; }
  catch (e) { if (e.code === 404) return false; throw e; }
}
async function attributeExists(collId, key) {
  try { const r = await databases.listAttributes(DB_ID, collId); return r.attributes.some(a => a.key === key); }
  catch { return false; }
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

async function ensureStringAttr(collId, key, size, required, defaultVal) {
  if (await attributeExists(collId, key)) {
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultVal ?? undefined);
  console.log(`  ✓ created string attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureIntAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) {
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, undefined, undefined, defaultVal ?? undefined);
  console.log(`  ✓ created integer attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureBoolAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) {
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultVal ?? undefined);
  console.log(`  ✓ created boolean attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureDatetimeAttr(collId, key, required) {
  if (await attributeExists(collId, key)) {
    await waitForAttribute(collId, key);
    console.log(`  ✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createDatetimeAttribute(DB_ID, collId, key, required);
  console.log(`  ✓ created datetime attribute "${key}"`);
  await waitForAttribute(collId, key);
}
async function ensureServerOnlyCollection(id, name) {
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
  console.log(`  ✓ enforced server-only access for ${id}`);
}

async function main() {
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

  if (!(await indexExists(COLL_ID, 'code_unique'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'code_unique', 'unique', ['code']);
    console.log('  ✓ created unique index on code');
  } else {
    console.log('  ✓ index code_unique already exists');
  }

  await ensureServerOnlyCollection(REDEMPTIONS_COLL_ID, 'Coupon Redemptions');
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'user_id', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'coupon_code', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'discount_code_id', 64, true);
  await ensureStringAttr(REDEMPTIONS_COLL_ID, 'status', 32, true);
  await ensureDatetimeAttr(REDEMPTIONS_COLL_ID, 'redeemed_at', true);

  if (!(await indexExists(REDEMPTIONS_COLL_ID, 'user_coupon_unique'))) {
    await databases.createIndex(
      DB_ID,
      REDEMPTIONS_COLL_ID,
      'user_coupon_unique',
      'unique',
      ['user_id', 'discount_code_id'],
    );
    console.log('  ✓ created unique redemption index on user + coupon');
  } else {
    console.log('  ✓ index user_coupon_unique already exists');
  }

  console.log('\n✅ discount_codes schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
