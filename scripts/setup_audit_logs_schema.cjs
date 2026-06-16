'use strict';

/**
 * Sets up the `admin_audit_logs` collection required by the DevKit Audit Log panel,
 * the Onboarding Funnel panel, and the admin-devkit-data Appwrite Function.
 *
 * Fields:
 *   user_id   (str 36,   optional) — Appwrite user ID performing the action
 *   category  (str 64,   optional) — log category (auth, plan, credits, feature_flag, etc.)
 *   action    (str 256,  required) — action slug/description
 *   metadata  (str 4096, optional) — JSON-serialised extra data
 *   details   (str 1024, optional) — human-readable detail string
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_audit_logs_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'admin_audit_logs';

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

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`  ✓ index ${key} already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  ✓ created index on ${attributes.join(', ')}`);
  } catch (e) {
    // Large string attrs (metadata 4096) exceed MariaDB's 767-byte index key limit.
    if (e.type === 'index_invalid' || String(e.message).toLowerCase().includes('index length')) {
      console.warn(`  ⚠ index "${key}" skipped — ${e.message} (query still works, no index)`);
      return;
    }
    throw e;
  }
}

async function main() {
  console.log(`Setting up admin_audit_logs schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Admin Audit Logs', []);
    console.log('  ✓ created admin_audit_logs collection');
    await sleep(800);
  } else {
    console.log('  ✓ admin_audit_logs collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'user_id', 36, false);
  await ensureStringAttr(COLL_ID, 'category', 64, false, 'system');
  await ensureStringAttr(COLL_ID, 'action', 256, true);
  await ensureStringAttr(COLL_ID, 'metadata', 4096, false, '');
  await ensureStringAttr(COLL_ID, 'details', 1024, false, '');

  await ensureIndex(COLL_ID, 'user_id_idx', 'key', ['user_id']);
  await ensureIndex(COLL_ID, 'category_idx', 'key', ['category']);
  await ensureIndex(COLL_ID, 'created_at_desc', 'key', ['$createdAt']);

  console.log('\n✅ admin_audit_logs schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
