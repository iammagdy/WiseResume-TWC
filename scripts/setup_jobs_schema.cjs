'use strict';

/**
 * Provisions Appwrite `jobs` collection attributes required by job import + Tailoring Hub.
 * Live API (2026-06-11) had only `user_id` — writes failed with Unknown attribute: "title".
 *
 * Run once:
 *   APPWRITE_API_KEY=<key> node scripts/setup_jobs_schema.cjs
 */

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnv('.env.deploy');
loadEnv('.env');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const JOBS_ID = 'jobs';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attributeExists(collId, key) {
  const attrs = await databases.listAttributes(DB_ID, collId);
  return attrs.attributes.some((attr) => attr.key === key);
}

async function waitForAttribute(collId, key, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const attrs = await databases.listAttributes(DB_ID, collId);
    const attr = attrs.attributes.find((a) => a.key === key);
    if (attr && attr.status === 'available') return;
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${collId}.${key} to become available`);
}

async function ensureStringAttr(collId, key, size, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
  console.log(`  created string ${collId}.${key}`);
  await waitForAttribute(collId, key);
}

async function ensureBoolAttr(collId, key, required, defaultValue) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} already exists`);
    return;
  }
  await databases.createBooleanAttribute(DB_ID, collId, key, required, defaultValue ?? undefined);
  console.log(`  created boolean ${collId}.${key}`);
  await waitForAttribute(collId, key);
}

async function ensureDatetimeAttr(collId, key, required) {
  if (await attributeExists(collId, key)) {
    console.log(`✓ ${collId}.${key} already exists`);
    return;
  }
  await databases.createDatetimeAttribute(DB_ID, collId, key, required);
  console.log(`  created datetime ${collId}.${key}`);
  await waitForAttribute(collId, key);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  const indexes = await databases.listIndexes(DB_ID, collId);
  if (indexes.indexes.some((idx) => idx.key === key)) {
    console.log(`✓ ${collId} index "${key}" already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`  created index ${collId}.${key}`);
  } catch (e) {
    console.warn(`⚠ ${collId} index "${key}" skipped — ${e.message}`);
  }
}

async function run() {
  console.log('\n=== Jobs Collection Schema Setup ===\n');

  try {
    await databases.getCollection(DB_ID, JOBS_ID);
  } catch (e) {
    console.error(`✗ collection "${JOBS_ID}" does not exist`);
    process.exit(1);
  }

  await ensureStringAttr(JOBS_ID, 'title', 512, false);
  await ensureStringAttr(JOBS_ID, 'company', 256, false);
  await ensureStringAttr(JOBS_ID, 'company_logo', 2048, false);
  await ensureStringAttr(JOBS_ID, 'description', 16384, false);
  await ensureStringAttr(JOBS_ID, 'requirements', 16384, false);
  await ensureStringAttr(JOBS_ID, 'location', 256, false);
  await ensureStringAttr(JOBS_ID, 'salary_range', 128, false);
  await ensureStringAttr(JOBS_ID, 'job_type', 64, false, 'full-time');
  await ensureDatetimeAttr(JOBS_ID, 'posted_date', false);
  await ensureStringAttr(JOBS_ID, 'source_url', 2048, false);
  await ensureBoolAttr(JOBS_ID, 'is_saved', false, true);

  await ensureIndex(JOBS_ID, 'user_id_idx', 'key', ['user_id'], ['ASC']);

  const col = await databases.getCollection(DB_ID, JOBS_ID);
  const existing = Array.isArray(col.$permissions) ? col.$permissions : (col.permissions || []);
  const createForUsers = sdk.Permission.create(sdk.Role.users());
  const hasCreateForUsers = existing.includes(createForUsers);
  const docSecurityOk = col.documentSecurity === true;

  if (!hasCreateForUsers || !docSecurityOk) {
    const permissions = hasCreateForUsers ? existing : [...existing, createForUsers];
    await databases.updateCollection(
      DB_ID,
      JOBS_ID,
      col.name || JOBS_ID,
      permissions,
      true,
      col.enabled !== false,
    );
    console.log('  enabled document security + create-for-users on jobs');
  } else {
    console.log('✓ jobs document security + create permission already set');
  }

  console.log('\n✓ jobs schema ready\n');
}

run().catch((e) => {
  console.error(`✗ Fatal: ${e.message}`);
  process.exit(1);
});
