'use strict';

// Idempotent schema setup for the `portfolio_settings` collection.
// Ensures the attributes the portfolio password gate + the portfolio-settings
// writer require:
//   - user_id          string(36) required   (link to owner; already present in prod)
//   - password_enabled boolean    not-required default false
//   - password_hash    string(256) not-required, NO default (nullable/absent until set)
//
// SECURITY: this script does NOT change permissions on an existing collection.
// `portfolio_settings` is server-only (no client read/write). If the collection
// is missing entirely it is (re)created with documentSecurity=false and NO
// permissions, i.e. API-key-only access — matching the verified production state.
// Safe to run repeatedly.

// node-appwrite v17 exports the index-type enum as `DatabasesIndexType`.
const { Client, Databases, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL = 'portfolio_settings';

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const db = new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDuplicate = (e) => !!e && (e.code === 409 || /already exists/i.test(e.message || ''));
const isMissing = (e) => !!e && (e.code === 404 || /could not be found/i.test(e.message || ''));

async function ensureCollectionExists() {
  try {
    await db.getCollection(DB_ID, COLL);
    console.log('✓ collection "portfolio_settings" exists (permissions left untouched)');
    return;
  } catch (e) {
    if (!isMissing(e)) throw e;
  }
  // Missing → create server-only: documentSecurity=false + no permissions => only
  // the API key (server) can read/write. Never grants client access.
  await db.createCollection(DB_ID, COLL, 'Portfolio Settings', [], false);
  console.log('✓ created collection "portfolio_settings" (server-only: documentSecurity=false, no client permissions)');
  await sleep(400);
}

async function ensureBoolean(key, def) {
  try {
    await db.createBooleanAttribute(DB_ID, COLL, key, false, def);
    console.log(`✓ created boolean "${key}" (required=false, default=${def})`);
    await sleep(400);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• boolean "${key}" already exists`);
    else throw e;
  }
}

async function ensureString(key, size, required) {
  try {
    // Default intentionally OMITTED for optional strings -> stored as null/absent
    // until explicitly written (safest for a sensitive hash field).
    await db.createStringAttribute(DB_ID, COLL, key, size, required);
    console.log(`✓ created string "${key}" (size=${size}, required=${required}, no default)`);
    await sleep(400);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• string "${key}" already exists`);
    else throw e;
  }
}

async function ensureIndex(key, attributes) {
  try {
    await db.createIndex(DB_ID, COLL, key, IndexType.Key, attributes, ['ASC']);
    console.log(`✓ created index "${key}" on [${attributes.join(',')}]`);
    await sleep(400);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• index "${key}" already exists`);
    else throw e;
  }
}

(async () => {
  console.log(`Ensuring portfolio_settings schema on project=${PROJECT_ID} db=${DB_ID}`);
  await ensureCollectionExists();
  await ensureString('user_id', 36, true);
  await ensureBoolean('password_enabled', false);
  await ensureString('password_hash', 256, false);
  await ensureIndex('idx_ps_user_id', ['user_id']);
  console.log('✅ portfolio_settings schema ready');
})().catch((e) => {
  console.error('portfolio_settings schema setup failed:', e.message || e);
  process.exit(1);
});
