#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');
function loadEnv(f){const p=path.join(process.cwd(),f);if(!fs.existsSync(p))return;for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){const t=line.trim();if(!t||t.startsWith('#')||!t.includes('='))continue;const [k,...r]=t.split('=');if(!process.env[k])process.env[k]=r.join('=').replace(/^["']|["']$/g,'');}}
loadEnv('.env.deploy');
const db = new sdk.Databases(new sdk.Client().setEndpoint(process.env.APPWRITE_ENDPOINT||'https://fra.cloud.appwrite.io/v1').setProject(process.env.APPWRITE_PROJECT_ID||'69fd362b001eb325a192').setKey(process.env.APPWRITE_API_KEY));
(async()=>{
  for (const id of ['username_rules','username_rules_overrides','username_reserved','username_exclusive','username_premium','profiles']) {
    try {
      const c = await db.getCollection('main', id);
      console.log(id+':', (c.attributes||[]).map(a=>a.key).join(', ') || '(no attrs)');
    } catch(e){ console.log(id+':', e.message); }
  }
})();
