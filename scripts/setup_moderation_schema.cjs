#!/usr/bin/env node
'use strict';
/**
 * Creates Appwrite collections for the DevKit Moderation panel:
 *   bug_reports, blocklist, moderation_queue
 *
 * Run once against production:
 *   APPWRITE_API_KEY=<key> APPWRITE_PROJECT_ID=69fd362b001eb325a192 node scripts/setup_moderation_schema.cjs
 *
 * Idempotent — skips existing collections/attributes/indexes.
 */

const fs = require('fs');
const path = require('path');
const { Client, Databases, IndexType } = require('node-appwrite');

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

loadEnvFile('.env.deploy');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
const DB_ID = 'main';

if (!API_KEY) {
  console.error('[moderation-schema] APPWRITE_API_KEY is required');
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

function isDuplicate(e) {
  return e.code === 409 || /already exists/i.test(e.message || '');
}

function isNotFound(e) {
  return e.code === 404 || /could not be found/i.test(e.message || '');
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureCollection(collectionId, name, attributes, indexes = []) {
  let recreate = false;
  try {
    await db.getCollection(DB_ID, collectionId);
    console.log(`[moderation-schema] Collection "${collectionId}" exists`);
  } catch (e) {
    if (isNotFound(e)) {
      await db.createCollection(DB_ID, collectionId, name, []);
      console.log(`[moderation-schema] Created collection "${collectionId}"`);
      await sleep(500);
    } else if (e.code === 500 || /server error/i.test(String(e.message || ''))) {
      console.warn(`[moderation-schema] "${collectionId}" appears corrupt (500) — recreating…`);
      recreate = true;
    } else {
      throw e;
    }
  }

  if (recreate) {
    try {
      await db.deleteCollection(DB_ID, collectionId);
      console.log(`[moderation-schema] Deleted corrupt collection "${collectionId}"`);
      await sleep(800);
    } catch (delErr) {
      console.warn(`[moderation-schema] Could not delete "${collectionId}":`, delErr.message);
    }
    await db.createCollection(DB_ID, collectionId, name, []);
    console.log(`[moderation-schema] Recreated collection "${collectionId}"`);
    await sleep(500);
  }

  for (const attr of attributes) {
    const { type, key, required = false, defaultVal, size, min, max } = attr;
    try {
      if (type === 'string') {
        await db.createStringAttribute(DB_ID, collectionId, key, size || 256, required, defaultVal);
      } else if (type === 'boolean') {
        await db.createBooleanAttribute(DB_ID, collectionId, key, required, defaultVal);
      }
      console.log(`  + attribute ${key}`);
      await sleep(350);
    } catch (e) {
      if (!isDuplicate(e)) throw e;
      console.log(`  = attribute ${key} (exists)`);
    }
  }

  for (const idx of indexes) {
    try {
      await db.createIndex(DB_ID, collectionId, idx.key, idx.type || IndexType.Key, idx.attributes, idx.orders);
      console.log(`  + index ${idx.key}`);
      await sleep(350);
    } catch (e) {
      if (!isDuplicate(e)) throw e;
      console.log(`  = index ${idx.key} (exists)`);
    }
  }
}

async function main() {
  console.log(`[moderation-schema] project=${PROJECT_ID} endpoint=${ENDPOINT}`);

  await ensureCollection('moderation_bugs', 'Moderation Bug Reports', [
    { type: 'string', key: 'user_email', size: 320 },
    { type: 'string', key: 'error_message', size: 2000, required: true },
    { type: 'string', key: 'error_stack', size: 4000 },
    { type: 'string', key: 'component_stack', size: 4000 },
    { type: 'string', key: 'additional_context', size: 2000 },
    { type: 'string', key: 'session_id', size: 100 },
    { type: 'string', key: 'user_agent', size: 500 },
    { type: 'string', key: 'route', size: 500 },
    { type: 'string', key: 'status', size: 50, defaultVal: 'open' },
    { type: 'string', key: 'private_note', size: 1000 },
    { type: 'string', key: 'app_version', size: 50 },
  ], [
    { key: 'idx_moderation_bugs_status', attributes: ['status'], orders: ['ASC'] },
    { key: 'idx_moderation_bugs_created', attributes: ['$createdAt'], orders: ['DESC'] },
  ]);

  await ensureCollection('blocklist', 'Blocklist', [
    { type: 'string', key: 'type', size: 50, required: true },
    { type: 'string', key: 'value', size: 500, required: true },
    { type: 'string', key: 'reason', size: 500 },
    { type: 'string', key: 'added_by', size: 100 },
  ], [
    { key: 'idx_blocklist_type', attributes: ['type'], orders: ['ASC'] },
    { key: 'idx_blocklist_created', attributes: ['$createdAt'], orders: ['DESC'] },
  ]);

  await ensureCollection('moderation_queue', 'Moderation Queue', [
    { type: 'string', key: 'content_type', size: 100, required: true },
    { type: 'string', key: 'content_id', size: 100 },
    { type: 'string', key: 'snippet', size: 2000 },
    { type: 'string', key: 'reporter_user_id', size: 100 },
    { type: 'string', key: 'status', size: 50, defaultVal: 'pending' },
    { type: 'string', key: 'reviewed_by', size: 100 },
    { type: 'string', key: 'reviewed_at', size: 30 },
  ], [
    { key: 'idx_mod_queue_status', attributes: ['status'], orders: ['ASC'] },
    { key: 'idx_mod_queue_created', attributes: ['$createdAt'], orders: ['DESC'] },
  ]);

  const probe = await db.listDocuments(DB_ID, 'moderation_bugs', []);
  console.log(`[moderation-schema] moderation_bugs probe: total=${probe.total}`);
  console.log('[moderation-schema] Done.');
  console.log('[moderation-schema] Note: legacy collection "bug_reports" may be corrupt — delete it manually in Appwrite Console if list calls still fail.');
}

main().catch((err) => {
  console.error('[moderation-schema] Fatal:', err.message || err);
  process.exit(1);
});
