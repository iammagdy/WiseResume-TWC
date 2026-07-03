'use strict';

const sdk = require('node-appwrite');
const { DatabasesIndexType: IndexType } = sdk;

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';
const COLL_ID = 'admin_impersonation_sessions';

if (!API_KEY) {
  console.error('APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new sdk.Databases(client);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const isNotFound = (error) => error?.code === 404 || /could not be found|not found/i.test(String(error?.message || ''));

const attributes = [
  { key: 'nonce', type: 'string', size: 64, required: true },
  { key: 'target_user_id', type: 'string', size: 64, required: true },
  { key: 'target_email', type: 'string', size: 320, required: true },
  { key: 'actor_user_id', type: 'string', size: 64, required: false },
  { key: 'expires_at', type: 'datetime', required: true },
  { key: 'revoked_at', type: 'datetime', required: false },
  { key: 'created_at', type: 'datetime', required: true },
];

const indexes = [
  { key: 'target_user_id_idx', attributes: ['target_user_id'], required: true },
  { key: 'expires_at_idx', attributes: ['expires_at'], required: false },
  { key: 'revoked_at_idx', attributes: ['revoked_at'], required: false },
];

async function ensureCollection() {
  try {
    const existing = await databases.getCollection(DB_ID, COLL_ID);
    if (existing.documentSecurity !== true || (existing.$permissions || []).length > 0) {
      await databases.updateCollection(DB_ID, COLL_ID, existing.name, [], true, existing.enabled);
      console.log('Updated impersonation collection security');
    }
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await databases.createCollection(DB_ID, COLL_ID, 'Admin Impersonation Sessions', [], true);
    console.log('Created server-only impersonation collection');
    await sleep(800);
  }
}

async function ensureAttributes() {
  const existing = await databases.listAttributes(DB_ID, COLL_ID);
  const keys = new Set(existing.attributes.map(attribute => attribute.key));
  for (const attribute of attributes) {
    if (keys.has(attribute.key)) continue;
    if (attribute.type === 'string') {
      await databases.createStringAttribute(DB_ID, COLL_ID, attribute.key, attribute.size, attribute.required);
    } else {
      await databases.createDatetimeAttribute(DB_ID, COLL_ID, attribute.key, attribute.required);
    }
    console.log(`Created required attribute ${attribute.key}`);
    await sleep(500);
  }
}

async function ensureIndexes() {
  const existing = await databases.listIndexes(DB_ID, COLL_ID);
  const keys = new Set(existing.indexes.map(index => index.key));
  for (const index of indexes) {
    if (keys.has(index.key)) continue;
    try {
      await databases.createIndex(DB_ID, COLL_ID, index.key, IndexType.Key, index.attributes);
      console.log(`Created optional index ${index.key}`);
      await sleep(500);
    } catch (error) {
      if (index.required) throw error;
      console.warn(`Optional index ${index.key} could not be created; Act As schema remains usable.`);
    }
  }
}

async function main() {
  await ensureCollection();
  await ensureAttributes();
  await ensureIndexes();
  console.log('Impersonation session schema ready');
}

main().catch(() => {
  console.error('Required impersonation session schema setup failed');
  process.exit(1);
});
