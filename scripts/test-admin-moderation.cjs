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

const projectId = process.env.APPWRITE_PROJECT_ID || '69fd362b001eb325a192';
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const apiKey = process.env.APPWRITE_API_KEY;
const DB_ID = 'main';

async function timed(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`OK  ${label} (${Date.now() - start}ms)`);
    return result;
  } catch (err) {
    console.log(`ERR ${label} (${Date.now() - start}ms): ${err.message}`);
    throw err;
  }
}

(async () => {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const databases = new sdk.Databases(client);
  const functions = new sdk.Functions(client);
  const users = new sdk.Users(client);

  console.log('Project:', projectId);
  console.log('Endpoint:', endpoint);

  const fn = await timed('getFunction(admin-moderation)', () => functions.get('admin-moderation'));
  console.log('  deployment:', fn.deploymentId, 'timeout:', fn.timeout, 'enabled:', fn.enabled);

  for (const collId of ['moderation_bugs', 'bug_reports', 'blocklist', 'moderation_queue']) {
    try {
      const coll = await timed(`getCollection(${collId})`, () => databases.getCollection(DB_ID, collId));
      const countStart = Date.now();
      const docs = await databases.listDocuments(DB_ID, collId, [sdk.Query.limit(1)]);
      console.log(`  ${collId}: exists, total=${docs.total}, listMs=${Date.now() - countStart}`);
    } catch (e) {
      console.log(`  ${collId}: ${e.message}`);
    }
  }

  const email = process.env.ADMIN_EMAIL || 'admin@wiseresume.app';
  const page = await users.list([sdk.Query.equal('email', email), sdk.Query.limit(1)]);
  const user = page.users[0];
  if (!user) throw new Error(`User not found: ${email}`);

  const jwt = (await users.createJWT(user.$id)).jwt;
  const devkitLoginBody = JSON.stringify({
    action: 'verify-devkit-session',
    __headers: { 'X-Appwrite-JWT': jwt },
  });
  const loginEx = await functions.createExecution('admin-devkit-data', devkitLoginBody, false, '/', 'POST');
  const loginPayload = JSON.parse(loginEx.responseBody || '{}');
  const devkitToken = loginPayload?.session?.token;
  if (!devkitToken) throw new Error('Could not obtain DevKit token');

  for (const action of ['ping', 'list_bug_reports']) {
    const body = JSON.stringify({
      action,
      status_filter: 'all',
      page: 1,
      per_page: 5,
      __headers: { Authorization: `Bearer ${devkitToken}` },
    });
    const start = Date.now();
    const ex = await functions.createExecution('admin-moderation', body, false, '/', 'POST');
    const ms = Date.now() - start;
    console.log(`\n--- admin-moderation ${action} (${ms}ms) ---`);
    console.log('execution status:', ex.status);
    console.log('http:', ex.responseStatusCode);
    console.log('errors:', ex.errors || '(none)');
    console.log('body:', (ex.responseBody || '').slice(0, 800));
  }
})().catch((err) => {
  console.error('\nFatal:', err.message || err);
  process.exit(1);
});
