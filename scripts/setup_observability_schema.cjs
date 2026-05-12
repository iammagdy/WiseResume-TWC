'use strict';

/**
 * Sets up the Appwrite schema required for the Observability panel:
 *  1. Creates `edge_function_logs` collection with required attributes.
 *  2. Adds `resolved` (boolean) and `reviewed_at` (datetime) to `error_log`.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_observability_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

if (!API_KEY) {
  console.error('❌  APPWRITE_API_KEY is required');
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
    return attrs.attributes.some(a => a.key === key);
  } catch {
    return false;
  }
}

async function ensureStringAttr(collId, key, size, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`    ↳ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
  console.log(`    ↳ created string attribute "${key}"`);
}

async function ensureIntAttr(collId, key, required, min, max, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`    ↳ attribute "${key}" already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, min ?? undefined, max ?? undefined, defaultValue ?? undefined);
  console.log(`    ↳ created integer attribute "${key}"`);
}

async function ensureBoolAttr(collId, key, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`    ↳ attribute "${key}" already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultValue ?? undefined);
  console.log(`    ↳ created boolean attribute "${key}"`);
}

async function ensureDatetimeAttr(collId, key, required) {
  if (await attributeExists(collId, key)) {
    console.log(`    ↳ attribute "${key}" already exists`);
    return;
  }
  await databases.createDatetimeAttribute(DB_ID, collId, key, required);
  console.log(`    ↳ created datetime attribute "${key}"`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('\n=== Observability Schema Setup ===\n');

  // ── 1. edge_function_logs ──────────────────────────────────────────────────
  console.log('1. edge_function_logs');
  if (await collectionExists('edge_function_logs')) {
    console.log('   collection already exists — skipping creation');
  } else {
    // No public permissions: this collection is accessed only via server API key.
    await databases.createCollection(DB_ID, 'edge_function_logs', 'edge_function_logs', []);
    console.log('   ✅ collection created (no public permissions — server-only)');
    await sleep(500);
  }

  await ensureStringAttr('edge_function_logs', 'function_name', 128, true);
  await sleep(200);
  await ensureStringAttr('edge_function_logs', 'invocation_id', 128, false);
  await sleep(200);
  await ensureIntAttr('edge_function_logs', 'duration_ms', false, 0, 3600000);
  await sleep(200);
  await ensureIntAttr('edge_function_logs', 'status_code', false, 0, 9999);
  await sleep(200);
  await ensureStringAttr('edge_function_logs', 'level', 32, false, 'info');
  await sleep(200);
  await ensureStringAttr('edge_function_logs', 'message', 4096, false);
  await sleep(200);

  console.log('   ✅ edge_function_logs attributes done\n');

  // ── 2. error_log — add resolved + reviewed_at ──────────────────────────────
  console.log('2. error_log — adding resolved + reviewed_at');
  if (!(await collectionExists('error_log'))) {
    console.log('   ⚠️  error_log collection does not exist — skipping (create it first)');
  } else {
    await ensureBoolAttr('error_log', 'resolved', false, false);
    await sleep(200);
    await ensureDatetimeAttr('error_log', 'reviewed_at', false);
    await sleep(200);
    console.log('   ✅ error_log attributes done\n');
  }

  console.log('=== Done ===\n');
}

run().catch(e => {
  console.error('Fatal:', e.message);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
