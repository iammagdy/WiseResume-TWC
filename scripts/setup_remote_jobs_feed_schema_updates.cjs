'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const { runSetup: runOwnerCollectionsSetup } = require('./setup_owner_collections_schema.cjs');

// Load .env.deploy variables
const envPath = path.join(__dirname, '../.env.deploy');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key) process.env[key] = val;
    }
  });
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required in .env.deploy');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function attributeExists(collId, key) {
  try {
    await databases.getAttribute(DB_ID, collId, key);
    return true;
  } catch (e) {
    if (e.code === 404) return false;
    try {
      const attrs = await databases.listAttributes(DB_ID, collId, [sdk.Query.limit(100)]);
      return attrs.attributes.some(attr => attr.key === key);
    } catch {
      return false;
    }
  }
}

async function indexExists(collId, key) {
  try {
    await databases.getIndex(DB_ID, collId, key);
    return true;
  } catch (e) {
    if (e.code === 404) return false;
    try {
      const indexes = await databases.listIndexes(DB_ID, collId, [sdk.Query.limit(100)]);
      return indexes.indexes.some(idx => idx.key === key);
    } catch {
      return false;
    }
  }
}

async function ensureStringAttr(collId, key, size, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`  ✓ attribute "${collId}.${key}" exists`);
    return;
  }
  try {
    await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
    console.log(`  ✓ created string attribute "${collId}.${key}"`);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${collId}.${key}" exists`);
    } else {
      throw e;
    }
  }
}

async function ensureIntegerAttr(collId, key, required, min, max, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`  ✓ attribute "${collId}.${key}" exists`);
    return;
  }
  try {
    await databases.createIntegerAttribute(DB_ID, collId, key, required, min ?? undefined, max ?? undefined, defaultValue ?? undefined);
    console.log(`  ✓ created integer attribute "${collId}.${key}"`);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${collId}.${key}" exists`);
    } else {
      throw e;
    }
  }
}

async function ensureStringArrayAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) {
    console.log(`  ✓ attribute "${collId}.${key}" (array) exists`);
    return;
  }
  try {
    await databases.createStringAttribute(DB_ID, collId, key, size, required, undefined, true);
    console.log(`  ✓ created string array attribute "${collId}.${key}"`);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${collId}.${key}" (array) exists`);
    } else {
      throw e;
    }
  }
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`  ✓ index "${collId}.${key}" exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  ✓ created index "${collId}.${key}"`);
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ index "${collId}.${key}" exists`);
    } else {
      console.warn(`  ⚠ index "${collId}.${key}" skipped — ${e.message}`);
    }
  }
}

async function run() {
  console.log('\n=== Updating Remote Jobs & Tracker Schema ===\n');

  const jobsColl = 'job_feed_items';
  console.log(`1. Updating collection "${jobsColl}"`);
  await ensureStringAttr(jobsColl, 'salary_confidence', 32, false);
  await ensureStringAttr(jobsColl, 'salary_source', 32, false);
  await ensureStringAttr(jobsColl, 'salary_quality', 32, false);
  await ensureStringAttr(jobsColl, 'seniority_level', 32, false);
  await ensureIntegerAttr(jobsColl, 'easy_job_score', false, 0, 100, 0);
  await ensureStringArrayAttr(jobsColl, 'region_fit', 64, false);
  await ensureStringAttr(jobsColl, 'freshness_status', 32, false, 'fresh');
  
  await ensureIndex(jobsColl, 'seniority_level_idx', 'key', ['seniority_level'], ['ASC']);
  await ensureIndex(jobsColl, 'easy_job_score_idx', 'key', ['easy_job_score'], ['ASC']);

  const trackerColl = 'job_applications';
  console.log(`\n2. Updating collection "${trackerColl}"`);
  await ensureStringAttr(trackerColl, 'cover_letter_id', 128, false);
  await ensureStringAttr(trackerColl, 'job_feed_item_id', 128, false);
  await ensureStringAttr(trackerColl, 'source_job_id', 128, false);
  
  // generated_resume_id and generated_cover_letter_id aliases (if missing)
  await ensureStringAttr(trackerColl, 'generated_resume_id', 128, false);
  await ensureStringAttr(trackerColl, 'generated_cover_letter_id', 128, false);
  await runOwnerCollectionsSetup({ databases, projectId: PROJECT_ID, collections: [trackerColl] });

  // In user_job_actions (remote jobs specific tracker)
  const actionsColl = 'user_job_actions';
  console.log(`\n3. Updating collection "${actionsColl}"`);
  await ensureStringAttr(actionsColl, 'generated_cover_letter_id', 128, false);

  console.log('\n✓ Schema updates complete!\n');
}

run().catch(e => {
  console.error(`✗ Schema update failed: ${e.message}`);
  process.exit(1);
});
