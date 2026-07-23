'use strict';

/**
 * Idempotently restores the server-only Appwrite schema for authenticated
 * in-app broadcasts. This script never changes collection permissions and
 * never modifies or deletes documents.
 *
 * Usage:
 *   node scripts/setup_broadcasts_schema.cjs --dry-run
 *   node scripts/setup_broadcasts_schema.cjs
 */

const sdk = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';
const COLLECTION_ID = 'broadcasts';
const DRY_RUN = process.argv.includes('--dry-run');

const ATTRIBUTES = [
  { key: 'title', type: 'string', size: 256, required: true },
  { key: 'body', type: 'string', size: 4096, required: true },
  {
    key: 'severity',
    type: 'enum',
    elements: ['info', 'warning', 'critical'],
    required: false,
    default: 'info',
  },
  { key: 'active', type: 'boolean', required: false, default: false },
  { key: 'created_by', type: 'string', size: 36, required: true },
  { key: 'created_at', type: 'datetime', required: true },
  { key: 'expires_at', type: 'datetime', required: false },
];

function schemaPlan(existingAttributes) {
  const existing = new Set(existingAttributes.map((attribute) => attribute.key));
  return ATTRIBUTES.filter((attribute) => !existing.has(attribute.key));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAttribute(databases, key) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await databases.listAttributes(DB_ID, COLLECTION_ID);
    const attribute = response.attributes.find((candidate) => candidate.key === key);
    if (attribute?.status === 'available') return;
    if (attribute?.status === 'failed') {
      throw new Error(`Attribute "${key}" entered failed status`);
    }
    await sleep(1_000);
  }
  throw new Error(`Timed out waiting for attribute "${key}"`);
}

async function createAttribute(databases, attribute) {
  if (attribute.type === 'string') {
    await databases.createStringAttribute(
      DB_ID,
      COLLECTION_ID,
      attribute.key,
      attribute.size,
      attribute.required,
    );
  } else if (attribute.type === 'enum') {
    await databases.createEnumAttribute(
      DB_ID,
      COLLECTION_ID,
      attribute.key,
      attribute.elements,
      attribute.required,
      attribute.default,
    );
  } else if (attribute.type === 'boolean') {
    await databases.createBooleanAttribute(
      DB_ID,
      COLLECTION_ID,
      attribute.key,
      attribute.required,
      attribute.default,
    );
  } else if (attribute.type === 'datetime') {
    await databases.createDatetimeAttribute(
      DB_ID,
      COLLECTION_ID,
      attribute.key,
      attribute.required,
    );
  } else {
    throw new Error(`Unsupported attribute type: ${attribute.type}`);
  }

  await waitForAttribute(databases, attribute.key);
}

async function main() {
  if (!API_KEY) throw new Error('APPWRITE_API_KEY is required');

  const client = new sdk.Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
  const databases = new sdk.Databases(client);

  const collection = await databases.getCollection(DB_ID, COLLECTION_ID);
  const collectionPermissions = Array.isArray(collection.$permissions)
    ? collection.$permissions
    : [];
  if (collectionPermissions.length > 0) {
    throw new Error('OWNER_ACTION_REQUIRED: broadcasts collection permissions are not server-only');
  }

  const [attributesResponse, documentsResponse] = await Promise.all([
    databases.listAttributes(DB_ID, COLLECTION_ID),
    databases.listDocuments(DB_ID, COLLECTION_ID, [sdk.Query.limit(1)]),
  ]);
  const plan = schemaPlan(attributesResponse.attributes);

  console.log(`Broadcast schema ${DRY_RUN ? 'dry run' : 'apply'}`);
  console.log(`collection=${COLLECTION_ID} documentSecurity=${collection.documentSecurity}`);
  console.log(`collectionPermissions=${collectionPermissions.length}`);
  console.log(`documents=${documentsResponse.total}`);
  console.log(`attributesExisting=${attributesResponse.attributes.length}`);
  console.log(`attributesPlanned=${plan.length}`);

  if (DRY_RUN) {
    for (const attribute of plan) console.log(`wouldCreate=${attribute.key}:${attribute.type}`);
    console.log('documentsScanned=0 documentsUpdated=0 documentsSkipped=0 documentsFailed=0');
    return;
  }

  if (documentsResponse.total > 0 && plan.some((attribute) => attribute.required)) {
    throw new Error(
      'OWNER_ACTION_REQUIRED: required Broadcast attributes cannot be added safely to a non-empty collection',
    );
  }

  for (const attribute of plan) {
    await createAttribute(databases, attribute);
    console.log(`created=${attribute.key}:${attribute.type}`);
  }

  console.log(`attributesCreated=${plan.length}`);
  console.log('documentsScanned=0 documentsUpdated=0 documentsSkipped=0 documentsFailed=0');
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = { ATTRIBUTES, schemaPlan };
