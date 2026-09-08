'use strict';

/** Idempotent, server-only Whop provider-state and event-ledger schema. */
const sdk = require('node-appwrite');

const DB_ID = 'main';
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY;
const COLLECTION_SPECS = Object.freeze([
  {
    id: 'whop_subscription_state', name: 'Whop Subscription State',
    attributes: [
      { key: 'user_id', type: 'string', size: 64, required: true },
      { key: 'plan', type: 'string', size: 16, required: true },
      { key: 'membership_id', type: 'string', size: 64, required: true },
      { key: 'plan_id', type: 'string', size: 64, required: true },
      { key: 'product_id', type: 'string', size: 64, required: true },
      { key: 'environment', type: 'string', size: 16, required: true },
      { key: 'status', type: 'string', size: 32, required: true },
      { key: 'expires_at', type: 'string', size: 32, required: false },
      { key: 'will_renew', type: 'boolean', required: true, default: true },
      { key: 'latest_event_id', type: 'string', size: 128, required: true },
      { key: 'latest_event_type', type: 'string', size: 64, required: true },
      { key: 'latest_event_timestamp_ms', type: 'integer', required: true, min: 0, max: 9999999999999 },
      { key: 'checkout_reference', type: 'string', size: 160, required: false },
      { key: 'updated_at', type: 'string', size: 32, required: true },
    ],
    indexes: [
      { key: 'user_id_unique', type: 'unique', attributes: ['user_id'], orders: ['ASC'] },
      { key: 'membership_id_idx', type: 'key', attributes: ['membership_id'], orders: ['ASC'] },
      { key: 'latest_event_idx', type: 'key', attributes: ['latest_event_timestamp_ms'], orders: ['DESC'] },
    ],
  },
  {
    id: 'whop_event_ledger', name: 'Whop Event Ledger',
    attributes: [
      { key: 'event_id', type: 'string', size: 128, required: true },
      { key: 'event_type', type: 'string', size: 64, required: true },
      { key: 'user_id', type: 'string', size: 64, required: false },
      { key: 'membership_id', type: 'string', size: 64, required: false },
      { key: 'event_timestamp_ms', type: 'integer', required: true, min: 0, max: 9999999999999 },
      { key: 'received_at', type: 'string', size: 32, required: true },
      { key: 'processing_status', type: 'string', size: 24, required: true },
      { key: 'ordering_key', type: 'string', size: 160, required: true },
      { key: 'outcome_code', type: 'string', size: 64, required: true },
      { key: 'expires_at', type: 'string', size: 32, required: true },
    ],
    indexes: [
      { key: 'event_id_unique', type: 'unique', attributes: ['event_id'], orders: ['ASC'] },
      { key: 'user_event_idx', type: 'key', attributes: ['user_id', 'event_timestamp_ms'], orders: ['ASC', 'DESC'] },
      { key: 'expires_at_idx', type: 'key', attributes: ['expires_at'], orders: ['ASC'] },
    ],
  },
]);

function valuesEqual(a, b) { return Array.isArray(a) && a.length === b.length && a.every((v, i) => v === b[i]); }
function assertServerOnly(collection, id) {
  if (!Array.isArray(collection?.$permissions) || collection.$permissions.length || collection.documentSecurity !== false) {
    throw new Error(`Incompatible server-only collection: ${id}`);
  }
}
function getDatabases() {
  if (!API_KEY || !PROJECT_ID) throw new Error('APPWRITE_API_KEY and an explicit APPWRITE_PROJECT_ID are required');
  return new sdk.Databases(new sdk.Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
}
async function ensureCollection(databases, spec) {
  let collection;
  try { collection = await databases.getCollection(DB_ID, spec.id); } catch (error) { if (error?.code !== 404) throw error; }
  if (collection) assertServerOnly(collection, spec.id);
  else { await databases.createCollection(DB_ID, spec.id, spec.name, [], false); await new Promise(r => setTimeout(r, 250)); }
  const attrs = (await databases.listAttributes(DB_ID, spec.id)).attributes || [];
  for (const attr of spec.attributes) {
    const existing = attrs.find(item => item.key === attr.key);
    if (existing) {
      if (existing.type !== attr.type || Boolean(existing.array) || existing.required !== attr.required || (attr.size && Number(existing.size) !== attr.size)) throw new Error(`Incompatible attribute: ${spec.id}.${attr.key}`);
      continue;
    }
    if (attr.type === 'string') await databases.createStringAttribute(DB_ID, spec.id, attr.key, attr.size, attr.required);
    else if (attr.type === 'integer') await databases.createIntegerAttribute(DB_ID, spec.id, attr.key, attr.required, attr.min, attr.max);
    else if (attr.type === 'boolean') await databases.createBooleanAttribute(DB_ID, spec.id, attr.key, attr.required, attr.default);
    await new Promise(r => setTimeout(r, 250));
  }
  const indexes = (await databases.listIndexes(DB_ID, spec.id)).indexes || [];
  for (const index of spec.indexes) {
    const existing = indexes.find(item => item.key === index.key);
    if (existing) {
      if (existing.type !== index.type || !valuesEqual(existing.attributes, index.attributes) || !valuesEqual(existing.orders || [], index.orders)) throw new Error(`Incompatible index: ${spec.id}.${index.key}`);
      continue;
    }
    await databases.createIndex(DB_ID, spec.id, index.key, index.type, index.attributes, index.orders);
    await new Promise(r => setTimeout(r, 250));
  }
}
async function run() { const databases = getDatabases(); for (const spec of COLLECTION_SPECS) await ensureCollection(databases, spec); console.log('Whop schemas are ready.'); }
if (require.main === module) run().catch(error => { console.error(error.message); process.exit(1); });
module.exports = { DB_ID, COLLECTION_SPECS, valuesEqual, assertServerOnly, ensureCollection, run };
