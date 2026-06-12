#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sdk = require('node-appwrite');

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

const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const hashPath = path.join(process.cwd(), 'src/lib/devkit/sourceHashes.generated.json');

(async () => {
  if (!apiKey) {
    console.error('APPWRITE_API_KEY missing — cannot compare production drift');
    process.exit(1);
  }

  const local = JSON.parse(fs.readFileSync(hashPath, 'utf8')).hashes;
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const db = new sdk.Databases(client);

  let deployed = {};
  const res = await db.listDocuments('main', 'app_settings', [
    sdk.Query.equal('key', ['fn_deployed_hashes']),
    sdk.Query.limit(1),
  ]);
  if (res.documents[0]?.value) {
    deployed = JSON.parse(res.documents[0].value);
  }

  const needs = [];
  const ok = [];
  const unknown = [];

  for (const [hub, hash] of Object.entries(local)) {
    if (!hash) {
      unknown.push(hub);
      continue;
    }
    const src16 = hash.slice(0, 16);
    const dep = deployed[hub];
    if (!dep) needs.push({ hub, reason: 'never recorded', deployed: null, src: src16 });
    else if (dep !== src16) needs.push({ hub, reason: 'drift', deployed: dep, src: src16 });
    else ok.push(hub);
  }

  console.log(`NEEDS REDEPLOY (${needs.length})`);
  for (const n of needs) {
    console.log(`  ${n.hub}: deployed=${n.deployed ?? 'none'} local=${n.src}`);
  }
  console.log(`\nIN SYNC (${ok.length})`);
  console.log(`  ${ok.join(', ') || '(none)'}`);
  if (unknown.length) console.log(`\nNO LOCAL SOURCE: ${unknown.join(', ')}`);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
