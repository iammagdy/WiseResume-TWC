#!/usr/bin/env node
'use strict';
/**
 * Recreates moderation_queue and blocklist when production schema drifted
 * (e.g. only a legacy user_id attribute). Safe when collections are empty.
 *
 *   node scripts/fix-moderation-queue-schema.cjs
 */

const fs = require('fs');
const path = require('path');
const { Client, Databases, Query } = require('node-appwrite');

function loadEnv(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  }
}

loadEnv('.env.deploy');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DB_ID = 'main';

if (!API_KEY) {
  console.error('APPWRITE_API_KEY is required (.env.deploy)');
  process.exit(1);
}

const db = new Databases(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));

const SPECS = {
  moderation_queue: {
    name: 'Moderation Queue',
    requiredKeys: ['content_type', 'status'],
    attributes: [
      { type: 'string', key: 'content_type', size: 100, required: true },
      { type: 'string', key: 'content_id', size: 100 },
      { type: 'string', key: 'snippet', size: 2000 },
      { type: 'string', key: 'reporter_user_id', size: 100 },
      { type: 'string', key: 'status', size: 50, required: false, defaultVal: 'pending' },
      { type: 'string', key: 'reviewed_by', size: 100 },
      { type: 'string', key: 'reviewed_at', size: 30 },
    ],
    indexes: [
      { key: 'idx_mod_queue_status', attributes: ['status'], orders: ['ASC'] },
      { key: 'idx_mod_queue_created', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
  blocklist: {
    name: 'Blocklist',
    requiredKeys: ['type', 'value'],
    attributes: [
      { type: 'string', key: 'type', size: 50, required: true },
      { type: 'string', key: 'value', size: 500, required: true },
      { type: 'string', key: 'reason', size: 500 },
      { type: 'string', key: 'added_by', size: 100 },
    ],
    indexes: [
      { key: 'idx_blocklist_type', attributes: ['type'], orders: ['ASC'] },
      { key: 'idx_blocklist_created', attributes: ['$createdAt'], orders: ['DESC'] },
    ],
  },
};

function isDuplicate(e) {
  return e.code === 409 || /already exists/i.test(e.message || '');
}

function isNotFound(e) {
  return e.code === 404 || /could not be found/i.test(e.message || '');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForAttributes(collectionId, keys, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const coll = await db.getCollection(DB_ID, collectionId);
    const byKey = new Map((coll.attributes || []).map((a) => [a.key, a]));
    const pending = keys.filter((k) => {
      const a = byKey.get(k);
      return !a || a.status !== 'available';
    });
    if (pending.length === 0) return;
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for attributes on ${collectionId}: ${keys.join(', ')}`);
}

async function waitForIndex(collectionId, indexKey, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const coll = await db.getCollection(DB_ID, collectionId);
    const idx = (coll.indexes || []).find((i) => i.key === indexKey);
    if (idx && idx.status === 'available') return;
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for index ${indexKey} on ${collectionId}`);
}

async function schemaMatches(collectionId, requiredKeys) {
  try {
    const coll = await db.getCollection(DB_ID, collectionId);
    const keys = new Set((coll.attributes || []).map((a) => a.key));
    return requiredKeys.every((k) => keys.has(k));
  } catch (e) {
    if (isNotFound(e)) return false;
    throw e;
  }
}

async function recreateCollection(collectionId, spec) {
  const docs = await db.listDocuments(DB_ID, collectionId, [Query.limit(1)]);
  if (docs.total > 0) {
    throw new Error(`${collectionId} has ${docs.total} documents — manual migration required`);
  }

  try {
    await db.deleteCollection(DB_ID, collectionId);
    console.log(`  deleted empty collection "${collectionId}"`);
    await sleep(800);
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }

  await db.createCollection(DB_ID, collectionId, spec.name, []);
  console.log(`  created collection "${collectionId}"`);
  await sleep(500);

  for (const attr of spec.attributes) {
    if (attr.type === 'string') {
      await db.createStringAttribute(
        DB_ID,
        collectionId,
        attr.key,
        attr.size || 256,
        attr.required || false,
        attr.defaultVal,
      );
    }
    console.log(`  + attribute ${attr.key}`);
    await sleep(400);
  }

  await waitForAttributes(collectionId, spec.attributes.map((a) => a.key));

  for (const idx of spec.indexes) {
    await db.createIndex(
      DB_ID,
      collectionId,
      idx.key,
      'key',
      idx.attributes,
      idx.orders,
    );
    console.log(`  + index ${idx.key}`);
    await sleep(400);
    await waitForIndex(collectionId, idx.key);
  }
}

async function ensureIndexes(collectionId, indexes) {
  const coll = await db.getCollection(DB_ID, collectionId);
  const existing = new Set((coll.indexes || []).map((i) => i.key));
  for (const idx of indexes) {
    if (existing.has(idx.key)) {
      console.log(`  = index ${idx.key} (exists)`);
      continue;
    }
    await db.createIndex(DB_ID, collectionId, idx.key, 'key', idx.attributes, idx.orders);
    console.log(`  + index ${idx.key}`);
    await sleep(400);
    await waitForIndex(collectionId, idx.key);
  }
}

async function verifyQueue() {
  const pending = await db.listDocuments(DB_ID, 'moderation_queue', [
    Query.equal('status', 'pending'),
    Query.limit(1),
    Query.orderDesc('$createdAt'),
  ]);
  console.log(`verify Query.equal(status,pending): total=${pending.total}`);
}

async function verifyFunction() {
  const { Functions, Users } = require('node-appwrite');
  const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
  const functions = new Functions(client);
  const users = new Users(client);

  const email = process.env.ADMIN_EMAIL || 'admin@wiseresume.app';
  const page = await users.list([Query.equal('email', email), Query.limit(1)]);
  const user = page.users[0];
  if (!user) throw new Error(`Admin user not found: ${email}`);

  const jwt = (await users.createJWT(user.$id)).jwt;
  const loginEx = await functions.createExecution(
    'admin-devkit-data',
    JSON.stringify({ action: 'verify-devkit-session', __headers: { 'X-Appwrite-JWT': jwt } }),
    false,
    '/',
    'POST',
  );
  const loginPayload = JSON.parse(loginEx.responseBody || '{}');
  const devkitToken = loginPayload?.session?.token;
  if (!devkitToken) throw new Error('Could not obtain DevKit token');

  const body = JSON.stringify({
    action: 'list_moderation_queue',
    status_filter: 'pending',
    page: 1,
    per_page: 10,
    __headers: { Authorization: `Bearer ${devkitToken}` },
  });
  const ex = await functions.createExecution('admin-moderation', body, false, '/', 'POST');
  const payload = JSON.parse(ex.responseBody || '{}');
  if (!payload.success) throw new Error(payload.error || ex.responseBody);
  console.log(`verify admin-moderation list_moderation_queue: items=${payload.items?.length ?? 0} total=${payload.total ?? 0}`);
}

async function main() {
  console.log(`fix-moderation-queue-schema project=${PROJECT_ID}`);

  for (const [collectionId, spec] of Object.entries(SPECS)) {
    console.log(`\n--- ${collectionId} ---`);
    const ok = await schemaMatches(collectionId, spec.requiredKeys);
    if (ok) {
      console.log('  schema matches README — ensuring indexes only');
      await ensureIndexes(collectionId, spec.indexes);
    } else {
      console.log('  schema drift detected — recreating empty collection');
      await recreateCollection(collectionId, spec);
    }
  }

  console.log('\n--- verification ---');
  await verifyQueue();
  await verifyFunction();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
