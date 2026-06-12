'use strict';

/**
 * Sets up the `error_log` collection used by the DevKit Observability panel
 * and handleListErrors / handleObservability in admin-devkit-data.
 *
 * Fields:
 *   message     (str 2048, required) — error message
 *   context     (str 4096, optional) — JSON-serialised context object
 *   source      (str 256,  optional) — function/module that raised the error
 *   level       (str 16,   optional, default "error") — error | warn | info
 *   user_id     (str 36,   optional) — Appwrite user ID if applicable
 *   resolved    (bool,     optional, default false) — marked as reviewed/resolved
 *   reviewed_at (str 32,   optional) — ISO timestamp of review action
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_error_log_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'error_log';

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
async function ensureBoolAttr(collId, key, required, defaultVal) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultVal ?? undefined);
  console.log(`  ✓ created boolean attribute "${key}"`);
  await sleep(500);
}

async function main() {
  console.log(`Setting up error_log schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Error Log', []);
    console.log('  ✓ created error_log collection');
    await sleep(800);
  } else {
    console.log('  ✓ error_log collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'message', 2048, true);
  await ensureStringAttr(COLL_ID, 'context', 4096, false, '');
  await ensureStringAttr(COLL_ID, 'source', 256, false, '');
  await ensureStringAttr(COLL_ID, 'level', 16, false, 'error');
  await ensureStringAttr(COLL_ID, 'user_id', 36, false);
  await ensureBoolAttr(COLL_ID, 'resolved', false, false);
  await ensureStringAttr(COLL_ID, 'reviewed_at', 32, false);

  if (!(await indexExists(COLL_ID, 'level_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'level_idx', 'key', ['level']);
    console.log('  ✓ created index on level');
  } else {
    console.log('  ✓ index level_idx already exists');
  }
  if (!(await indexExists(COLL_ID, 'resolved_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'resolved_idx', 'key', ['resolved']);
    console.log('  ✓ created index on resolved');
  } else {
    console.log('  ✓ index resolved_idx already exists');
  }
  if (!(await indexExists(COLL_ID, 'source_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'source_idx', 'key', ['source']);
    console.log('  ✓ created index on source');
  } else {
    console.log('  ✓ index source_idx already exists');
  }

  console.log('\n✅ error_log schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
