'use strict';

/**
 * Sets up the Appwrite schema required for ai-gateway idempotency protection:
 *   Creates `idempotency_cache` collection with required attributes and indexes.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_idempotency_schema.cjs
 *
 * Fields written by createIdempotencyPending():
 *   key (str 64)          — SHA-256 content key (userId:feature:payloadHash:timeBucket)
 *   user_id (str 36)      — Appwrite user ID
 *   feature (str 64)      — feature name
 *   status (str 16)       — 'pending' | 'success' | 'failed'
 *   has_result (bool)     — whether cached_result is populated
 *   cached_result (str)   — serialised result payload (up to 60 KB)
 *   created_at (str 32)   — ISO 8601 timestamp
 *   expires_at (str 32)   — ISO 8601 expiry (5-minute TTL)
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLLECTION_ID = 'idempotency_cache';

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

async function ensureBoolAttr(collId, key, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultValue ?? undefined);
  console.log(`✓ created boolean attribute "${key}"`);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`✓ index "${key}" already exists`);
    return;
  }
  await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
  console.log(`✓ created index "${key}"`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== Idempotency Cache Schema Setup ===\n');
  console.log(`1. ${COLLECTION_ID}`);

  if (await collectionExists(COLLECTION_ID)) {
    console.log('✓ collection already exists - skipping creation');
  } else {
    await databases.createCollection(DB_ID, COLLECTION_ID, COLLECTION_ID, []);
    console.log('✓ collection created (server-only permissions)');
    await sleep(500);
  }

  await ensureStringAttr(COLLECTION_ID, 'key', 64, true);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'user_id', 36, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'feature', 64, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'status', 16, false);
  await sleep(200);
  await ensureBoolAttr(COLLECTION_ID, 'has_result', false, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'cached_result', 65535, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'created_at', 32, false);
  await sleep(200);
  await ensureStringAttr(COLLECTION_ID, 'expires_at', 32, false);
  await sleep(500);

  // Index required by checkIdempotencyCache: Query.equal('key', idempotencyKey)
  await ensureIndex(COLLECTION_ID, 'key_idx', 'key', ['key'], ['ASC']);
  await sleep(200);

  console.log(`\n✓ ${COLLECTION_ID} schema ready\n`);
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
