'use strict';

/**
 * Sets up the `contact_requests` collection required by the DevKit Contact Requests panel
 * and the admin-devkit-data Appwrite Function (handleListContactRequests).
 *
 * Fields:
 *   name      (str 256, optional) — sender's name
 *   email     (str 254, required) — sender's email
 *   subject   (str 256, optional) — message subject
 *   message   (str 4096, required) — message body
 *   status    (str 32,  optional, default "new") — processing status
 *   user_id   (str 36,  optional) — linked Appwrite user ID if authenticated
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_contact_requests_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'contact_requests';

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

async function main() {
  console.log(`Setting up contact_requests schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'Contact Requests', []);
    console.log('  ✓ created contact_requests collection');
    await sleep(800);
  } else {
    console.log('  ✓ contact_requests collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'name', 256, false, '');
  await ensureStringAttr(COLL_ID, 'email', 254, true);
  await ensureStringAttr(COLL_ID, 'subject', 256, false, '');
  await ensureStringAttr(COLL_ID, 'message', 4096, true);
  await ensureStringAttr(COLL_ID, 'status', 32, false, 'new');
  await ensureStringAttr(COLL_ID, 'user_id', 36, false);

  if (!(await indexExists(COLL_ID, 'email_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'email_idx', 'key', ['email']);
    console.log('  ✓ created index on email');
  } else {
    console.log('  ✓ index email_idx already exists');
  }
  if (!(await indexExists(COLL_ID, 'status_idx'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'status_idx', 'key', ['status']);
    console.log('  ✓ created index on status');
  } else {
    console.log('  ✓ index status_idx already exists');
  }

  console.log('\n✅ contact_requests schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
