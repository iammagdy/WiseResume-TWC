'use strict';

/**
 * Sets up the `notifications` collection required by the DevKit Notifications panel
 * and the admin-devkit-data Appwrite Function (handleListNotifications / handleSendNotification).
 *
 * Fields:
 *   user_id   (str 36,   required) — target Appwrite user ID
 *   type      (str 64,   optional, default "info") — notification type
 *   title     (str 256,  required) — notification title
 *   message   (str 2048, required) — notification body
 *   is_read   (bool,     required, default false) — read/unread state
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_notifications_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'notifications';

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

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`  ✓ index ${key} already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  ✓ created index on ${attributes.join(', ')}`);
  } catch (e) {
    // message (2048) exceeds MariaDB's 767-byte index key limit for the collection.
    if (e.type === 'index_invalid' || String(e.message).toLowerCase().includes('index length')) {
      console.warn(`  ⚠ index "${key}" skipped — ${e.message} (query still works, no index)`);
      return;
    }
    throw e;
  }
}

async function main() {
  console.log(`Setting up notifications schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Notifications', []);
    console.log('  ✓ created notifications collection');
    await sleep(800);
  } else {
    console.log('  ✓ notifications collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'user_id', 36, true);
  await ensureStringAttr(COLL_ID, 'type', 64, false, 'info');
  await ensureStringAttr(COLL_ID, 'title', 256, true);
  await ensureStringAttr(COLL_ID, 'message', 2048, true);
  await ensureBoolAttr(COLL_ID, 'is_read', true, false);

  await ensureIndex(COLL_ID, 'user_id_idx', 'key', ['user_id']);
  await ensureIndex(COLL_ID, 'is_read_idx', 'key', ['is_read']);

  console.log('\n✅ notifications schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
