'use strict';

/**
 * Sets up the `feature_flags` collection required by the DevKit Feature Flags panel
 * and the admin-feature-flags Appwrite Function.
 *
 * Fields:
 *   name               (str 128, required) — slug-style flag name
 *   description        (str 512, optional) — human-readable description
 *   enabled_globally   (bool,    required) — flag is on for all users
 *   enabled_plans      (str[],   optional) — plans this flag is enabled for
 *   enabled_user_ids   (str[],   optional) — specific user IDs this flag is enabled for
 *   percentage_rollout (int,     required) — 0-100 gradual rollout percentage
 *   kill_switch_function (str 128, optional) — Appwrite function ID to kill-switch against
 *   updated_by         (str 128, optional) — who last updated the flag
 *   updated_at         (str 32,  optional) — ISO timestamp of last update
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_feature_flags_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'feature_flags';

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
async function ensureStringArrayAttr(collId, key, size) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createStringAttribute(DB_ID, collId, key, size, false, undefined, true);
  console.log(`  ✓ created string[] attribute "${key}"`);
  await sleep(500);
}
async function ensureIntAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, 0, 100, defaultVal ?? undefined);
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
  console.log(`Setting up feature_flags schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Feature Flags', []);
    console.log('  ✓ created feature_flags collection');
    await sleep(800);
  } else {
    console.log('  ✓ feature_flags collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'name', 128, true);
  await ensureStringAttr(COLL_ID, 'description', 512, false, '');
  await ensureBoolAttr(COLL_ID, 'enabled_globally', true, false);
  await ensureStringArrayAttr(COLL_ID, 'enabled_plans', 64);
  await ensureStringArrayAttr(COLL_ID, 'enabled_user_ids', 36);
  await ensureIntAttr(COLL_ID, 'percentage_rollout', true, 0);
  await ensureStringAttr(COLL_ID, 'kill_switch_function', 128, false);
  await ensureStringAttr(COLL_ID, 'updated_by', 128, false, 'system');
  await ensureStringAttr(COLL_ID, 'updated_at', 32, false);

  if (!(await indexExists(COLL_ID, 'name_unique'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'name_unique', 'unique', ['name']);
    console.log('  ✓ created unique index on name');
  } else {
    console.log('  ✓ index name_unique already exists');
  }

  console.log('\n✅ feature_flags schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
