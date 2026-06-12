'use strict';

/**
 * Sets up the `edge_function_logs` collection used by the DevKit Observability panel
 * (handleObservability get_telemetry action in admin-devkit-data).
 *
 * Fields:
 *   function_name (str 128, optional) — Appwrite function slug that emitted the log
 *   status_code   (int,     optional) — HTTP/execution status code
 *   level         (str 16,  optional, default "info") — log level: info | warn | error
 *   duration_ms   (int,     optional) — execution duration in milliseconds
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_edge_function_logs_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'edge_function_logs';

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

async function main() {
  console.log(`Setting up edge_function_logs schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Edge Function Logs', []);
    console.log('  ✓ created edge_function_logs collection');
    await sleep(800);
  } else {
    console.log('  ✓ edge_function_logs collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'function_name', 128, false, '');
  await ensureIntAttr(COLL_ID, 'status_code', false);
  await ensureStringAttr(COLL_ID, 'level', 16, false, 'info');
  await ensureIntAttr(COLL_ID, 'duration_ms', false);

  if (!(await indexExists(COLL_ID, 'function_name_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'function_name_idx', 'key', ['function_name']);
    console.log('  ✓ created index on function_name');
  } else {
    console.log('  ✓ index function_name_idx already exists');
  }
  if (!(await indexExists(COLL_ID, 'level_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'level_idx', 'key', ['level']);
    console.log('  ✓ created index on level');
  } else {
    console.log('  ✓ index level_idx already exists');
  }

  console.log('\n✅ edge_function_logs schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
