'use strict';

// Idempotent schema setup for the `portfolio_interactions` collection.
// The public "I'm Interested" beacon (api/portfolio-interest.ts) writes:
//   - token             string  (per-browser UUID dedup key)
//   - portfolio_username string (which portfolio the interest is for)
//   - interaction_type  string  ('interested')
//   - referrer_hostname string  (optional)
// and looks the token up via Query.equal('token', ...). In production the
// collection existed with only a `user_id` attribute, so every write failed with
// "Unknown attribute", surfacing as "Could not send interest — please try again."
//
// This adds ONLY the missing attributes plus a key index on `token` for the dedup
// lookup. It never changes collection permissions or existing documents, and
// aborts if the collection is somehow absent (it won't recreate it). Safe to run
// repeatedly.

// node-appwrite exports the index-type enum as `DatabasesIndexType`.
const { Client, Databases, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL = 'portfolio_interactions';

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const db = new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDuplicate = (e) => !!e && (e.code === 409 || /already exists/i.test(e.message || ''));
const isMissing = (e) => !!e && (e.code === 404 || /could not be found/i.test(e.message || ''));

// All optional/nullable — additive and backward-compatible.
const STRING_ATTRS = [
  ['token', 64],
  ['portfolio_username', 64],
  ['interaction_type', 32],
  ['referrer_hostname', 255],
];

async function ensureCollectionExists() {
  try {
    await db.getCollection(DB_ID, COLL);
    console.log('✓ collection "portfolio_interactions" exists (permissions left untouched)');
  } catch (e) {
    if (isMissing(e)) {
      console.error('✗ collection "portfolio_interactions" does not exist — aborting (will not create it).');
      process.exit(1);
    }
    throw e;
  }
}

async function ensureString(key, size) {
  try {
    await db.createStringAttribute(DB_ID, COLL, key, size, false); // optional, no default
    console.log(`✓ created string "${key}" (size=${size}, required=false)`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• string "${key}" already exists`);
    else throw e;
  }
}

async function ensureIndex(key, attributes) {
  try {
    await db.createIndex(DB_ID, COLL, key, IndexType.Key, attributes, ['ASC']);
    console.log(`✓ created index "${key}" on [${attributes.join(',')}]`);
    await sleep(500);
  } catch (e) {
    if (isDuplicate(e)) console.log(`• index "${key}" already exists`);
    else throw e;
  }
}

(async () => {
  console.log(`Ensuring portfolio_interactions schema on project=${PROJECT_ID} db=${DB_ID}`);
  await ensureCollectionExists();
  for (const [key, size] of STRING_ATTRS) await ensureString(key, size);
  await ensureIndex('idx_pi_token', ['token']);
  console.log('✅ portfolio_interactions schema ready');
})().catch((e) => {
  console.error('portfolio_interactions schema setup failed:', e.message || e);
  process.exit(1);
});
