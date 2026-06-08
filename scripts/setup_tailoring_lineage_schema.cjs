'use strict';

/**
 * Sets up the Appwrite schema required for Tailoring Hub lineage:
 *   1. `tailor_history.tailored_resume_id` + index (actively queried)
 *   2. Optional `resumes` lineage fields (read-only heuristics)
 *
 * Both collections already exist (created during the Supabase -> Appwrite
 * migration). This script only adds missing attributes and indexes.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_tailoring_lineage_schema.cjs
 *
 * tailor_history.tailored_resume_id (str 36):
 *   - written fire-and-forget by TailoringHubPage.tsx after a successful tailor
 *   - read by useTailorHistory.ts (useAppwriteTailoredIds) and queried by
 *     TailoringHubResultPage.tsx via Query.equal('tailored_resume_id', [...])
 *   The result/history flow already tolerates this field being missing (it falls
 *   back to navigation state + Zustand), so applying this schema is additive.
 *
 * resumes lineage fields (all optional, read-only):
 *   parent_resume_id (str 36)    — links a tailored resume to its source/master
 *   is_master (bool)             — marks the master CV
 *   target_job_title (str 256)   — tailored target metadata
 *   target_company (str 256)     — tailored target metadata
 *   job_url (str 2048)           — tailored target job URL
 *   job_match_score (int)        — match score for the tailored target
 *   The resume write path (resumeDataToDb in src/hooks/useResumes.ts) does not
 *   write these, so adding them as optional cannot break existing writes.
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const TAILOR_HISTORY_ID = 'tailor_history';
const RESUMES_ID = 'resumes';

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
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
  console.log(`✓ created string attribute ${collId}.${key}`);
}

async function ensureBoolAttr(collId, key, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultValue ?? undefined);
  console.log(`✓ created boolean attribute ${collId}.${key}`);
}

async function ensureIntAttr(collId, key, required, min, max, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} attribute already exists`);
    return;
  }
  await databases.createIntegerAttribute(DB_ID, collId, key, required, min ?? undefined, max ?? undefined, defaultValue ?? undefined);
  console.log(`✓ created integer attribute ${collId}.${key}`);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`✓ ${collId} index "${key}" already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`✓ created ${collId} index "${key}"`);
  } catch (e) {
    // Appwrite 1.9.x rejects index creation when any attribute in the collection
    // exceeds the MariaDB 767-byte index key limit. If the collection has large
    // string fields, skip the index — queries still work via full scan.
    if (e.type === 'index_invalid' || String(e.message).toLowerCase().includes('index length')) {
      console.warn(`⚠ ${collId} index "${key}" skipped — ${e.message} (query still works, no index)`);
      return;
    }
    throw e;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== Tailoring Lineage Schema Setup ===\n');

  // 1. tailor_history.tailored_resume_id + index
  console.log(`1. ${TAILOR_HISTORY_ID}`);
  if (!(await collectionExists(TAILOR_HISTORY_ID))) {
    console.error(`✗ collection "${TAILOR_HISTORY_ID}" does not exist — aborting`);
    process.exit(1);
  }
  await ensureStringAttr(TAILOR_HISTORY_ID, 'tailored_resume_id', 36, false);
  await sleep(500);
  await ensureIndex(TAILOR_HISTORY_ID, 'tailored_resume_id_idx', 'key', ['tailored_resume_id'], ['ASC']);
  await sleep(500);

  // 2. resumes optional lineage fields
  console.log(`\n2. ${RESUMES_ID}`);
  if (!(await collectionExists(RESUMES_ID))) {
    console.error(`✗ collection "${RESUMES_ID}" does not exist — aborting`);
    process.exit(1);
  }
  await ensureStringAttr(RESUMES_ID, 'parent_resume_id', 36, false);
  await sleep(200);
  await ensureBoolAttr(RESUMES_ID, 'is_master', false, false);
  await sleep(200);
  await ensureStringAttr(RESUMES_ID, 'target_job_title', 256, false);
  await sleep(200);
  await ensureStringAttr(RESUMES_ID, 'target_company', 256, false);
  await sleep(200);
  await ensureStringAttr(RESUMES_ID, 'job_url', 2048, false);
  await sleep(200);
  await ensureIntAttr(RESUMES_ID, 'job_match_score', false, 0, 100);
  await sleep(200);

  console.log('\n✓ tailoring lineage schema ready\n');
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 600));
  process.exit(1);
});
