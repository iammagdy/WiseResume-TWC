'use strict';

/**
 * Sets up the Appwrite schema + permissions required for Cover Letters.
 *
 * The `cover_letters` collection exists but is missing the correct attributes
 * and permissions, causing client-side saves to fail with 401 or 400.
 *
 * Run once with:
 *   APPWRITE_API_KEY=<key> node scripts/setup_cover_letters_schema.cjs
 *
 * Permissions (Security-Safe):
 * - Enables document-level security (`documentSecurity: true`) so that each
 *   cover letter document is readable/writable/deletable ONLY by its owner.
 * - Grants ONLY collection-level `create` permission to the `users` role
 *   (authenticated users), allowing them to create new cover letters.
 * - Does NOT grant collection-level read/update/delete permissions to `users`
 *   to ensure user-to-user privacy is preserved.
 *
 * Schema Attributes (Migration-Safe):
 * - user_id (string, size 36)
 * - title (string, size 256)
 * - job_title (string, size 256)
 * - company (string, size 256)
 * - content (string, size 32768)
 * - tone (string, size 32)
 * - template_style (string, size 32)
 * - resume_id (string, size 36)
 */

const fs = require('fs');
const path = require('path');

// Load .env.deploy if it exists
const envPath = path.join(__dirname, '..', '.env.deploy');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'cover_letters';

if (!API_KEY) {
  console.error('✗ APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new sdk.Databases(client);

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
    console.log(`✓ attribute "${key}" already exists`);
    return;
  }
  await databases.createStringAttribute(DB_ID, collId, key, size, required, defaultValue ?? undefined);
  console.log(`✓ created string attribute "${key}"`);
}

async function ensureIndex(collId, key, type, attributes, orders) {
  if (await indexExists(collId, key)) {
    console.log(`✓ index "${key}" already exists`);
    return;
  }
  try {
    await databases.createIndex(DB_ID, collId, key, type, attributes, orders);
    console.log(`✓ created index "${key}"`);
  } catch (e) {
    if (e.type === 'index_invalid' || String(e.message).toLowerCase().includes('index length')) {
      console.warn(`⚠ index "${key}" skipped — ${e.message}`);
      return;
    }
    throw e;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n=== Cover Letters Schema Setup (Security-Safe) ===\n');

  try {
    const coll = await databases.getCollection(DB_ID, COLLECTION_ID);
    console.log(`✓ Collection "${COLLECTION_ID}" found.`);

    // 1. Ensure Schema Attributes
    await ensureStringAttr(COLLECTION_ID, 'user_id', 36, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'title', 256, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'job_title', 256, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'company', 256, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'content', 32768, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'tone', 32, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'template_style', 32, false);
    await sleep(200);
    await ensureStringAttr(COLLECTION_ID, 'resume_id', 36, false);
    await sleep(500);

    // 2. Ensure Index on user_id for list queries
    await ensureIndex(COLLECTION_ID, 'user_id_idx', 'key', ['user_id'], ['ASC']);
    await sleep(500);

    // 3. Ensure Permissions
    const createForUsers = sdk.Permission.create(sdk.Role.users());
    const existing = Array.isArray(coll.$permissions) ? coll.$permissions : [];

    const hasCreateForUsers = existing.includes(createForUsers);
    const docSecurityOk = coll.documentSecurity === true;

    // Filter out any unsafe collection-level read, update, or delete permissions for Role.users()
    const cleanedPermissions = existing.filter(p => {
      const isUserReadUpdateDelete =
        p.includes('read("users")') ||
        p.includes('update("users")') ||
        p.includes('delete("users")');
      return !isUserReadUpdateDelete;
    });

    const permissions = hasCreateForUsers ? cleanedPermissions : [...cleanedPermissions, createForUsers];

    console.log('Updating collection permissions and document security...');
    await databases.updateCollection(
      DB_ID,
      COLLECTION_ID,
      coll.name || COLLECTION_ID,
      permissions,
      true, // documentSecurity: each document carries its own owner read/update/delete
      coll.enabled !== false,
    );
    console.log('✓ Ensured user create-only permissions and document-level security on cover_letters collection.');
  } catch (e) {
    console.error(`✗ Error getting/updating cover_letters collection: ${e.message}`);
    process.exit(1);
  }
}

run().catch(e => {
  console.error(`✗ Fatal: ${e.message}`);
  process.exit(1);
});
