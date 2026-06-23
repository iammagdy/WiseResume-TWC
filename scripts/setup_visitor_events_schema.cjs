'use strict';

/**
 * B10 — Adds the optional `referrer` and `os` string attributes to the
 * `visitor_events` collection so the server-side `track-visitor-event` function
 * can persist them (the DevKit "Top referrers" / OS breakdowns depend on them).
 *
 * Both attributes are optional and additive — adding them cannot break existing
 * writes, and the function strips them and retries if they are still missing.
 *
 * Run once with:
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

async function ensureStringAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required);
  console.log(`✓ created string attribute ${collId}.${key}`);
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
  await ensureStringAttr(VISITOR_EVENTS_ID, 'referrer', 512, false);
  await sleep(300);
  await ensureStringAttr(VISITOR_EVENTS_ID, 'os', 32, false);
  console.log('\n✓ visitor_events schema ready\n');
}

run().catch((e) => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
