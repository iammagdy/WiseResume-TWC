#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client, Databases, IndexType } = require('node-appwrite');

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

const DB_ID = 'main';
const COL = 'moderation_bugs';
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isDup = (e) => e.code === 409 || /already exists/i.test(e.message || '');

const attrs = [
  { key: 'component_stack', size: 4000 },
  { key: 'additional_context', size: 4000 },
  { key: 'session_id', size: 100 },
  { key: 'user_agent', size: 500 },
  { key: 'route', size: 500 },
  { key: 'status', size: 50, required: true, default: 'open' },
  { key: 'private_note', size: 2000 },
  { key: 'app_version', size: 50 },
];

(async () => {
  for (const attr of attrs) {
    try {
      await db.createStringAttribute(DB_ID, COL, attr.key, attr.size, !!attr.required, attr.default);
      console.log('added', attr.key);
      await sleep(400);
    } catch (e) {
      console.log(attr.key, isDup(e) ? 'exists' : e.message);
    }
  }

  for (const idx of [
    { key: 'idx_moderation_bugs_status', attributes: ['status'] },
    { key: 'idx_moderation_bugs_created', attributes: ['$createdAt'], orders: ['DESC'] },
  ]) {
    try {
      await db.createIndex(DB_ID, COL, idx.key, IndexType.Key, idx.attributes, idx.orders);
      console.log('index', idx.key);
      await sleep(400);
    } catch (e) {
      console.log(idx.key, isDup(e) ? 'exists' : e.message);
    }
  }

  const coll = await db.getCollection(DB_ID, COL);
  console.log('\nFinal attributes:', (coll.attributes || []).map((a) => a.key).join(', '));
})().catch((e) => { console.error(e.message); process.exit(1); });
