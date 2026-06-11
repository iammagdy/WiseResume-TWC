#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { Client, Databases } = require('node-appwrite');
function loadEnv(f){const p=path.join(process.cwd(),f);if(!fs.existsSync(p))return;for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#')||!t.includes('='))continue;const [k,...r]=t.split('=');if(!process.env[k])process.env[k]=r.join('=').replace(/^["']|["']$/g,'');}}
loadEnv('.env.deploy');
const db = new Databases(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192')
  .setKey(process.env.APPWRITE_API_KEY));
const attrs = [
  ['status', 50, false, 'open'],
  ['additional_context', 2000, false, undefined],
  ['private_note', 1000, false, undefined],
];
(async () => {
  for (const [key, size, required, def] of attrs) {
    try {
      await db.createStringAttribute('main', 'moderation_bugs', key, size, required, def);
      console.log('added', key);
    } catch (e) {
      console.log(key, e.message);
    }
  }
})();
