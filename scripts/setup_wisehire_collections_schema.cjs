'use strict';

/**
 * Sets up three WiseHire collections required by the DevKit WiseHire Queue panel
 * and the wisehire-gateway / admin-devkit-data Appwrite Functions:
 *
 *   wisehire_waitlist  — applicants waiting for WiseHire access
 *   wisehire_invites   — one-time invite tokens sent to waitlist applicants
 *   wisehire_accounts  — approved WiseHire recruiter accounts
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_wisehire_collections_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';

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

async function ensureWisehireWaitlist() {
  console.log('\n── wisehire_waitlist ──');
  const COLL = 'wisehire_waitlist';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Waitlist', []);
    console.log('  ✓ created wisehire_waitlist collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_waitlist already exists');
  }
  await ensureStringAttr(COLL, 'email', 254, true);
  await ensureStringAttr(COLL, 'name', 256, false, '');
  await ensureStringAttr(COLL, 'company_name', 256, false, '');
  await ensureStringAttr(COLL, 'company_size', 64, false, '');
  if (!(await indexExists(COLL, 'email_idx'))) {
    await databases.createIndex(DB_ID, COLL, 'email_idx', 'key', ['email']);
    console.log('  ✓ created index on email');
  }
}

async function ensureWisehireInvites() {
  console.log('\n── wisehire_invites ──');
  const COLL = 'wisehire_invites';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Invites', []);
    console.log('  ✓ created wisehire_invites collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_invites already exists');
  }
  await ensureStringAttr(COLL, 'email', 254, true);
  await ensureStringAttr(COLL, 'token', 128, true);
  await ensureStringAttr(COLL, 'status', 32, false, 'pending');
  await ensureStringAttr(COLL, 'expires_at', 32, false);
  await ensureStringAttr(COLL, 'created_at', 32, false);
  await ensureStringAttr(COLL, 'target_user_id', 36, false);
  if (!(await indexExists(COLL, 'email_idx'))) {
    await databases.createIndex(DB_ID, COLL, 'email_idx', 'key', ['email']);
    console.log('  ✓ created index on email');
  }
  if (!(await indexExists(COLL, 'token_unique'))) {
    await databases.createIndex(DB_ID, COLL, 'token_unique', 'unique', ['token']);
    console.log('  ✓ created unique index on token');
  }
}

async function ensureWisehireAccounts() {
  console.log('\n── wisehire_accounts ──');
  const COLL = 'wisehire_accounts';
  if (!(await collectionExists(COLL))) {
    await databases.createCollection(DB_ID, COLL, 'WiseHire Accounts', []);
    console.log('  ✓ created wisehire_accounts collection');
    await sleep(800);
  } else {
    console.log('  ✓ wisehire_accounts already exists');
  }
  await ensureStringAttr(COLL, 'user_id', 36, true);
  await ensureStringAttr(COLL, 'email', 254, false);
  await ensureStringAttr(COLL, 'approved_at', 32, false);
  if (!(await indexExists(COLL, 'user_id_unique'))) {
    await databases.createIndex(DB_ID, COLL, 'user_id_unique', 'unique', ['user_id']);
    console.log('  ✓ created unique index on user_id');
  }
}

async function main() {
  console.log(`Setting up WiseHire collections — project=${PROJECT_ID} db=${DB_ID}`);
  await ensureWisehireWaitlist();
  await ensureWisehireInvites();
  await ensureWisehireAccounts();
  console.log('\n✅ WiseHire collections schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
