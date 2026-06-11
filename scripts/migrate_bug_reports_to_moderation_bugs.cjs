#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client, Databases, ID, Query } = require('node-appwrite');

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
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY));

const FIELDS = [
  'user_email', 'error_message', 'error_stack', 'component_stack', 'additional_context',
  'session_id', 'user_agent', 'route', 'status', 'private_note', 'app_version',
];

(async () => {
  const src = await db.listDocuments(DB_ID, 'bug_reports', [Query.limit(100), Query.orderDesc('$createdAt')]);
  console.log(`Found ${src.documents.length} bug_reports to migrate`);

  let migrated = 0;
  for (const doc of src.documents) {
    const payload = {};
    for (const key of FIELDS) {
      if (doc[key] !== undefined && doc[key] !== null) payload[key] = doc[key];
    }
    if (!payload.status) payload.status = 'open';
    if (!payload.error_message) payload.error_message = 'Unknown error';

    await db.createDocument(DB_ID, 'moderation_bugs', ID.unique(), payload);
    migrated += 1;
    console.log(`  migrated ${doc.$id} -> moderation_bugs`);
  }

  const probe = await db.listDocuments(DB_ID, 'moderation_bugs', [Query.limit(1)]);
  console.log(`Done. moderation_bugs total=${probe.total}`);
})().catch((err) => {
  console.error('Fatal:', err.message || err);
  process.exit(1);
});
