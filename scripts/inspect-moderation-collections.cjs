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
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);

(async () => {
  for (const collId of ['moderation_bugs', 'bug_reports']) {
    try {
      const coll = await db.getCollection(DB_ID, collId);
      console.log(`\n${collId} attributes:`);
      for (const a of coll.attributes || []) {
        console.log(`  - ${a.key} (${a.type}, size=${a.size || 'n/a'}, required=${a.required})`);
      }
    } catch (e) {
      console.log(`${collId}: ${e.message}`);
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
