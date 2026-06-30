'use strict';

const sdk = require('node-appwrite');
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const apiKey = process.env.APPWRITE_API_KEY;
if (!apiKey) throw new Error('APPWRITE_API_KEY is required');
const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new sdk.Databases(client);
const DB_ID = 'main';

async function ensureCollection(id, name) {
  try { return await databases.getCollection(DB_ID, id); }
  catch (error) { if (error.code !== 404) throw error; return databases.createCollection(DB_ID, id, name); }
}
async function attrs(id) { return (await databases.listAttributes(DB_ID, id)).attributes; }
async function ensureString(id, key, size) { if (!(await attrs(id)).some(a => a.key === key)) await databases.createStringAttribute(DB_ID, id, key, size, false); }
async function ensureInteger(id, key) { if (!(await attrs(id)).some(a => a.key === key)) await databases.createIntegerAttribute(DB_ID, id, key, false); }
async function ensureIndex(id, key, fields) {
  const indexes = (await databases.listIndexes(DB_ID, id)).indexes;
  if (!indexes.some(index => index.key === key)) await databases.createIndex(DB_ID, id, key, 'key', fields);
}

async function run() {
  await ensureCollection('visitor_identity_links', 'Visitor identity links');
  for (const [key, size] of [['anon_id_hash', 64], ['user_id', 64], ['linked_at', 32], ['consent_state', 16], ['identity_version', 16]]) await ensureString('visitor_identity_links', key, size);
  await ensureIndex('visitor_identity_links', 'idx_identity_user', ['user_id']);
  await ensureIndex('visitor_identity_links', 'idx_identity_hash', ['anon_id_hash']);

  await ensureCollection('visitor_daily_aggregates', 'Visitor daily aggregates');
  await ensureString('visitor_daily_aggregates', 'date', 10);
  await ensureString('visitor_daily_aggregates', 'timezone', 64);
  for (const key of ['sessions', 'page_views', 'unique_visitors', 'authenticated_active_users', 'signups']) await ensureInteger('visitor_daily_aggregates', key);
  await ensureString('visitor_daily_aggregates', 'generated_at', 32);
  await ensureIndex('visitor_daily_aggregates', 'idx_daily_date', ['date']);
  console.log('✓ admin analytics collections are ready');
}
run().catch(error => { console.error(error); process.exit(1); });
