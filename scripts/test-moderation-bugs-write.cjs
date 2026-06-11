#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { Client, Databases, ID } = require('node-appwrite');
function loadEnv(f) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...r] = t.split('=');
    if (!process.env[k]) process.env[k] = r.join('=').replace(/^["']|["']$/g, '');
  }
}
loadEnv('.env.deploy');
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY));

(async () => {
  try {
    const doc = await db.createDocument('main', 'moderation_bugs', ID.unique(), {
      user_email: 'test@thewise.cloud',
      error_message: 'Test crash from script',
      error_stack: 'stack here',
      status: 'open',
      route: '/dashboard',
    });
    console.log('create ok', doc.$id);
  } catch (e) {
    console.log('create fail', e.message);
  }
  const list = await db.listDocuments('main', 'moderation_bugs', []);
  console.log('total', list.total);
})();
