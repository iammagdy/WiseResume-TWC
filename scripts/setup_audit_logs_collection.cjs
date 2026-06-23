'use strict';

/**
 * B11 — Provisions the `audit_logs` collection used by the ONBOARDING FUNNEL.
 *
 * IMPORTANT: this is NOT `admin_audit_logs`.
 *   - `admin_audit_logs` (see scripts/setup_audit_logs_schema.cjs) stores ADMIN
 *     actions and is read by the DevKit Audit Log panel. Do not change it.
 *   - `audit_logs` is where src/lib/auditLogger.ts writes onboarding/auth/account
 *     events and where appwrite-hubs/admin-onboarding-funnel reads them. Code
 *     comments (DevKitRunner) suggest this collection may never have been
 *     provisioned, which would make every onboarding event write fail silently
 *     and the funnel always empty.
 *
 * This script creates `audit_logs` (if missing) with the schema the writer and
 * funnel expect, without touching `admin_audit_logs`. Authenticated users may
 * CREATE (so logAudit works from the browser); reads are server-side via API key
 * (functions), so no collection read role is granted.
 *
 * Idempotent. Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_audit_logs_collection.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLL_ID = 'audit_logs';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new sdk.Databases(client);

async function collectionExists(id) {
  try { await databases.getCollection(DB_ID, id); return true; }
  catch (e) { if (e.code === 404) return false; throw e; }
}
async function attributeExists(collId, key) {
  try { const r = await databases.listAttributes(DB_ID, collId); return r.attributes.some((a) => a.key === key); }
  catch { return false; }
}
async function indexExists(collId, key) {
  try { const r = await databases.listIndexes(DB_ID, collId); return r.indexes.some((i) => i.key === key); }
  catch { return false; }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function ensureStringAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) { console.log(`  ✓ attribute "${key}" already exists`); return; }
  await databases.createStringAttribute(DB_ID, collId, key, size, required);
  console.log(`  ✓ created string attribute "${key}"`);
  await sleep(500);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) { console.log(`  ✓ index ${key} already exists`); return; }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  ✓ created index on ${attributes.join(', ')}`);
  } catch (e) {
    console.warn(`  ⚠ index "${key}" skipped — ${e.message}`);
  }
}

async function main() {
  console.log(`Setting up audit_logs (onboarding) schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(
      DB_ID,
      COLL_ID,
      'Audit Logs',
      [sdk.Permission.create(sdk.Role.users())],
      false, // documentSecurity off — reads are server-side via API key only
      true,
    );
    console.log('  ✓ created audit_logs collection');
    await sleep(800);
  } else {
    console.log('  ✓ audit_logs collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'user_id', 64, false);
  await ensureStringAttr(COLL_ID, 'anon_id', 64, false);
  await ensureStringAttr(COLL_ID, 'category', 32, false);
  await ensureStringAttr(COLL_ID, 'action', 64, false);
  await ensureStringAttr(COLL_ID, 'metadata', 8192, false);

  await ensureIndex(COLL_ID, 'category_idx', 'key', ['category'], ['ASC']);

  console.log('\n✅ audit_logs (onboarding) schema ready');
}

main().catch((e) => {
  console.error('✗', e.message);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
