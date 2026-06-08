'use strict';

/**
 * Sets up the Appwrite schema + permissions required for the Company Briefing
 * library Save/List flow (src/hooks/useCompanyBriefingLibrary.ts).
 *
 * The `company_briefings` collection already exists (created during the Supabase
 * -> Appwrite migration) but is missing the attributes, index, and create
 * permission the app needs, so Save currently fails live with:
 *   "No permissions provided for action 'create'"
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_company_briefings_schema.cjs
 *
 * Fields written by useSaveCompanyBriefing():
 *   user_id (str 36)        — Appwrite user ID (queried with Query.equal)
 *   company_name (str 256)  — company name
 *   briefing (str 65535)    — JSON-stringified CompanyBriefing payload
 *
 * Migration-safety: attributes are created as NON-required (optional) so adding
 * them cannot reject pre-existing documents. The app always writes all three.
 *
 * Permissions: enables document-level security and grants create to the `users`
 * role so authenticated users can create their own briefings. Per-document
 * read/update/delete are granted to the document owner at create time by the
 * client (see useSaveCompanyBriefing). Existing collection permissions are
 * preserved; the create permission is only added if absent (idempotent).
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'company_briefings';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function collectionExists(collId) {
  try {
    await databases.getCollection(DB_ID, collId);
    return true;
  } catch (e) {
    if (e.code === 404) return false;
    throw e;
  }
}

async function attributeExists(collId, key) {
  try {
    const attrs = await databases.listAttributes(DB_ID, collId);
    return attrs.attributes.some(attr => attr.key === key);
  } catch {
    return false;
  }
}

async function indexExists(collId, key) {
  try {
    const indexes = await databases.listIndexes(DB_ID, collId);
    return indexes.indexes.some(idx => idx.key === key);
  } catch {
    return false;
  }
}

async function ensureStringAttr(collId, key, size, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
  console.log(`✓ created string attribute "${key}"`);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`✓ index "${key}" already exists`);
    return;
  }
  await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
  console.log(`✓ created index "${key}"`);
}

// Idempotently ensure the collection allows authenticated users to create their
// own documents, with document-level security enabled. Existing permissions are
// preserved; we only add the create-for-users permission when it is missing.
async function ensureCreatePermission(collId) {
  const coll = await databases.getCollection(DB_ID, collId);
  const existing = Array.isArray(coll.$permissions) ? coll.$permissions : [];
  const createForUsers = sdk.Permission.create(sdk.Role.users());

  const hasCreateForUsers = existing.includes(createForUsers);
  const docSecurityOk = coll.documentSecurity === true;

  if (hasCreateForUsers && docSecurityOk) {
    console.log('✓ create permission + document security already configured');
    return;
  }

  const permissions = hasCreateForUsers ? existing : [...existing, createForUsers];
  await databases.updateCollection(
    DB_ID,
    collId,
    coll.name || collId,
    permissions,
    true, // documentSecurity: each document carries its own owner read/update/delete
    coll.enabled !== false,
  );
  console.log('✓ ensured create-for-users permission and document security');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== Company Briefings Schema Setup ===\n');
  console.log(`1. ${COLLECTION_ID}`);

  if (await collectionExists(COLLECTION_ID)) {
    console.log('✓ collection already exists - skipping creation');
  } else {
    // Created with document-level security so per-user briefings are isolated.
    await databases.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, [], true);
    console.log('✓ collection created (document security enabled)');
    await sleep(500);
  }

  // Optional (non-required) for migration safety; the app always writes them.
  await ensureStringAttr(COLLECTION_ID, 'user_id', 36, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'company_name', 256, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'briefing', 65535, false);
  await sleep(500);

  // Index required by useCompanyBriefingLibrary: Query.equal('user_id', user.id)
  await ensureIndex(COLLECTION_ID, 'user_id_idx', 'key', ['user_id'], ['ASC']);
  await sleep(500);

  await ensureCreatePermission(COLLECTION_ID);

  console.log(`\n✓ ${COLLECTION_ID} schema ready\n`);
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
