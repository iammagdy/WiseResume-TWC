'use strict';

/**
 * Sets up the `ai_routing_config` collection required by the DevKit AI Gateway panel
 * and the admin-devkit-data Appwrite Function (handleAiRoutingConfig).
 *
 * Fields:
 *   feature_id  (str 128, required) — slug identifying the AI feature
 *   provider    (str 64,  required) — AI provider name (e.g. "openai", "anthropic")
 *   model       (str 128, required) — model identifier
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_ai_routing_config_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY    = process.env.APPWRITE_API_KEY;
const DB_ID      = 'main';
const COLL_ID    = 'ai_routing_config';

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
  console.log(`Setting up ai_routing_config schema — project=${PROJECT_ID} db=${DB_ID}`);

  if (!(await collectionExists(COLL_ID))) {
    await databases.createCollection(DB_ID, COLL_ID, 'AI Routing Config', []);
    console.log('  ✓ created ai_routing_config collection');
    await sleep(800);
  } else {
    console.log('  ✓ ai_routing_config collection already exists');
  }

  await ensureStringAttr(COLL_ID, 'feature_id', 128, true);
  await ensureStringAttr(COLL_ID, 'provider', 64, true);
  await ensureStringAttr(COLL_ID, 'model', 128, true);

  if (!(await indexExists(COLL_ID, 'feature_id_unique'))) {
    await databases.createIndex(DB_ID, COLL_ID, 'feature_id_unique', 'unique', ['feature_id']);
    console.log('  ✓ created unique index on feature_id');
  } else {
    console.log('  ✓ index feature_id_unique already exists');
  }

  console.log('\n✅ ai_routing_config schema ready');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
