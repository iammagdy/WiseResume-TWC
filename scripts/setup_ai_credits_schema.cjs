'use strict';

/**
 * Sets up the Appwrite schema required for AI credit tracking:
 *   Creates `ai_credits` collection with required attributes and indexes.
 *
 * Used by both ai-gateway and resume-section-ai to enforce per-user
 * daily credit limits. Without this collection, ALL AI calls fail with
 * "AI credit tracking is not available." (503).
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_ai_credits_schema.cjs
 *
 * Fields:
 *   user_id     (str 36,  required)  — Appwrite user $id
 *   daily_usage (int,     required)  — credits used on usage_date
 *   total_usage (int,     required)  — lifetime credits used
 *   usage_date  (str 10,  required)  — "YYYY-MM-DD" of last update
 *   daily_limit (int,     optional)  — per-user override; null = use plan default
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLLECTION_ID = 'ai_credits';

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

async function ensureIntAttr(collId, key, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, undefined, undefined, defaultValue ?? undefined);
  console.log(`✓ created integer attribute "${key}"`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Setting up ai_credits schema on project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLLECTION_ID))) {
    await databases.createCollection(DB_ID, COLLECTION_ID, 'AI Credits', [
      sdk.Permission.create(sdk.Role.any()),  // functions create docs per-user
      sdk.Permission.read(sdk.Role.any()),    // functions read on behalf of users
      sdk.Permission.update(sdk.Role.any()),  // functions update usage counters
      sdk.Permission.delete(sdk.Role.any()),  // functions may delete stale docs
    ]);
    console.log(`✓ created collection "${COLLECTION_ID}"`);
    // Wait for collection to be ready before adding attributes
    await sleep(1500);
  } else {
    console.log(`✓ collection "${COLLECTION_ID}" already exists`);
  }

  await ensureStringAttr(COLLECTION_ID, 'user_id',     36,  true,  null);
  await sleep(500);
  await ensureIntAttr   (COLLECTION_ID, 'daily_usage', true,  0);
  await sleep(500);
  await ensureIntAttr   (COLLECTION_ID, 'total_usage', true,  0);
  await sleep(500);
  await ensureStringAttr(COLLECTION_ID, 'usage_date',  10,  true,  null);
  await sleep(500);
  // Optional per-user override; null means "use plan default"
  await ensureIntAttr   (COLLECTION_ID, 'daily_limit', false, null);
  await sleep(1000);

  // Index on user_id for fast per-user lookups
  if (!(await indexExists(COLLECTION_ID, 'idx_user_id'))) {
    await databases.createIndex(DB_ID, COLLECTION_ID, 'idx_user_id', 'key', ['user_id'], ['ASC']);
    console.log('✓ created index "idx_user_id"');
  } else {
    console.log('✓ index "idx_user_id" already exists');
  }

  console.log('\n✅ ai_credits schema ready');
}

main().catch(err => {
  console.error('✗ Fatal:', err.message);
  process.exit(1);
});
