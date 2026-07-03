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

const email = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@wiseresume.app').trim().toLowerCase();
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;

async function runOnce(functions, body, asyncMode) {
  let ex = await functions.createExecution('admin-devkit-data', body, asyncMode, '/', 'POST');
  if (asyncMode && ex.status !== 'completed' && ex.status !== 'failed') {
    for (let i = 0; i < 30; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      ex = await functions.getExecution('admin-devkit-data', ex.$id);
      if (ex.status === 'completed' || ex.status === 'failed') break;
    }
  }
  return ex;
}

(async () => {
  const client = new sdk.Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const users = new sdk.Users(client);
  const functions = new sdk.Functions(client);

  const page = await users.list([sdk.Query.equal('email', email), sdk.Query.limit(1)]);
  const user = page.users[0];
  if (!user) throw new Error(`User not found: ${email}`);

  console.log('User:', user.$id);
  console.log('Labels:', user.labels);

  const jwt = (await users.createJWT(user.$id)).jwt;
  const body = JSON.stringify({
    action: 'verify-devkit-session',
    __headers: { 'X-Appwrite-JWT': jwt },
  });

  for (const asyncMode of [false, true]) {
    const ex = await runOnce(functions, body, asyncMode);
    console.log('\n--- async =', asyncMode, '---');
    console.log('execution status:', ex.status);
    console.log('response status:', ex.responseStatusCode);
    console.log('response body:', ex.responseBody);
    if (ex.errors) console.log('errors:', ex.errors);
    if (asyncMode && !ex.responseBody) {
      console.log('execution keys:', Object.keys(ex));
    }
  }

  const diagBody = JSON.stringify({ action: 'diagnostics' });
  const diagEx = await runOnce(functions, diagBody, true);
  console.log('\n--- diagnostics async ---');
  console.log('status:', diagEx.status, 'http:', diagEx.responseStatusCode, 'bodyLen:', (diagEx.responseBody || '').length);
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
