#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { Client, Databases, Functions, Query } = require('node-appwrite');

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
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const functions = new Functions(client);

const README_ATTRS = {
  moderation_queue: [
    'content_type', 'content_id', 'snippet', 'reporter_user_id',
    'status', 'reviewed_by', 'reviewed_at',
  ],
};

(async () => {
  const fn = await functions.get('admin-moderation');
  console.log('admin-moderation:', {
    deploymentId: fn.deploymentId,
    timeout: fn.timeout,
    enabled: fn.enabled,
  });

  for (const collId of ['moderation_queue', 'blocklist', 'moderation_bugs']) {
    console.log(`\n=== ${collId} ===`);
    try {
      const coll = await db.getCollection(DB_ID, collId);
      const attrKeys = (coll.attributes || []).map((a) => a.key);
      console.log('attributes:', attrKeys.join(', ') || '(none)');
      for (const a of coll.attributes || []) {
        console.log(`  ${a.key}: type=${a.type} size=${a.size ?? 'n/a'} required=${a.required} status=${a.status}`);
      }
      console.log('indexes:');
      for (const i of coll.indexes || []) {
        console.log(`  ${i.key}: ${i.type} on [${i.attributes.join(', ')}] status=${i.status}`);
      }
      const expected = README_ATTRS[collId];
      if (expected) {
        const missing = expected.filter((k) => !attrKeys.includes(k));
        if (missing.length) console.log('MISSING vs README:', missing.join(', '));
        else console.log('README attributes: OK');
        const hasStatusIdx = (coll.indexes || []).some((i) => i.attributes?.includes('status'));
        console.log('status index:', hasStatusIdx ? 'present' : 'MISSING');
      }
      const start = Date.now();
      const docs = await db.listDocuments(DB_ID, collId, [Query.limit(1), Query.orderDesc('$createdAt')]);
      console.log(`listDocuments OK total=${docs.total} ms=${Date.now() - start}`);
      try {
        const filtered = await db.listDocuments(DB_ID, collId, [
          Query.equal('status', 'pending'),
          Query.limit(1),
        ]);
        console.log(`Query.equal(status) OK total=${filtered.total}`);
      } catch (e) {
        console.log(`Query.equal(status) FAIL: ${e.message}`);
      }
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
