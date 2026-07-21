'use strict';

const sdk = require('node-appwrite');
const fs = require('fs');
const path = require('path');
const {
  COLLECTION_SCHEMAS,
  ownerDocumentPermissions,
  hasExactOwnerPermissions,
  isValidOwnerId,
  parseCollectionsArg,
} = require('./setup_owner_collections_schema.cjs');

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'main';
const PAGE_LIMIT = 100;

function loadEnvFile(fileName) {
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

function createDatabases() {
  loadEnvFile('.env.deploy');
  loadEnvFile('.env.local');
  loadEnvFile('.env');

  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
  const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_VERIFY_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY is required');

  const client = new sdk.Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  return { databases: new sdk.Databases(client), projectId };
}

function parseArgs(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const dryRun = argv.includes('--dry-run') || !apply;
  if (apply && argv.includes('--dry-run')) {
    throw new Error('Use either --apply or --dry-run, not both');
  }
  const collections = parseCollectionsArg(argv);
  return { dryRun, collections };
}

function runnerOwnerIds(env = process.env) {
  return new Set([
    env.APPWRITE_RUNNER_USER_ID,
    env.APPWRITE_ADMIN_USER_ID,
    env.ADMIN_USER_ID,
    env.CURRENT_ADMIN_USER_ID,
    env.APPWRITE_USER_ID,
  ].filter(Boolean));
}

function safeOwnerId(doc, runnerIds) {
  const ownerId = doc?.user_id;
  if (!isValidOwnerId(ownerId)) return null;
  if (runnerIds.has(ownerId)) return null;
  return ownerId;
}

async function listPage(databases, collectionId, cursorAfter) {
  const queries = [sdk.Query.limit(PAGE_LIMIT), sdk.Query.orderAsc('$id')];
  if (cursorAfter) queries.push(sdk.Query.cursorAfter(cursorAfter));
  return databases.listDocuments(DB_ID, collectionId, queries);
}

async function migrateCollection(databases, collectionId, options) {
  if (!COLLECTION_SCHEMAS[collectionId]) {
    throw new Error(`Unknown owner collection id: ${collectionId}`);
  }

  const counts = {
    scanned: 0,
    updated: 0,
    alreadyCorrect: 0,
    skippedInvalidOwner: 0,
    failed: 0,
  };
  const runnerIds = runnerOwnerIds();
  let cursorAfter = null;

  while (true) {
    const page = await listPage(databases, collectionId, cursorAfter);
    const docs = page.documents || [];
    for (const doc of docs) {
      counts.scanned += 1;
      const ownerId = safeOwnerId(doc, runnerIds);
      if (!ownerId) {
        counts.skippedInvalidOwner += 1;
        continue;
      }

      const currentPermissions = doc.$permissions || doc.permissions || [];
      const desiredPermissions = ownerDocumentPermissions(ownerId);
      if (hasExactOwnerPermissions(currentPermissions, ownerId)) {
        counts.alreadyCorrect += 1;
        continue;
      }

      if (options.dryRun) {
        counts.updated += 1;
        continue;
      }

      try {
        await databases.updateDocument(DB_ID, collectionId, doc.$id, {}, desiredPermissions);
        counts.updated += 1;
      } catch {
        counts.failed += 1;
      }
    }

    if (docs.length < PAGE_LIMIT) break;
    cursorAfter = docs[docs.length - 1].$id;
  }

  return counts;
}

function printCounts(collectionId, counts, dryRun) {
  const mode = dryRun ? 'dry_run' : 'apply';
  console.log(
    `${collectionId} mode=${mode} scanned=${counts.scanned} updated=${counts.updated} ` +
    `already_correct=${counts.alreadyCorrect} skipped_invalid_owner=${counts.skippedInvalidOwner} failed=${counts.failed}`,
  );
}

async function runMigration(options = {}) {
  const parsed = options.collections
    ? { collections: options.collections, dryRun: options.dryRun !== false }
    : parseArgs(options.argv);
  const { databases, projectId } = options.databases
    ? { databases: options.databases, projectId: options.projectId || 'test' }
    : createDatabases();

  console.log(`Migrating owner document permissions on project=${projectId} db=${DB_ID} mode=${parsed.dryRun ? 'dry_run' : 'apply'}`);
  let ownerActionRequired = false;
  const summary = {};
  for (const collectionId of parsed.collections) {
    const counts = await migrateCollection(databases, collectionId, { dryRun: parsed.dryRun });
    printCounts(collectionId, counts, parsed.dryRun);
    summary[collectionId] = counts;
    if (counts.skippedInvalidOwner > 0 || counts.failed > 0) ownerActionRequired = true;
  }

  if (ownerActionRequired) {
    console.error('OWNER_ACTION_REQUIRED');
    process.exitCode = 2;
  }
  return summary;
}

if (require.main === module) {
  runMigration().catch((error) => {
    console.error(`Fatal: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  parseArgs,
  safeOwnerId,
  migrateCollection,
  runMigration,
};
