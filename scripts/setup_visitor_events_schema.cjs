'use strict';

/**
 * visitor_events Schema Setup — Idempotent
 *
 * Ensures ALL required attributes exist on the `visitor_events` collection.
 * Additive only: no deletes, no required fields, no destructive migrations.
 * If an attribute already exists with a different size/type, it is NOT modified —
 * the discrepancy is reported.
 *
 * Run with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_visitor_events_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const VISITOR_EVENTS_ID = 'visitor_events';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
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
    return attrs.attributes.some((attr) => attr.key === key);
  } catch {
    return false;
  }
}

async function getAttribute(collId, key) {
  try {
    const attrs = await databases.listAttributes(DB_ID, collId);
    return attrs.attributes.find((attr) => attr.key === key) || null;
  } catch {
    return null;
  }
}

async function indexExists(collId, key) {
  try {
    const indexes = await databases.listIndexes(DB_ID, collId);
    return indexes.indexes.some((idx) => idx.key === key);
  } catch {
    return false;
  }
}

async function ensureStringAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) {
    const existing = await getAttribute(collId, key);
    if (existing && existing.size != null && existing.size !== size) {
      console.log(`⚠ ${collId}.${key} exists with size=${existing.size} (expected ${size}) — NOT modifying destructively`);
    } else {
      console.log(`✓ ${collId}.${key} attribute already exists`);
    }
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required);
  console.log(`✓ created string attribute ${collId}.${key} (size=${size})`);
}

async function ensureIntegerAttr(collId, key, required) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required);
  console.log(`✓ created integer attribute ${collId}.${key}`);
}

async function ensureBooleanAttr(collId, key, required) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required);
  console.log(`✓ created boolean attribute ${collId}.${key}`);
}

async function ensureIndex(collId, key, attribute) {
  if (await indexExists(collId, key)) {
    console.log(`✓ ${collId}.${key} index already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, 'key', [attribute]);
    console.log(`✓ created index ${collId}.${key} on ${attribute}`);
  } catch (e) {
    console.log(`⚠ could not create index ${collId}.${key}: ${e.message}`);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== visitor_events Schema Setup ===\n');
  if (!(await collectionExists(VISITOR_EVENTS_ID))) {
    console.error(`✗ collection "${VISITOR_EVENTS_ID}" does not exist — aborting`);
    process.exit(1);
  }

  // Existing attributes — verify only
  await ensureStringAttr(VISITOR_EVENTS_ID, 'user_id', 65000, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'session_id', 255, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'anon_id', 255, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'event_type', 50, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'page', 1024, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'target', 255, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'section', 255, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'country', 110, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'device_type', 50, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'browser', 100, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'metadata', 4000, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'referrer', 512, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'os', 32, false);
  await sleep(200);

  // New additive attributes
  await ensureIntegerAttr(VISITOR_EVENTS_ID, 'duration_ms', false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'label', 512, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'utm_source', 128, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'utm_medium', 64, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'utm_campaign', 128, false);
  await sleep(200);
  await ensureBooleanAttr(VISITOR_EVENTS_ID, 'is_returning', false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'consent_state', 16, false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'occurred_at', 32, false);
  await sleep(200);
  await ensureBooleanAttr(VISITOR_EVENTS_ID, 'is_internal', false);
  await sleep(200);
  await ensureBooleanAttr(VISITOR_EVENTS_ID, 'is_bot', false);
  await sleep(200);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'identity_version', 16, false);
  await sleep(200);

  // Safe indexes on normal attributes only (NOT on $createdAt — system field)
  await ensureIndex(VISITOR_EVENTS_ID, 'idx_visitor_events_page', 'page');
  await sleep(200);
  await ensureIndex(VISITOR_EVENTS_ID, 'idx_visitor_events_session', 'session_id');
  await sleep(200);
  await ensureIndex(VISITOR_EVENTS_ID, 'idx_visitor_events_anon', 'anon_id');
  await sleep(200);
  await ensureIndex(VISITOR_EVENTS_ID, 'idx_visitor_events_user', 'user_id');

  // Note: $createdAt index is NOT supported by Appwrite (system field).
  // Time-range queries use sdk.Query.greaterThanEqual('$createdAt', ...) which
  // relies on the default system ordering. Mention this in the report.
  console.log('\nℹ Note: $createdAt custom index is not supported by Appwrite (system field). Skipped.');

  console.log('\n✓ visitor_events schema ready\n');
}

run().catch((e) => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
