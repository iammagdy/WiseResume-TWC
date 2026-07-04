'use strict';

/**
 * Ensures the Appwrite app_settings collection exposes the key/value schema
 * expected by DevKit operational settings such as fn_deployed_hashes.
 *
 * Run with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_app_settings_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'app_settings';

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

async function ensureStringAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required);
  console.log(`✓ created string attribute "${key}"`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== App Settings Schema Setup ===\n');
  console.log(`1. ${COLLECTION_ID}`);

  if (await collectionExists(COLLECTION_ID)) {
    console.log('✓ collection already exists - skipping creation');
  } else {
    await databases.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, []);
    console.log('✓ collection created (server-only permissions)');
    await sleep(500);
  }

  await ensureStringAttr(COLLECTION_ID, 'key', 128, true);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'value', 65535, true);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'ai_test_slot_models', 65535, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'ai_key_test_results', 65535, false);
  await sleep(200);

  console.log(`\n✓ ${COLLECTION_ID} schema ready\n`);
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
