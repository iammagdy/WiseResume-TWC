'use strict';

/**
 * Idempotent schema setup for the `password_reset_otps` collection.
 * Creates the collection with server-only permissions (no client access),
 * provisions the required attributes, and creates indexing for queries.
 *
 * Run with:
 *   APPWRITE_API_KEY=<key> APPWRITE_PROJECT_ID=<id> node scripts/setup_password_reset_otps_schema.cjs
 */

const { Client, Databases, DatabasesIndexType: IndexType } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL_ID = 'password_reset_otps';

if (!PROJECT_ID || !API_KEY) {
  console.error('✗ Missing APPWRITE_PROJECT_ID / APPWRITE_API_KEY in environment.');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDuplicate = (e) => !!e && (e.code === 409 || /already exists/i.test(e.message || ''));
const isNotFound = (e) => !!e && (e.code === 404 || /could not be found/i.test(e.message || ''));

const ATTRIBUTES = [
  { key: 'email', type: 'string', size: 256, required: true },
  { key: 'otp_hash', type: 'string', size: 256, required: true },
  { key: 'purpose', type: 'string', size: 64, required: false, defaultVal: 'password_reset' },
  { key: 'attempts', type: 'integer', required: false, min: 0, max: 99, defaultVal: 0 },
  { key: 'max_attempts', type: 'integer', required: false, min: 1, max: 99, defaultVal: 5 },
  { key: 'expires_at', type: 'datetime', required: true },
  { key: 'used', type: 'boolean', required: false, defaultVal: false },
  { key: 'used_at', type: 'datetime', required: false },
  { key: 'created_at', type: 'datetime', required: true },
  { key: 'revoked_at', type: 'datetime', required: false },
  { key: 'request_ip', type: 'string', size: 64, required: false },
  { key: 'device_metadata', type: 'string', size: 512, required: false },
  { key: 'challenge_token_hash', type: 'string', size: 256, required: false },
  { key: 'challenge_expires_at', type: 'datetime', required: false },
];

const INDEXES = [
  { key: 'idx_pro_email', type: IndexType.Key, attributes: ['email'] },
  { key: 'idx_pro_expires', type: IndexType.Key, attributes: ['expires_at'] },
  { key: 'idx_pro_created', type: IndexType.Key, attributes: ['created_at'] },
  { key: 'idx_pro_purpose', type: IndexType.Key, attributes: ['purpose'] },
  { key: 'idx_pro_challenge', type: IndexType.Key, attributes: ['challenge_token_hash'] },
];

async function ensureCollection() {
  try {
    await db.getCollection(DB_ID, COLL_ID);
    console.log(`✓ Collection "${COLL_ID}" already exists`);
  } catch (e) {
    if (!isNotFound(e)) throw e;
    // [] permissions enforces server-only (API-key/Functions only)
    await db.createCollection(DB_ID, COLL_ID, 'Password Reset OTPs', []);
    console.log(`✓ Created collection "${COLL_ID}" with server-only permissions`);
    await sleep(800);
  }
}

async function listExistingAttributes() {
  try {
    const list = await db.listAttributes(DB_ID, COLL_ID);
    return list.attributes.map(a => a.key);
  } catch {
    return [];
  }
}

async function run() {
  console.log(`\n=== Setting up Appwrite "${COLL_ID}" Collection ===\n`);
  await ensureCollection();

  const existingAttrs = await listExistingAttributes();

  for (const attr of ATTRIBUTES) {
    const { key, type, size, required, min, max, defaultVal } = attr;
    if (existingAttrs.includes(key)) {
      console.log(`• Attribute "${key}" already exists - skipping`);
      continue;
    }

    try {
      if (type === 'string') {
        await db.createStringAttribute(DB_ID, COLL_ID, key, size, required, defaultVal);
      } else if (type === 'integer') {
        await db.createIntegerAttribute(DB_ID, COLL_ID, key, required, min, max, defaultVal);
      } else if (type === 'boolean') {
        await db.createBooleanAttribute(DB_ID, COLL_ID, key, required, defaultVal);
      } else if (type === 'datetime') {
        await db.createDatetimeAttribute(DB_ID, COLL_ID, key, required, defaultVal);
      }
      console.log(`✓ Created attribute "${key}" (${type})`);
      await sleep(500);
    } catch (e) {
      if (isDuplicate(e)) {
        console.log(`• Attribute "${key}" already exists`);
      } else {
        throw e;
      }
    }
  }

  // Get collection to make sure attributes are parsed/active
  await sleep(1000);

  for (const idx of INDEXES) {
    try {
      await db.createIndex(DB_ID, COLL_ID, idx.key, idx.type, idx.attributes);
      console.log(`✓ Created index "${idx.key}" on [${idx.attributes.join(', ')}]`);
      await sleep(500);
    } catch (e) {
      if (isDuplicate(e)) {
        console.log(`• Index "${idx.key}" already exists`);
      } else {
        throw e;
      }
    }
  }

  console.log(`\n=== "${COLL_ID}" Schema Setup Complete ===\n`);
}

run().catch((e) => {
  console.error('✗ Setup failed:', e.message || e);
  if (e.response) console.error(JSON.stringify(e.response, null, 2).slice(0, 800));
  process.exit(1);
});
