'use strict';

/**
 * Setup script for Remote Jobs Feed MVP Appwrite Collections:
 * - `job_feed_items`
 * - `user_job_actions`
 * - `job_feed_sync_runs`
 *
 * Usage:
 *   APPWRITE_API_KEY=<key> node scripts/setup_remote_jobs_feed_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

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
    console.log(`  ✓ attribute "${key}" exists`);
    return;
  }
  try {
    await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
    console.log(`  ✓ created string attribute "${key}"`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${key}" exists`);
    } else {
      throw e;
    }
  }
}

async function ensureIntegerAttr(collId, key, required, min, max, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`  ✓ attribute "${key}" exists`);
    return;
  }
  try {
    await databases.createIntegerAttribute(DB_ID, collId, key, required, min ?? undefined, max ?? undefined, defaultValue ?? undefined);
    console.log(`  ✓ created integer attribute "${key}"`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${key}" exists`);
    } else {
      throw e;
    }
  }
}

async function ensureStringArrayAttr(collId, key, size, required) {
  if (await attributeExists(collId, key)) {
    console.log(`  ✓ attribute "${key}" (array) exists`);
    return;
  }
  try {
    await databases.createStringAttribute(DB_ID, collId, key, size, required, undefined, true);
    console.log(`  ✓ created string array attribute "${key}"`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ attribute "${key}" (array) exists`);
    } else {
      throw e;
    }
  }
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`  ✓ index "${key}" exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  ✓ created index "${key}"`);
  } catch (e) {
    if (e.message?.includes('already exists')) {
      console.log(`  ✓ index "${key}" exists`);
    } else {
      console.warn(`  ⚠ index "${key}" skipped — ${e.message}`);
    }
  }
}

async function ensurePermissions(collId, name, permissions, docSecurity = false) {
  try {
    const coll = await databases.getCollection(DB_ID, collId);
    await databases.updateCollection(
      DB_ID,
      collId,
      coll.name || name,
      permissions,
      docSecurity,
      coll.enabled !== false
    );
    console.log(`✓ updated permissions for ${collId}`);
  } catch (e) {
    console.warn(`⚠ failed to update permissions for ${collId}: ${e.message}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function setupJobFeedItems() {
  const collId = 'job_feed_items';
  console.log(`\n1. Setting up collection "${collId}"`);

  const allPerms = [
    sdk.Permission.read(sdk.Role.any()),
    sdk.Permission.create(sdk.Role.any()),
    sdk.Permission.update(sdk.Role.any()),
    sdk.Permission.delete(sdk.Role.any()),
  ];

  if (!(await collectionExists(collId))) {
    await databases.createCollection(DB_ID, collId, 'Remote Job Feed Items', allPerms, false);
    console.log('✓ collection created');
    await sleep(500);
  } else {
    console.log('✓ collection exists');
    await ensurePermissions(collId, 'Remote Job Feed Items', allPerms, false);
  }

  await ensureStringAttr(collId, 'source', 32, false);
  await ensureStringAttr(collId, 'source_job_id', 128, false);
  await ensureStringAttr(collId, 'title', 256, false);
  await ensureStringAttr(collId, 'company', 128, false);
  await ensureStringAttr(collId, 'company_logo', 1024, false);
  await ensureStringAttr(collId, 'location', 128, false);
  await ensureStringAttr(collId, 'remote_region', 128, false);
  await ensureStringAttr(collId, 'category', 128, false);
  await ensureStringAttr(collId, 'role_group', 64, false, 'other');
  await ensureStringAttr(collId, 'job_type', 64, false);
  await ensureIntegerAttr(collId, 'salary_min', false);
  await ensureIntegerAttr(collId, 'salary_max', false);
  await ensureIntegerAttr(collId, 'salary_amount_min', false);
  await ensureIntegerAttr(collId, 'salary_amount_max', false);
  await ensureStringAttr(collId, 'salary_currency', 16, false);
  await ensureStringAttr(collId, 'salary_period', 32, false, 'unknown');
  await ensureStringAttr(collId, 'salary_display', 128, false, 'Salary not listed');
  await ensureStringAttr(collId, 'published_at', 64, false);
  await ensureStringAttr(collId, 'description_excerpt', 2048, false);
  await ensureStringAttr(collId, 'description_html', 16384, false);
  await ensureStringAttr(collId, 'canonical_url', 2048, false);
  await ensureStringAttr(collId, 'apply_url', 2048, false);
  await ensureStringArrayAttr(collId, 'tags', 64, false);
  await ensureStringAttr(collId, 'dedupe_key', 256, false);
  await ensureStringAttr(collId, 'content_hash', 128, false);
  await ensureStringAttr(collId, 'fetched_at', 64, false);
  await ensureStringAttr(collId, 'status', 32, false, 'active');

  await sleep(1000);
  await ensureIndex(collId, 'dedupe_key_idx', 'unique', ['dedupe_key'], ['ASC']);
  await ensureIndex(collId, 'source_idx', 'key', ['source'], ['ASC']);
  await ensureIndex(collId, 'status_idx', 'key', ['status'], ['ASC']);
  await ensureIndex(collId, 'role_group_idx', 'key', ['role_group'], ['ASC']);
}

async function setupUserJobActions() {
  const collId = 'user_job_actions';
  console.log(`\n2. Setting up collection "${collId}"`);

  const userPerms = [
    sdk.Permission.create(sdk.Role.users()),
    sdk.Permission.read(sdk.Role.users()),
    sdk.Permission.update(sdk.Role.users()),
    sdk.Permission.delete(sdk.Role.users()),
    sdk.Permission.read(sdk.Role.any()),
    sdk.Permission.create(sdk.Role.any()),
    sdk.Permission.update(sdk.Role.any()),
    sdk.Permission.delete(sdk.Role.any()),
  ];

  if (!(await collectionExists(collId))) {
    await databases.createCollection(DB_ID, collId, 'User Job Actions', userPerms, true);
    console.log('✓ collection created (document security enabled)');
    await sleep(500);
  } else {
    console.log('✓ collection exists');
    await ensurePermissions(collId, 'User Job Actions', userPerms, true);
  }

  await ensureStringAttr(collId, 'user_id', 128, false);
  await ensureStringAttr(collId, 'job_feed_item_id', 128, false);
  await ensureStringAttr(collId, 'canonical_url', 2048, false);
  await ensureStringAttr(collId, 'status', 32, false);
  await ensureStringAttr(collId, 'applied_at', 64, false);
  await ensureStringAttr(collId, 'saved_at', 64, false);
  await ensureStringAttr(collId, 'dismissed_at', 64, false);
  await ensureStringAttr(collId, 'notes', 2048, false);
  await ensureStringAttr(collId, 'source_resume_id', 128, false);
  await ensureStringAttr(collId, 'tailored_resume_id', 128, false);
  await ensureStringAttr(collId, 'action_key', 256, false);

  await sleep(1000);
  await ensureIndex(collId, 'user_id_idx', 'key', ['user_id'], ['ASC']);
  await ensureIndex(collId, 'action_key_idx', 'unique', ['action_key'], ['ASC']);
}

async function setupJobFeedSyncRuns() {
  const collId = 'job_feed_sync_runs';
  console.log(`\n3. Setting up collection "${collId}"`);

  const allPerms = [
    sdk.Permission.read(sdk.Role.any()),
    sdk.Permission.create(sdk.Role.any()),
    sdk.Permission.update(sdk.Role.any()),
    sdk.Permission.delete(sdk.Role.any()),
  ];

  if (!(await collectionExists(collId))) {
    await databases.createCollection(DB_ID, collId, 'Job Feed Sync Runs', allPerms, false);
    console.log('✓ collection created');
    await sleep(500);
  } else {
    console.log('✓ collection exists');
    await ensurePermissions(collId, 'Job Feed Sync Runs', allPerms, false);
  }

  await ensureStringAttr(collId, 'source', 32, false);
  await ensureStringAttr(collId, 'started_at', 64, false);
  await ensureStringAttr(collId, 'finished_at', 64, false);
  await ensureIntegerAttr(collId, 'fetched_count', false);
  await ensureIntegerAttr(collId, 'inserted_count', false);
  await ensureIntegerAttr(collId, 'updated_count', false);
  await ensureIntegerAttr(collId, 'skipped_count', false);
  await ensureIntegerAttr(collId, 'error_count', false);
  await ensureStringAttr(collId, 'status', 32, false);
  await ensureStringAttr(collId, 'error_message', 2048, false);
}

async function run() {
  console.log('\n=== Remote Jobs Feed Schema Setup ===\n');
  await setupJobFeedItems();
  await setupUserJobActions();
  await setupJobFeedSyncRuns();
  console.log('\n✓ All Remote Jobs Feed collections configured successfully!\n');
}

run().catch(e => {
  console.error(`✗ Setup failed: ${e.message}`);
  process.exit(1);
});
