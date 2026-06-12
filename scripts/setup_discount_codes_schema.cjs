'use strict';

/**
 * Sets up the `discount_codes` collection required by the DevKit Coupons panel.
 *
 * Fields:
 *   code        (str 64,  required) — the discount code string
 *   active      (bool,    required) — whether the code is currently active
 *   percent_off (int,     required) — discount percentage (0-100)
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
async function indexExists(collId, key) {
  try { const r = await databases.listIndexes(DB_ID, collId); return r.indexes.some(i => i.key === key); }
  catch { return false; }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function ensureStringAttr(collId, key, size, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultVal ?? undefined);
  console.log(`  ✓ created string attribute "${key}"`);
  await sleep(500);
}
async function ensureIntAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, undefined, undefined, defaultVal ?? undefined);
  console.log(`  ✓ created integer attribute "${key}"`);
  await sleep(500);
}
async function ensureBoolAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultVal ?? undefined);
  console.log(`  ✓ created boolean attribute "${key}"`);
  await sleep(500);
}

async function main() {
  console.log(`Setting up discount_codes schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Discount Codes', [
      sdk.Permission.read(sdk.Role.any()),
    ]);
    console.log('  ✓ created discount_codes collection');
    await sleep(800);
  } else {
    console.log('  ✓ discount_codes collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'code', 64, true);
  await ensureBoolAttr(COLL_ID, 'active', true, true);
  await ensureIntAttr(COLL_ID, 'percent_off', true, 100);

  if (!(await indexExists(COLL_ID, 'code_unique'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'code_unique', 'unique', ['code']);
    console.log('  ✓ created unique index on code');
  } else {
    console.log('  ✓ index code_unique already exists');
  }

  console.log('\n✅ discount_codes schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
